import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Timer, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  imagen_url: string | null;
  grupo: number;
}

interface Props {
  sesionId: string;
  userId: string;
}

type QuizState = 'idle' | 'playing' | 'feedback' | 'results';

export default function QuizComponent({ sesionId, userId }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<QuizState>('idle');
  const [timeLeft, setTimeLeft] = useState(60);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestions();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sesionId]);

  async function loadQuestions() {
    // Get all questions for this session
    const { data: allQuestions } = await supabase
      .from('quiz_preguntas')
      .select('*')
      .eq('sesion_id', sesionId);

    if (!allQuestions || allQuestions.length === 0) {
      setQuestions([]);
      return;
    }

    // Get previously answered question IDs from progress
    const { data: progress } = await supabase
      .from('progreso_estudiante')
      .select('preguntas_respondidas')
      .eq('user_id', userId)
      .eq('sesion_id', sesionId)
      .maybeSingle();

    const answeredIds: string[] = (progress?.preguntas_respondidas as string[]) || [];

    // Filter out already answered, if all answered reset
    let available = allQuestions.filter(q => !answeredIds.includes(q.id));
    if (available.length < 10) {
      // All questions exhausted, reset pool
      available = allQuestions;
    }

    // Shuffle and pick 10 (one group of 10)
    const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled.map(q => ({
      id: q.id,
      pregunta: q.pregunta,
      opciones: (q.opciones as string[]) || [],
      respuesta_correcta: q.respuesta_correcta,
      imagen_url: q.imagen_url,
      grupo: q.grupo,
    })));
  }

  function startQuiz() {
    if (questions.length === 0) return;
    setCurrentIndex(0);
    setScore(0);
    setAnswers([]);
    setSelected(null);
    setState('playing');
    startTimer();
  }

  function startTimer() {
    setTimeLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleTimeout() {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswers(prev => [...prev, false]);
    setState('feedback');
    setSelected(-1);
    setTimeout(() => nextQuestion(), 2000);
  }

  function handleAnswer(index: number) {
    if (state !== 'playing' || selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(index);
    const correct = index === questions[currentIndex].respuesta_correcta;
    if (correct) setScore(prev => prev + 1);
    setAnswers(prev => [...prev, correct]);
    setState('feedback');
    setTimeout(() => nextQuestion(), 1500);
  }

  function nextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      finishQuiz();
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelected(null);
      setState('playing');
      startTimer();
    }
  }

  async function finishQuiz() {
    setState('results');
    if (timerRef.current) clearInterval(timerRef.current);

    const finalScore = Math.round((score / questions.length) * 100);

    // Get existing answered IDs and append new ones (no-repeat logic)
    const { data: existingProgress } = await supabase
      .from('progreso_estudiante')
      .select('preguntas_respondidas')
      .eq('user_id', userId)
      .eq('sesion_id', sesionId)
      .maybeSingle();

    const prevAnswered: string[] = (existingProgress?.preguntas_respondidas as string[]) || [];
    const newAnswered = [...new Set([...prevAnswered, ...questions.map(q => q.id)])];

    await supabase.from('progreso_estudiante').upsert({
      user_id: userId,
      sesion_id: sesionId,
      puntaje_quiz: finalScore,
      completada: finalScore >= 70,
      preguntas_respondidas: newAnswered,
    }, { onConflict: 'user_id,sesion_id' });

    if (finalScore >= 90) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }

  const currentQ = questions[currentIndex];
  const timerColor = timeLeft > 30 ? 'text-[hsl(var(--neon-mint))]' : timeLeft > 10 ? 'text-[hsl(var(--neon-orange))]' : 'text-destructive';
  const timerBg = timeLeft > 30 ? 'bg-[hsl(var(--neon-mint))]' : timeLeft > 10 ? 'bg-[hsl(var(--neon-orange))]' : 'bg-destructive';

  if (questions.length === 0) {
    return <div className="text-center py-12"><p className="text-muted-foreground">No hay preguntas disponibles para esta sesión</p></div>;
  }

  if (state === 'idle') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl gradient-neon flex items-center justify-center animate-pulse-glow">
          <Trophy className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold">Quiz ESPOL</h2>
        <p className="text-muted-foreground text-sm">{questions.length} preguntas · 60s por pregunta · Sin repetir</p>
        <Button onClick={startQuiz} className="gradient-primary text-primary-foreground px-8 py-3">Comenzar Quiz</Button>
      </motion.div>
    );
  }

  if (state === 'results') {
    const finalPct = Math.round((score / questions.length) * 100);
    const pieData = [
      { name: 'Correctas', value: score },
      { name: 'Incorrectas', value: questions.length - score },
    ];
    const COLORS = ['hsl(160 60% 50%)', 'hsl(0 84% 60%)'];

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-6">
        <h2 className="text-2xl font-display font-bold">
          {finalPct >= 90 ? '🎉 ¡Excelente!' : finalPct >= 70 ? '👏 ¡Bien hecho!' : '💪 ¡Sigue practicando!'}
        </h2>
        <p className="text-4xl font-bold text-gradient-primary">{finalPct}%</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie></PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 text-sm">
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-[hsl(var(--neon-mint))]" /> {score} correctas</span>
          <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-destructive" /> {questions.length - score} incorrectas</span>
        </div>
        <Button onClick={() => { loadQuestions(); setState('idle'); }} className="gradient-primary text-primary-foreground gap-2">
          <RotateCcw className="w-4 h-4" /> Intentar de nuevo
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{currentIndex + 1}/{questions.length}</span>
        <Progress value={((currentIndex + 1) / questions.length) * 100} className="flex-1 h-2" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Timer className={`w-5 h-5 ${timerColor}`} />
        <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div className={`h-full rounded-full ${timerBg}`} animate={{ width: `${(timeLeft / 60) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className={`text-sm font-mono font-bold ${timerColor}`}>{timeLeft}s</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <p className="font-display font-bold text-base md:text-lg mb-4 text-foreground">{currentQ.pregunta}</p>
              {currentQ.imagen_url && <img src={currentQ.imagen_url} alt="Pregunta" className="rounded-lg mb-4 max-w-full h-auto" />}
              <div className="space-y-2">
                {currentQ.opciones.map((opcion, i) => {
                  let bg = 'bg-card hover:bg-muted';
                  if (state === 'feedback' && selected !== null) {
                    if (i === currentQ.respuesta_correcta) bg = 'bg-[hsl(var(--neon-mint))]/20 border-[hsl(var(--neon-mint))]';
                    else if (i === selected && i !== currentQ.respuesta_correcta) bg = 'bg-destructive/20 border-destructive';
                  }
                  return (
                    <motion.button key={i} whileHover={state === 'playing' ? { scale: 1.01 } : {}} whileTap={state === 'playing' ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswer(i)} disabled={state !== 'playing'}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground ${bg} ${state === 'playing' ? 'cursor-pointer' : 'cursor-default'}`}>
                      <span className="font-medium mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{opcion}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
