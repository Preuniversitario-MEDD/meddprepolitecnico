import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const DURATION = 180; // 3 minutos

export default function ExercisePuntoFocal({ onComplete }: { onComplete: (precision: number, duracion: number) => void }) {
  const [time, setTime] = useState(DURATION);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const moveT = setInterval(() => {
      setPos({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 });
    }, 2500);
    const tickT = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(tickT);
          clearInterval(moveT);
          onComplete(100, Math.round((Date.now() - startedAt.current) / 1000));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(moveT); clearInterval(tickT); };
  }, [onComplete]);

  return (
    <div className="relative w-full h-[60vh] bg-background rounded-xl border border-border overflow-hidden">
      <div className="absolute top-3 left-3 text-sm font-mono bg-card px-3 py-1 rounded-full border border-border z-10">
        {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
      </div>
      <motion.div
        animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        transition={{ duration: 2.4, ease: 'easeInOut' }}
        className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-primary shadow-[0_0_24px_hsl(var(--primary))]"
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
        Sigue el punto con la vista sin mover la cabeza
      </div>
    </div>
  );
}
