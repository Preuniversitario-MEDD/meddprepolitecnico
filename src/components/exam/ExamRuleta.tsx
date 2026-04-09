import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Zap, RotateCcw, CheckCircle, XCircle, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RuletaQuestion {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  imagen_url: string | null;
  dificultad: number;
}

interface ExamRuletaProps {
  questions: RuletaQuestion[];
  onFinish: (score: number, total: number) => void;
}

const TIMER_SECONDS = 15;

export default function ExamRuleta({ questions, onFinish }: ExamRuletaProps) {
  const [pool, setPool] = useState<RuletaQuestion[]>([]);
  const [current, setCurrent] = useState<RuletaQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setPool(shuffled);
  }, [questions]);

  const playSound = useCallback((freq: number, dur: number) => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }, []);

  function spinRuleta() {
    if (pool.length === 0) {
      setFinished(true);
      onFinish(score, total);
      return;
    }
    setSpinning(true);
    setFeedback(null);
    
    // Simulate spinning animation
    setTimeout(() => {
      const idx = Math.floor(Math.random() * pool.length);
      const q = pool[idx];
      setCurrent(q);
      setPool(prev => prev.filter((_, i) => i !== idx));
      setTimeLeft(TIMER_SECONDS);
      setSpinning(false);
      startTimer();
    }, 800);
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        if (prev <= 4) playSound(800, 0.1);
        return prev - 1;
      });
    }, 1000);
  }

  function handleTimeout() {
    setFeedback('timeout');
    setStreak(0);
    setTotal(prev => prev + 1);
    playSound(200, 0.3);
  }

  function handleAnswer(index: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!current || feedback) return;
    
    const correct = index === current.respuesta_correcta;
    setTotal(prev => prev + 1);

    if (correct) {
      const points = current.dificultad * (1 + streak * 0.1);
      setScore(prev => prev + Math.round(points));
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setFeedback('correct');
      playSound(1200, 0.15);
      if (streak >= 4) confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    } else {
      setStreak(0);
      setFeedback('wrong');
      playSound(300, 0.3);
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? 'text-destructive' : timeLeft <= 10 ? 'text-neon-orange' : 'text-neon-mint';

  if (finished) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-8">
        <Trophy className="w-16 h-16 text-neon-orange mx-auto" />
        <h2 className="text-2xl font-display font-bold text-foreground">¡Ruleta Completada!</h2>
        <p className="text-4xl font-bold text-gradient-primary">{score} pts</p>
        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <span>Respondidas: {total}</span>
          <span>Mejor racha: {bestStreak} 🔥</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-neon-orange" />
          <span className="font-display font-bold text-lg text-foreground">{score} pts</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{total} respondidas</span>
          {streak > 0 && (
            <motion.span
              key={streak}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="text-neon-orange font-bold"
            >
              🔥 x{streak}
            </motion.span>
          )}
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{pool.length} restantes</span>
        </div>
      </div>

      {/* Timer ring */}
      {current && !feedback && (
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="2" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                className={`${timerColor === 'text-destructive' ? 'stroke-destructive' : timerColor === 'text-neon-orange' ? 'stroke-[hsl(var(--neon-orange))]' : 'stroke-[hsl(var(--neon-mint))]'}`}
                strokeWidth="2.5"
                strokeDasharray={`${timerPct} 100`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center font-mono font-bold text-xl ${timerColor}`}>
              {timeLeft}
            </span>
          </div>
        </div>
      )}

      {/* Spin button or question */}
      {!current && !spinning && (
        <motion.div className="text-center py-8">
          <Button
            onClick={spinRuleta}
            size="lg"
            className="gap-2 h-14 px-8 bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white hover:opacity-90 text-lg rounded-2xl shadow-lg shadow-neon-fuchsia/30"
          >
            <RotateCcw className="w-5 h-5" /> Girar Ruleta
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Tienes 15 segundos para responder cada pregunta</p>
        </motion.div>
      )}

      {spinning && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-4 border-neon-fuchsia border-t-transparent mx-auto"
          />
          <p className="text-sm text-muted-foreground mt-4">Seleccionando pregunta...</p>
        </div>
      )}

      {current && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className={`border-2 transition-colors ${
              feedback === 'correct' ? 'border-accent bg-accent/5' :
              feedback === 'wrong' ? 'border-destructive bg-destructive/5' :
              feedback === 'timeout' ? 'border-neon-orange bg-neon-orange/5' :
              'border-neon-fuchsia/30'
            }`}>
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neon-fuchsia/20 text-neon-fuchsia shrink-0">
                    ×{current.dificultad} pts
                  </span>
                  <p className="font-display font-bold text-sm md:text-base text-foreground">{current.pregunta}</p>
                </div>

                {current.imagen_url && (
                  <img src={current.imagen_url} alt="" className="rounded-lg max-w-full h-auto max-h-40" />
                )}

                <div className="space-y-2">
                  {current.opciones.map((op, i) => {
                    const isCorrect = i === current.respuesta_correcta;
                    let style = 'bg-card hover:bg-muted border-border cursor-pointer';
                    if (feedback) {
                      if (isCorrect) style = 'bg-accent/15 border-accent text-accent';
                      else if (feedback === 'wrong' && i !== current.respuesta_correcta) style = 'bg-card border-border opacity-50';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => !feedback && handleAnswer(i)}
                        disabled={!!feedback}
                        className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground ${style}`}
                      >
                        <span className="font-medium mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{op}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {feedback === 'correct' && <><CheckCircle className="w-5 h-5 text-accent" /><span className="text-sm font-bold text-accent">¡Correcto!</span></>}
                      {feedback === 'wrong' && <><XCircle className="w-5 h-5 text-destructive" /><span className="text-sm font-bold text-destructive">Incorrecto</span></>}
                      {feedback === 'timeout' && <><Timer className="w-5 h-5 text-neon-orange" /><span className="text-sm font-bold text-neon-orange">¡Tiempo agotado!</span></>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { setCurrent(null); setFeedback(null); }}
                      className="gap-1.5 bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Siguiente
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
