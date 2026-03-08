
-- Add attachment columns to mensajes
ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS archivo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archivo_nombre text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archivo_tipo text DEFAULT NULL;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-attachments bucket
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
