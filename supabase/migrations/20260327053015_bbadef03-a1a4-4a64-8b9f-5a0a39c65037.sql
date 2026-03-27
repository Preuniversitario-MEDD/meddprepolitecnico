
-- Table to block/disable exams for specific students
CREATE TABLE public.exam_bloqueos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_tipo text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam_tipo)
);

ALTER TABLE public.exam_bloqueos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam_bloqueos" ON public.exam_bloqueos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own blocks" ON public.exam_bloqueos FOR SELECT TO authenticated USING (auth.uid() = user_id);
