import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const COLORES = [
  { nombre: 'rojo', clase: 'text-red-500', valor: 'red' },
  { nombre: 'azul', clase: 'text-blue-500', valor: 'blue' },
  { nombre: 'verde', clase: 'text-green-500', valor: 'green' },
  { nombre: 'amarillo', clase: 'text-yellow-500', valor: 'yellow' },
  { nombre: 'morado', clase: 'text-purple-500', valor: 'purple' },
];
const TOTAL = 20;

interface Props { open: boolean; onClose: () => void; onComplete: () => void }

export default function ExerciseStroop({ open, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [round, setRound] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const reto = useMemo(() => {
    const palabra = COLORES[Math.floor(Math.random() * COLORES.length)];
    let color = COLORES[Math.floor(Math.random() * COLORES.length)];
    // 70% de incongruencia
    if (Math.random() < 0.7) while (color.valor === palabra.valor) color = COLORES[Math.floor(Math.random() * COLORES.length)];
    else color = palabra;
    return { palabra, color };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (open) { setRound(0); setAciertos(0); setDone(false); startedAt.current = Date.now(); }
  }, [open]);

  function elegir(opt: typeof COLORES[number]) {
    if (done) return;
    // La consigna: tocar el COLOR del texto (no la palabra)
    if (opt.valor === reto.color.valor) setAciertos(a => a + 1);
    if (round + 1 >= TOTAL) finalizar(aciertos + (opt.valor === reto.color.valor ? 1 : 0));
    else setRound(r => r + 1);
  }

  async function finalizar(scoreFinal: number) {
    setDone(true);
    const dur = Math.round((Date.now() - startedAt.current) / 1000);
    const precision = Math.round((scoreFinal / TOTAL) * 100);
    if (user) {
      await supabase.from('concentracion_sesiones').insert({
        user_id: user.id, ejercicio: 'stroop',
        duracion_segundos: dur, precision_porcentaje: precision, completado: true,
      });
    }
    toast.success('¡Stroop completado!', { description: `Precisión: ${precision}%` });
    onComplete();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="p-4 flex items-center justify-between border-b">
        <div>
          <p className="font-display font-bold">Stroop · Color/Palabra</p>
          <p className="text-xs text-muted-foreground">Toca el COLOR del texto, no la palabra</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
      </div>
      <div className="px-4 pt-2"><Progress value={(round / TOTAL) * 100} /></div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-4">
        {!done ? (
          <>
            <p className="text-xs text-muted-foreground">Ronda {round + 1} de {TOTAL} · Aciertos {aciertos}</p>
            <motion.p key={round} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`text-6xl md:text-8xl font-black ${reto.color.clase}`}>
              {reto.palabra.nombre.toUpperCase()}
            </motion.p>
            <div className="grid grid-cols-3 gap-2 max-w-md w-full">
              {COLORES.map(c => (
                <Button key={c.valor} variant="outline" onClick={() => elegir(c)} className="h-14 capitalize">
                  <span className={c.clase}>●</span> {c.nombre}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <Card><CardContent className="p-6 text-center space-y-2">
            <p className="text-2xl font-bold">¡Listo!</p>
            <p className="text-muted-foreground text-sm">Aciertos: {aciertos} / {TOTAL}</p>
            <Button onClick={onClose}>Cerrar</Button>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
