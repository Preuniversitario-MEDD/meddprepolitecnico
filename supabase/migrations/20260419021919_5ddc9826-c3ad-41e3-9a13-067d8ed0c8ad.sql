CREATE TABLE public.concentracion_sesiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ejercicio TEXT NOT NULL,
  duracion_segundos INTEGER DEFAULT 0,
  precision_porcentaje INTEGER DEFAULT 0,
  completado BOOLEAN DEFAULT false,
  fecha TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.concentracion_sesiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus sesiones"
  ON public.concentracion_sesiones
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin ve todas las sesiones"
  ON public.concentracion_sesiones
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_concentracion_user_fecha ON public.concentracion_sesiones(user_id, fecha DESC);