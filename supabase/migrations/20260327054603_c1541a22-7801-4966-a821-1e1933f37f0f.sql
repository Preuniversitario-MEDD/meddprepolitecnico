-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages" ON public.mensajes FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- Allow admins to delete any message
CREATE POLICY "Admins can delete any message" ON public.mensajes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));