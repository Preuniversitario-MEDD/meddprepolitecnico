import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet';
  else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) deviceType = 'phone';
  return { deviceType, userAgent: ua };
}

export function useConnectionLogger() {
  const { user } = useAuth();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!user || loggedRef.current) return;
    loggedRef.current = true;

    const { deviceType, userAgent } = getDeviceInfo();

    // Log login
    const logLogin = async () => {
      let ip = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip || '';
      } catch { /* ignore */ }

      await supabase.from('connection_logs' as any).insert({
        user_id: user.id,
        event_type: 'login',
        device_type: deviceType,
        ip_address: ip,
        user_agent: userAgent,
      });
    };
    logLogin();

    // Log logout on unload
    const handleUnload = () => {
      const body = JSON.stringify({
        user_id: user.id,
        event_type: 'logout',
        device_type: deviceType,
        ip_address: '',
        user_agent: userAgent,
      });
      // Use sendBeacon for reliable logout tracking
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/connection_logs`;
      navigator.sendBeacon(url + `?apikey=${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, 
        new Blob([body], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);
}
