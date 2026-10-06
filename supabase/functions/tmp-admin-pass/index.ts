import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: p } = await c.from("profiles").select("user_id").eq("cedula", "0930620109").single();
  if (!p) return new Response("no user", { status: 404 });
  const { error } = await c.auth.admin.updateUserById(p.user_id, { password: "097480256p" });
  return new Response(error ? error.message : "ok");
});
