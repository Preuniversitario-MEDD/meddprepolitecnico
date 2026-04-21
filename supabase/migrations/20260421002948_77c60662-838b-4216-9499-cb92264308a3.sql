CREATE TABLE public.notificaciones_push (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notificaciones_push ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus notificaciones"
  ON public.notificaciones_push FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin ve todas las notificaciones"
  ON public.notificaciones_push FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notif_user_fecha ON public.notificaciones_push(user_id, fecha DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_preferencias JSONB
  NOT NULL DEFAULT '{"tests":true,"schulte":true,"sesiones":true,"mensajes":true}'::jsonb;