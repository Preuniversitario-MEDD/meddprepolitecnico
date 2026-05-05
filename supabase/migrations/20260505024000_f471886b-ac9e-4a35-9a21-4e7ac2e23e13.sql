-- Cache de análisis Perfil 360 generados por IA
CREATE TABLE public.perfil_360_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('carrera','comparacion')),
  cache_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  perfil_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo, cache_key)
);

CREATE INDEX idx_perfil_360_cache_user ON public.perfil_360_cache(user_id);

ALTER TABLE public.perfil_360_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan su cache 360"
ON public.perfil_360_cache FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins ven todo el cache 360"
ON public.perfil_360_cache FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));