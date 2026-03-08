import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Clock, FlaskConical, FileText, PartyPopper, Zap } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

const EXAM_BLOCKS = [
  { tipo: 'exam_1_3', sessions: [1, 2, 3], label: 'Examen Secciones 1-3' },
  { tipo: 'exam_4_6', sessions: [4, 5, 6], label: 'Examen Secciones 4-6' },
  { tipo: 'exam_7_9', sessions: [7, 8, 9], label: 'Examen Secciones 7-9' },
  { tipo: 'exam_10_12', sessions: [10, 11, 12], label: 'Examen Secciones 10-12' },
  { tipo: 'exam_13_14', sessions: [13, 14], label: 'Examen Secciones 13-14' },
];

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [progress, setProgress] = useState<Record<string, { completada: boolean; puntaje: number; correctasTotal: number; erroresTotal: number }>>({});
  const [globalProgress, setGlobalProgress] = useState(0);
  const [exams, setExams] = useState<Record<string, { aprobado: boolean; puntaje: number }>>({});
  const [liveCompCount, setLiveCompCount] = useState(0);

  useEffect(() => { loadData(); loadLiveComps(); }, [user]);

  // Realtime: listen for new/updated competitions
  useEffect(() => {
    const ch = supabase.channel('live-comp-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competencias' }, () => {
        loadLiveComps();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadLiveComps() {
    const { count } = await supabase
      .from('competencias')
      .select('*', { count: 'exact', head: true })
      .in('estado', ['lobby', 'en_curso']);
    setLiveCompCount(count || 0);
  }

  async function loadData() {
    const { data: ses } = await supabase.from('sesiones').select('*').order('numero');
    setSesiones(ses || []);

    if (user) {
      const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', user.id);
      const map: Record<string, { completada: boolean; puntaje: number; correctasTotal: number; erroresTotal: number }> = {};
      let totalProgress = 0;
      prog?.forEach((p: any) => {
        const ejerciciosP = Math.min((p.ejercicios_correctos || 0) / 20, 1) * 40;
        const quizP = Math.min((p.preguntas_correctas_total || 0) / 150, 1) * 60;
        const sessionP = ejerciciosP + quizP;
        totalProgress += sessionP;
        map[p.sesion_id] = {
          completada: p.completada,
          puntaje: Number(p.puntaje_quiz) || 0,
          correctasTotal: p.preguntas_correctas_total || 0,
          erroresTotal: p.errores_quiz || 0,
        };
      });
      setProgress(map);
      setGlobalProgress(Math.round(totalProgress / 14));

      const { data: examData } = await supabase.from('examenes').select('*').eq('user_id', user.id);
      const examMap: Record<string, { aprobado: boolean; puntaje: number }> = {};
      examData?.forEach((e: any) => {
        if (!examMap[e.tipo] || e.aprobado) examMap[e.tipo] = { aprobado: e.aprobado, puntaje: Number(e.puntaje) };
      });
      setExams(examMap);
    }
  }

  const firstName = profile?.nombre?.split(' ')[0] || 'Estudiante';

  const getSessionStatus = (sesion: Sesion) => {
    if (sesion.estado === 'bloqueada') return 'locked';
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

  // Exam unlocks when ALL sessions in the block have >= 80% quiz accuracy
  function isExamUnlocked(block: typeof EXAM_BLOCKS[0]) {
    return block.sessions.every(num => {
      const sesion = sesiones.find(s => s.numero === num);
      if (!sesion) return false;
      const p = progress[sesion.id];
      if (!p) return false;
      const totalAnswered = p.correctasTotal + p.erroresTotal;
      if (totalAnswered === 0) return false;
      const accuracy = p.correctasTotal / totalAnswered;
      return accuracy >= 0.8;
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
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
              {Object.values(progress).filter(p => p.completada).length} de 14 sesiones completadas
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
                    {/* Show quiz accuracy if has progress */}
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

      <div>
        <h2 className="font-display font-bold text-lg mb-3 text-neon-fuchsia">Exámenes por Bloque</h2>
        <p className="text-xs text-muted-foreground mb-2">Se desbloquean al alcanzar ≥80% de aciertos en el quiz de cada sesión del bloque</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXAM_BLOCKS.map(block => {
            const unlocked = isExamUnlocked(block);
            const exam = exams[block.tipo];
            return (
              <Card key={block.tipo} className={`card-elevated ${!unlocked ? 'opacity-50' : exam?.aprobado ? 'border-l-4 border-accent' : ''}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${exam?.aprobado ? 'text-accent' : unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium">{block.label}</p>
                      {exam && <p className="text-xs text-muted-foreground">{exam.puntaje}/100 {exam.aprobado ? '✅' : '❌'}</p>}
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
                    </div>
                  </div>
                  {unlocked && !exam?.aprobado && (
                    <Button size="sm" onClick={() => navigate(`/student/exam/${block.tipo}`)} className="gradient-primary text-primary-foreground text-xs">
                      Iniciar
                    </Button>
                  )}
                  {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
