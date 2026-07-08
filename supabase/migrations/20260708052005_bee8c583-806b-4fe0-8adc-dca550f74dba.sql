
-- 1. conversacion_participantes: only self-insert (or admin)
DROP POLICY IF EXISTS "Authenticated can add participants" ON public.conversacion_participantes;
CREATE POLICY "Users can add themselves as participants"
ON public.conversacion_participantes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 2. access_logs: recreate INSERT policy strictly for authenticated + own user_id; revoke anon
DROP POLICY IF EXISTS "Authenticated insert own logs" ON public.access_logs;
CREATE POLICY "Authenticated insert own logs"
ON public.access_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);
REVOKE INSERT ON public.access_logs FROM anon, public;

-- 3. SUPA_security_definer_view: recreate public_profiles with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT user_id, nombre, apellidos, avatar_url, usuario, activo
FROM public.profiles
WHERE activo = true;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 4. Storage: DELETE own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Storage: explicit public SELECT for quiz-images (intentional public bucket)
DROP POLICY IF EXISTS "Public can view quiz images" ON storage.objects;
CREATE POLICY "Public can view quiz images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'quiz-images');

-- 6. Storage: SELECT for message-attachments: uploader OR conversation participant
DROP POLICY IF EXISTS "Users can view own message attachments" ON storage.objects;
CREATE POLICY "Users can view message attachments in their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.mensajes m
      JOIN public.conversacion_participantes cp
        ON cp.conversacion_id = m.conversacion_id
      WHERE cp.user_id = auth.uid()
        AND m.archivo_url LIKE '%' || storage.objects.name
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 7. Realtime: remove sensitive tables from broadcast publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.examenes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.psychometric_results;
ALTER PUBLICATION supabase_realtime DROP TABLE public.psychometric_attempts;

-- 8. Revoke EXECUTE on internal trigger SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_curso_id_from_sesion() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_curso_id_from_exam_tipo() FROM anon, authenticated, public;
