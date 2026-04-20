-- Tabla para almacenar resultados de Orientación Vocacional ESPOL
CREATE TABLE public.orientacion_vocacional (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  top_carreras JSONB NOT NULL DEFAULT '[]'::jsonb,
  carrera_elegida TEXT,
  perfil_normalizado JSONB NOT NULL DEFAULT '{}'::jsonb,
  tests_usados INTEGER NOT NULL DEFAULT 0,
  fecha_calculo TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_revision TIMESTAMPTZ
);

ALTER TABLE public.orientacion_vocacional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan su orientacion"
  ON public.orientacion_vocacional FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin ve todas las orientaciones"
  ON public.orientacion_vocacional FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_orientacion_user ON public.orientacion_vocacional(user_id);