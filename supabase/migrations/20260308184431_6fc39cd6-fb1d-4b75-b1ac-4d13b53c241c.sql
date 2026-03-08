
CREATE TABLE public.sesion_estudiante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sesion_id uuid NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  desbloqueada boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sesion_id)
);

ALTER TABLE public.sesion_estudiante ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sesion_estudiante"
ON public.sesion_estudiante FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own session assignments"
ON public.sesion_estudiante FOR SELECT
USING (auth.uid() = user_id);
