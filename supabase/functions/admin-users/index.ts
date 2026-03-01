import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, cedula, password, nombre, apellidos, userId, newPassword } = await req.json();

    if (action === "register") {
      const email = `${cedula}@espolmedd.app`;
      
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { cedula, nombre: nombre || '' }
      });

      if (authError) throw authError;

      // Update profile
      if (authData.user) {
        await adminClient.from('profiles').update({
          nombre: nombre || '',
          apellidos: apellidos || '',
          primera_vez: password === '123*789*h',
        }).eq('user_id', authData.user.id);
      }

      return new Response(JSON.stringify({ user: authData.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "promote_admin") {
      // Find user by cedula
      const { data: profile } = await adminClient.from('profiles').select('user_id').eq('cedula', cedula).single();
      if (!profile) throw new Error("User not found");

      await adminClient.from('user_roles').upsert({
        user_id: profile.user_id,
        role: 'admin',
      }, { onConflict: 'user_id,role' });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword || '123*789*h',
      });
      if (error) throw error;

      await adminClient.from('profiles').update({ primera_vez: true }).eq('user_id', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
