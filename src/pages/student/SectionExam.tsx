import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timer, ArrowLeft, CheckCircle, XCircle, AlertTriangle, RotateCcw, Trophy, Flag, Eye, Lock, Zap, BookOpen, FlaskConical, Brain } from 'lucide-react';
import confetti from 'canvas-confetti';
import ExamRuleta from '@/components/exam/ExamRuleta';

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

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { key: 'teoria', label: 'Nivel 1 — Teoría', icon: BookOpen, color: 'neon-blue', range: [1, 2], desc: 'Preguntas conceptuales y de memoria' },
  { key: 'practica', label: 'Nivel 2 — Práctica', icon: FlaskConical, color: 'neon-orange', range: [3, 3], desc: 'Aplicación de fórmulas y procedimientos' },
  { key: 'analisis', label: 'Nivel 3 — Análisis', icon: Brain, color: 'neon-fuchsia', range: [4, 5], desc: 'Razonamiento, análisis y problemas complejos' },
];

type ExamView = 'levels' | 'playing' | 'results' | 'ruleta';

export default function SectionExam() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const location = window.location.pathname;
  const isAdminPreview = location.startsWith('/admin/exam-preview');
  const { user, role } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Map<number, { selected: number; correct: boolean }>>(new Map());
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [timeLeft, setTimeLeft] = useState(0);
  const [view, setView] = useState<ExamView>('levels');
  const [weightedScore, setWeightedScore] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertPlayedRef = useRef(false);
  const [showReview, setShowReview] = useState(false);
  const examStartRef = useRef<Date | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelScores, setLevelScores] = useState<number[]>([0, 0, 0]);
  const [levelsUnlocked, setLevelsUnlocked] = useState([true, false, false]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tipo && user) loadExamConfig();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tipo, user]);

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
    } catch {}
  }, []);

  async function loadExamConfig() {
    setLoading(true);
    const { data: cfg } = await supabase.from('exam_configuracion').select('*').eq('tipo', tipo!).single();
    const isFinal = tipo === 'exam_final';

    if (cfg) {
      if (user && !isAdminPreview) {
        const { data: bloqueo } = await supabase.from('exam_bloqueos').select('id').eq('user_id', user.id).eq('exam_tipo', tipo!).maybeSingle();
        if (bloqueo) { setView('blocked' as any); setLoading(false); return; }
      }

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

      if (user && !isAdminPreview) {
        const { data: prevExams } = await supabase.from('examenes').select('*').eq('user_id', user.id).eq('tipo', tipo!);
        const attemptCount = prevExams?.length || 0;
        setAttemptNumber(attemptCount + 1);
        const bestScore = prevExams ? Math.max(0, ...prevExams.map((e: any) => Number(e.puntaje))) : 0;
        const anyApproved = prevExams?.some((e: any) => e.aprobado);
        if (!anyApproved && attemptCount >= 3 && bestScore < 70) {
          setView('blocked' as any); setLoading(false); return;
        }
      }

      await loadAllQuestions(examCfg.sessions, examCfg.cantidad_preguntas, isFinal);
    }
    setLoading(false);
  }

  async function loadAllQuestions(sessions: number[], count: number, isFinal: boolean) {
    const { data: sesiones } = await supabase.from('sesiones').select('id, numero').in('numero', sessions);
    if (!sesiones) return;
    const sesionIds = sesiones.map(s => s.id);

    let query = supabase.from('quiz_preguntas').select('*').in('sesion_id', sesionIds);
    if (isFinal) query = query.order('dificultad', { ascending: false });

    const { data: allQ } = await query;
    if (!allQ || allQ.length === 0) return;

    let pool = allQ;
    if (user && !isAdminPreview) {
      const { data: history } = await supabase.from('examen_historial').select('pregunta_id').eq('user_id', user.id).eq('exam_tipo', tipo!);
      if (history && history.length > 0) {
        const answeredIds = new Set(history.map(h => h.pregunta_id));
        const fresh = pool.filter(q => !answeredIds.has(q.id));
        if (fresh.length >= count) pool = fresh;
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
    setAllQuestions(mapped);
    setView('levels');
  }

  function startLevel(levelIdx: number) {
    const level = DIFFICULTY_LEVELS[levelIdx];
    const levelQuestions = allQuestions.filter(q => q.dificultad >= level.range[0] && q.dificultad <= level.range[1]);
    
    if (levelQuestions.length === 0) {
      // If no questions for this level, auto-pass and unlock next
      const newScores = [...levelScores];
      newScores[levelIdx] = 100;
      setLevelScores(newScores);
      if (levelIdx < 2) {
        const newUnlocked = [...levelsUnlocked];
        newUnlocked[levelIdx + 1] = true;
        setLevelsUnlocked(newUnlocked);
      }
      return;
    }

    setQuestions(levelQuestions);
    setCurrentIndex(0);
    setSelected(null);
    setAnsweredMap(new Map());
    setCurrentLevel(levelIdx);
    setTimeLeft(config.tiempo_minutos * 60);
    finishedRef.current = false;
    alertPlayedRef.current = false;
    examStartRef.current = new Date();
    setView('playing');
    startTimer();
  }

  function startRuleta() {
    setView('ruleta');
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 11 && prev > 10 && !alertPlayedRef.current) {
          alertPlayedRef.current = true;
          playAlertSound();
        }
        if (prev <= 1) { finishLevel(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleAnswer(index: number) {
    setSelected(index);
    const q = questions[currentIndex];
    const correct = index === q.respuesta_correcta;
    setAnsweredMap(prev => new Map(prev).set(currentIndex, { selected: index, correct }));
    // NO auto-advance — user controls navigation
  }

  function goToQuestion(idx: number) {
    if (config.modo === 'secuencial' && idx < currentIndex) return;
    setCurrentIndex(idx);
    const ans = answeredMap.get(idx);
    setSelected(ans ? ans.selected : null);
  }

  function finishLevel() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const correctCount = Array.from(answeredMap.values()).filter(a => a.correct).length;
    const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    const newScores = [...levelScores];
    newScores[currentLevel] = pct;
    setLevelScores(newScores);

    // Unlock next level if ≥60%
    if (pct >= 60 && currentLevel < 2) {
      const newUnlocked = [...levelsUnlocked];
      newUnlocked[currentLevel + 1] = true;
      setLevelsUnlocked(newUnlocked);
    }

    // Check if all levels done -> compute final
    const allDone = newScores.every(s => s > 0) || currentLevel === 2;
    if (allDone) {
      // Weighted: level1=20%, level2=30%, level3=50%
      const weights = [0.2, 0.3, 0.5];
      const finalPct = Math.round(newScores.reduce((sum, s, i) => sum + s * weights[i], 0));
      setWeightedScore(finalPct);
      saveExamResult(finalPct);
      setView('results');
    } else {
      setView('levels');
    }
  }

  async function saveExamResult(finalPct: number) {
    const aprobado = finalPct >= config.puntaje_aprobacion;

    if (user && !isAdminPreview) {
      const horaFin = new Date();
      await supabase.from('examenes').insert({
        user_id: user.id,
        tipo: tipo!,
        puntaje: config.isFinal ? Math.round(finalPct * 10) : finalPct,
        aprobado,
        respuestas: allQuestions.map(q => ({ questionId: q.id })) as any,
        hora_inicio: examStartRef.current?.toISOString() || horaFin.toISOString(),
        hora_fin: horaFin.toISOString(),
      } as any);

      const historyRows = allQuestions.map(q => ({
        user_id: user.id,
        exam_tipo: tipo!,
        pregunta_id: q.id,
        correcta: false,
        intento: attemptNumber,
      }));
      if (historyRows.length > 0) await supabase.from('examen_historial').insert(historyRows);
    }

    if (aprobado) {
      if (config.isFinal && finalPct >= 90) {
        const duration = 3000;
        const end = Date.now() + duration;
        const interval = setInterval(() => {
          if (Date.now() > end) { clearInterval(interval); return; }
          confetti({ particleCount: 50, spread: 100, origin: { x: Math.random(), y: Math.random() * 0.6 } });
        }, 150);
      } else {
        confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
      }
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const currentQ = questions[currentIndex];
  const maxScore = config.isFinal ? 1000 : 100;
  const isLastFiveMin = timeLeft <= 300 && timeLeft > 10;
  const isLastTenSec = timeLeft <= 10;
  const backPath = isAdminPreview ? '/admin/exams' : '/student';

  if (loading) return <div className="p-6 text-center text-muted-foreground">Cargando examen...</div>;

  if ((view as string) === 'blocked') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-destructive">Intentos Agotados</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Has usado tus 3 intentos sin alcanzar el puntaje mínimo. Debes repasar las sesiones.</p>
          <Button onClick={() => navigate(backPath)} className="gradient-primary text-primary-foreground">Volver</Button>
        </motion.div>
      </div>
    );
  }

  // === LEVELS SELECTION VIEW ===
  if (view === 'levels') {
    const ruletaQuestions = allQuestions.filter(q => q.dificultad >= 3);
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">{config.label}</h1>
            <p className="text-xs text-muted-foreground">Intento #{attemptNumber} · Completa los 3 niveles de dificultad</p>
          </div>
        </div>

        {isAdminPreview && (
          <div className="bg-neon-violet/20 text-neon-violet text-xs text-center py-2 rounded-lg font-medium">
            👁️ Vista previa — Los resultados no se guardarán
          </div>
        )}

        {/* Level Cards */}
        <div className="space-y-3">
          {DIFFICULTY_LEVELS.map((level, idx) => {
            const unlocked = levelsUnlocked[idx];
            const score = levelScores[idx];
            const completed = score > 0;
            const qCount = allQuestions.filter(q => q.dificultad >= level.range[0] && q.dificultad <= level.range[1]).length;
            const Icon = level.icon;

            return (
              <motion.div
                key={level.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`border-l-4 transition-all ${
                  completed ? 'border-accent bg-accent/5' :
                  unlocked ? `border-${level.color} hover:shadow-lg cursor-pointer` :
                  'border-muted opacity-50'
                }`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      completed ? 'bg-accent/20' :
                      unlocked ? `bg-${level.color}/15` : 'bg-muted'
                    }`}>
                      {!unlocked ? <Lock className="w-6 h-6 text-muted-foreground" /> :
                       completed ? <CheckCircle className="w-6 h-6 text-accent" /> :
                       <Icon className={`w-6 h-6 text-${level.color}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-sm text-foreground">{level.label}</h3>
                      <p className="text-xs text-muted-foreground">{level.desc}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{qCount} preguntas disponibles</p>
                      {completed && (
                        <p className="text-xs font-bold text-accent mt-1">✅ Completado: {score}%</p>
                      )}
                    </div>
                    {unlocked && !completed && qCount > 0 && (
                      <Button
                        size="sm"
                        onClick={() => startLevel(idx)}
                        className={`shrink-0 ${
                          idx === 0 ? 'bg-[hsl(var(--neon-blue))] hover:bg-[hsl(var(--neon-blue))]/90' :
                          idx === 1 ? 'bg-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/90' :
                          'bg-[hsl(var(--neon-fuchsia))] hover:bg-[hsl(var(--neon-fuchsia))]/90'
                        } text-white`}
                      >
                        Iniciar
                      </Button>
                    )}
                    {unlocked && !completed && qCount === 0 && (
                      <span className="text-xs text-muted-foreground">Sin preguntas</span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Ruleta bonus */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-2 border-dashed border-neon-fuchsia/40 bg-gradient-to-r from-neon-fuchsia/5 to-neon-violet/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neon-fuchsia/15 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-neon-fuchsia" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-sm text-foreground">🎰 Ruleta de Preguntas</h3>
                <p className="text-xs text-muted-foreground">Pregunta aleatoria con 15s de cuenta regresiva. ¡Acumula puntos!</p>
                <p className="text-[10px] text-muted-foreground">{ruletaQuestions.length} preguntas en el pool</p>
              </div>
              <Button
                size="sm"
                onClick={startRuleta}
                disabled={ruletaQuestions.length === 0}
                className="shrink-0 bg-gradient-to-r from-neon-fuchsia to-neon-violet text-white hover:opacity-90"
              >
                Jugar
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score summary if any levels done */}
        {levelScores.some(s => s > 0) && (
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Progreso por nivel:</span>
              <div className="flex gap-3">
                {DIFFICULTY_LEVELS.map((l, i) => (
                  <span key={l.key} className={`text-xs font-bold ${levelScores[i] > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                    N{i+1}: {levelScores[i]}%
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // === RULETA VIEW ===
  if (view === 'ruleta') {
    const ruletaQuestions = allQuestions.filter(q => q.dificultad >= 3);
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('levels')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-display font-bold text-foreground">🎰 Ruleta de Preguntas</h1>
        </div>
        <ExamRuleta
          questions={ruletaQuestions}
          onFinish={(score, total) => {
            // Ruleta is bonus, just return to levels
          }}
        />
        <Button variant="outline" onClick={() => setView('levels')} className="w-full">Volver a Niveles</Button>
      </div>
    );
  }

  // === RESULTS VIEW ===
  if (view === 'results') {
    const aprobado = weightedScore >= config.puntaje_aprobacion;
    const displayScore = config.isFinal ? Math.round(weightedScore * 10) : weightedScore;

    return (
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto max-h-screen overflow-y-auto">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          {config.isFinal && displayScore >= 900 ? (
            <>
              <div className="text-6xl mb-2">🏆</div>
              <h1 className="text-3xl font-display font-bold text-[hsl(var(--neon-orange))]">¡EXTRAORDINARIO!</h1>
            </>
          ) : (
            <h1 className="text-3xl font-display font-bold">
              {aprobado ? '🎉 ¡Examen Aprobado!' : '😔 No aprobado'}
            </h1>
          )}
          <p className="text-5xl font-bold text-gradient-primary">{displayScore}/{maxScore}</p>
          <p className="text-muted-foreground">Necesitas {config.puntaje_aprobacion}/{maxScore} para aprobar</p>

          {/* Level breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {DIFFICULTY_LEVELS.map((l, i) => (
              <div key={l.key} className="p-3 rounded-xl bg-card border border-border/50">
                <p className="text-xs text-muted-foreground">{l.label.split('—')[0]}</p>
                <p className={`text-lg font-bold ${levelScores[i] >= 60 ? 'text-accent' : 'text-destructive'}`}>{levelScores[i]}%</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">Ponderación: Teoría 20% · Práctica 30% · Análisis 50%</p>
          <p className="text-xs text-muted-foreground">Intento #{attemptNumber}</p>

          <div className="flex justify-center gap-3 flex-wrap">
            {!aprobado && (
              <Button onClick={() => {
                finishedRef.current = false;
                setAnsweredMap(new Map());
                setCurrentIndex(0);
                setSelected(null);
                setWeightedScore(0);
                setLevelScores([0, 0, 0]);
                setLevelsUnlocked([true, false, false]);
                setView('levels');
                loadExamConfig();
              }} className="gradient-primary text-primary-foreground gap-2">
                <RotateCcw className="w-4 h-4" /> Repetir Examen
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(backPath)}>Volver al Dashboard</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // === PLAYING VIEW (level exam) ===
  return (
    <div className="h-screen flex flex-col select-none" onContextMenu={e => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {isAdminPreview && (
        <div className="bg-neon-violet/20 text-neon-violet text-xs text-center py-1 font-medium">
          👁️ Vista previa — Los resultados no se guardarán
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div>
          <h1 className="text-sm font-display font-bold text-foreground">
            {DIFFICULTY_LEVELS[currentLevel].label}
          </h1>
          <p className="text-[10px] text-muted-foreground">{answeredMap.size}/{questions.length} respondidas</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg transition-all ${
          isLastTenSec ? 'bg-destructive text-white animate-pulse scale-110' :
          isLastFiveMin ? 'bg-destructive/20 text-destructive' : 'bg-muted text-foreground'
        }`}>
          <Timer className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
        <Button size="sm" variant="destructive" onClick={finishLevel} className="gap-1">
          <Flag className="w-4 h-4" /> Finalizar Nivel
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question navigator */}
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
                        if (isSelected) bg = 'bg-primary/20 border-primary ring-1 ring-primary';
                        return (
                          <button key={i} onClick={() => handleAnswer(i)}
                            className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground ${bg} cursor-pointer`}
                            style={{ userSelect: 'none' }}>
                            <span className="font-medium mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{op}
                          </button>
                        );
                      })}
                    </div>
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
