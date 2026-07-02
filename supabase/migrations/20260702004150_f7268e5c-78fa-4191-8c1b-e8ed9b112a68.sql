
-- Trigger function: fill curso_id from sesion_id on insert/update
CREATE OR REPLACE FUNCTION public.set_curso_id_from_sesion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.curso_id IS NULL AND NEW.sesion_id IS NOT NULL THEN
    SELECT curso_id INTO NEW.curso_id FROM public.sesiones WHERE id = NEW.sesion_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_progreso_curso ON public.progreso_estudiante;
CREATE TRIGGER trg_progreso_curso
  BEFORE INSERT OR UPDATE ON public.progreso_estudiante
  FOR EACH ROW EXECUTE FUNCTION public.set_curso_id_from_sesion();

DROP TRIGGER IF EXISTS trg_sesest_curso ON public.sesion_estudiante;
CREATE TRIGGER trg_sesest_curso
  BEFORE INSERT OR UPDATE ON public.sesion_estudiante
  FOR EACH ROW EXECUTE FUNCTION public.set_curso_id_from_sesion();

-- exam_bloqueos: derive from exam_configuracion by exam_tipo
CREATE OR REPLACE FUNCTION public.set_curso_id_from_exam_tipo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.curso_id IS NULL AND NEW.exam_tipo IS NOT NULL THEN
    SELECT curso_id INTO NEW.curso_id FROM public.exam_configuracion WHERE tipo = NEW.exam_tipo LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exambloq_curso ON public.exam_bloqueos;
CREATE TRIGGER trg_exambloq_curso
  BEFORE INSERT OR UPDATE ON public.exam_bloqueos
  FOR EACH ROW EXECUTE FUNCTION public.set_curso_id_from_exam_tipo();

-- examen_historial: also derive from sesion_id when present
DROP TRIGGER IF EXISTS trg_examhist_curso ON public.examen_historial;
CREATE TRIGGER trg_examhist_curso
  BEFORE INSERT OR UPDATE ON public.examen_historial
  FOR EACH ROW EXECUTE FUNCTION public.set_curso_id_from_sesion();
