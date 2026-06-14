import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Verify the caller is authenticated. Returns the user (and a service-role client)
 * on success, or a Response to short-circuit on failure.
 */
export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return { error: jsonResponse({ error: "Unauthorized" }, 401) } as const;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) } as const;
  }
  return { user: data.user, userClient } as const;
}

/** Verify the caller is an admin. */
export async function requireAdmin(req: Request) {
  const res = await requireUser(req);
  if ("error" in res) return res;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", res.user.id);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin");
  if (!isAdmin) return { error: jsonResponse({ error: "Forbidden" }, 403) } as const;
  return { user: res.user, adminClient } as const;
}

/** Generate a secure temporary password (12 chars, mixed). */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*?";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let pwd = upper[bytes[0] % upper.length]
    + lower[bytes[1] % lower.length]
    + digits[bytes[2] % digits.length]
    + symbols[bytes[3] % symbols.length];
  for (let i = 4; i < 12; i++) pwd += all[bytes[i] % all.length];
  return pwd.split("").sort(() => 0.5 - Math.random()).join("");
}
