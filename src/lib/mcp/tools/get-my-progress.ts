import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_progress",
  title: "Get my progress",
  description: "Return the signed-in user's progress rows for a course (per-session completion, exercises, quiz hits).",
  inputSchema: {
    curso_id: z.string().uuid().describe("Course id (from list_my_courses)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ curso_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data, error } = await sb
      .from("progreso_estudiante")
      .select("sesion_id, teoria_vista, ejercicios_correctos, quiz_aciertos, porcentaje, completado")
      .eq("user_id", userId)
      .eq("curso_id", curso_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { progress: data ?? [] } };
  },
});
