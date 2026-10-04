import { supabase } from '@/integrations/supabase/client';

export type TipoXP = 'flashcard' | 'pomodoro' | 'teoria' | 'quiz' | 'examen';
export const META_DIARIA = 60;
export const XP_EVENT = 'medd:xp';

/** Registra puntos de esfuerzo. Los puntos se calculan en el servidor. */
export async function registrarPuntosEsfuerzo(tipo: TipoXP, opts: { cantidad?: number; extra?: boolean } = {}) {
  try {
    const curso = localStorage.getItem('medd_active_curso_id');
    const { data, error } = await (supabase as any).rpc('registrar_xp', {
      _tipo: tipo, _curso: curso || null, _cantidad: opts.cantidad ?? 1, _extra: !!opts.extra,
    });
    if (error) throw error;
    window.dispatchEvent(new CustomEvent(XP_EVENT, { detail: data }));
    return data;
  } catch (e) {
    console.warn('XP no registrado', e);
    return null;
  }
}

export function hoyEc() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}
