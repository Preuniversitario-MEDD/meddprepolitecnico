import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Exercise202020({ onComplete }: { onComplete: (precision: number, duracion: number) => void }) {
  const [count, setCount] = useState(20);
  const [startedAt] = useState(Date.now());

  useEffect(() => {
    if (count <= 0) {
      onComplete(100, Math.round((Date.now() - startedAt) / 1000));
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete, startedAt]);

  return (
    <div className="space-y-6 text-center py-6">
      <p className="text-sm text-muted-foreground">Mira un objeto a 6 metros de distancia</p>
      <motion.div
        key={count}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-8xl font-mono font-bold text-primary"
      >
        {count}
      </motion.div>
      <p className="text-xs text-muted-foreground">Relaja tus ojos y respira profundo</p>
    </div>
  );
}
