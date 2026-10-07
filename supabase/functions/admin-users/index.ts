import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin, generateTempPassword } from "../_shared/auth.ts";
const DEFAULT_PASSWORD = "123*789*h";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authResult = await requireAdmin(req);
    if ("error" in authResult) return authResult.error;
    const adminClient = authResult.adminClient;

    const { action, cedula, nombre, apellidos, userId } = await req.json();

    if (action === "register") {
      const email = `${cedula}@espolmedd.app`;
      const tempPassword = DEFAULT_PASSWORD;

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { cedula, nombre: nombre || "" },
      });
      if (authError) throw authError;

      if (authData.user) {
        await adminClient.from("profiles").update({
          nombre: nombre || "",
          apellidos: apellidos || "",
          primera_vez: true,
        }).eq("user_id", authData.user.id);
      }

      return jsonResponse({ user: authData.user, tempPassword });
    }

    if (action === "promote_admin") {
      const { data: profile } = await adminClient
        .from("profiles").select("user_id").eq("cedula", cedula).single();
      if (!profile) throw new Error("User not found");

      await adminClient.from("user_roles").upsert(
        { user_id: profile.user_id, role: "admin" },
        { onConflict: "user_id,role" },
      );
      return jsonResponse({ success: true });
    }

    if (action === "reset_password") {
      if (!userId) throw new Error("userId is required");
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
      });
      if (error) throw error;
      await adminClient.from("profiles").update({ primera_vez: true }).eq("user_id", userId);
      return jsonResponse({ success: true, tempPassword: DEFAULT_PASSWORD });
    }

    if (action === "reset_all_passwords") {
      const { data: roles } = await adminClient.from("user_roles").select("user_id").eq("role", "estudiante");
      const { data: admins } = await adminClient.from("user_roles").select("user_id").in("role", ["admin"]);
      const adminSet = new Set((admins || []).map((a: any) => a.user_id));
      const ids = [...new Set((roles || []).map((r: any) => r.user_id))].filter((id) => !adminSet.has(id));
      let ok = 0, fail = 0;
      for (const id of ids) {
        const { error } = await adminClient.auth.admin.updateUserById(id, { password: DEFAULT_PASSWORD });
        if (error) { fail++; continue; }
        await adminClient.from("profiles").update({ primera_vez: true }).eq("user_id", id);
        ok++;
      }
      return jsonResponse({ success: true, ok, fail, tempPassword: DEFAULT_PASSWORD });
    }

    if (action === "delete_user") {
      if (!userId) throw new Error("userId is required");
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
