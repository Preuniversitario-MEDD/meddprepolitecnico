
-- Allow admins to insert progress for students (needed for force-unlock)
CREATE POLICY "Admins can insert progress"
ON public.progreso_estudiante
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update progress for students
CREATE POLICY "Admins can update progress"
ON public.progreso_estudiante
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
