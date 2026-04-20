import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Bola { id: number; x: number; y: number; vx: number; vy: number; objetivo: boolean }
const TOTAL_BOLAS = 8;
const OBJETIVOS = 3;
const ROUNDS = 5;

interface Props { open: boolean; onClose: () => void; onComplete: () => void }

type Fase = 'mostrar' | 'mover' | 'seleccionar' | 'feedback' | 'fin';

export default function ExerciseMOT({ open, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [fase, setFase] = useState<Fase>('mostrar');
  const [round, setRound] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [bolas, setBolas] = useState<Bola[]>([]);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const arenaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const inicioRef = useRef(Date.now());
  const W = 320, H = 320;

  function nuevaRonda() {
    const arr: Bola[] = [];
    for (let i = 0; i < TOTAL_BOLAS; i++) {
      arr.push({
        id: i,
        x: 30 + Math.random() * (W - 60),
        y: 30 + Math.random() * (H - 60),
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4,
        objetivo: i < OBJETIVOS,
      });
    }
    // Mezclar índice de objetivos
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setBolas(arr);
    setSeleccion(new Set());
    setFase('mostrar');
  }

  useEffect(() => {
    if (open) { setRound(0); setAciertos(0); inicioRef.current = Date.now(); nuevaRonda(); }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mostrar objetivos 2s, luego mover 5s
  useEffect(() => {
    if (!open) return;
    if (fase === 'mostrar') {
      const t = setTimeout(() => setFase('mover'), 2000);
      return () => clearTimeout(t);
    }
    if (fase === 'mover') {
      const t = setTimeout(() => setFase('seleccionar'), 5000);
      const animate = () => {
        setBolas(prev => prev.map(b => {
          let { x, y, vx, vy } = b;
          x += vx; y += vy;
          if (x < 16 || x > W - 16) vx = -vx;
          if (y < 16 || y > H - 16) vy = -vy;
          return { ...b, x, y, vx, vy };
        }));
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => { clearTimeout(t); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }
  }, [fase, open]);

  function tocarBola(b: Bola) {
    if (fase !== 'seleccionar') return;
    const next = new Set(seleccion);
    if (next.has(b.id)) next.delete(b.id);
    else next.add(b.id);
    if (next.size > OBJETIVOS) return;
    setSeleccion(next);
    if (next.size === OBJETIVOS) {
      const correctos = [...next].filter(id => bolas.find(x => x.id === id)?.objetivo).length;
      const ok = correctos === OBJETIVOS;
      if (ok) setAciertos(a => a + 1);
      setFase('feedback');
      setTimeout(() => {
        if (round + 1 >= ROUNDS) finalizar(aciertos + (ok ? 1 : 0));
        else { setRound(r => r + 1); nuevaRonda(); }
      }, 900);
    }
  }

  async function finalizar(score: number) {
    setFase('fin');
    const dur = Math.round((Date.now() - inicioRef.current) / 1000);
    const precision = Math.round((score / ROUNDS) * 100);
    if (user) {
      await supabase.from('concentracion_sesiones').insert({
        user_id: user.id, ejercicio: 'mot',
        duracion_segundos: dur, precision_porcentaje: precision, completado: true,
      });
    }
    toast.success('¡MOT completado!', { description: `Aciertos: ${score} / ${ROUNDS}` });
    onComplete();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="p-4 flex items-center justify-between border-b">
        <div>
          <p className="font-display font-bold">Rastreo de objetos múltiples</p>
          <p className="text-xs text-muted-foreground">
            {fase === 'mostrar' && `Memoriza las ${OBJETIVOS} bolas marcadas en azul…`}
            {fase === 'mover' && 'Síguelas mientras se mueven'}
            {fase === 'seleccionar' && 'Toca las que eran objetivo'}
            {fase === 'feedback' && 'Verificando…'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
      </div>
      <div className="px-4 pt-2"><Progress value={(round / ROUNDS) * 100} /></div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-xs text-muted-foreground">Ronda {round + 1} de {ROUNDS} · Aciertos {aciertos}</p>
        {fase !== 'fin' ? (
          <div ref={arenaRef} className="relative rounded-xl border bg-muted/20" style={{ width: W, height: H }}>
            {bolas.map(b => {
              const showObjetivo = fase === 'mostrar' && b.objetivo;
              const showFeedback = fase === 'feedback' && b.objetivo;
              const selected = seleccion.has(b.id);
              return (
                <button key={b.id} onClick={() => tocarBola(b)}
                  className={`absolute rounded-full transition-colors ${
                    showObjetivo || showFeedback ? 'bg-primary'
                      : selected ? 'bg-amber-500'
                      : 'bg-foreground/40'
                  }`}
                  style={{ width: 32, height: 32, left: b.x - 16, top: b.y - 16 }}
                />
              );
            })}
          </div>
        ) : (
          <Card><CardContent className="p-6 text-center space-y-2">
            <p className="text-2xl font-bold">¡Listo!</p>
            <Button onClick={onClose}>Cerrar</Button>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
