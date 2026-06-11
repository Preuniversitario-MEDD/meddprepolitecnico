CREATE POLICY "Admins can delete all psychometric results"
ON public.psychometric_results
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));