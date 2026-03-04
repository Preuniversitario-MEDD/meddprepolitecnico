
-- 1. Add granular progress columns
ALTER TABLE progreso_estudiante 
  ADD COLUMN IF NOT EXISTS ejercicios_completados integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ejercicios_correctos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intentos_quiz integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errores_quiz integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiempo_invertido integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preguntas_correctas_total integer DEFAULT 0;

-- 2. Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'progreso_estudiante_user_sesion_unique'
  ) THEN
    ALTER TABLE progreso_estudiante ADD CONSTRAINT progreso_estudiante_user_sesion_unique UNIQUE (user_id, sesion_id);
  END IF;
END $$;

-- 3. Add solucion column to contenido
ALTER TABLE contenido ADD COLUMN IF NOT EXISTS solucion text DEFAULT '';

-- 4. Create examenes table
CREATE TABLE IF NOT EXISTS examenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  puntaje numeric DEFAULT 0,
  aprobado boolean DEFAULT false,
  fecha timestamptz DEFAULT now(),
  respuestas jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE examenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exams" ON examenes FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all exams" ON examenes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Create biblioteca table
CREATE TABLE IF NOT EXISTS biblioteca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text DEFAULT '',
  url text NOT NULL,
  categoria text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view biblioteca" ON biblioteca FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage biblioteca" ON biblioteca FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Create quiz-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-images', 'quiz-images', true) ON CONFLICT (id) DO NOTHING;

-- 7. Storage policies for quiz-images
CREATE POLICY "Anyone can view quiz images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'quiz-images');
CREATE POLICY "Admins can upload quiz images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quiz-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete quiz images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'quiz-images' AND has_role(auth.uid(), 'admin'::app_role));
