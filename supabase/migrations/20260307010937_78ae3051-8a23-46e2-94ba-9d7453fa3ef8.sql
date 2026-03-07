
-- Fix RLS infinite recursion on conversacion_participantes
DROP POLICY IF EXISTS "Users can view own participants" ON public.conversacion_participantes;
CREATE POLICY "Users can view own participants"
  ON public.conversacion_participantes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix RLS on conversaciones  
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversaciones;
CREATE POLICY "Users can view own conversations"
  ON public.conversaciones FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.conversacion_participantes cp
      WHERE cp.conversacion_id = conversaciones.id AND cp.user_id = auth.uid()
    )
  );

-- Add presence tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS device_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ip_address text DEFAULT '';
