import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, CheckCircle, Clock, Lock, FlaskConical, FileText, Trophy, Target, AlertTriangle, Timer, Smartphone, Tablet, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;
type Profile = Tables<'profiles'>;

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [progress, setProgress] = useState<Record<string, { completada: boolean; puntaje: number; correctasTotal: number; erroresTotal: number; intentos: number; tiempo: number }>>({});
  const [globalProgress, setGlobalProgress] = useState(0);
  const [exams, setExams] = useState<Record<string, { aprobado: boolean; puntaje: number }>>({});

  useEffect(() => { if (userId) loadData(); }, [userId]);

  async function loadData() {
    const [{ data: prof }, { data: ses }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId!).single(),
      supabase.from('sesiones').select('*').order('numero'),
    ]);
    setProfile(prof);
    setSesiones(ses || []);

    const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', userId!);
    const map: Record<string, any> = {};
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

  const formatTime = (s: number) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };

  const getDeviceIcon = (type: string) => {
    if (type === 'phone') return <Smartphone className="w-4 h-4" />;
    if (type === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
  };

  if (!profile) return <div className="p-6 text-center text-muted-foreground">Cargando...</div>;

  const initials = (profile.nombre?.[0] || '') + (profile.apellidos?.[0] || '');

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/students')}><ArrowLeft className="w-5 h-5" /></Button>
        <Avatar className="w-12 h-12">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-display font-bold truncate">{profile.nombre} {profile.apellidos}</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>📋 {profile.cedula}</span>
            <span>🔑 {profile.usuario}</span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isOnline(profile.last_seen_at) ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
              {getDeviceIcon(profile.device_type || '')}
              {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
            </span>
            {profile.ip_address && <span>🌐 {profile.ip_address}</span>}
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${profile.activo ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
          {profile.activo ? 'Activo' : 'Bloqueado'}
        </span>
      </div>

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

      {/* Session Progress Grid */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3">Progreso por Sesión</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sesiones.map(sesion => {
            const p = progress[sesion.id];
            const totalAnswered = p ? p.correctasTotal + p.erroresTotal : 0;
            const accuracy = totalAnswered > 0 ? Math.round((p.correctasTotal / totalAnswered) * 100) : 0;
            const ejerciciosP = p ? Math.min((p.correctasTotal || 0) / 150, 1) * 100 : 0;

            return (
              <Card key={sesion.id} className={`card-elevated ${p?.completada ? 'border-l-4 border-accent' : sesion.estado === 'bloqueada' ? 'opacity-50' : ''}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-sm">S{sesion.numero}: {sesion.titulo}</p>
                    {p?.completada ? <CheckCircle className="w-4 h-4 text-accent" /> : sesion.estado === 'bloqueada' ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Clock className="w-4 h-4 text-neon-orange" />}
                  </div>
                  {p ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-primary" />
                          <span>{p.intentos} intentos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-accent" />
                          <span>{p.correctasTotal}/150 correctas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                          <span>{p.erroresTotal} errores</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3 text-neon-orange" />
                          <span>{formatTime(p.tiempo)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Aciertos: {accuracy}%</span>
                          <span className={accuracy >= 80 ? 'text-accent font-bold' : 'text-destructive'}>{accuracy >= 80 ? '✅ Desbloquea examen' : '❌ < 80%'}</span>
                        </div>
                        <Progress value={accuracy} className="h-1.5" />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin progreso</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
