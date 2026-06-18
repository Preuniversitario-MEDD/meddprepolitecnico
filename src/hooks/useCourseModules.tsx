import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

const CACHE_KEY = 'medd_course_modules_v1';

/**
 * Returns the effective module flags for the current student.
 * If the student belongs to multiple courses, modules are OR-merged
 * (a feature is enabled if any of the student's courses enables it).
 * Admins always get ALL_ON.
 */
export function useCourseModules(): { modules: CourseModules; loading: boolean } {
  const { profile, role } = useAuth();
  const [modules, setModules] = useState<CourseModules>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...ALL_ON, ...JSON.parse(cached) };
    } catch {}
    return ALL_ON;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    if (role === 'admin') {
      setModules(ALL_ON);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: enrollments } = await supabase
        .from('curso_estudiantes')
        .select('curso_id')
        .eq('user_id', profile.user_id);
      if (cancelled) return;

      if (!enrollments || enrollments.length === 0) {
        // No course assigned → keep everything enabled (back-compat)
        setModules(ALL_ON);
        setLoading(false);
        return;
      }

      const cursoIds = enrollments.map((e) => e.curso_id);
      const { data: cursos } = await supabase
        .from('cursos')
        .select('modulos')
        .in('id', cursoIds);
      if (cancelled) return;

      const merged: CourseModules = {
        concentracion: false,
        psicometria: false,
        mensajes: false,
        biblioteca: false,
        tutor: false,
        orientacion_vocacional: false,
      };
      (cursos || []).forEach((c: any) => {
        const m = (c.modulos || {}) as Partial<CourseModules>;
        (Object.keys(merged) as Array<keyof CourseModules>).forEach((k) => {
          if (m[k] !== false) merged[k] = merged[k] || !!m[k];
        });
      });

      try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
      setModules(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.user_id, role]);

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
