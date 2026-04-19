import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const TEXTS = [
  { tema: 'Química', texto: 'Los enlaces covalentes se forman cuando dos átomos comparten electrones para alcanzar configuración estable. La electronegatividad determina la polaridad del enlace y las propiedades químicas de la molécula resultante.' },
  { tema: 'Matemáticas', texto: 'El cálculo diferencial estudia las tasas de cambio instantáneo. La derivada de una función en un punto representa la pendiente de la recta tangente a la curva en ese punto específico.' },
  { tema: 'Física', texto: 'La segunda ley de Newton establece que la fuerza neta aplicada sobre un cuerpo es igual al producto de su masa por la aceleración. Esta relación es fundamental en la mecánica clásica.' },
  { tema: 'Química', texto: 'La tabla periódica organiza los elementos según su número atómico creciente. Los grupos verticales comparten propiedades químicas similares debido a su configuración electrónica de valencia.' },
  { tema: 'Matemáticas', texto: 'Las funciones trigonométricas relacionan ángulos con razones de lados en triángulos rectángulos. El seno, coseno y tangente son fundamentales para resolver problemas de geometría aplicada.' },
];

const OPTIONS = ['Química', 'Matemáticas', 'Física', 'Biología'];

export default function ExerciseLecturaRapida({ onComplete }: { onComplete: (precision: number, duracion: number) => void }) {
  const [wpm, setWpm] = useState(250);
  const [phase, setPhase] = useState<'config' | 'reading' | 'question' | 'done'>('config');
  const [textIdx] = useState(Math.floor(Math.random() * TEXTS.length));
  const [wordIdx, setWordIdx] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());

  const current = TEXTS[textIdx];
  const words = current.texto.split(' ');

  useEffect(() => {
    if (phase !== 'reading') return;
    if (wordIdx >= words.length) {
      setPhase('question');
      return;
    }
    const t = setTimeout(() => setWordIdx(i => i + 1), 60000 / wpm);
    return () => clearTimeout(t);
  }, [phase, wordIdx, wpm, words.length]);

  const start = () => {
    setStartedAt(Date.now());
    setWordIdx(0);
    setPhase('reading');
  };

  const answer = (opt: string) => {
    onComplete(opt === current.tema ? 100 : 0, Math.round((Date.now() - startedAt) / 1000));
    setPhase('done');
  };

  if (phase === 'config') {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium">Velocidad: {wpm} palabras/min</label>
          <Slider value={[wpm]} onValueChange={([v]) => setWpm(v)} min={100} max={400} step={25} className="mt-3" />
        </div>
        <Button onClick={start} className="w-full">Comenzar lectura</Button>
      </div>
    );
  }

  if (phase === 'reading') {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-4xl font-bold text-center">{words[wordIdx]}</p>
      </div>
    );
  }

  if (phase === 'question') {
    return (
      <div className="space-y-4">
        <p className="font-bold text-center">¿Qué tema trataba el texto?</p>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map(o => (
            <Button key={o} variant="outline" onClick={() => answer(o)}>{o}</Button>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-center text-muted-foreground">Resultado guardado</p>;
}
