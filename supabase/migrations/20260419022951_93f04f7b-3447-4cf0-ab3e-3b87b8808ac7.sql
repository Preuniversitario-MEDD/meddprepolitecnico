CREATE TABLE public.schulte_resultados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL CHECK (nivel IN (1,2,3,4)),
  tiempo_segundos NUMERIC(6,1) NOT NULL,
  errores INTEGER NOT NULL DEFAULT 0,
  calificacion TEXT NOT NULL,
  completado BOOLEAN NOT NULL DEFAULT true,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schulte_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus resultados schulte"
  ON public.schulte_resultados FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin ve todos los resultados schulte"
  ON public.schulte_resultados FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_schulte_user_nivel ON public.schulte_resultados(user_id, nivel);
CREATE INDEX idx_schulte_nivel_tiempo ON public.schulte_resultados(nivel, tiempo_segundos);