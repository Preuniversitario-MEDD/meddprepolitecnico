
-- Conversations table (threads between users)
CREATE TABLE public.conversaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Participants in each conversation
CREATE TABLE public.conversacion_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversacion_id, user_id)
);

-- Messages
CREATE TABLE public.mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  contenido text NOT NULL,
  leido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- Conversaciones: users see their own, admins see all
CREATE POLICY "Users can view own conversations" ON public.conversaciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversacion_participantes WHERE conversacion_id = id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Authenticated can create conversations" ON public.conversaciones
  FOR INSERT TO authenticated WITH CHECK (true);

-- Participantes: users see their own convos, admins see all
CREATE POLICY "Users can view own participants" ON public.conversacion_participantes
  FOR SELECT USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.conversacion_participantes cp WHERE cp.conversacion_id = conversacion_id AND cp.user_id = auth.uid())
  );

CREATE POLICY "Authenticated can add participants" ON public.conversacion_participantes
  FOR INSERT TO authenticated WITH CHECK (true);

-- Mensajes: participants can view, admins can view ALL
CREATE POLICY "Participants can view messages" ON public.mensajes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversacion_participantes WHERE conversacion_id = mensajes.conversacion_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Participants can send messages" ON public.mensajes
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.conversacion_participantes WHERE conversacion_id = mensajes.conversacion_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own messages" ON public.mensajes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.conversacion_participantes WHERE conversacion_id = mensajes.conversacion_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
