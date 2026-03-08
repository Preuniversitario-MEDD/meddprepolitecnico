
-- Competition rooms
CREATE TABLE public.competencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  pin text NOT NULL,
  modo text NOT NULL DEFAULT 'controlado', -- 'controlado' or 'libre'
  estado text NOT NULL DEFAULT 'lobby', -- 'lobby', 'en_curso', 'finalizada'
  pregunta_actual integer DEFAULT 0,
  tiempo_por_pregunta integer DEFAULT 20,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Participants
CREATE TABLE public.competencia_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid REFERENCES public.competencias(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  nombre text NOT NULL DEFAULT '',
  avatar_url text,
  puntaje integer DEFAULT 0,
  racha integer DEFAULT 0,
  mejor_racha integer DEFAULT 0,
  powerups jsonb DEFAULT '{"freeze":1,"fifty":1,"x2":1}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(competencia_id, user_id)
);

-- Questions for competition
CREATE TABLE public.competencia_preguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid REFERENCES public.competencias(id) ON DELETE CASCADE NOT NULL,
  orden integer DEFAULT 0,
  pregunta text NOT NULL,
  imagen_url text,
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  respuesta_correcta integer DEFAULT 0,
  tiempo integer DEFAULT 20
);

-- Answers
CREATE TABLE public.competencia_respuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid REFERENCES public.competencias(id) ON DELETE CASCADE NOT NULL,
  pregunta_id uuid REFERENCES public.competencia_preguntas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  respuesta integer NOT NULL,
  correcta boolean DEFAULT false,
  tiempo_ms integer DEFAULT 0,
  puntaje integer DEFAULT 0,
  powerup_usado text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pregunta_id, user_id)
);

-- RLS
ALTER TABLE public.competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_respuestas ENABLE ROW LEVEL SECURITY;

-- Competencias policies
CREATE POLICY "Admins manage competencias" ON public.competencias FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated view competencias" ON public.competencias FOR SELECT USING (auth.uid() IS NOT NULL);

-- Participantes policies
CREATE POLICY "Anyone can join" ON public.competencia_participantes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View participants" ON public.competencia_participantes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Update own participant" ON public.competencia_participantes FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete participants" ON public.competencia_participantes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Preguntas policies
CREATE POLICY "Admin manage comp preguntas" ON public.competencia_preguntas FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "View comp preguntas" ON public.competencia_preguntas FOR SELECT USING (auth.uid() IS NOT NULL);

-- Respuestas policies
CREATE POLICY "Submit answer" ON public.competencia_respuestas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "View answers" ON public.competencia_respuestas FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.competencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competencia_participantes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competencia_respuestas;
