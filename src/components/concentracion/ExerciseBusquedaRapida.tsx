import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const TOTAL = 10;
const SYMBOLS = ['7', '3', '5', '8', '2', 'O', 'Q', 'M', 'N', '+', '×'];

export default function ExerciseBusquedaRapida({ onComplete }: { onComplete: (precision: number, duracion: number) => void }) {
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [grid, setGrid] = useState<{ char: string; odd: boolean }[]>([]);
  const [startedAt] = useState(Date.now());

  const newRound = () => {
    const base = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    let odd = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    while (odd === base) odd = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const oddIdx = Math.floor(Math.random() * 25);
    setGrid(Array.from({ length: 25 }, (_, i) => ({ char: i === oddIdx ? odd : base, odd: i === oddIdx })));
  };

  useEffect(() => { newRound(); }, []);

  const handle = (correct: boolean) => {
    const newHits = hits + (correct ? 1 : 0);
    const newRound_ = round + 1;
    if (newRound_ >= TOTAL) {
      onComplete(Math.round((newHits / TOTAL) * 100), Math.round((Date.now() - startedAt) / 1000));
    } else {
      setHits(newHits);
      setRound(newRound_);
      newRound();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span>Ronda {round + 1} / {TOTAL}</span>
        <span className="text-primary font-bold">Aciertos: {hits}</span>
      </div>
      <p className="text-xs text-muted-foreground text-center">Toca el símbolo distinto</p>
      <div className="grid grid-cols-5 gap-2">
        {grid.map((c, i) => (
          <motion.button
            key={`${round}-${i}`}
            whileTap={{ scale: 0.9 }}
            onClick={() => handle(c.odd)}
            className="aspect-square bg-card border border-border rounded-lg text-2xl font-bold hover:border-primary transition-colors"
          >
            {c.char}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
