
-- Custom tabs per session
CREATE TABLE pestanas_sesion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id uuid NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  clave text NOT NULL,
  orden integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pestanas_sesion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tabs" ON pestanas_sesion FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view tabs" ON pestanas_sesion FOR SELECT TO authenticated USING (true);

-- Add grupo_nombre to contenido for collapsible grouping
ALTER TABLE contenido ADD COLUMN IF NOT EXISTS grupo_nombre text DEFAULT '';

-- Seed default tabs for all existing sessions
INSERT INTO pestanas_sesion (sesion_id, nombre, clave, orden)
SELECT id, 'Teoría', 'teoria', 0 FROM sesiones
UNION ALL
SELECT id, 'Trucos', 'truco', 1 FROM sesiones
UNION ALL
SELECT id, 'Ejercicios', 'ejercicio', 2 FROM sesiones;
