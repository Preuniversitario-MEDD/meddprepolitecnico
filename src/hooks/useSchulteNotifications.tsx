import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const KEY = 'schulte_notif_shown';
const NIVEL_LABEL: Record<number, string> = { 1: '3×3', 2: '4×4', 3: '5×5', 4: '7×7' };

export function useSchulteNotifications() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(KEY)) return;
    (async () => {
      try {
        // Mejor del usuario por nivel
        const { data: mine } = await supabase
          .from('schulte_resultados')
          .select('nivel, tiempo_segundos')
          .eq('user_id', user.id)
          .eq('completado', true);
        if (!mine || mine.length === 0) return;
        const myBest = new Map<number, number>();
        mine.forEach((r: any) => {
          const t = Number(r.tiempo_segundos);
          const cur = myBest.get(r.nivel);
          if (cur === undefined || t < cur) myBest.set(r.nivel, t);
        });

        // Buscar quien me superó recientemente (últimas 48h)
        const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const { data: others } = await supabase
          .from('schulte_resultados')
          .select('user_id, nivel, tiempo_segundos, fecha')
          .neq('user_id', user.id)
          .gte('fecha', since)
          .eq('completado', true)
          .order('fecha', { ascending: false });
        if (!others || others.length === 0) return;

        for (const r of others as any[]) {
          const mb = myBest.get(r.nivel);
          if (mb !== undefined && Number(r.tiempo_segundos) < mb) {
            const { data: prof } = await (supabase.from('public_profiles' as any).select('nombre, apellidos').eq('user_id', r.user_id).maybeSingle() as any);
            const nom = prof ? `${prof.nombre} ${(prof.apellidos || '')[0] || ''}.`.trim() : 'Un compañero';
            toast(`${nom} te superó en el nivel ${NIVEL_LABEL[r.nivel]} con ${Number(r.tiempo_segundos).toFixed(1)}s. ¡Acepta el reto!`);
            sessionStorage.setItem(KEY, '1');
            break;
          }
        }
      } catch {/* silent */}
    })();
  }, [user]);
}
