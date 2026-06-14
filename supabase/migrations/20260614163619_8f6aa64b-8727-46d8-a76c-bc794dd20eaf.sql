
DROP POLICY IF EXISTS "Sistema puede insertar logs" ON public.access_logs;
DROP POLICY IF EXISTS "Authenticated insert own logs" ON public.access_logs;
CREATE POLICY "Authenticated insert own logs"
  ON public.access_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own messages" ON public.mensajes;
CREATE POLICY "Users can update own messages"
  ON public.mensajes FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;

CREATE POLICY "Users can view own message attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own message attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own message attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage own progress" ON public.progreso_estudiante;
CREATE POLICY "Users can manage own progress"
  ON public.progreso_estudiante FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own exam history" ON public.examen_historial;
CREATE POLICY "Users can manage own exam history"
  ON public.examen_historial FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own exams" ON public.examenes;
CREATE POLICY "Users can manage own exams"
  ON public.examenes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
