import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolResult, cached, page, DEFAULT_TTL_MS } from "../supabase";

export default defineTool({
  name: "list_sessions",
  title: "List sessions in a course",
  description:
    "List learning sessions (number, title, state) for a course id. Paginated with `limit`/`offset`; results are cached briefly to keep large lists fast.",
  inputSchema: {
    curso_id: z.string().uuid().describe("Course id (from list_my_courses)."),
    limit: z.number().int().min(1).max(100).default(25).describe("Max sessions to return (1-100)."),
    offset: z.number().int().min(0).default(0).describe("Rows to skip, for pagination."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ curso_id, limit, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return toolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    try {
      const { value, hit } = await cached(
        `sessions:${ctx.getUserId()}:${curso_id}:${limit}:${offset}`,
        DEFAULT_TTL_MS,
        async () => {
          const { data, error } = await sb
            .from("sesiones")
            .select("id, numero, titulo, descripcion, estado")
            .eq("curso_id", curso_id)
            .order("numero")
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
