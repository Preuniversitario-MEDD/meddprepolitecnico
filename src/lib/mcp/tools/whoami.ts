import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, toolError, toolResult, cached, DEFAULT_TTL_MS } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in ESPOLMEDD user profile (name, cedula, role).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return toolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { value, hit } = await cached(`whoami:${userId}`, DEFAULT_TTL_MS, async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        sb.from("profiles").select("nombre, apellidos, cedula, avatar_url").eq("user_id", userId).maybeSingle(),
        sb.from("user_roles").select("role").eq("user_id", userId),
      ]);
      return {
        user_id: userId,
        email: ctx.getUserEmail?.() ?? null,
        nombre: profile?.nombre ?? null,
        apellidos: (profile as any)?.apellidos ?? null,
        cedula: profile?.cedula ?? null,
        roles: (roles ?? []).map((r: any) => r.role),
      };
    });
    return toolResult({ ...value, cached: hit });
  },
});
