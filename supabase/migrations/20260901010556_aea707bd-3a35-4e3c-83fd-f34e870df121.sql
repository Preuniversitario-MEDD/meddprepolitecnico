CREATE TABLE public.productividad_tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  notas text,
  materia text,
  prioridad text NOT NULL DEFAULT 'media',
  estado text NOT NULL DEFAULT 'pendiente',
  fecha_limite timestamptz,
  duracion_estimada integer NOT NULL DEFAULT 25,
  duracion_real integer NOT NULL DEFAULT 0,
  curso_id uuid REFERENCES public.cursos(id) ON DELETE SET NULL,
  sesion_id uuid REFERENCES public.sesiones(id) ON DELETE SET NULL,
  orden integer NOT NULL DEFAULT 0,
  completada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.productividad_tareas TO authenticated;
GRANT ALL ON public.productividad_tareas TO service_role;
ALTER TABLE public.productividad_tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus tareas"
ON public.productividad_tareas FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins ven todas las tareas"
ON public.productividad_tareas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER productividad_tareas_updated
BEFORE UPDATE ON public.productividad_tareas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_prod_tareas_user ON public.productividad_tareas(user_id, estado, fecha_limite);

CREATE TABLE public.productividad_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarea_id uuid REFERENCES public.productividad_tareas(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'enfoque',
  minutos_planificados integer NOT NULL DEFAULT 25,
  minutos_completados integer NOT NULL DEFAULT 0,
  completada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.productividad_focus TO authenticated;
GRANT ALL ON public.productividad_focus TO service_role;
ALTER TABLE public.productividad_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus sesiones de enfoque"
ON public.productividad_focus FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins ven sesiones de enfoque"
ON public.productividad_focus FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_prod_focus_user ON public.productividad_focus(user_id, created_at DESC);