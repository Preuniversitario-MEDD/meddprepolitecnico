
-- Add unique constraint for upsert on competencia_participantes
ALTER TABLE public.competencia_participantes 
ADD CONSTRAINT competencia_participantes_comp_user_unique 
UNIQUE (competencia_id, user_id);
