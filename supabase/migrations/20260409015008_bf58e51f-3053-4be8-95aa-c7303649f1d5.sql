
CREATE TABLE public.psychometric_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_key TEXT NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, test_key)
);

ALTER TABLE public.psychometric_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results"
ON public.psychometric_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results"
ON public.psychometric_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own results"
ON public.psychometric_results FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all results"
ON public.psychometric_results FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_psychometric_results_updated_at
BEFORE UPDATE ON public.psychometric_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
