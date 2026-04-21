import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRES_MESES_MS = 90 * 24 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const TESTS_TOTALES_KEYS = ['empatia', 'emocional', 'prosocial', 'social', 'aprendizaje'];

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function usePushNotifications() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!notificationsSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }, []);

  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!notificationsSupported() || Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'medd-recordatorio',
      });
    } catch {
      // some browsers (iOS Safari) require a service worker — silently fail
    }
  }, []);

  /**
   * Verifica si hay tests pendientes o vencidos (>90 días) y dispara
   * una notificación nativa + inserta un registro en notificaciones_push.
   * Devuelve el estado para que el caller pueda mostrar el banner in-app.
   */
  const checkAndNotify = useCallback(async (userId: string): Promise<{
    pendientes: string[];
    vencidos: { test_key: string; updated_at: string }[];
    needsAction: boolean;
  }> => {
    const empty = { pendientes: [], vencidos: [], needsAction: false };
    if (!userId) return empty;

    // Respeta preferencias del usuario
    const { data: prof } = await supabase
      .from('profiles')
      .select('notif_preferencias')
      .eq('user_id', userId)
      .maybeSingle();
    const prefs = (prof?.notif_preferencias as any) || { tests: true };
    if (prefs.tests === false) return empty;

    const { data: resultados } = await supabase
      .from('psychometric_results')
      .select('test_key, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    const ultimoPorTipo = new Map<string, string>();
    (resultados || []).forEach(r => {
      const k = r.test_key.toLowerCase();
      const matched = TESTS_TOTALES_KEYS.find(t => k.includes(t));
      if (matched && !ultimoPorTipo.has(matched)) ultimoPorTipo.set(matched, r.updated_at);
    });

    const pendientes = TESTS_TOTALES_KEYS.filter(t => !ultimoPorTipo.has(t));
    const now = Date.now();
    const vencidos: { test_key: string; updated_at: string }[] = [];
    ultimoPorTipo.forEach((fecha, test_key) => {
      if (now - new Date(fecha).getTime() > TRES_MESES_MS) {
        vencidos.push({ test_key, updated_at: fecha });
      }
    });

    const needsAction = pendientes.length > 0 || vencidos.length > 0;

    // Throttle por 24h en localStorage para la notificación nativa
    const lastKey = `medd-last-push-${userId}`;
    const lastNotified = localStorage.getItem(lastKey);
    const canFire = !lastNotified || now - parseInt(lastNotified) >= UN_DIA_MS;

    if (needsAction && canFire && Notification.permission === 'granted') {
      let title = '';
      let body = '';
      let tipo = '';
      if (pendientes.length > 0) {
        title = '🧠 Completa tu perfil psicológico';
        body = `Te falta${pendientes.length > 1 ? 'n' : ''} ${pendientes.length} test${pendientes.length > 1 ? 's' : ''}. Conocerte mejor te ayuda a elegir tu carrera ideal.`;
        tipo = 'tests_pendientes';
      } else {
        title = '🔄 ¡Han pasado 3 meses!';
        body = 'Tu perfil puede haber evolucionado. Repite los tests para ver si tu orientación vocacional cambió.';
        tipo = 'tests_vencidos';
      }
      showNotification(title, body);
      localStorage.setItem(lastKey, now.toString());
      // Persistir para el popover de la campana
      await supabase.from('notificaciones_push').insert({
        user_id: userId,
        tipo,
        mensaje: body,
      });
    }

    return { pendientes, vencidos, needsAction };
  }, [showNotification]);

  return { requestPermission, showNotification, checkAndNotify, supported: notificationsSupported() };
}
