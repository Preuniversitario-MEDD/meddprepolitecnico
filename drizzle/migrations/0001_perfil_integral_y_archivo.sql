CREATE TABLE public.tests_archivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  origen text NOT NULL,
  test_key text,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  fecha_original timestamptz,
  archivado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tests_archivo_user_idx ON public.tests_archivo(user_id);
GRANT SELECT ON public.tests_archivo TO authenticated;
GRANT ALL ON public.tests_archivo TO service_role;
ALTER TABLE public.tests_archivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins ven archivo" ON public.tests_archivo FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.perfil_integral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  respuestas jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimensiones jsonb NOT NULL DEFAULT '{}'::jsonb,
  analisis jsonb,
  precision_estimada integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX perfil_integral_user_idx ON public.perfil_integral(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.perfil_integral TO authenticated;
GRANT ALL ON public.perfil_integral TO service_role;
ALTER TABLE public.perfil_integral ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Propio perfil integral ver" ON public.perfil_integral FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Propio perfil integral crear" ON public.perfil_integral FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);