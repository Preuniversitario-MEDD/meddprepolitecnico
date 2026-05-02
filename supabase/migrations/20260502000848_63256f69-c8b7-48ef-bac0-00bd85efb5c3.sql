CREATE TABLE public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ruta TEXT NOT NULL,
  accion TEXT NOT NULL DEFAULT 'acceso',
  ip_address TEXT,
  user_agent TEXT,
  exitoso BOOLEAN NOT NULL DEFAULT true,
  detalle TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin ve logs"
  ON public.access_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema puede insertar logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_access_logs_user_fecha ON public.access_logs(user_id, fecha DESC);
CREATE INDEX idx_access_logs_fecha ON public.access_logs(fecha DESC);