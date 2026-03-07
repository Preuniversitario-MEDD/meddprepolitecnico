import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }

    const { data: myParts } = await supabase
      .from('conversacion_participantes')
      .select('conversacion_id')
      .eq('user_id', user.id);

    if (!myParts?.length) { setUnreadCount(0); return; }

    const convIds = myParts.map(p => p.conversacion_id);
    const { count } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .in('conversacion_id', convIds)
      .eq('leido', false)
      .neq('sender_id', user.id);

    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnread();

    if (!user) return;
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' },
        () => fetchUnread())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes' },
        () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUnread, user]);

  return unreadCount;
}
