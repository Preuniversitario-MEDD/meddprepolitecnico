import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolResult, cached, page, DEFAULT_TTL_MS } from "../supabase";

export default defineTool({
  name: "list_my_courses",
  title: "List my courses",
  description:
    "List the ESPOLMEDD courses the signed-in user has access to (id, title, description). Paginated: use `limit` and `offset`; the response includes pagination.next_offset when more rows exist.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("Max courses to return (1-100)."),
    offset: z.number().int().min(0).default(0).describe("Rows to skip, for pagination."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return toolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { value, hit } = await cached(`courses:${userId}:${limit}:${offset}`, DEFAULT_TTL_MS, async () => {
      const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");

      let query = sb.from("cursos").select("id, titulo, descripcion");
      if (!isAdmin) {
        const { data: enroll, error: e1 } = await sb.from("curso_estudiantes").select("curso_id").eq("user_id", userId);
        if (e1) throw new Error(e1.message);
        const ids = (enroll ?? []).map((r: any) => r.curso_id);
        if (ids.length === 0) return [] as any[];
        query = query.in("id", ids);
      }
      // fetch limit+1 to detect has_more
      const { data, error } = await query.order("created_at").range(offset, offset + limit);
      if (error) throw new Error(error.message);
      return data ?? [];
    }).catch((e: Error) => ({ error: e.message }) as any);

    if ((value as any)?.error) return toolError((value as any).error);
    return toolResult(page(value as any[], limit, offset, hit));
  },
});
