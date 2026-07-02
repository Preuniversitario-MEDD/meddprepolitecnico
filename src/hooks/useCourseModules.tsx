import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCourse } from '@/hooks/useActiveCourse';

export type CourseModules = {
  concentracion: boolean;
  psicometria: boolean;
  mensajes: boolean;
  biblioteca: boolean;
  tutor: boolean;
  orientacion_vocacional: boolean;
};

const ALL_ON: CourseModules = {
  concentracion: true,
  psicometria: true,
  mensajes: true,
  biblioteca: true,
  tutor: true,
  orientacion_vocacional: true,
};

/**
 * Returns the effective module flags for the current active course.
 * Admins always get ALL_ON. Students without an active course also get ALL_ON.
 */
export function useCourseModules(): { modules: CourseModules; loading: boolean } {
  const { role } = useAuth();
  const { activeCursoId } = useActiveCourse();
  const [modules, setModules] = useState<CourseModules>(ALL_ON);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role === 'admin' || !activeCursoId) {
      setModules(ALL_ON);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('cursos').select('modulos').eq('id', activeCursoId).maybeSingle();
      if (cancelled) return;
      const raw = (data as any)?.modulos;
      const merged: CourseModules = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...ALL_ON, ...(raw as Partial<CourseModules>) }
        : ALL_ON;
      setModules(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeCursoId, role]);

  return { modules, loading };
}

export const MODULE_LABELS: Record<keyof CourseModules, string> = {
  concentracion: 'Concentración',
  psicometria: 'Psicometría',
  mensajes: 'Mensajes',
  biblioteca: 'Biblioteca',
  tutor: 'Mr. Victor (Tutor IA)',
  orientacion_vocacional: 'Orientación Vocacional',
};
