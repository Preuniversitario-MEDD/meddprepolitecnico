
-- Fix overly permissive INSERT policies
DROP POLICY "Authenticated can create conversations" ON public.conversaciones;
CREATE POLICY "Authenticated can create conversations" ON public.conversaciones
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Authenticated can add participants" ON public.conversacion_participantes;
CREATE POLICY "Authenticated can add participants" ON public.conversacion_participantes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
