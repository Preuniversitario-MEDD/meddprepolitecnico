
CREATE TABLE public.connection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_seconds INTEGER NOT NULL DEFAULT 0,
  idle_seconds INTEGER NOT NULL DEFAULT 0,
  background_seconds INTEGER NOT NULL DEFAULT 0,
  device_type TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conn_sessions_user ON public.connection_sessions(user_id);
CREATE INDEX idx_conn_sessions_started ON public.connection_sessions(started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.connection_sessions TO authenticated;
GRANT ALL ON public.connection_sessions TO service_role;

ALTER TABLE public.connection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own sessions"
  ON public.connection_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions"
  ON public.connection_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own sessions"
  ON public.connection_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sessions"
  ON public.connection_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
