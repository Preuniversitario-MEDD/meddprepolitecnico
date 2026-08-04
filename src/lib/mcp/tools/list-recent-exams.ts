import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolResult, cached, page, DEFAULT_TTL_MS } from "../supabase";

export default defineTool({
  name: "list_recent_exams",
  title: "List my recent exam attempts",
  description:
    "Return the signed-in user's most recent exam history entries (type, correctness, date). Paginated with `limit`/`offset`, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(10).describe("Max rows to return (1-100)."),
    offset: z.number().int().min(0).default(0).describe("Rows to skip, for pagination."),
    curso_id: z.string().uuid().optional().describe("Optional course id filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset, curso_id }, ctx) => {
    if (!ctx.isAuthenticated()) return toolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    try {
      const { value, hit } = await cached(
        `exams:${userId}:${curso_id ?? "all"}:${limit}:${offset}`,
        DEFAULT_TTL_MS,
        async () => {
          let q = sb
            .from("examen_historial")
            .select("exam_tipo, correcta, intento, created_at, pregunta_id, curso_id")
            .eq("user_id", userId);
          if (curso_id) q = q.eq("curso_id", curso_id);
          const { data, error } = await q.order("created_at", { ascending: false }).range(offset, offset + limit);
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
