CREATE TABLE public.estudiante_rachas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  racha_actual integer NOT NULL DEFAULT 0,
  racha_maxima integer NOT NULL DEFAULT 0,
  ultimo_dia_estudio date,
  puntos_semana_actual integer NOT NULL DEFAULT 0,
  semana_inicio date,
  puntos_totales integer NOT NULL DEFAULT 0,
  puntos_hoy integer NOT NULL DEFAULT 0,
  dia_puntos date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.estudiante_rachas TO authenticated;
GRANT ALL ON public.estudiante_rachas TO service_role;
ALTER TABLE public.estudiante_rachas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own racha read" ON public.estudiante_rachas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin racha read" ON public.estudiante_rachas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.xp_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  curso_id uuid REFERENCES public.cursos(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  puntos integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xp_eventos_user_idx ON public.xp_eventos(user_id, created_at DESC);
GRANT SELECT ON public.xp_eventos TO authenticated;
GRANT ALL ON public.xp_eventos TO service_role;
ALTER TABLE public.xp_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own xp read" ON public.xp_eventos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin xp read" ON public.xp_eventos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.registrar_xp(_tipo text, _curso uuid DEFAULT NULL, _cantidad integer DEFAULT 1, _extra boolean DEFAULT false)
RETURNS public.estudiante_rachas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _hoy date := (now() AT TIME ZONE 'America/Guayaquil')::date;
  _lunes date := date_trunc('week', (now() AT TIME ZONE 'America/Guayaquil'))::date;
  _pts integer;
  r public.estudiante_rachas;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  _pts := CASE _tipo
    WHEN 'flashcard' THEN 5 * LEAST(GREATEST(COALESCE(_cantidad,1),0),40)
    WHEN 'pomodoro' THEN 30
    WHEN 'teoria' THEN 20
    WHEN 'quiz' THEN 40 + CASE WHEN _extra THEN 20 ELSE 0 END
    WHEN 'examen' THEN 100
    ELSE NULL END;
  IF _pts IS NULL THEN RAISE EXCEPTION 'Tipo inválido'; END IF;

  -- teoría: una vez por día
  IF _tipo = 'teoria' AND EXISTS (SELECT 1 FROM xp_eventos WHERE user_id=_uid AND tipo='teoria'
       AND (created_at AT TIME ZONE 'America/Guayaquil')::date = _hoy AND curso_id IS NOT DISTINCT FROM _curso
       AND (SELECT count(*) FROM xp_eventos e2 WHERE e2.user_id=_uid AND e2.tipo='teoria' AND (e2.created_at AT TIME ZONE 'America/Guayaquil')::date=_hoy) >= 5) THEN
    _pts := 0;
  END IF;

  INSERT INTO estudiante_rachas(user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO r FROM estudiante_rachas WHERE user_id=_uid FOR UPDATE;

  IF r.ultimo_dia_estudio IS NULL OR r.ultimo_dia_estudio < _hoy - 1 THEN r.racha_actual := 1;
  ELSIF r.ultimo_dia_estudio = _hoy - 1 THEN r.racha_actual := r.racha_actual + 1;
  END IF;
  r.racha_maxima := GREATEST(r.racha_maxima, r.racha_actual);
  r.ultimo_dia_estudio := _hoy;
  IF r.semana_inicio IS DISTINCT FROM _lunes THEN r.semana_inicio := _lunes; r.puntos_semana_actual := 0; END IF;
  IF r.dia_puntos IS DISTINCT FROM _hoy THEN r.dia_puntos := _hoy; r.puntos_hoy := 0; END IF;
  r.puntos_semana_actual := r.puntos_semana_actual + _pts;
  r.puntos_hoy := r.puntos_hoy + _pts;
  r.puntos_totales := r.puntos_totales + _pts;

  UPDATE estudiante_rachas SET racha_actual=r.racha_actual, racha_maxima=r.racha_maxima,
    ultimo_dia_estudio=r.ultimo_dia_estudio, semana_inicio=r.semana_inicio, puntos_semana_actual=r.puntos_semana_actual,
    dia_puntos=r.dia_puntos, puntos_hoy=r.puntos_hoy, puntos_totales=r.puntos_totales, updated_at=now()
  WHERE user_id=_uid RETURNING * INTO r;

  INSERT INTO xp_eventos(user_id, curso_id, tipo, puntos) VALUES (_uid, _curso, _tipo, _pts);
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.registrar_xp(text, uuid, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_xp(text, uuid, integer, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.liga_semanal(_curso uuid DEFAULT NULL)
RETURNS TABLE(posicion bigint, user_id uuid, nombre text, avatar_url text, puntos integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH lunes AS (SELECT date_trunc('week', (now() AT TIME ZONE 'America/Guayaquil'))::date d),
  base AS (
    SELECT r.user_id, CASE WHEN r.semana_inicio = (SELECT d FROM lunes) THEN r.puntos_semana_actual ELSE 0 END pts
    FROM estudiante_rachas r
    WHERE auth.uid() IS NOT NULL AND (_curso IS NULL OR EXISTS (SELECT 1 FROM curso_estudiantes ce WHERE ce.curso_id=_curso AND ce.user_id=r.user_id))
  ),
  ranked AS (
    SELECT row_number() OVER (ORDER BY b.pts DESC, b.user_id) pos, b.user_id, trim(coalesce(p.nombre,'')||' '||coalesce(p.apellidos,'')) nom, p.avatar_url av, b.pts
    FROM base b LEFT JOIN profiles p ON p.user_id=b.user_id WHERE b.pts > 0
  )
  SELECT pos, user_id, nom, av, pts FROM ranked WHERE pos <= 10 OR user_id = auth.uid() ORDER BY pos;
$$;
REVOKE EXECUTE ON FUNCTION public.liga_semanal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liga_semanal(uuid) TO authenticated;