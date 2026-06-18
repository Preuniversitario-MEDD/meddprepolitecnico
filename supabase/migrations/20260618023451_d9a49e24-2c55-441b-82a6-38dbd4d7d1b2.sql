
-- 1) Profiles: restrict broad authenticated read; expose only safe fields via view
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT user_id, nombre, apellidos, avatar_url, usuario, activo
FROM public.profiles
WHERE activo = true;

-- Allow authenticated to read the safe projection. We add a SELECT policy on profiles
-- restricted to the same safe columns through a column GRANT pattern:
GRANT SELECT ON public.public_profiles TO authenticated;

-- Re-add a row-visibility policy so the view (security_invoker) can return active rows
CREATE POLICY "Authenticated can view active profile rows (safe view only)"
ON public.profiles FOR SELECT
TO authenticated
USING (activo = true);

-- Revoke direct column SELECT for sensitive fields from authenticated, then re-grant safe ones.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, user_id, nombre, apellidos, avatar_url, usuario, activo,
  primera_vez, last_seen_at, created_at, updated_at
) ON public.profiles TO authenticated;
-- Sensitive cols (cedula, fecha_nacimiento, ip_address, device_type, colegio, telefono, etc.)
-- remain readable only via service_role / admin paths using elevated client.
GRANT ALL ON public.profiles TO service_role;

-- 2) competencia_participantes: require user_id = auth.uid() on insert
DROP POLICY IF EXISTS "Anyone can join" ON public.competencia_participantes;
CREATE POLICY "Users can join as themselves"
ON public.competencia_participantes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3) Storage: missing UPDATE policies
CREATE POLICY "Users can update own message attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can update quiz images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quiz-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'quiz-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Realtime channel RLS: enable and scope to authenticated callers
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime"
ON realtime.messages FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;
CREATE POLICY "Authenticated can write realtime"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 5) Lock down SECURITY DEFINER functions exposed via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated keeps EXECUTE on has_role because RLS policies invoke it as the calling role.
