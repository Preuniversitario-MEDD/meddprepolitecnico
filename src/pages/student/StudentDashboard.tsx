import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useViewAsStudent } from '@/hooks/useViewAsStudent';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Clock, FlaskConical, FileText, Zap, Trophy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

interface ExamBlockConfig {
  tipo: string;
  sessions: number[];
  label: string;
  puntaje_aprobacion: number;
  activo: boolean;
  isFinal: boolean;
}

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const { viewAsStudentId } = useViewAsStudent();
  const effectiveUserId = viewAsStudentId || user?.id;
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [progress, setProgress] = useState<Record<string, { completada: boolean; puntaje: number; correctasTotal: number; erroresTotal: number }>>({});
  const [globalProgress, setGlobalProgress] = useState(0);
  const [exams, setExams] = useState<Record<string, { aprobado: boolean; puntaje: number; intentos: number }>>({});
  const [liveCompCount, setLiveCompCount] = useState(0);
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, boolean>>({});
  const [viewedProfile, setViewedProfile] = useState<Tables<'profiles'> | null>(null);
  const [examBlocks, setExamBlocks] = useState<ExamBlockConfig[]>([]);
  const prevUnlockedExamsRef = useRef<Set<string> | null>(null);
  const [unlockDialog, setUnlockDialog] = useState<ExamBlockConfig | null>(null);

  useEffect(() => { loadData(); loadLiveComps(); }, [effectiveUserId]);

  // Real-time sync for admin changes to exam config and sessions
  useEffect(() => {
    const ch = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competencias' }, () => loadLiveComps())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_configuracion' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesiones' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sesion_estudiante' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progreso_estudiante' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [effectiveUserId]);

  async function loadLiveComps() {
    const { count } = await supabase.from('competencias').select('*', { count: 'exact', head: true }).in('estado', ['lobby', 'en_curso']);
    setLiveCompCount(count || 0);
  }

  async function loadData() {
    if (!effectiveUserId) return;

    if (viewAsStudentId) {
      const { data: vp } = await supabase.from('profiles').select('*').eq('user_id', viewAsStudentId).single();
      setViewedProfile(vp);
    } else {
      setViewedProfile(null);
    }

    const [{ data: ses }, overridesRes, { data: examConfigs }] = await Promise.all([
      supabase.from('sesiones').select('*').order('numero'),
      supabase.from('sesion_estudiante').select('*').eq('user_id', effectiveUserId),
      supabase.from('exam_configuracion').select('*').eq('activo', true).order('tipo'),
    ]);
    setSesiones(ses || []);

    if (examConfigs) {
      setExamBlocks(examConfigs.map((c: any) => ({
        tipo: c.tipo,
        sessions: c.sessions || [],
        label: c.label || c.tipo,
        puntaje_aprobacion: c.puntaje_aprobacion || 80,
        activo: c.activo,
        isFinal: c.tipo === 'exam_final',
      })));
    }

    const oMap: Record<string, boolean> = {};
    overridesRes?.data?.forEach((o: any) => { oMap[o.sesion_id] = o.desbloqueada; });
    setSessionOverrides(oMap);

    const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', effectiveUserId);
    const map: Record<string, { completada: boolean; puntaje: number; correctasTotal: number; erroresTotal: number }> = {};
    let totalProgress = 0;
    const totalSesiones = ses?.length || 14;
    prog?.forEach((p: any) => {
      const ejerciciosP = Math.min((p.ejercicios_correctos || 0) / 20, 1) * 40;
      const quizP = Math.min((p.preguntas_correctas_total || 0) / 150, 1) * 60;
      totalProgress += ejerciciosP + quizP;
      map[p.sesion_id] = {
        completada: p.completada,
        puntaje: Number(p.puntaje_quiz) || 0,
        correctasTotal: p.preguntas_correctas_total || 0,
        erroresTotal: p.errores_quiz || 0,
      };
    });
    setProgress(map);
    setGlobalProgress(Math.round(totalProgress / totalSesiones));

    // Load exams with attempt count
    const { data: examData } = await supabase.from('examenes').select('*').eq('user_id', effectiveUserId);
    const examMap: Record<string, { aprobado: boolean; puntaje: number; intentos: number }> = {};
    examData?.forEach((e: any) => {
      if (!examMap[e.tipo]) {
        examMap[e.tipo] = { aprobado: e.aprobado, puntaje: Number(e.puntaje), intentos: 1 };
      } else {
        examMap[e.tipo].intentos += 1;
        if (e.aprobado) examMap[e.tipo].aprobado = true;
        if (Number(e.puntaje) > examMap[e.tipo].puntaje) examMap[e.tipo].puntaje = Number(e.puntaje);
      }
    });
    setExams(examMap);
  }

  const displayProfile = viewedProfile || profile;
  const firstName = displayProfile?.nombre?.split(' ')[0] || 'Estudiante';

  const getSessionStatus = (sesion: Sesion) => {
    const override = sessionOverrides[sesion.id];
    const isBlocked = override !== undefined ? !override : sesion.estado === 'bloqueada';
    if (isBlocked) return 'locked';
    const p = progress[sesion.id];
    if (p?.completada) return 'completed';
    if (p) return 'in-progress';
    return 'available';
  };

  const statusConfig = {
    locked: { bg: 'bg-muted', icon: Lock, label: 'Bloqueada', border: 'border-muted' },
    completed: { bg: 'gradient-cool', icon: CheckCircle, label: 'Completada', border: 'border-accent' },
    'in-progress': { bg: 'gradient-warm', icon: Clock, label: 'En progreso', border: 'border-neon-orange' },
    available: { bg: 'gradient-primary', icon: FlaskConical, label: 'Disponible', border: 'border-primary' },
  };

  const sessionColors = [
    'from-neon-violet to-neon-blue', 'from-neon-pink to-neon-fuchsia', 'from-neon-blue to-neon-mint',
    'from-neon-orange to-neon-pink', 'from-neon-mint to-neon-blue', 'from-neon-fuchsia to-neon-violet', 'from-neon-orange to-neon-violet',
  ];

  function isExamUnlocked(block: ExamBlockConfig) {
    if (block.isFinal) {
      return examBlocks.filter(b => !b.isFinal).every(b => exams[b.tipo]?.aprobado);
    }
    return block.sessions.every(num => {
      const sesion = sesiones.find(s => s.numero === num);
      if (!sesion) return false;
      const p = progress[sesion.id];
      if (!p) return false;
      const totalAnswered = p.correctasTotal + p.erroresTotal;
      if (totalAnswered === 0) return false;
      return (p.correctasTotal / totalAnswered) >= 0.8;
    });
  }

  function getExamAttemptStatus(block: ExamBlockConfig) {
    const exam = exams[block.tipo];
    if (!exam) return { canTake: true, reason: '' };
    if (exam.aprobado) return { canTake: false, reason: 'Aprobado' };
    if (exam.intentos >= 3) {
      // 3 attempts used: if best score >= 70 allow one more
      if (exam.puntaje >= 70) {
        return { canTake: true, reason: 'Oportunidad extra por obtener ≥70' };
      }
      return { canTake: false, reason: 'Debes repasar las sesiones del examen para intentarlo de nuevo' };
    }
    return { canTake: true, reason: `Intento ${exam.intentos + 1} de 3` };
  }

  // Detect newly unlocked exams and show dialog
  useEffect(() => {
    if (sesiones.length === 0 || examBlocks.length === 0) return;
    const currentUnlocked = new Set<string>();
    examBlocks.forEach(block => { if (isExamUnlocked(block)) currentUnlocked.add(block.tipo); });

    if (prevUnlockedExamsRef.current !== null) {
      for (const tipo of currentUnlocked) {
        if (!prevUnlockedExamsRef.current.has(tipo)) {
          const block = examBlocks.find(b => b.tipo === tipo);
          if (block) {
            setUnlockDialog(block);
            confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
            break; // show one at a time
          }
        }
      }
    }
    prevUnlockedExamsRef.current = currentUnlocked;
  }, [sesiones, progress, exams, examBlocks]);

  const blockExams = examBlocks.filter(b => !b.isFinal);
  const finalExam = examBlocks.find(b => b.isFinal);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Exam unlock dialog */}
      <Dialog open={!!unlockDialog} onOpenChange={(open) => !open && setUnlockDialog(null)}>
        <DialogContent className="border-2 border-[hsl(var(--neon-orange))] bg-background">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--neon-orange))]/20 flex items-center justify-center animate-pulse">
                <Trophy className="w-8 h-8 text-[hsl(var(--neon-orange))]" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-display text-[hsl(var(--neon-orange))]">
              🎓 ¡Examen Habilitado!
            </DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <p className="text-base font-semibold text-foreground">{unlockDialog?.label}</p>
              <p>{unlockDialog?.isFinal ? 'Has aprobado todos los exámenes de bloque.' : 'Has alcanzado ≥80% de precisión en todas las sesiones requeridas.'}</p>
              <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--neon-orange))]/10 border border-[hsl(var(--neon-orange))]/30">
                <p className="text-xs text-[hsl(var(--neon-orange))] flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Solo puedes realizar este examen 3 veces. Si no logras el puntaje mínimo, deberás repasar las sesiones. Si obtienes ≥70 tendrás una oportunidad extra.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUnlockDialog(null)} className="flex-1">Después</Button>
            <Button onClick={() => { navigate(`/student/exam/${unlockDialog?.tipo}`); setUnlockDialog(null); }}
              className="flex-1 bg-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/90 text-primary-foreground gap-2">
              <Zap className="w-4 h-4" /> Realizarlo Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-neon-mint">¡Hola, <span className="text-gradient-primary text-neon-mint">{firstName}</span>! 👋</h1>
        <p className="text-muted-foreground text-sm">Sigue avanzando en tu preparación de Química</p>
      </motion.div>

      {liveCompCount > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="cursor-pointer" onClick={() => navigate('/student/competencia')}>
          <Card className="border-2 border-[hsl(var(--neon-orange))] bg-[hsl(var(--neon-orange))]/10 hover:bg-[hsl(var(--neon-orange))]/20 transition-colors">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--neon-orange))]/20 flex items-center justify-center animate-pulse">
                <Zap className="w-5 h-5 text-[hsl(var(--neon-orange))]" />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-sm">🔴 {liveCompCount} competencia{liveCompCount > 1 ? 's' : ''} en vivo</p>
                <p className="text-xs text-muted-foreground">¡Toca para unirte ahora!</p>
              </div>
              <Button size="sm" className="gradient-primary text-primary-foreground">Unirse</Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <Card className="card-elevated neon-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold text-sm">Progreso Global</p>
              <span className="text-2xl font-bold text-gradient-primary text-accent">{globalProgress}%</span>
            </div>
            <Progress value={globalProgress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {Object.values(progress).filter(p => p.completada).length} de {sesiones.length} sesiones completadas
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div>
        <h2 className="font-display font-bold text-lg mb-3 text-neon-pink">Sesiones de Química</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sesiones.map((sesion, i) => {
            const status = getSessionStatus(sesion);
            const config = statusConfig[status];
            return (
              <motion.div key={sesion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={status !== 'locked' ? { scale: 1.03 } : {}} whileTap={status !== 'locked' ? { scale: 0.97 } : {}}>
                <Card className={`card-elevated cursor-pointer transition-all overflow-hidden ${status === 'locked' ? 'opacity-50 cursor-not-allowed' : 'hover:glow-primary'} border-l-4 ${config.border}`}
                  onClick={() => status !== 'locked' && navigate(`/student/session/${sesion.id}`)}>
                  <CardContent className="p-3">
                    <div className={`w-10 h-10 rounded-xl mb-2 flex items-center justify-center bg-gradient-to-br ${sessionColors[i % sessionColors.length]}`}>
                      <config.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="font-display font-bold text-sm">S{sesion.numero}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sesion.titulo}</p>
                    {progress[sesion.id] && (progress[sesion.id].correctasTotal + progress[sesion.id].erroresTotal) > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Quiz: {Math.round((progress[sesion.id].correctasTotal / (progress[sesion.id].correctasTotal + progress[sesion.id].erroresTotal)) * 100)}% aciertos
                      </p>
                    )}
                    <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      status === 'completed' ? 'bg-accent/20 text-accent' : status === 'in-progress' ? 'bg-neon-orange/20 text-neon-orange' :
                      status === 'locked' ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
                      {config.label}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Block exams */}
      {blockExams.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg mb-3 text-neon-fuchsia">Exámenes por Bloque</h2>
          <p className="text-xs text-muted-foreground mb-2">Se desbloquean al alcanzar ≥80% de aciertos en el quiz de cada sesión del bloque</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {blockExams.map(block => {
              const unlocked = isExamUnlocked(block);
              const exam = exams[block.tipo];
              const attemptStatus = getExamAttemptStatus(block);
              const isOpen = unlocked && !exam?.aprobado && attemptStatus.canTake;
              return (
                <Card key={block.tipo} className={`card-elevated transition-all ${
                  !unlocked ? 'opacity-50' : 
                  exam?.aprobado ? 'border-l-4 border-accent' : 
                  isOpen ? 'border-2 border-[hsl(var(--neon-orange))] shadow-[0_0_15px_hsl(var(--neon-orange)/0.3)]' : ''
                }`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-5 h-5 ${exam?.aprobado ? 'text-accent' : isOpen ? 'text-[hsl(var(--neon-orange))]' : unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-sm font-medium ${isOpen ? 'text-[hsl(var(--neon-orange))]' : ''}`}>{block.label}</p>
                        {exam && <p className="text-xs text-muted-foreground">{exam.puntaje}/100 {exam.aprobado ? '✅' : '❌'} · {exam.intentos} intento{exam.intentos > 1 ? 's' : ''}</p>}
                        {!unlocked && (
                          <p className="text-[10px] text-muted-foreground">
                            {block.sessions.map(num => {
                              const ses = sesiones.find(s => s.numero === num);
                              if (!ses) return null;
                              const p = progress[ses.id];
                              const total = p ? p.correctasTotal + p.erroresTotal : 0;
                              const acc = total > 0 ? Math.round((p!.correctasTotal / total) * 100) : 0;
                              return `S${num}: ${acc}%`;
                            }).filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {unlocked && !exam?.aprobado && !attemptStatus.canTake && (
                          <p className="text-[10px] text-destructive">{attemptStatus.reason}</p>
                        )}
                        {unlocked && attemptStatus.canTake && !exam?.aprobado && attemptStatus.reason && (
                          <p className="text-[10px] text-[hsl(var(--neon-orange))]">{attemptStatus.reason}</p>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <Button size="sm" onClick={() => navigate(`/student/exam/${block.tipo}`)}
                        className="bg-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/90 text-primary-foreground text-xs animate-pulse">
                        {exam ? 'Repetir' : 'Iniciar'}
                      </Button>
                    )}
                    {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                    {exam?.aprobado && <CheckCircle className="w-5 h-5 text-accent" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Exam */}
      {finalExam && (() => {
        const finalUnlocked = isExamUnlocked(finalExam);
        const finalAttempt = getExamAttemptStatus(finalExam);
        const finalOpen = finalUnlocked && !exams[finalExam.tipo]?.aprobado && finalAttempt.canTake;
        return (
          <div>
            <h2 className="font-display font-bold text-lg mb-3 text-[hsl(var(--neon-orange))]">🏆 Examen Final</h2>
            <Card className={`card-elevated border-2 ${finalOpen ? 'border-[hsl(var(--neon-orange))] shadow-[0_0_20px_hsl(var(--neon-orange)/0.4)]' : finalUnlocked ? 'border-[hsl(var(--neon-orange))]' : 'border-muted opacity-60'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-[hsl(var(--neon-orange))]/20 flex items-center justify-center ${finalOpen ? 'animate-pulse' : ''}`}>
                    <Trophy className="w-6 h-6 text-[hsl(var(--neon-orange))]" />
                  </div>
                  <div>
                    <p className="font-display font-bold">{finalExam.label}</p>
                    <p className="text-xs text-muted-foreground">50 preguntas · Alta dificultad · Sobre 1000 puntos</p>
                    {exams[finalExam.tipo] && (
                      <p className="text-sm font-medium mt-1">
                        Mejor: {exams[finalExam.tipo].puntaje}/1000 {exams[finalExam.tipo].aprobado ? '✅' : ''} · {exams[finalExam.tipo].intentos} intento{exams[finalExam.tipo].intentos > 1 ? 's' : ''}
                      </p>
                    )}
                    {!finalUnlocked && <p className="text-[10px] text-muted-foreground mt-1">Aprueba todos los exámenes de bloque para desbloquear</p>}
                    {finalUnlocked && !exams[finalExam.tipo]?.aprobado && !finalAttempt.canTake && (
                      <p className="text-[10px] text-destructive mt-1">{finalAttempt.reason}</p>
                    )}
                    {finalOpen && finalAttempt.reason && (
                      <p className="text-[10px] text-[hsl(var(--neon-orange))] mt-1">{finalAttempt.reason}</p>
                    )}
                  </div>
                </div>
                {finalOpen ? (
                  <Button onClick={() => navigate(`/student/exam/${finalExam.tipo}`)}
                    className="bg-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/90 text-primary-foreground gap-2 animate-pulse">
                    {exams[finalExam.tipo] ? 'Reintentar' : 'Iniciar'}
                  </Button>
                ) : (
                  !finalUnlocked && <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                {exams[finalExam.tipo]?.aprobado && <CheckCircle className="w-6 h-6 text-accent" />}
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
