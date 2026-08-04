import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolResult, invalidatePrefix } from "../supabase";

export default defineTool({
  name: "request_unlock",
  title: "Request section unlock",
  description:
    "Request the unlock of a locked session for the signed-in user. Granted only when the previous session reached 100% completion; otherwise it returns the missing requirement.",
  inputSchema: {
    sesion_id: z.string().uuid().describe("Session id to unlock (from list_locked_sections)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ sesion_id }, ctx) => {
    if (!ctx.isAuthenticated()) return toolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: target, error: e1 } = await sb
      .from("sesiones")
      .select("id, numero, titulo, curso_id")
      .eq("id", sesion_id)
      .maybeSingle();
    if (e1) return toolError(e1.message);
    if (!target) return toolError("Session not found or not accessible.");

    const { data: existing } = await sb
      .from("sesion_estudiante")
      .select("desbloqueada")
      .eq("user_id", userId)
      .eq("sesion_id", sesion_id)
      .maybeSingle();
    if (existing?.desbloqueada) {
      return toolResult({ granted: true, already_unlocked: true, sesion_id, numero: target.numero, titulo: target.titulo });
    }

    if (target.numero > 1) {
      const { data: prev } = await sb
        .from("sesiones")
        .select("id, numero, titulo")
        .eq("curso_id", target.curso_id)
        .eq("numero", target.numero - 1)
        .maybeSingle();
      if (prev) {
        const { data: prog } = await sb
          .from("progreso_estudiante")
          .select("completada")
          .eq("user_id", userId)
          .eq("sesion_id", prev.id)
          .maybeSingle();
        if (!prog?.completada) {
          return toolResult({
            granted: false,
            sesion_id,
            reason: `Session ${prev.numero} ("${prev.titulo}") is not at 100% yet. Finish theory, 20 correct exercises and 150 quiz hits first.`,
            prerequisito: { sesion_id: prev.id, numero: prev.numero, titulo: prev.titulo },
          });
        }
      }
    }

    const { error } = await sb
      .from("sesion_estudiante")
      .upsert({ user_id: userId, sesion_id, desbloqueada: true, curso_id: target.curso_id } as any, {
        onConflict: "user_id,sesion_id",
      });
    if (error) return toolError(error.message);

    invalidatePrefix(`locked:${userId}:`);
    return toolResult({ granted: true, sesion_id, numero: target.numero, titulo: target.titulo });
  },
});
