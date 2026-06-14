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
 * cada 30s clasificando el tiempo en activo / inactivo / segundo plano.
 *
 * Clasificación usando Page Lifecycle API:
 *  - background: document.hidden, window sin foco, o estado 'hidden'/'frozen'
 *  - active: visible y con interacción reciente (<60s)
 *  - idle: visible sin interacción reciente
 */
export function useSessionDuration() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());
  const totalsRef = useRef({ active: 0, idle: 0, background: 0 });
  const hasFocusRef = useRef<boolean>(typeof document !== 'undefined' ? document.hasFocus() : true);
  const frozenRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let intervalId: number | null = null;

    const markInteraction = () => { lastInteractionRef.current = Date.now(); };
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    events.forEach((e) => document.addEventListener(e, markInteraction, { passive: true }));

    const isBackground = () =>
      document.hidden ||
      document.visibilityState === 'hidden' ||
      frozenRef.current ||
      !hasFocusRef.current;

    // Acumular el delta actual antes de cambios de estado o flush
    const accumulate = () => {
      const now = Date.now();
      const deltaSec = Math.max(0, Math.round((now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
      if (deltaSec === 0) return;
      if (isBackground()) {
        totalsRef.current.background += deltaSec;
      } else if (now - lastInteractionRef.current <= IDLE_THRESHOLD_MS) {
        totalsRef.current.active += deltaSec;
      } else {
        totalsRef.current.idle += deltaSec;
      }
    };

    const onVisibility = () => {
      accumulate();
      if (document.visibilityState === 'visible') {
        // al volver, evitar contar el tiempo oculto como interacción
        lastInteractionRef.current = Date.now() - IDLE_THRESHOLD_MS - 1;
      }
    };
    const onFocus = () => { accumulate(); hasFocusRef.current = true; };
    const onBlur = () => { accumulate(); hasFocusRef.current = false; };
    const onFreeze = () => { accumulate(); frozenRef.current = true; };
    const onResume = () => { accumulate(); frozenRef.current = false; lastTickRef.current = Date.now(); };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    // Page Lifecycle API (Chromium): freeze/resume
    document.addEventListener('freeze', onFreeze as EventListener);
    document.addEventListener('resume', onResume as EventListener);

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
      accumulate();
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
      accumulate();
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
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('freeze', onFreeze as EventListener);
      document.removeEventListener('resume', onResume as EventListener);
      window.removeEventListener('beforeunload', finalize);
      window.removeEventListener('pagehide', finalize);
      finalize();
    };
  }, [user]);
}
