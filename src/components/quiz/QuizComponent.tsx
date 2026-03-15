import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Timer, CheckCircle, XCircle, Trophy, RotateCcw, Unlock } from 'lucide-react';
import { toast } from 'sonner';
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
  const scoreRef = useRef(0);
  const [state, setState] = useState<QuizState>('idle');
  const [timeLeft, setTimeLeft] = useState(60);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    loadQuestions();
    loadStats();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sesionId]);

  async function loadStats() {
    const { data } = await supabase.from('progreso_estudiante').select('*').eq('user_id', userId).eq('sesion_id', sesionId).maybeSingle();
    if (data) {
      setTotalCorrect((data as any).preguntas_correctas_total || 0);
      setTotalAttempts((data as any).intentos_quiz || 0);
    }
  }

  async function loadQuestions() {
    const { data: allQuestions } = await supabase.from('quiz_preguntas').select('*').eq('sesion_id', sesionId);
    if (!allQuestions || allQuestions.length === 0) { setQuestions([]); return; }

    const { data: progress } = await supabase.from('progreso_estudiante').select('preguntas_respondidas').eq('user_id', userId).eq('sesion_id', sesionId).maybeSingle();
    const answeredIds: string[] = (progress?.preguntas_respondidas as string[]) || [];

    let available = allQuestions.filter(q => !answeredIds.includes(q.id));
    if (available.length < 10) available = allQuestions;

    const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled.map(q => ({
      id: q.id, pregunta: q.pregunta, opciones: (q.opciones as string[]) || [],
      respuesta_correcta: q.respuesta_correcta, imagen_url: q.imagen_url, grupo: q.grupo,
    })));
  }

  function startQuiz() {
    if (questions.length === 0) return;
    setCurrentIndex(0); setScore(0); scoreRef.current = 0; setAnswers([]); setSelected(null);
    setState('playing'); startTimer();
    startTimeRef.current = Date.now();
  }

  function startTimer() {
    setTimeLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { handleTimeout(); return 0; } return prev - 1; });
    }, 1000);
  }

  function handleTimeout() {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswers(prev => [...prev, false]);
    setState('feedback'); setSelected(-1);
    setTimeout(() => nextQuestion(), 2000);
  }

  function handleAnswer(index: number) {
    if (state !== 'playing' || selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(index);
    const correct = index === questions[currentIndex].respuesta_correcta;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setAnswers(prev => [...prev, correct]);
    setState('feedback');
    setTimeout(() => nextQuestion(), 1500);
  }

  function nextQuestion() {
    if (currentIndex + 1 >= questions.length) { finishQuiz(); }
    else { setCurrentIndex(prev => prev + 1); setSelected(null); setState('playing'); startTimer(); }
  }

  async function finishQuiz() {
    setState('results');
    if (timerRef.current) clearInterval(timerRef.current);

    const roundCorrect = scoreRef.current;
    const roundErrors = questions.length - roundCorrect;
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const finalScore = Math.round((roundCorrect / questions.length) * 100);

    const { data: existingProgress } = await supabase.from('progreso_estudiante').select('*').eq('user_id', userId).eq('sesion_id', sesionId).maybeSingle();

    const prevAnswered: string[] = (existingProgress?.preguntas_respondidas as string[]) || [];
    const newAnswered = [...new Set([...prevAnswered, ...questions.map(q => q.id)])];
    const prevCorrectTotal = (existingProgress as any)?.preguntas_correctas_total || 0;
    const newCorrectTotal = prevCorrectTotal + roundCorrect;
    const prevAttempts = (existingProgress as any)?.intentos_quiz || 0;
    const prevErrors = (existingProgress as any)?.errores_quiz || 0;
    const prevTime = (existingProgress as any)?.tiempo_invertido || 0;

    // Session is complete when 150+ correct answers
    const isComplete = newCorrectTotal >= 150;

    await supabase.from('progreso_estudiante').upsert({
      user_id: userId,
      sesion_id: sesionId,
      puntaje_quiz: finalScore,
      completada: isComplete,
      preguntas_respondidas: newAnswered,
      intentos_quiz: prevAttempts + 1,
      errores_quiz: prevErrors + roundErrors,
      tiempo_invertido: prevTime + elapsedSeconds,
      preguntas_correctas_total: newCorrectTotal,
    } as any, { onConflict: 'user_id,sesion_id' });

    setTotalCorrect(newCorrectTotal);
    setTotalAttempts(prevAttempts + 1);

    if (finalScore >= 90) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    // Auto-unlock next session when this one is completed (150+ correct)
    if (isComplete && !existingProgress?.completada) {
      await autoUnlockNextSession();
    }
  }

  async function autoUnlockNextSession() {
    // Get current session number
    const { data: currentSession } = await supabase.from('sesiones').select('numero').eq('id', sesionId).single();
    if (!currentSession) return;

    // Find next session by number
    const { data: nextSession } = await supabase.from('sesiones').select('id, numero, titulo').eq('numero', currentSession.numero + 1).single();
    if (!nextSession) return;

    // Upsert unlock record for the student
    await supabase.from('sesion_estudiante').upsert({
      user_id: userId,
      sesion_id: nextSession.id,
      desbloqueada: true,
    } as any, { onConflict: 'user_id,sesion_id' });

    toast.success(`🔓 ¡Sesión ${nextSession.numero} desbloqueada!`, {
      description: nextSession.titulo,
      duration: 5000,
    });
  }

  const currentQ = questions[currentIndex];
  const timerColor = timeLeft > 30 ? 'text-accent' : timeLeft > 10 ? 'text-neon-orange' : 'text-destructive';

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
        <div className="text-sm space-y-1">
          <p className="text-accent font-medium">{totalCorrect}/150 correctas acumuladas</p>
          <p className="text-muted-foreground">Intentos: {totalAttempts}</p>
        </div>
        <Progress value={Math.min((totalCorrect / 150) * 100, 100)} className="h-2 max-w-xs mx-auto" />
        <Button onClick={startQuiz} className="gradient-primary text-primary-foreground px-8 py-3">Comenzar Quiz</Button>
      </motion.div>
    );
  }

  if (state === 'results') {
    const finalPct = Math.round((score / questions.length) * 100);
    const pieData = [{ name: 'Correctas', value: score }, { name: 'Incorrectas', value: questions.length - score }];
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
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-accent" /> {score} correctas</span>
          <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-destructive" /> {questions.length - score} incorrectas</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Total acumulado: <span className="font-bold text-accent">{totalCorrect}/150</span></p>
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
          <motion.div className={`h-full rounded-full ${timeLeft > 30 ? 'bg-accent' : timeLeft > 10 ? 'bg-neon-orange' : 'bg-destructive'}`}
            animate={{ width: `${(timeLeft / 60) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className={`text-sm font-mono font-bold ${timerColor}`}>{timeLeft}s</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <p className="font-display font-bold text-base md:text-lg mb-4 text-foreground break-words">{currentQ.pregunta}</p>
              {currentQ.imagen_url && <img src={currentQ.imagen_url} alt="Pregunta" className="rounded-lg mb-4 max-w-full h-auto" />}
              <div className="space-y-2">
                {currentQ.opciones.map((opcion, i) => {
                  let bg = 'bg-card hover:bg-muted';
                  if (state === 'feedback' && selected !== null) {
                    if (i === currentQ.respuesta_correcta) bg = 'bg-accent/20 border-accent';
                    else if (i === selected && i !== currentQ.respuesta_correcta) bg = 'bg-destructive/20 border-destructive';
                  }
                  return (
                    <motion.button key={i} whileHover={state === 'playing' ? { scale: 1.01 } : {}} whileTap={state === 'playing' ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswer(i)} disabled={state !== 'playing'}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground break-words ${bg} ${state === 'playing' ? 'cursor-pointer' : 'cursor-default'}`}>
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
