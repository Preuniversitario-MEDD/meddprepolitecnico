import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Target, Trophy, AlertTriangle } from 'lucide-react';
import { META_DIARIA, XP_EVENT, hoyEc } from '@/lib/xp';

type Racha = { racha_actual: number; racha_maxima: number; ultimo_dia_estudio: string | null; puntos_hoy: number; dia_puntos: string | null; puntos_semana_actual: number; puntos_totales: number };
type Fila = { posicion: number; user_id: string; nombre: string; avatar_url: string | null; puntos: number };

function useRacha() {
  const { user } = useAuth();
  const [r, setR] = useState<Racha | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('estudiante_rachas').select('*').eq('user_id', user.id).maybeSingle();
    setR(data);
  }, [user?.id]);
  useEffect(() => {
    load();
    const h = (e: any) => e.detail ? setR(e.detail) : load();
    window.addEventListener(XP_EVENT, h);
    return () => window.removeEventListener(XP_EVENT, h);
  }, [load]);
  return r;
}

export function Gamificacion() {
  const r = useRacha();
  const hoy = hoyEc();
  const ayer = new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const activaHoy = r?.ultimo_dia_estudio === hoy;
  const racha = r && (activaHoy || r.ultimo_dia_estudio === ayer) ? r.racha_actual : 0;
  const xpHoy = r?.dia_puntos === hoy ? r.puntos_hoy : 0;
  const pct = Math.min(100, Math.round((xpHoy / META_DIARIA) * 100));
  const hora = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Guayaquil' }));
  const alerta = !activaHoy && racha > 0 && hora >= 18;

  useEffect(() => {
    if (pct >= 100) {
      const k = `medd_meta_${hoy}`;
      if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } }); }
    }
  }, [pct, hoy]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4 flex items-center gap-4 border-[hsl(var(--neon-orange))]/40">
        <motion.div
          animate={activaHoy ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] } : {}}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className={activaHoy ? 'text-[hsl(var(--neon-orange))]' : 'text-muted-foreground'}
        >
          <Flame className="w-10 h-10" fill={activaHoy ? 'currentColor' : 'none'} />
        </motion.div>
        <div>
          <p className="text-2xl font-bold">{racha} {racha === 1 ? 'día' : 'días'}</p>
          <p className="text-xs text-muted-foreground">Racha · récord {r?.racha_maxima ?? 0}</p>
        </div>
      </Card>

      <Card className="p-4 space-y-2 md:col-span-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 font-semibold"><Target className="w-4 h-4 text-[hsl(var(--neon-blue))]" /> Meta de hoy</span>
          <span className="text-muted-foreground">{xpHoy}/{META_DIARIA} XP · {pct}%</span>
        </div>
        <Progress value={pct} className="h-3" />
        {pct >= 100
          ? <p className="text-xs text-[hsl(var(--neon-mint))] font-semibold">¡Meta de hoy cumplida! 🎉</p>
          : <p className="text-xs text-muted-foreground">Tarjetas +5 · Pomodoro +30 · Teoría +20 · Quiz +40 · Examen +100</p>}
      </Card>

      {alerta && (
        <Card className="p-3 md:col-span-3 flex items-center gap-2 border-[hsl(var(--neon-orange))] bg-[hsl(var(--neon-orange))]/10 text-sm">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--neon-orange))]" />
          ¡Estudia hoy para no perder tu racha de {racha} días!
        </Card>
      )}

      <div className="md:col-span-3"><LigaSemanal /></div>
    </div>
  );
}

export function LigaSemanal() {
  const { user } = useAuth();
  const { activeCursoId } = useActiveCourse();
  const [filas, setFilas] = useState<Fila[]>([]);
  const load = useCallback(async () => {
    const { data } = await (supabase as any).rpc('liga_semanal', { _curso: activeCursoId || null });
    setFilas(data || []);
  }, [activeCursoId]);
  useEffect(() => {
    load();
    window.addEventListener(XP_EVENT, load);
    return () => window.removeEventListener(XP_EVENT, load);
  }, [load]);

  const top = filas.filter(f => f.posicion <= 10);
  const yo = filas.find(f => f.user_id === user?.id);
  const medallas = ['🥇', '🥈', '🥉'];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><Trophy className="w-4 h-4 text-[hsl(var(--neon-orange))]" /> Liga semanal</h3>
        <span className="text-xs text-muted-foreground">Se reinicia el domingo a medianoche</span>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aún nadie suma puntos esta semana. ¡Sé el primero!</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((f, i) => (
            <motion.div key={f.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${f.user_id === user?.id ? 'bg-primary/15 border border-primary/40' : 'bg-muted/40'}`}>
              <span className="w-6 text-center font-bold">{medallas[f.posicion - 1] ?? f.posicion}</span>
              {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-muted" />}
              <span className="flex-1 truncate">{f.nombre || 'Estudiante'}</span>
              <span className="font-semibold text-[hsl(var(--neon-mint))]">{f.puntos} XP</span>
            </motion.div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-[hsl(var(--neon-blue))]/40 p-3 text-sm flex justify-between">
        <span>Tu posición</span>
        <span className="font-bold">{yo ? `#${yo.posicion} · ${yo.puntos} XP` : 'Sin puntos esta semana'}</span>
      </div>
    </Card>
  );
}
