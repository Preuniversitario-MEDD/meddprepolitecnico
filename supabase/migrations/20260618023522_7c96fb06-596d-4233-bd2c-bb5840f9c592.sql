
-- Revert column-level restriction; rely on row-level scoping instead.
GRANT SELECT ON public.profiles TO authenticated;

-- Drop the activo-based broad row policy; keep only owner + admin row access.
DROP POLICY IF EXISTS "Authenticated can view active profile rows (safe view only)" ON public.profiles;

-- public_profiles view already exists and exposes only safe columns. Make sure
-- it works for authenticated callers regardless of base-table RLS.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT user_id, nombre, apellidos, avatar_url, usuario, activo
FROM public.profiles
WHERE activo = true;
GRANT SELECT ON public.public_profiles TO authenticated;
