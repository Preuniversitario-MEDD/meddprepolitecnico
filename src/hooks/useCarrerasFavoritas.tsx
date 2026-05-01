import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CarreraFavoritaInput {
  carrera_id: string;
  carrera_nombre: string;
  universidad_sigla: string;
  porcentaje: number;
}

export function useCarrerasFavoritas() {
  const { user } = useAuth();
  const [favoritas, setFavoritas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('carreras_favoritas')
      .select('carrera_id')
      .eq('user_id', user.id);
    setFavoritas((data || []).map(r => r.carrera_id));
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const toggle = useCallback(async (data: CarreraFavoritaInput) => {
    if (!user) return;
    const isFav = favoritas.includes(data.carrera_id);
    if (isFav) {
      const { error } = await supabase
        .from('carreras_favoritas')
        .delete()
        .eq('user_id', user.id)
        .eq('carrera_id', data.carrera_id);
      if (error) { toast.error('No se pudo quitar de favoritos'); return; }
      setFavoritas(prev => prev.filter(id => id !== data.carrera_id));
      toast.success('Quitada de favoritos');
    } else {
      if (favoritas.length >= 5) {
        toast.error('Máximo 5 favoritas', { description: 'Quita alguna antes de añadir otra.' });
        return;
      }
      const { error } = await supabase
        .from('carreras_favoritas')
        .insert({ user_id: user.id, ...data });
      if (error) { toast.error('No se pudo guardar como favorita'); return; }
      setFavoritas(prev => [...prev, data.carrera_id]);
      toast.success('Añadida a favoritas');
    }
  }, [user, favoritas]);

  return { favoritas, toggle, loading, isFavorita: (id: string) => favoritas.includes(id), reload };
}
