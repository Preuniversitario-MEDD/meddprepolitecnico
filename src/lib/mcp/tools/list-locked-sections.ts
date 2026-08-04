import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolResult, cached, page, DEFAULT_TTL_MS } from "../supabase";

export default defineTool({
  name: "list_locked_sections",
  title: "List locked sections",
  description:
    "List the course sessions that are still locked for the signed-in user, with the reason and the completion status of the prerequisite session. Paginated with `limit`/`offset`.",
  inputSchema: {
    curso_id: z.string().uuid().describe("Course id (from list_my_courses)."),
    limit: z.number().int().min(1).max(100).default(25).describe("Max rows to return (1-100)."),
    offset: z.number().int().min(0).default(0).describe("Rows to skip, for pagination."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ curso_id, limit, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return toolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    try {
      const { value, hit } = await cached(`locked:${userId}:${curso_id}`, DEFAULT_TTL_MS, async () => {
        const [{ data: sesiones, error: e1 }, { data: unlocks }, { data: progreso }] = await Promise.all([
          sb.from("sesiones").select("id, numero, titulo, estado").eq("curso_id", curso_id).order("numero"),
          sb.from("sesion_estudiante").select("sesion_id, desbloqueada").eq("user_id", userId),
          sb.from("progreso_estudiante").select("sesion_id, completada").eq("user_id", userId).eq("curso_id", curso_id),
        ]);
        if (e1) throw new Error(e1.message);
        const unlocked = new Set((unlocks ?? []).filter((u: any) => u.desbloqueada).map((u: any) => u.sesion_id));
        const done = new Set((progreso ?? []).filter((p: any) => p.completada).map((p: any) => p.sesion_id));
        const list = sesiones ?? [];
        return list
          .filter((s: any) => s.numero > 1 && !unlocked.has(s.id))
          .map((s: any) => {
            const prev = list.find((p: any) => p.numero === s.numero - 1);
            const prereqDone = prev ? done.has(prev.id) : true;
            return {
              sesion_id: s.id,
              numero: s.numero,
              titulo: s.titulo,
              locked: true,
              prerequisito: prev ? { sesion_id: prev.id, numero: prev.numero, titulo: prev.titulo } : null,
              prerequisito_completado: prereqDone,
              can_request_unlock: prereqDone,
              reason: prereqDone
                ? "Prerequisite session is at 100% — call request_unlock with this sesion_id."
                : "Previous session is not yet complete (100%).",
            };
          });
      });
      return toolResult(page((value as any[]).slice(offset, offset + limit + 1), limit, offset, hit));
    } catch (e) {
      return toolError((e as Error).message);
    }
  },
});
