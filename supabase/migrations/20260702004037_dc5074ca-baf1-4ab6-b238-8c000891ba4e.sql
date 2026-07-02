
-- 1. Add curso_id to global tables (nullable during backfill, then set NOT NULL where safe)
ALTER TABLE public.sesiones ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE;
ALTER TABLE public.exam_configuracion ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE;
ALTER TABLE public.progreso_estudiante ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE;
ALTER TABLE public.sesion_estudiante ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE;
ALTER TABLE public.examen_historial ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE;
ALTER TABLE public.exam_bloqueos ADD COLUMN IF NOT EXISTS curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE;

-- 2. Create the "Química (Original)" backfill course if we have orphan data and it doesn't exist yet
DO $$
DECLARE
  quimica_id uuid;
BEGIN
  -- Try to find an existing Química-like course
  SELECT id INTO quimica_id FROM public.cursos WHERE lower(titulo) LIKE 'qu%mica%' ORDER BY created_at LIMIT 1;

  -- If none, create it
  IF quimica_id IS NULL THEN
    INSERT INTO public.cursos (titulo, descripcion, modulos)
    VALUES (
      'Química (Original)',
      'Curso base ESPOLMEDD de preparación en Química',
      '{"concentracion":true,"psicometria":true,"mensajes":true,"biblioteca":true,"tutor":true,"orientacion_vocacional":true}'::jsonb
    )
    RETURNING id INTO quimica_id;
  END IF;

  -- Backfill sesiones
  UPDATE public.sesiones SET curso_id = quimica_id WHERE curso_id IS NULL;

  -- Vincular sesiones existentes al curso Química vía curso_sesiones (si no están ya vinculadas)
  INSERT INTO public.curso_sesiones (curso_id, sesion_id, orden)
  SELECT quimica_id, s.id, s.numero
  FROM public.sesiones s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.curso_sesiones cs WHERE cs.sesion_id = s.id AND cs.curso_id = quimica_id
  );

  -- Backfill exam_configuracion
  UPDATE public.exam_configuracion SET curso_id = quimica_id WHERE curso_id IS NULL;

  -- Backfill progreso_estudiante (via sesion_id → curso)
  UPDATE public.progreso_estudiante pe
  SET curso_id = quimica_id
  WHERE pe.curso_id IS NULL;

  -- Backfill sesion_estudiante
  UPDATE public.sesion_estudiante SET curso_id = quimica_id WHERE curso_id IS NULL;

  -- Backfill examen_historial
  UPDATE public.examen_historial SET curso_id = quimica_id WHERE curso_id IS NULL;

  -- Backfill exam_bloqueos
  UPDATE public.exam_bloqueos SET curso_id = quimica_id WHERE curso_id IS NULL;

  -- Assign ALL existing students to Química (Original) so they don't lose access
  INSERT INTO public.curso_estudiantes (curso_id, user_id)
  SELECT quimica_id, ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'estudiante'
    AND NOT EXISTS (
      SELECT 1 FROM public.curso_estudiantes ce
      WHERE ce.curso_id = quimica_id AND ce.user_id = ur.user_id
    );
END $$;

-- 3. Indexes for filter-by-course
CREATE INDEX IF NOT EXISTS idx_sesiones_curso ON public.sesiones(curso_id);
CREATE INDEX IF NOT EXISTS idx_exam_conf_curso ON public.exam_configuracion(curso_id);
CREATE INDEX IF NOT EXISTS idx_progreso_curso ON public.progreso_estudiante(curso_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sesest_curso ON public.sesion_estudiante(curso_id, user_id);
CREATE INDEX IF NOT EXISTS idx_examhist_curso ON public.examen_historial(curso_id, user_id);
CREATE INDEX IF NOT EXISTS idx_exambloq_curso ON public.exam_bloqueos(curso_id, user_id);
