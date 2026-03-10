
-- Cursos table
CREATE TABLE public.cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cursos" ON public.cursos FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view cursos" ON public.cursos FOR SELECT TO authenticated USING (true);

-- Curso-Sesiones link table
CREATE TABLE public.curso_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  sesion_id uuid NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  orden integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(curso_id, sesion_id)
);

ALTER TABLE public.curso_sesiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage curso_sesiones" ON public.curso_sesiones FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view curso_sesiones" ON public.curso_sesiones FOR SELECT TO authenticated USING (true);

-- Curso-Estudiantes link table
CREATE TABLE public.curso_estudiantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(curso_id, user_id)
);

ALTER TABLE public.curso_estudiantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage curso_estudiantes" ON public.curso_estudiantes FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own curso assignments" ON public.curso_estudiantes FOR SELECT TO authenticated USING (auth.uid() = user_id);
