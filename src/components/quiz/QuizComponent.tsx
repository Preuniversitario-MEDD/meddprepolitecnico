import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Timer, CheckCircle, XCircle, Trophy, RotateCcw, Zap } from 'lucide-react';
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

    if (isComplete && !existingProgress?.completada) {
      await autoUnlockNextSession();
    }
  }

  async function autoUnlockNextSession() {
    const { data: currentSession } = await supabase.from('sesiones').select('numero').eq('id', sesionId).single();
    if (!currentSession) return;
    const { data: nextSession } = await supabase.from('sesiones').select('id, numero, titulo').eq('numero', currentSession.numero + 1).single();
    if (!nextSession) return;
    await supabase.from('sesion_estudiante').upsert({
      user_id: userId, sesion_id: nextSession.id, desbloqueada: true,
    } as any, { onConflict: 'user_id,sesion_id' });
    toast.success(`🔓 ¡Sesión ${nextSession.numero} desbloqueada!`, { description: nextSession.titulo, duration: 5000 });
  }

  const currentQ = questions[currentIndex];
  const timerPct = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 30 ? 'text-neon-mint' : timeLeft > 10 ? 'text-neon-orange' : 'text-destructive';
  const timerBg = timeLeft > 30 ? 'bg-neon-mint' : timeLeft > 10 ? 'bg-neon-orange' : 'bg-destructive';

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground text-sm">No hay preguntas disponibles para esta sesión</p>
      </div>
    );
  }

  // IDLE STATE
  if (state === 'idle') {
    const progressPct = Math.min((totalCorrect / 150) * 100, 100);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-neon-violet/5 overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-neon-violet flex items-center justify-center shadow-lg shadow-primary/25">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Quiz ESPOL</h2>
              <p className="text-sm text-muted-foreground mt-1">{questions.length} preguntas · 60s por pregunta</p>
            </div>

            {/* Progress tracker */}
            <div className="max-w-sm mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progreso acumulado</span>
                <span className={progressPct >= 100 ? 'text-neon-mint font-bold' : 'text-primary'}>{totalCorrect}/150</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted/60 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-neon-mint"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Intentos realizados: <span className="font-semibold text-foreground">{totalAttempts}</span></p>
            </div>

            <Button onClick={startQuiz} size="lg" className="bg-gradient-to-r from-primary to-neon-violet text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2 px-8">
              <Zap className="w-4 h-4" /> Comenzar Quiz
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // RESULTS STATE
  if (state === 'results') {
    const finalScore = scoreRef.current;
    const finalPct = Math.round((finalScore / questions.length) * 100);
    const pieData = [{ name: 'Correctas', value: finalScore }, { name: 'Incorrectas', value: questions.length - finalScore }];
    const COLORS = ['hsl(var(--neon-mint))', 'hsl(var(--destructive))'];

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-6 text-center space-y-5">
            <h2 className="text-xl font-display font-bold text-foreground">
              {finalPct >= 90 ? '🎉 ¡Excelente!' : finalPct >= 70 ? '👏 ¡Bien hecho!' : '💪 ¡Sigue practicando!'}
            </h2>

            <div className="relative w-40 h-40 mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={4} startAngle={90} endAngle={-270}>
                    {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? '#34d399' : '#f87171'} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold font-display text-foreground">{finalPct}%</span>
              </div>
            </div>

            <div className="flex justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-mint/10 border border-neon-mint/20">
                <CheckCircle className="w-4 h-4 text-neon-mint" /> <span className="font-semibold text-foreground">{finalScore}</span> <span className="text-muted-foreground">correctas</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="w-4 h-4 text-destructive" /> <span className="font-semibold text-foreground">{questions.length - finalScore}</span> <span className="text-muted-foreground">incorrectas</span>
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              Total acumulado: <span className="font-bold text-primary">{totalCorrect}/150</span>
            </div>

            <Button onClick={() => { loadQuestions(); setState('idle'); }} className="gap-2 bg-gradient-to-r from-primary to-neon-violet text-primary-foreground shadow-lg shadow-primary/20">
              <RotateCcw className="w-4 h-4" /> Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // PLAYING / FEEDBACK STATE
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold font-display text-foreground bg-primary/10 px-2.5 py-1 rounded-lg">{currentIndex + 1}/{questions.length}</span>
        <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-neon-violet"
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-2.5">
        <Timer className={`w-4 h-4 ${timerColor}`} />
        <div className="w-40 h-2 rounded-full bg-muted/60 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${timerBg}`}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className={`text-xs font-mono font-bold ${timerColor} min-w-[2.5rem] text-right`}>{timeLeft}s</span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <Card className="border-border/50 bg-card overflow-hidden">
            <CardContent className="p-4 md:p-6 space-y-4">
              <p className="font-display font-bold text-base md:text-lg text-foreground break-words leading-snug">{currentQ.pregunta}</p>
              {currentQ.imagen_url && (
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <img src={currentQ.imagen_url} alt="Pregunta" className="w-full h-auto" />
                </div>
              )}
              <div className="space-y-2">
                {currentQ.opciones.map((opcion, i) => {
                  const isCorrect = i === currentQ.respuesta_correcta;
                  const isSelected = i === selected;
                  let classes = 'border-border/60 bg-card hover:bg-muted/50 hover:border-primary/30';
                  if (state === 'feedback' && selected !== null) {
                    if (isCorrect) classes = 'border-neon-mint/50 bg-neon-mint/10';
                    else if (isSelected && !isCorrect) classes = 'border-destructive/50 bg-destructive/10';
                    else classes = 'border-border/30 bg-card opacity-60';
                  }
                  return (
                    <motion.button
                      key={i}
                      whileHover={state === 'playing' ? { scale: 1.01 } : {}}
                      whileTap={state === 'playing' ? { scale: 0.99 } : {}}
                      onClick={() => handleAnswer(i)}
                      disabled={state !== 'playing'}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all text-sm text-foreground break-words ${classes} ${state === 'playing' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shrink-0 ${
                          state === 'feedback' && isCorrect ? 'bg-neon-mint/20 text-neon-mint' :
                          state === 'feedback' && isSelected && !isCorrect ? 'bg-destructive/20 text-destructive' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="pt-0.5">{opcion}</span>
                      </div>
                      {state === 'feedback' && isCorrect && (
                        <CheckCircle className="w-4 h-4 text-neon-mint absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
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
