import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const HEARTBEAT_MS = 30_000;        // envío cada 30s
const IDLE_THRESHOLD_MS = 60_000;   // sin interacción >60s = inactivo

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'phone';
  return 'desktop';
}

/**
 * Crea una fila en `connection_sessions` al montar y la mantiene actualizada
 * cada 30s con tiempo activo, inactivo y en segundo plano.
 */
export function useSessionDuration() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());
  const totalsRef = useRef({ active: 0, idle: 0, background: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let intervalId: number | null = null;

    const markInteraction = () => { lastInteractionRef.current = Date.now(); };
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((e) => document.addEventListener(e, markInteraction, { passive: true }));

    const start = async () => {
      let ip = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip || '';
      } catch { /* ignore */ }

      const { data, error } = await supabase
        .from('connection_sessions')
        .insert({
          user_id: user.id,
          device_type: getDeviceType(),
          ip_address: ip,
          user_agent: navigator.userAgent.slice(0, 500),
        })
        .select('id')
        .single();

      if (cancelled || error || !data) return;
      sessionIdRef.current = data.id;
      lastTickRef.current = Date.now();
      lastInteractionRef.current = Date.now();
      intervalId = window.setInterval(tick, HEARTBEAT_MS);
    };

    const tick = async () => {
      const id = sessionIdRef.current;
      if (!id) return;
      const now = Date.now();
      const deltaSec = Math.max(0, Math.round((now - lastTickRef.current) / 1000));
      lastTickRef.current = now;

      if (document.hidden) {
        totalsRef.current.background += deltaSec;
      } else if (now - lastInteractionRef.current <= IDLE_THRESHOLD_MS) {
        totalsRef.current.active += deltaSec;
      } else {
        totalsRef.current.idle += deltaSec;
      }

      await supabase
        .from('connection_sessions')
        .update({
          last_heartbeat_at: new Date().toISOString(),
          active_seconds: totalsRef.current.active,
          idle_seconds: totalsRef.current.idle,
          background_seconds: totalsRef.current.background,
        })
        .eq('id', id);
    };

    const finalize = () => {
      const id = sessionIdRef.current;
      if (!id) return;
      // flush con sendBeacon para que llegue al cerrar pestaña
      const now = Date.now();
      const deltaSec = Math.max(0, Math.round((now - lastTickRef.current) / 1000));
      if (document.hidden) totalsRef.current.background += deltaSec;
      else if (now - lastInteractionRef.current <= IDLE_THRESHOLD_MS) totalsRef.current.active += deltaSec;
      else totalsRef.current.idle += deltaSec;

      const body = JSON.stringify({
        ended_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        active_seconds: totalsRef.current.active,
        idle_seconds: totalsRef.current.idle,
        background_seconds: totalsRef.current.background,
      });
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/connection_sessions?id=eq.${id}`;
      try {
        navigator.sendBeacon(
          url + `&apikey=${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          new Blob([body], { type: 'application/json' }),
        );
      } catch { /* ignore */ }
    };

    window.addEventListener('beforeunload', finalize);
    window.addEventListener('pagehide', finalize);

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      events.forEach((e) => document.removeEventListener(e, markInteraction));
      window.removeEventListener('beforeunload', finalize);
      window.removeEventListener('pagehide', finalize);
      finalize();
    };
  }, [user]);
}
