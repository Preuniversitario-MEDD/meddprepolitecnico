import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Grid3x3, Trophy, Crown, Sparkles, Lock, RotateCcw, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Nivel = 1 | 2 | 3 | 4;
const NIVELES: { n: Nivel; size: number; total: number; label: string; color: string; thresholds: [number, number] }[] = [
  { n: 1, size: 3, total: 9, label: 'Básico (3×3)', color: 'from-blue-500 to-cyan-500', thresholds: [15, 25] },
  { n: 2, size: 4, total: 16, label: 'Medio (4×4)', color: 'from-emerald-500 to-green-500', thresholds: [30, 50] },
  { n: 3, size: 5, total: 25, label: 'Avanzado (5×5)', color: 'from-purple-500 to-fuchsia-500', thresholds: [60, 90] },
  { n: 4, size: 7, total: 49, label: 'Experto (7×7)', color: 'from-orange-500 to-rose-500', thresholds: [120, 180] },
];

function seededShuffle<T>(array: T[], seed: number): T[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function calificar(nivel: Nivel, t: number): string {
  const cfg = NIVELES.find(x => x.n === nivel)!;
  if (t <= cfg.thresholds[0]) return 'Excepcional';
  if (t <= cfg.thresholds[1]) return 'Bueno';
  return 'Sigue practicando';
}

type Phase = 'select' | 'instructions' | 'playing' | 'result';

export default function SchulteTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('select');
  const [nivel, setNivel] = useState<Nivel>(1);
  const [unlocked, setUnlocked] = useState<Set<Nivel>>(new Set([1]));
  const [bestTimes, setBestTimes] = useState<Record<number, number>>({});
  const [grid, setGrid] = useState<number[]>([]);
  const [seed, setSeed] = useState<number>(0);
  const [current, setCurrent] = useState(1);
  const [errores, setErrores] = useState(0);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [foundCells, setFoundCells] = useState<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [isGlobalBest, setIsGlobalBest] = useState(false);
  const [rankPos, setRankPos] = useState<{ pos: number; total: number } | null>(null);
  const startRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const cfg = NIVELES.find(x => x.n === nivel)!;

  // Cargar resultados del usuario
  const loadUserData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('schulte_resultados')
      .select('nivel, tiempo_segundos')
      .eq('user_id', user.id)
      .eq('completado', true);
    if (!data) return;
    const u = new Set<Nivel>([1]);
    const best: Record<number, number> = {};
    data.forEach((r: any) => {
      u.add(r.nivel as Nivel);
      const next = (r.nivel + 1) as Nivel;
      if (next <= 4) u.add(next);
      const t = Number(r.tiempo_segundos);
      if (!best[r.nivel] || t < best[r.nivel]) best[r.nivel] = t;
    });
    setUnlocked(u);
    setBestTimes(best);
  };
  useEffect(() => { loadUserData(); }, [user]);

  // Cronómetro
  useEffect(() => {
    if (phase !== 'playing') return;
    startRef.current = performance.now();
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed((performance.now() - startRef.current) / 1000);
    }, 100);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [phase]);

  const startGame = () => {
    const newSeed = Date.now() + Math.floor(Math.random() * 999999);
    setSeed(newSeed);
    const nums = Array.from({ length: cfg.total }, (_, i) => i + 1);
    setGrid(seededShuffle(nums, newSeed));
    setCurrent(1);
    setErrores(0);
    setFoundCells(new Set());
    setWrongCell(null);
    setPhase('playing');
  };

  const handleCellClick = (num: number) => {
    if (foundCells.has(num)) return;
    if (num === current) {
      const newFound = new Set(foundCells);
      newFound.add(num);
      setFoundCells(newFound);
      if (current === cfg.total) finishGame();
      else setCurrent(current + 1);
    } else {
      setErrores(e => e + 1);
      setWrongCell(num);
      setTimeout(() => setWrongCell(null), 300);
    }
  };

  const finishGame = async () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    const t = Math.round(((performance.now() - startRef.current) / 1000) * 10) / 10;
    setFinalTime(t);
    const cal = calificar(nivel, t);
    const prevBest = bestTimes[nivel];
    const isPB = !prevBest || t < prevBest;
    setIsPersonalBest(isPB);

    if (user) {
      await supabase.from('schulte_resultados').insert({
        user_id: user.id, nivel, tiempo_segundos: t, errores, calificacion: cal, completado: true,
      });
      // Verificar récord global y posición
      const { data: all } = await supabase
        .from('schulte_resultados')
        .select('user_id, tiempo_segundos')
        .eq('nivel', nivel)
        .eq('completado', true)
        .order('tiempo_segundos', { ascending: true });
      if (all) {
        const bestPerUser = new Map<string, number>();
        all.forEach((r: any) => {
          const cur = bestPerUser.get(r.user_id);
          if (cur === undefined || r.tiempo_segundos < cur) bestPerUser.set(r.user_id, Number(r.tiempo_segundos));
        });
        const sorted = [...bestPerUser.entries()].sort((a, b) => a[1] - b[1]);
        const myBest = bestPerUser.get(user.id) ?? t;
        const pos = sorted.findIndex(([uid]) => uid === user.id) + 1;
        setRankPos({ pos, total: sorted.length });
        setIsGlobalBest(sorted[0]?.[0] === user.id && sorted[0]?.[1] === myBest);
      }
    }
    setPhase('result');
    loadUserData();
  };

  const reset = () => { setPhase('select'); setIsPersonalBest(false); setIsGlobalBest(false); setRankPos(null); };

  // ============ RENDER ============

  if (phase === 'select') {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/concentracion')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/student/schulte-records')}>
            <Trophy className="w-4 h-4 mr-1" /> Ver récords
          </Button>
        </div>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Grid3x3 className="w-7 h-7 text-primary" /> Tabla de Schulte
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Toca los números en orden. Entrena tu visión periférica.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NIVELES.map((cfg, i) => {
            const lock = !unlocked.has(cfg.n);
            const best = bestTimes[cfg.n];
            return (
              <motion.div key={cfg.n} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`overflow-hidden ${lock ? 'opacity-60' : 'hover:border-primary/50 transition-colors cursor-pointer'}`}
                  onClick={() => !lock && (setNivel(cfg.n), setPhase('instructions'))}>
                  <div className={`h-1.5 bg-gradient-to-r ${cfg.color}`} />
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Nivel {cfg.n}</p>
                        <h3 className="font-bold text-lg">{cfg.label}</h3>
                      </div>
                      {lock ? <Lock className="w-5 h-5 text-muted-foreground" />
                        : best ? <Badge variant="secondary" className="gap-1"><Trophy className="w-3 h-3" />{best.toFixed(1)}s</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lock ? `Completa el nivel ${cfg.n - 1} para desbloquear` : `Encuentra del 1 al ${cfg.total}`}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'instructions') {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6 min-h-[60vh] flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="p-6 space-y-5 text-center">
              <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center`}>
                <Grid3x3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">{cfg.label}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Toca los números en orden del 1 al {cfg.total}. Intenta mirar al centro de la tabla y usar tu visión periférica.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setPhase('select')}>Cancelar</Button>
                <Button onClick={startGame}>Comenzar</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="p-3 md:p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center`}>
              <span className="text-xl font-bold text-white">{current}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Buscar</p>
              <p className="text-sm font-bold">de {cfg.total}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tiempo</p>
            <p className="text-2xl font-mono font-bold tabular-nums">{elapsed.toFixed(1)}s</p>
            <p className="text-xs text-rose-500">{errores} errores</p>
          </div>
        </div>

        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cfg.size}, minmax(0, 1fr))` }}>
          {grid.map((num, idx) => {
            const found = foundCells.has(num);
            const wrong = wrongCell === num;
            const fontSize = cfg.size <= 3 ? 'text-3xl' : cfg.size === 4 ? 'text-2xl' : cfg.size === 5 ? 'text-xl' : 'text-sm';
            return (
              <motion.button
                key={idx}
                onClick={() => handleCellClick(num)}
                animate={wrong ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`aspect-square rounded-md font-bold ${fontSize} flex items-center justify-center transition-colors
                  ${found ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : 'bg-card hover:bg-accent border border-border'}`}
              >
                {num}
              </motion.button>
            );
          })}
        </div>

        <Button variant="ghost" size="sm" onClick={() => setPhase('select')} className="w-full">Cancelar partida</Button>
      </div>
    );
  }

  // result
  const calif = calificar(nivel, finalTime);
  const califColor = calif === 'Excepcional' ? 'text-emerald-500' : calif === 'Bueno' ? 'text-blue-500' : 'text-amber-500';
  const motivacional = calif === 'Excepcional' ? '¡Velocidad sobresaliente!' : calif === 'Bueno' ? 'Buen ritmo, sigue así.' : 'Cada intento te hace más rápido.';

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring' }}>
        <Card>
          <CardContent className="p-6 space-y-5 text-center">
            <AnimatePresence>
              {isGlobalBest && (
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center gap-2 text-3xl">
                  <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>👑</motion.span>
                  <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}>🎉</motion.span>
                  <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}>👑</motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center`}>
              <Trophy className="w-10 h-10 text-white" />
            </div>

            {isGlobalBest && <p className="font-bold text-amber-500 flex items-center justify-center gap-1"><Crown className="w-4 h-4" />¡Eres el más rápido de la clase!</p>}
            {isPersonalBest && !isGlobalBest && <p className="font-bold text-emerald-500 flex items-center justify-center gap-1"><Sparkles className="w-4 h-4" />¡Nuevo récord personal!</p>}

            <div>
              <p className="text-xs text-muted-foreground">Tiempo total</p>
              <p className="text-5xl font-mono font-bold tabular-nums">{finalTime.toFixed(1)}<span className="text-2xl">s</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Errores</p>
                <p className="text-xl font-bold">{errores}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Calificación</p>
                <p className={`text-sm font-bold ${califColor}`}>{calif}</p>
              </div>
            </div>

            {rankPos && (
              <p className="text-sm text-muted-foreground">
                Quedaste en el puesto <span className="font-bold text-foreground">#{rankPos.pos}</span> de {rankPos.total} estudiantes
              </p>
            )}

            <p className="text-sm italic text-muted-foreground">{motivacional}</p>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={startGame}><RotateCcw className="w-4 h-4 mr-1" />Intentar de nuevo</Button>
              {nivel < 4 && unlocked.has((nivel + 1) as Nivel) ? (
                <Button onClick={() => { setNivel((nivel + 1) as Nivel); setPhase('instructions'); }}>
                  Siguiente nivel <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => navigate('/student/schulte-records')}>
                  <Trophy className="w-4 h-4 mr-1" />Ver récords
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="w-full">Volver al menú</Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
