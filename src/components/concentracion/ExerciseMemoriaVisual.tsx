import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];

export default function ExerciseMemoriaVisual({ onComplete }: { onComplete: (precision: number, duracion: number) => void }) {
  const [level, setLevel] = useState(3);
  const [seq, setSeq] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<'show' | 'input' | 'done'>('show');
  const [startedAt] = useState(Date.now());
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (level > 7) {
      onComplete(total ? Math.round((correct / total) * 100) : 0, Math.round((Date.now() - startedAt) / 1000));
      return;
    }
    const s = Array.from({ length: level }, () => Math.floor(Math.random() * 6));
    setSeq(s);
    setUserSeq([]);
    setPhase('show');
    const t = setTimeout(() => setPhase('input'), 800 + level * 600);
    return () => clearTimeout(t);
  }, [level]);

  const handleClick = (i: number) => {
    if (phase !== 'input') return;
    const next = [...userSeq, i];
    setUserSeq(next);
    if (next.length === seq.length) {
      const ok = next.every((v, idx) => v === seq[idx]);
      setTotal(t => t + 1);
      if (ok) setCorrect(c => c + 1);
      setTimeout(() => setLevel(l => l + 1), 600);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Nivel {level - 2} de 5</p>
        <p className="font-bold mt-1">{phase === 'show' ? 'Memoriza la secuencia' : 'Repite la secuencia'}</p>
      </div>
      {phase === 'show' && (
        <div className="flex flex-wrap gap-2 justify-center min-h-[80px]">
          {seq.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.4 }}
              className={`w-12 h-12 rounded-lg ${COLORS[c]}`}
            />
          ))}
        </div>
      )}
      {phase === 'input' && (
        <>
          <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
            {userSeq.map((c, i) => (
              <div key={i} className={`w-8 h-8 rounded ${COLORS[c]}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {COLORS.map((c, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleClick(i)}
                className={`aspect-square rounded-xl ${c} hover:opacity-80`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
