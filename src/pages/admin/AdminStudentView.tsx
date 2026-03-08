import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Unlock, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StudentHeader from '@/components/admin/StudentHeader';
import SessionManagementCard from '@/components/admin/SessionManagementCard';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;
type Profile = Tables<'profiles'>;

interface SessionProgress {
  completada: boolean;
  puntaje: number;
  correctasTotal: number;
  erroresTotal: number;
  intentos: number;
  tiempo: number;
}

const EXAM_BLOCKS = [
  { tipo: 'exam_1_3', sessions: [1, 2, 3], label: 'Examen Secciones 1-3' },
  { tipo: 'exam_4_6', sessions: [4, 5, 6], label: 'Examen Secciones 4-6' },
  { tipo: 'exam_7_9', sessions: [7, 8, 9], label: 'Examen Secciones 7-9' },
  { tipo: 'exam_10_12', sessions: [10, 11, 12], label: 'Examen Secciones 10-12' },
  { tipo: 'exam_13_14', sessions: [13, 14], label: 'Examen Secciones 13-14' },
];

export default function AdminStudentView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [progress, setProgress] = useState<Record<string, SessionProgress>>({});
  const [globalProgress, setGlobalProgress] = useState(0);
  const [exams, setExams] = useState<Record<string, { aprobado: boolean; puntaje: number }>>({});
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => { if (userId) loadData(); }, [userId]);

  async function loadData() {
    const [{ data: prof }, { data: ses }, { data: overrides }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId!).single(),
      supabase.from('sesiones').select('*').order('numero'),
      supabase.from('sesion_estudiante').select('*').eq('user_id', userId!),
    ]);
    setProfile(prof);
    setSesiones(ses || []);

    // Build overrides map
    const overrideMap: Record<string, boolean> = {};
    overrides?.forEach((o: any) => { overrideMap[o.sesion_id] = o.desbloqueada; });
    setSessionOverrides(overrideMap);

    const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', userId!);
    const map: Record<string, SessionProgress> = {};
    let totalProgress = 0;
    prog?.forEach((p: any) => {
      const ejerciciosP = Math.min((p.ejercicios_correctos || 0) / 20, 1) * 40;
      const quizP = Math.min((p.preguntas_correctas_total || 0) / 150, 1) * 60;
      totalProgress += ejerciciosP + quizP;
      map[p.sesion_id] = {
        completada: p.completada,
        puntaje: Number(p.puntaje_quiz) || 0,
        correctasTotal: p.preguntas_correctas_total || 0,
        erroresTotal: p.errores_quiz || 0,
        intentos: p.intentos_quiz || 0,
        tiempo: p.tiempo_invertido || 0,
      };
    });
    setProgress(map);
    setGlobalProgress(Math.round(totalProgress / 14));

    const { data: examData } = await supabase.from('examenes').select('*').eq('user_id', userId!);
    const examMap: Record<string, { aprobado: boolean; puntaje: number }> = {};
    examData?.forEach((e: any) => {
      if (!examMap[e.tipo] || e.aprobado) examMap[e.tipo] = { aprobado: e.aprobado, puntaje: Number(e.puntaje) };
    });
    setExams(examMap);
  }

  async function handleToggleUnlock(sesionId: string, currentOverride: boolean | null) {
    const newState = currentOverride === null
      ? true // first override: unlock
      : !currentOverride; // toggle

    const { error } = await supabase.from('sesion_estudiante').upsert({
      user_id: userId!,
      sesion_id: sesionId,
      desbloqueada: newState,
    }, { onConflict: 'user_id,sesion_id' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: newState ? '🔓 Desbloqueada' : '🔒 Bloqueada', description: `Sesión actualizada para este estudiante` });
    setSessionOverrides(prev => ({ ...prev, [sesionId]: newState }));
  }

  async function handleResetProgress(sesionId: string, sesionNumero: number) {
    if (!confirm(`¿Reiniciar todo el progreso de la Sesión ${sesionNumero}? Esta acción no se puede deshacer.`)) return;

    const { error } = await supabase.from('progreso_estudiante')
      .delete()
      .eq('user_id', userId!)
      .eq('sesion_id', sesionId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '♻️ Progreso reiniciado', description: `Sesión ${sesionNumero} reiniciada` });
    setProgress(prev => {
      const next = { ...prev };
      delete next[sesionId];
      return next;
    });
  }

  async function bulkUnlockAll() {
    if (!confirm('¿Desbloquear TODAS las sesiones para este estudiante?')) return;
    const inserts = sesiones.map(s => ({ user_id: userId!, sesion_id: s.id, desbloqueada: true }));
    await supabase.from('sesion_estudiante').upsert(inserts, { onConflict: 'user_id,sesion_id' });
    toast({ title: '🔓 Todas desbloqueadas' });
    const map: Record<string, boolean> = {};
    sesiones.forEach(s => { map[s.id] = true; });
    setSessionOverrides(map);
  }

  async function bulkRemoveOverrides() {
    if (!confirm('¿Quitar todas las asignaciones individuales y volver al estado global?')) return;
    await supabase.from('sesion_estudiante').delete().eq('user_id', userId!);
    toast({ title: '🔄 Asignaciones eliminadas' });
    setSessionOverrides({});
  }

  if (!profile) return <div className="p-6 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <StudentHeader profile={profile} onBack={() => navigate('/admin/students')} />

      {/* Global Progress */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-sm">Progreso Global</p>
            <span className="text-2xl font-bold text-accent">{globalProgress}%</span>
          </div>
          <Progress value={globalProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {Object.values(progress).filter(p => p.completada).length} de {sesiones.length} sesiones completadas
          </p>
        </CardContent>
      </Card>

      {/* Session Management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Gestión de Sesiones</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={bulkUnlockAll}>
              <Unlock className="w-3 h-3" /> Desbloquear todas
            </Button>
            {Object.keys(sessionOverrides).length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={bulkRemoveOverrides}>
                Quitar individuales
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sesiones.map(sesion => (
            <SessionManagementCard
              key={sesion.id}
              sesion={sesion}
              progress={progress[sesion.id]}
              isUnlocked={sessionOverrides[sesion.id] ?? null}
              onToggleUnlock={handleToggleUnlock}
              onResetProgress={handleResetProgress}
            />
          ))}
        </div>
      </div>

      {/* Exams */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3">Exámenes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXAM_BLOCKS.map(block => {
            const exam = exams[block.tipo];
            const unlocked = block.sessions.every(num => {
              const ses = sesiones.find(s => s.numero === num);
              if (!ses) return false;
              const p = progress[ses.id];
              const total = p ? p.correctasTotal + p.erroresTotal : 0;
              return total > 0 && (p.correctasTotal / total) >= 0.8;
            });
            return (
              <Card key={block.tipo} className={`card-elevated ${!unlocked ? 'opacity-50' : exam?.aprobado ? 'border-l-4 border-accent' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className={`w-5 h-5 ${exam?.aprobado ? 'text-accent' : unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{block.label}</p>
                    {exam ? (
                      <p className="text-xs text-muted-foreground">{exam.puntaje}/100 {exam.aprobado ? '✅ Aprobado' : '❌ No aprobado'}</p>
                    ) : unlocked ? (
                      <p className="text-xs text-neon-orange">Disponible, no realizado</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Bloqueado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
