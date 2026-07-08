
-- Scope realtime.messages broadcast/presence policies to the caller's own topics.
-- postgres_changes subscriptions rely on the underlying table RLS, not on
-- realtime.messages policies, so this narrower scope does not break existing
-- realtime data subscriptions in the app.
DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;

CREATE POLICY "Users read only their own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND realtime.topic() IS NOT NULL
  AND position(auth.uid()::text in realtime.topic()) > 0
);

CREATE POLICY "Users write only their own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND realtime.topic() IS NOT NULL
  AND position(auth.uid()::text in realtime.topic()) > 0
);

-- Re-affirm mensajes UPDATE is strictly sender-only (defence in depth).
DROP POLICY IF EXISTS "Users can update own messages" ON public.mensajes;
CREATE POLICY "Users can update own messages"
ON public.mensajes
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
