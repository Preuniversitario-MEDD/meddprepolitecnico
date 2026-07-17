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
  name: "list_my_courses",
  title: "List my courses",
  description: "List the ESPOLMEDD courses the signed-in user has access to (title, description, id).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    // Admin: see all courses. Student: enrolled courses via curso_estudiantes.
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");

    if (isAdmin) {
      const { data, error } = await sb.from("cursos").select("id, titulo, descripcion").order("created_at");
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { courses: data ?? [] } };
    }

    const { data: enroll, error: e1 } = await sb.from("curso_estudiantes").select("curso_id").eq("user_id", userId);
    if (e1) return { content: [{ type: "text", text: e1.message }], isError: true };
    const ids = (enroll ?? []).map((r: any) => r.curso_id);
    if (ids.length === 0) return { content: [{ type: "text", text: "[]" }], structuredContent: { courses: [] } };
    const { data, error } = await sb.from("cursos").select("id, titulo, descripcion").in("id", ids).order("created_at");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { courses: data ?? [] } };
  },
});
