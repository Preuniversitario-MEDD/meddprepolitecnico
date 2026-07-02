import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type CourseLite = { id: string; titulo: string; descripcion: string | null };

interface ActiveCourseCtx {
  cursos: CourseLite[];
  activeCursoId: string | null;
  setActiveCursoId: (id: string | null) => void;
  loading: boolean;
  needsSelection: boolean; // student has >1 courses and hasn't picked
  refresh: () => Promise<void>;
}

const Ctx = createContext<ActiveCourseCtx | null>(null);
const KEY = 'medd_active_curso_id';

export function ActiveCourseProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [cursos, setCursos] = useState<CourseLite[]>([]);
  const [activeCursoId, setActiveId] = useState<string | null>(() => localStorage.getItem(KEY));
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setCursos([]); return; }
    setLoading(true);
    if (role === 'admin') {
      // Admin sees every course; auto-picks first if none set
      const { data } = await supabase.from('cursos').select('id, titulo, descripcion').order('created_at');
      const list = (data || []) as CourseLite[];
      setCursos(list);
      if (!activeCursoId && list.length > 0) {
        setActiveId(list[0].id);
        localStorage.setItem(KEY, list[0].id);
      }
    } else {
      const { data: enroll } = await supabase
        .from('curso_estudiantes').select('curso_id').eq('user_id', user.id);
      const ids = (enroll || []).map(e => e.curso_id);
      if (ids.length === 0) { setCursos([]); setLoading(false); return; }
      const { data: cs } = await supabase.from('cursos').select('id, titulo, descripcion').in('id', ids).order('created_at');
      const list = (cs || []) as CourseLite[];
      setCursos(list);
      // auto-pick if only one
      if (list.length === 1) {
        setActiveId(list[0].id);
        localStorage.setItem(KEY, list[0].id);
      } else if (activeCursoId && !list.find(c => c.id === activeCursoId)) {
        // active id no longer valid
        setActiveId(null);
        localStorage.removeItem(KEY);
      }
    }
    setLoading(false);
  }, [user, role, activeCursoId]);

  useEffect(() => {
    if (!user) { setCursos([]); setActiveId(null); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  const setActiveCursoId = (id: string | null) => {
    setActiveId(id);
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  };

  const needsSelection = role === 'estudiante' && cursos.length > 1 && !activeCursoId;

  return (
    <Ctx.Provider value={{ cursos, activeCursoId, setActiveCursoId, loading, needsSelection, refresh: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveCourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActiveCourse must be used within ActiveCourseProvider');
  return ctx;
}
