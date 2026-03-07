import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'phone';
  return 'desktop';
}

export function usePresenceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      const deviceType = getDeviceType();

      // Get IP from public API
      let ip = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip || '';
      } catch { /* ignore */ }

      await supabase
        .from('profiles')
        .update({
          last_seen_at: new Date().toISOString(),
          device_type: deviceType,
          ip_address: ip,
        })
        .eq('user_id', user.id);
    };

    updatePresence();

    // Update every 60 seconds
    const interval = setInterval(updatePresence, 60000);

    // Update on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') updatePresence();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);
}
