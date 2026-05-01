CREATE TABLE public.carreras_favoritas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  carrera_id TEXT NOT NULL,
  carrera_nombre TEXT NOT NULL,
  universidad_sigla TEXT NOT NULL,
  porcentaje INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, carrera_id)
);

ALTER TABLE public.carreras_favoritas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus favoritas"
ON public.carreras_favoritas
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins ven todas las favoritas"
ON public.carreras_favoritas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_carreras_favoritas_user ON public.carreras_favoritas(user_id);
CREATE INDEX idx_carreras_favoritas_carrera ON public.carreras_favoritas(carrera_id);