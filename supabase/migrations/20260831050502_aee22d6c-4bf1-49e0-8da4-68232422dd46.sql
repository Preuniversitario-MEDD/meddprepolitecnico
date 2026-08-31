CREATE TABLE public.estudio_mazos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  curso_id uuid REFERENCES public.cursos(id) ON DELETE CASCADE,
  sesion_id uuid REFERENCES public.sesiones(id) ON DELETE SET NULL,
  publico boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT 'mint',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudio_mazos TO authenticated;
GRANT ALL ON public.estudio_mazos TO service_role;
ALTER TABLE public.estudio_mazos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mazos_select" ON public.estudio_mazos FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR publico = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mazos_insert" ON public.estudio_mazos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "mazos_update" ON public.estudio_mazos FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mazos_delete" ON public.estudio_mazos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.estudio_tarjetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mazo_id uuid NOT NULL REFERENCES public.estudio_mazos(id) ON DELETE CASCADE,
  frente text NOT NULL,
  reverso text NOT NULL,
  pista text,
  imagen_url text,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudio_tarjetas TO authenticated;
GRANT ALL ON public.estudio_tarjetas TO service_role;
ALTER TABLE public.estudio_tarjetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tarjetas_select" ON public.estudio_tarjetas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estudio_mazos m WHERE m.id = mazo_id
    AND (m.created_by = auth.uid() OR m.publico = true OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "tarjetas_write" ON public.estudio_tarjetas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estudio_mazos m WHERE m.id = mazo_id
    AND (m.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.estudio_mazos m WHERE m.id = mazo_id
    AND (m.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX idx_estudio_tarjetas_mazo ON public.estudio_tarjetas(mazo_id, orden);

CREATE TABLE public.estudio_progreso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tarjeta_id uuid NOT NULL REFERENCES public.estudio_tarjetas(id) ON DELETE CASCADE,
  mazo_id uuid NOT NULL REFERENCES public.estudio_mazos(id) ON DELETE CASCADE,
  facilidad numeric NOT NULL DEFAULT 2.5,
  intervalo_dias numeric NOT NULL DEFAULT 0,
  repeticiones integer NOT NULL DEFAULT 0,
  aciertos integer NOT NULL DEFAULT 0,
  fallos integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'nueva',
  proxima_revision timestamptz NOT NULL DEFAULT now(),
  ultima_revision timestamptz,
  UNIQUE (user_id, tarjeta_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudio_progreso TO authenticated;
GRANT ALL ON public.estudio_progreso TO service_role;
ALTER TABLE public.estudio_progreso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progreso_own" ON public.estudio_progreso FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_estudio_progreso_user ON public.estudio_progreso(user_id, proxima_revision);

CREATE TABLE public.estudio_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mazo_id uuid REFERENCES public.estudio_mazos(id) ON DELETE CASCADE,
  modo text NOT NULL,
  tarjetas_vistas integer NOT NULL DEFAULT 0,
  aciertos integer NOT NULL DEFAULT 0,
  duracion_segundos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudio_sesiones TO authenticated;
GRANT ALL ON public.estudio_sesiones TO service_role;
ALTER TABLE public.estudio_sesiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estudio_sesiones_own" ON public.estudio_sesiones FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER estudio_mazos_updated BEFORE UPDATE ON public.estudio_mazos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();