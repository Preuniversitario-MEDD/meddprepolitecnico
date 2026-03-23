import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Timer, ArrowLeft, CheckCircle, XCircle, AlertTriangle, RotateCcw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamQuestion {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  imagen_url: string | null;
  dificultad: number;
}

interface ExamConfig {
  tiempo_minutos: number;
  cantidad_preguntas: number;
  puntaje_aprobacion: number;
  label: string;
  sessions: number[];
  isFinal: boolean;
}

const DEFAULT_CONFIG: ExamConfig = {
  tiempo_minutos: 50,
  cantidad_preguntas: 30,
  puntaje_aprobacion: 80,
  label: 'Examen',
  sessions: [],
  isFinal: false,
};

export default function SectionExam() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean; dificultad: number }[]>([]);
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [timeLeft, setTimeLeft] = useState(0);
  const [state, setState] = useState<'loading' | 'playing' | 'results'>('loading');
  const [weightedScore, setWeightedScore] = useState(0);
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef<typeof answers>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (tipo && user) loadExamConfig();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tipo, user]);

  async function loadExamConfig() {
    const { data: cfg } = await supabase.from('exam_configuracion').select('*').eq('tipo', tipo!).single();
    const isFinal = tipo === 'exam_final';

    if (cfg) {
      const examCfg: ExamConfig = {
        tiempo_minutos: (cfg as any).tiempo_minutos,
        cantidad_preguntas: (cfg as any).cantidad_preguntas,
        puntaje_aprobacion: (cfg as any).puntaje_aprobacion,
        label: (cfg as any).label || 'Examen',
        sessions: (cfg as any).sessions || [],
        isFinal,
      };
      setConfig(examCfg);
      setTimeLeft(examCfg.tiempo_minutos * 60);

      // Check attempt count and enforce limit
      if (user) {
        const { data: prevExams } = await supabase.from('examenes').select('*').eq('user_id', user.id).eq('tipo', tipo!);
        const attemptCount = prevExams?.length || 0;
        setAttemptNumber(attemptCount + 1);

        const bestScore = prevExams ? Math.max(0, ...prevExams.map((e: any) => Number(e.puntaje))) : 0;
        const anyApproved = prevExams?.some((e: any) => e.aprobado);

        if (!anyApproved && attemptCount >= 3) {
          if (bestScore < 70) {
            // Blocked - must redo sessions
            setState('blocked' as any);
            return;
          }
          // Allow extra attempt if score >= 70
        }
      }

      await loadExamQuestions(examCfg.sessions, examCfg.cantidad_preguntas, isFinal);
    } else {
      setTimeLeft(DEFAULT_CONFIG.tiempo_minutos * 60);
    }
  }

  async function loadExamQuestions(sessions: number[], count: number, isFinal: boolean) {
    const { data: sesiones } = await supabase.from('sesiones').select('id, numero').in('numero', sessions);
    if (!sesiones) return;
    const sesionIds = sesiones.map(s => s.id);

    let query = supabase.from('quiz_preguntas').select('*').in('sesion_id', sesionIds);
    // For final exam, prefer high difficulty
    if (isFinal) {
      query = query.order('dificultad', { ascending: false });
    }

    const { data: allQ } = await query;
    if (!allQ || allQ.length === 0) return;

    // For final exam, try to avoid questions the student already answered
    let pool = allQ;
    if (isFinal && user) {
      const { data: history } = await supabase.from('examen_historial' as any).select('pregunta_id').eq('user_id', user.id).eq('exam_tipo', tipo!);
      if (history && history.length > 0) {
        const answeredIds = new Set((history as any[]).map(h => h.pregunta_id));
        const fresh = pool.filter(q => !answeredIds.has(q.id));
        // If enough fresh questions, use them; otherwise mix
        if (fresh.length >= count) {
          pool = fresh;
        }
      }
      // For final, prioritize high difficulty (4-5)
      const hard = pool.filter(q => (q as any).dificultad >= 4);
      const medium = pool.filter(q => (q as any).dificultad >= 3 && (q as any).dificultad < 4);
      const rest = pool.filter(q => (q as any).dificultad < 3);
      pool = [...hard, ...medium, ...rest];
    }

    const shuffled = isFinal
      ? pool.slice(0, count * 2).sort(() => Math.random() - 0.5).slice(0, count)
      : pool.sort(() => Math.random() - 0.5).slice(0, count);

    const mapped = shuffled.map(q => ({
      id: q.id,
      pregunta: q.pregunta,
      opciones: (q.opciones as string[]) || [],
      respuesta_correcta: q.respuesta_correcta,
      imagen_url: q.imagen_url,
      dificultad: (q as any).dificultad || 1,
    }));
    setQuestions(mapped);
    setMaxPossibleScore(isFinal ? 1000 : mapped.reduce((sum, q) => sum + q.dificultad, 0));
    setState('playing');
    startTimer();
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { finishExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleAnswer(index: number) {
    if (selected !== null) return;
    setSelected(index);
    const q = questions[currentIndex];
    const correct = index === q.respuesta_correcta;
    const newAnswer = { questionId: q.id, correct, dificultad: q.dificultad };
    answersRef.current = [...answersRef.current, newAnswer];
    setAnswers(answersRef.current);

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        finishExam();
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelected(null);
      }
    }, 1000);
  }

  async function finishExam() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setState('results');

    const currentAnswers = answersRef.current;
    const isFinal = config.isFinal;

    let finalPct: number;
    if (isFinal) {
      // Final exam: each question = 1000/total_questions points
      const pointsPerQ = 1000 / questions.length;
      const earned = currentAnswers.filter(a => a.correct).length * pointsPerQ;
      finalPct = Math.round(earned);
    } else {
      const earnedPoints = currentAnswers.filter(a => a.correct).reduce((sum, a) => sum + a.dificultad, 0);
      const totalPossible = maxPossibleScore;
      finalPct = totalPossible > 0 ? Math.round((earnedPoints / totalPossible) * 100) : 0;
    }
    setWeightedScore(finalPct);

    const aprobado = finalPct >= config.puntaje_aprobacion;

    if (user) {
      // Save exam result
      await supabase.from('examenes').insert({
        user_id: user.id,
        tipo: tipo!,
        puntaje: finalPct,
        aprobado,
        respuestas: currentAnswers as any,
      });

      // Save question history for non-repetition
      if (currentAnswers.length > 0) {
        const historyRows = currentAnswers.map(a => ({
          user_id: user.id,
          exam_tipo: tipo!,
          pregunta_id: a.questionId,
          correcta: a.correct,
          intento: attemptNumber,
        }));
        await supabase.from('examen_historial' as any).insert(historyRows);
      }
    }

    if (isFinal && finalPct >= 900) {
      // Epic celebration for 900+
      const duration = 3000;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) { clearInterval(interval); return; }
        confetti({ particleCount: 50, spread: 100, origin: { x: Math.random(), y: Math.random() * 0.6 } });
      }, 150);
    } else if (aprobado) {
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const currentQ = questions[currentIndex];
  const timerWarn = timeLeft < 300;
  const maxScore = config.isFinal ? 1000 : 100;

  if (state === 'loading') return <div className="p-6 text-center text-muted-foreground">Cargando examen...</div>;

  if ((state as string) === 'blocked') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/student')} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-destructive">Intentos Agotados</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Has usado tus 3 intentos sin alcanzar el puntaje mínimo. Debes repasar las sesiones de este examen para poder intentarlo nuevamente.
          </p>
          <p className="text-xs text-muted-foreground">Si hubieras obtenido ≥70/100 tendrías una oportunidad extra.</p>
          <Button onClick={() => navigate('/student')} className="gradient-primary text-primary-foreground">Volver a las sesiones</Button>
        </motion.div>
      </div>
    );
  }


  if (state === 'results') {
    const correctCount = answersRef.current.filter(a => a.correct).length;
    const answeredCount = answersRef.current.length;
    const aprobado = weightedScore >= config.puntaje_aprobacion;

    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/student')} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          {config.isFinal && weightedScore >= 900 ? (
            <>
              <div className="text-6xl mb-2">🏆</div>
              <h1 className="text-3xl font-display font-bold text-[hsl(var(--neon-orange))]">
                ¡EXTRAORDINARIO!
              </h1>
              <p className="text-lg text-muted-foreground">Has demostrado un dominio excepcional</p>
            </>
          ) : (
            <h1 className="text-3xl font-display font-bold">
              {aprobado ? '🎉 ¡Examen Aprobado!' : '😔 No aprobado'}
            </h1>
          )}
          <p className="text-5xl font-bold text-gradient-primary">{weightedScore}/{maxScore}</p>
          <p className="text-muted-foreground">Necesitas {config.puntaje_aprobacion}/{maxScore} para aprobar</p>
          {answeredCount < questions.length && (
            <p className="text-sm text-destructive flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Respondiste {answeredCount} de {questions.length} preguntas (tiempo agotado)
            </p>
          )}
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-accent" /> {correctCount} correctas</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-destructive" /> {answeredCount - correctCount} incorrectas</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {config.isFinal ? `Puntuación sobre ${maxScore} puntos · Intento #${attemptNumber}` : `Puntuación ponderada por dificultad · Intento #${attemptNumber} de 3`}
          </p>
          {!aprobado && attemptNumber >= 3 && weightedScore < 70 && (
            <p className="text-xs text-destructive flex items-center justify-center gap-1 mt-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Has agotado tus 3 intentos. Debes repasar las sesiones.
            </p>
          )}
          {!aprobado && attemptNumber >= 3 && weightedScore >= 70 && (
            <p className="text-xs text-[hsl(var(--neon-orange))] flex items-center justify-center gap-1 mt-1">
              ✨ Obtuviste ≥70, tienes una oportunidad extra.
            </p>
          )}
          <div className="flex justify-center gap-3">
            {!aprobado && (
              <Button onClick={() => {
                finishedRef.current = false;
                answersRef.current = [];
                setAnswers([]);
                setCurrentIndex(0);
                setSelected(null);
                setWeightedScore(0);
                setState('loading');
                loadExamConfig();
              }} className="gradient-primary text-primary-foreground gap-2">
                <RotateCcw className="w-4 h-4" /> Repetir Examen
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/student')}>Volver al Dashboard</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold">{config.label}</h1>
          {config.isFinal && <p className="text-xs text-muted-foreground">Sobre {maxScore} puntos · Alta dificultad</p>}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${timerWarn ? 'bg-destructive/20 text-destructive' : 'bg-muted'}`}>
          {timerWarn && <AlertTriangle className="w-4 h-4" />}
          <Timer className="w-4 h-4" />
          <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">Pregunta {currentIndex + 1} de {questions.length} · No puedes retroceder</p>

      {currentQ && (
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <p className="font-display font-bold text-base md:text-lg mb-4">{currentQ.pregunta}</p>
              {currentQ.imagen_url && <img src={currentQ.imagen_url} alt="Pregunta" className="rounded-lg mb-4 max-w-full h-auto" />}
              <div className="space-y-2">
                {currentQ.opciones.map((op, i) => {
                  let bg = 'bg-card hover:bg-muted';
                  if (selected !== null) {
                    if (i === currentQ.respuesta_correcta) bg = 'bg-accent/20 border-accent';
                    else if (i === selected) bg = 'bg-destructive/20 border-destructive';
                  }
                  return (
                    <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground ${bg} ${selected === null ? 'cursor-pointer' : 'cursor-default'}`}>
                      <span className="font-medium mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{op}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
