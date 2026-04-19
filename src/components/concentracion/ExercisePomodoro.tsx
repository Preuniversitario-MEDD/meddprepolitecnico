import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const STUDY = 25 * 60;
const BREAK = 5 * 60;

export default function ExercisePomodoro({ onComplete }: { onComplete: (precision: number, duracion: number) => void }) {
  const [mode, setMode] = useState<'study' | 'break'>('study');
  const [time, setTime] = useState(STUDY);
  const [running, setRunning] = useState(true);
  const [startedAt] = useState(Date.now());
  const [breath, setBreath] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTime(s => {
        if (s <= 1) {
          if (mode === 'study') {
            setMode('break');
            return BREAK;
          } else {
            onComplete(100, Math.round((Date.now() - startedAt) / 1000));
            clearInterval(t);
            return 0;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, onComplete, startedAt]);

  useEffect(() => {
    if (mode !== 'break') return;
    const cycle = setInterval(() => {
      setBreath(b => b === 'in' ? 'hold' : b === 'hold' ? 'out' : 'in');
    }, 4000);
    return () => clearInterval(cycle);
  }, [mode]);

  const min = Math.floor(time / 60), sec = time % 60;

  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="text-xs uppercase text-muted-foreground tracking-wider">{mode === 'study' ? 'Concéntrate' : 'Descansa la vista'}</p>
        <p className="text-6xl font-mono font-bold mt-2 text-primary">
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
        </p>
      </div>
      {mode === 'study' ? (
        <p className="text-sm text-muted-foreground">Una mente enfocada construye un futuro brillante. ¡Tú puedes con ESPOL!</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ scale: breath === 'in' ? 1.4 : breath === 'hold' ? 1.4 : 0.8 }}
            transition={{ duration: 4, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-full bg-primary/30 border-2 border-primary"
          />
          <p className="font-bold text-lg">{breath === 'in' ? 'Inhala...' : breath === 'hold' ? 'Mantén...' : 'Exhala...'}</p>
        </div>
      )}
      <Button variant="outline" onClick={() => setRunning(r => !r)}>
        {running ? 'Pausar' : 'Continuar'}
      </Button>
    </div>
  );
}
