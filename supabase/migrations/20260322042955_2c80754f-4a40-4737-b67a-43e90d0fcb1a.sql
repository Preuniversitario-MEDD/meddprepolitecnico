
CREATE TABLE public.examen_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_tipo text NOT NULL,
  pregunta_id uuid NOT NULL,
  correcta boolean NOT NULL DEFAULT false,
  intento integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exam history" ON public.examen_historial
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exam history" ON public.examen_historial
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
