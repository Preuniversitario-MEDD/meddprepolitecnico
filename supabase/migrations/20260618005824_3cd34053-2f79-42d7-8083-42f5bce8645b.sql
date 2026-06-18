
CREATE TABLE public.tutor_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'message',
  tokens_in int,
  tokens_out int
);
CREATE INDEX idx_tutor_usage_user_time ON public.tutor_usage(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.tutor_usage TO authenticated;
GRANT ALL ON public.tutor_usage TO service_role;
ALTER TABLE public.tutor_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own usage" ON public.tutor_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own usage" ON public.tutor_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all usage" ON public.tutor_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tutor_video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  video_id text NOT NULL,
  topic text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_video_user ON public.tutor_video_sessions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_video_sessions TO authenticated;
GRANT ALL ON public.tutor_video_sessions TO service_role;
ALTER TABLE public.tutor_video_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own video sessions" ON public.tutor_video_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all video sessions" ON public.tutor_video_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
