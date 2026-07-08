import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin, generateTempPassword } from "../_shared/auth.ts";


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authResult = await requireAdmin(req);
    if ("error" in authResult) return authResult.error;
    const adminClient = authResult.adminClient;

    const { action, cedula, nombre, apellidos, userId } = await req.json();

    if (action === "register") {
      const email = `${cedula}@espolmedd.app`;
      const tempPassword = generateTempPassword();

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
      const tempPassword = DEFAULT_TEMP_PASSWORD;
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });
      if (error) throw error;
      await adminClient.from("profiles").update({ primera_vez: true }).eq("user_id", userId);
      return jsonResponse({ success: true, tempPassword });
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
