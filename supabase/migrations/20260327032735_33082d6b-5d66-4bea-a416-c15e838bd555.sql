
CREATE TABLE public.connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'login',
  device_type text DEFAULT '',
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own logs" ON public.connection_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON public.connection_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.connection_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_connection_logs_user_id ON public.connection_logs(user_id);
CREATE INDEX idx_connection_logs_created_at ON public.connection_logs(created_at);
