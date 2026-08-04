import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolResult, cached, page, DEFAULT_TTL_MS } from "../supabase";

export default defineTool({
  name: "get_my_progress",
  title: "Get my progress",
  description:
    "Return the signed-in user's progress rows for a course (per-session completion, exercises, quiz hits). Paginated with `limit`/`offset`.",
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
      const { value, hit } = await cached(
        `progress:${userId}:${curso_id}:${limit}:${offset}`,
        DEFAULT_TTL_MS,
        async () => {
          const { data, error } = await sb
            .from("progreso_estudiante")
            .select(
              "sesion_id, completada, ejercicios_completados, ejercicios_correctos, preguntas_correctas_total, puntaje_quiz, intentos_quiz, tiempo_invertido, fecha",
            )
            .eq("user_id", userId)
            .eq("curso_id", curso_id)
            .order("fecha", { ascending: false })
            .range(offset, offset + limit);
          if (error) throw new Error(error.message);
          return data ?? [];
        },
      );
      return toolResult(page(value, limit, offset, hit));
    } catch (e) {
      return toolError((e as Error).message);
    }
  },
});
