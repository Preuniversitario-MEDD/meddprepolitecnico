CREATE TABLE public.psychometric_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_key text NOT NULL,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_psy_attempts_user_test ON public.psychometric_attempts(user_id, test_key, created_at DESC);

ALTER TABLE public.psychometric_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attempts" ON public.psychometric_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all attempts" ON public.psychometric_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.psychometric_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.psychometric_attempts;