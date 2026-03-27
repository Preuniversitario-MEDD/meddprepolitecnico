import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timer, ArrowLeft, CheckCircle, XCircle, AlertTriangle, RotateCcw, Trophy, Flag, Eye } from 'lucide-react';
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
  modo: 'libre' | 'secuencial';
}

const DEFAULT_CONFIG: ExamConfig = {
  tiempo_minutos: 50,
  cantidad_preguntas: 30,
  puntaje_aprobacion: 80,
  label: 'Examen',
  sessions: [],
  isFinal: false,
  modo: 'libre',
};

export default function SectionExam() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const location = window.location.pathname;
  const isAdminPreview = location.startsWith('/admin/exam-preview');
  const { user, role } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Map<number, { selected: number; correct: boolean }>>(new Map());
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [timeLeft, setTimeLeft] = useState(0);
  const [state, setState] = useState<'loading' | 'playing' | 'results'>('loading');
  const [weightedScore, setWeightedScore] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertPlayedRef = useRef(false);

  useEffect(() => {
    if (tipo && user) loadExamConfig();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tipo, user]);

  // Sound alert at 10 seconds
  const playAlertSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + i * 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.15);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.15);
      }
    } catch { /* silent */ }
  }, []);

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
        modo: (cfg as any).modo || 'libre',
      };
      setConfig(examCfg);
      setTimeLeft(examCfg.tiempo_minutos * 60);

      if (user && !isAdminPreview) {
        const { data: prevExams } = await supabase.from('examenes').select('*').eq('user_id', user.id).eq('tipo', tipo!);
        const attemptCount = prevExams?.length || 0;
        setAttemptNumber(attemptCount + 1);

        const bestScore = prevExams ? Math.max(0, ...prevExams.map((e: any) => Number(e.puntaje))) : 0;
        const anyApproved = prevExams?.some((e: any) => e.aprobado);

        if (!anyApproved && attemptCount >= 3) {
          if (bestScore < 70) {
            setState('blocked' as any);
            return;
          }
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
    if (isFinal) query = query.order('dificultad', { ascending: false });

    const { data: allQ } = await query;
    if (!allQ || allQ.length === 0) return;

    let pool = allQ;
    // Avoid repeating questions until bank is exhausted (for all exam types)
    if (user && !isAdminPreview) {
      const { data: history } = await supabase.from('examen_historial').select('pregunta_id').eq('user_id', user.id).eq('exam_tipo', tipo!);
      if (history && history.length > 0) {
        const answeredIds = new Set(history.map(h => h.pregunta_id));
        const fresh = pool.filter(q => !answeredIds.has(q.id));
        // If enough fresh questions, use them; otherwise reset (use full bank)
        if (fresh.length >= count) {
          pool = fresh;
        }
        // If not enough fresh questions, use the full pool (bank exhausted, restart)
      }
    }

    if (isFinal) {
      const hard = pool.filter(q => q.dificultad >= 4);
      const medium = pool.filter(q => q.dificultad >= 3 && q.dificultad < 4);
      const rest = pool.filter(q => q.dificultad < 3);
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
      dificultad: q.dificultad || 1,
    }));
    setQuestions(mapped);
    setState('playing');
    alertPlayedRef.current = false;
    startTimer();
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 11 && prev > 10 && !alertPlayedRef.current) {
          alertPlayedRef.current = true;
          playAlertSound();
        }
        if (prev <= 1) { finishExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleAnswer(index: number) {
    setSelected(index);
    const q = questions[currentIndex];
    const correct = index === q.respuesta_correcta;
    setAnsweredMap(prev => new Map(prev).set(currentIndex, { selected: index, correct }));

    // In sequential mode, auto-advance after selecting
    if (config.modo === 'secuencial') {
      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(prev => prev + 1);
          setSelected(null);
        }
      }, 300);
    }
  }

  function goToQuestion(idx: number) {
    // In sequential mode, can't go back to previous questions
    if (config.modo === 'secuencial' && idx < currentIndex) return;
    setCurrentIndex(idx);
    const ans = answeredMap.get(idx);
    setSelected(ans ? ans.selected : null);
  }

  async function finishExam() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setState('results');

    const isFinal = config.isFinal;
    const answeredArr = Array.from(answeredMap.entries()).map(([idx, ans]) => ({
      questionId: questions[idx].id,
      correct: ans.correct,
      dificultad: questions[idx].dificultad,
    }));

    let finalPct: number;
    if (isFinal) {
      const pointsPerQ = 1000 / questions.length;
      const earned = answeredArr.filter(a => a.correct).length * pointsPerQ;
      finalPct = Math.round(earned);
    } else {
      const correctCount = answeredArr.filter(a => a.correct).length;
      finalPct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    }
    setWeightedScore(finalPct);

    const aprobado = finalPct >= config.puntaje_aprobacion;

    if (user && !isAdminPreview) {
      await supabase.from('examenes').insert({
        user_id: user.id,
        tipo: tipo!,
        puntaje: finalPct,
        aprobado,
        respuestas: answeredArr as any,
      });

      if (answeredArr.length > 0) {
        const historyRows = answeredArr.map(a => ({
          user_id: user.id,
          exam_tipo: tipo!,
          pregunta_id: a.questionId,
          correcta: a.correct,
          intento: attemptNumber,
        }));
        await supabase.from('examen_historial').insert(historyRows);
      }
    }

    if (isFinal && finalPct >= 900) {
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
  const maxScore = config.isFinal ? 1000 : 100;
  const isLastFiveMin = timeLeft <= 300 && timeLeft > 10;
  const isLastTenSec = timeLeft <= 10;

  const backPath = isAdminPreview ? '/admin/exams' : '/student';

  if (state === 'loading') return <div className="p-6 text-center text-muted-foreground">Cargando examen...</div>;

  if ((state as string) === 'blocked') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-destructive">Intentos Agotados</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Has usado tus 3 intentos sin alcanzar el puntaje mínimo. Debes repasar las sesiones de este examen para poder intentarlo nuevamente.
          </p>
          <Button onClick={() => navigate(backPath)} className="gradient-primary text-primary-foreground">Volver a las sesiones</Button>
        </motion.div>
      </div>
    );
  }

  if (state === 'results') {
    const correctCount = Array.from(answeredMap.values()).filter(a => a.correct).length;
    const answeredCount = answeredMap.size;
    const aprobado = weightedScore >= config.puntaje_aprobacion;
    const [showReview, setShowReviewState] = useState(false);

    return (
      <div className="p-4 md:p-6 space-y-6 max-h-screen overflow-y-auto">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          {config.isFinal && weightedScore >= 900 ? (
            <>
              <div className="text-6xl mb-2">🏆</div>
              <h1 className="text-3xl font-display font-bold text-[hsl(var(--neon-orange))]">¡EXTRAORDINARIO!</h1>
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
              Respondiste {answeredCount} de {questions.length} preguntas
            </p>
          )}
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-accent" /> {correctCount} correctas</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-destructive" /> {answeredCount - correctCount} incorrectas</span>
          </div>
          <p className="text-xs text-muted-foreground">Intento #{attemptNumber} {!config.isFinal && 'de 3'}</p>
          {!aprobado && attemptNumber >= 3 && weightedScore < 70 && (
            <p className="text-xs text-destructive"><AlertTriangle className="w-3.5 h-3.5 inline" /> Intentos agotados. Repasa las sesiones.</p>
          )}
          {!aprobado && attemptNumber >= 3 && weightedScore >= 70 && (
            <p className="text-xs text-[hsl(var(--neon-orange))]">✨ Obtuviste ≥70, tienes una oportunidad extra.</p>
          )}
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setShowReviewState(!showReview)} className="gap-2">
              <Eye className="w-4 h-4" /> {showReview ? 'Ocultar Revisión' : 'Revisar Respuestas'}
            </Button>
            {!aprobado && (
              <Button onClick={() => {
                finishedRef.current = false;
                setAnsweredMap(new Map());
                setCurrentIndex(0);
                setSelected(null);
                setWeightedScore(0);
                setState('loading');
                loadExamConfig();
              }} className="gradient-primary text-primary-foreground gap-2">
                <RotateCcw className="w-4 h-4" /> Repetir Examen
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(backPath)}>Volver al Dashboard</Button>
          </div>
        </motion.div>

        {/* Answer review */}
        {showReview && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pb-6">
            <h3 className="font-display font-bold text-lg text-foreground">Revisión de Respuestas</h3>
            {questions.map((q, idx) => {
              const ans = answeredMap.get(idx);
              const wasCorrect = ans?.correct;
              const selectedIdx = ans?.selected;
              const notAnswered = selectedIdx === undefined;
              return (
                <Card key={q.id} className={`border-l-4 ${notAnswered ? 'border-muted' : wasCorrect ? 'border-accent' : 'border-destructive'}`}>
                  <CardContent className="p-3 md:p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${notAnswered ? 'bg-muted text-muted-foreground' : wasCorrect ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground">{q.pregunta}</p>
                    </div>
                    {q.imagen_url && <img src={q.imagen_url} alt="" className="rounded-lg max-w-full h-auto max-h-32" />}
                    <div className="space-y-1">
                      {q.opciones.map((op, i) => {
                        const isCorrectAnswer = i === q.respuesta_correcta;
                        const wasSelected = selectedIdx === i;
                        let bg = 'bg-card border-border';
                        if (isCorrectAnswer) bg = 'bg-accent/15 border-accent text-accent';
                        else if (wasSelected && !isCorrectAnswer) bg = 'bg-destructive/15 border-destructive text-destructive';
                        return (
                          <div key={i} className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${bg}`}>
                            {isCorrectAnswer && <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />}
                            {wasSelected && !isCorrectAnswer && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                            {!isCorrectAnswer && !wasSelected && <span className="w-3.5 shrink-0" />}
                            <span><span className="font-medium mr-1">{String.fromCharCode(65 + i)}.</span>{op}</span>
                          </div>
                        );
                      })}
                    </div>
                    {notAnswered && <p className="text-[10px] text-muted-foreground italic">No respondida</p>}
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}
      </div>
    );
  }

  // Playing state - polytechnic format
  return (
    <div className="h-screen flex flex-col select-none" onContextMenu={e => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Top bar with timer */}
      {isAdminPreview && (
        <div className="bg-[hsl(var(--neon-violet))]/20 text-[hsl(var(--neon-violet))] text-xs text-center py-1 font-medium">
          👁️ Vista previa del administrador — Los resultados no se guardarán
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div>
          <h1 className="text-sm font-display font-bold text-foreground">{config.label}</h1>
          <p className="text-[10px] text-muted-foreground">{isAdminPreview ? 'Modo vista previa' : `Intento #${attemptNumber}`} · {answeredMap.size}/{questions.length} respondidas</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg transition-all ${
          isLastTenSec ? 'bg-destructive text-white animate-pulse scale-110' :
          isLastFiveMin ? 'bg-destructive/20 text-destructive' : 'bg-muted text-foreground'
        }`}>
          <Timer className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
        <Button size="sm" variant="destructive" onClick={finishExam} className="gap-1">
          <Flag className="w-4 h-4" /> Finalizar
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - question navigator */}
        <div className="w-20 md:w-24 border-r bg-muted/30 shrink-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              <p className="text-[9px] text-muted-foreground text-center font-medium mb-2">
                {questions.length} preguntas
              </p>
              {questions.map((_, idx) => {
                const answered = answeredMap.has(idx);
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx)}
                    disabled={config.modo === 'secuencial' && idx < currentIndex}
                    className={`w-full h-8 rounded text-xs font-bold transition-all ${
                      isActive ? 'ring-2 ring-primary bg-primary text-primary-foreground' :
                      answered ? 'bg-[hsl(160,60%,50%)] text-white border border-[hsl(160,60%,45%)] shadow-[0_0_6px_hsl(160,60%,50%/0.4)]' :
                      'bg-muted text-muted-foreground border border-border'
                    } ${config.modo === 'secuencial' && idx < currentIndex ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-3">
            <Progress value={(answeredMap.size / questions.length) * 100} className="h-1.5" />
          </div>

          {currentQ && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card className="card-elevated">
                  <CardContent className="p-4 md:p-6">
                    <p className="text-xs text-muted-foreground mb-2">Pregunta {currentIndex + 1} de {questions.length}</p>
                    <p className="font-display font-bold text-base md:text-lg mb-4 text-foreground"
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>{currentQ.pregunta}</p>
                    {currentQ.imagen_url && (
                      <img src={currentQ.imagen_url} alt="Pregunta" className="rounded-lg mb-4 max-w-full h-auto pointer-events-none" draggable={false} />
                    )}
                    <div className="space-y-2">
                      {currentQ.opciones.map((op, i) => {
                        const ans = answeredMap.get(currentIndex);
                        const isSelected = ans?.selected === i;
                        let bg = 'bg-card hover:bg-muted border-border';
                        if (isSelected) {
                          bg = 'bg-primary/20 border-primary ring-1 ring-primary';
                        }
                        return (
                          <button key={i} onClick={() => handleAnswer(i)}
                            className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground ${bg} cursor-pointer`}
                            style={{ userSelect: 'none' }}>
                            <span className="font-medium mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{op}
                          </button>
                        );
                      })}
                    </div>
                    {/* Navigation */}
                    <div className="flex justify-between mt-4">
                      <Button size="sm" variant="ghost"
                        disabled={currentIndex === 0 || config.modo === 'secuencial'}
                        onClick={() => goToQuestion(currentIndex - 1)}>← Anterior</Button>
                      <Button size="sm" variant="ghost" disabled={currentIndex === questions.length - 1}
                        onClick={() => goToQuestion(currentIndex + 1)}>Siguiente →</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
