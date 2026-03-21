CREATE POLICY "Admins can delete progress"
ON public.progreso_estudiante
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));