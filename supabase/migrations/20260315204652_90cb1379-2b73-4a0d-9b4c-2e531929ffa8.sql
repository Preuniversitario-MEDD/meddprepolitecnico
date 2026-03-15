
-- Exam configuration table
CREATE TABLE public.exam_configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  sessions integer[] NOT NULL DEFAULT '{}',
  tiempo_minutos integer NOT NULL DEFAULT 50,
  cantidad_preguntas integer NOT NULL DEFAULT 30,
  puntaje_aprobacion integer NOT NULL DEFAULT 80,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam config" ON public.exam_configuracion
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view exam config" ON public.exam_configuracion
  FOR SELECT TO authenticated USING (true);

-- Add difficulty column to quiz_preguntas (1-5 points, default 1)
ALTER TABLE public.quiz_preguntas ADD COLUMN IF NOT EXISTS dificultad integer NOT NULL DEFAULT 1;

-- Seed default exam configurations
INSERT INTO public.exam_configuracion (tipo, label, sessions, tiempo_minutos, cantidad_preguntas) VALUES
  ('exam_1_3', 'Examen Secciones 1-3', '{1,2,3}', 50, 30),
  ('exam_4_6', 'Examen Secciones 4-6', '{4,5,6}', 50, 30),
  ('exam_7_9', 'Examen Secciones 7-9', '{7,8,9}', 50, 30),
  ('exam_10_12', 'Examen Secciones 10-12', '{10,11,12}', 50, 30),
  ('exam_13_14', 'Examen Secciones 13-14', '{13,14}', 50, 30);
