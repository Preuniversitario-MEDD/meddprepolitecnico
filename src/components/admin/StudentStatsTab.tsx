import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Monitor, Smartphone, Tablet, Clock, Brain, Target, TrendingUp, Calendar, Wifi, Activity } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface StudentProgress {
  sesion_id: string;
  completada: boolean;
  puntaje_quiz: number | null;
  preguntas_correctas_total: number | null;
  errores_quiz: number | null;
  intentos_quiz: number | null;
  tiempo_invertido: number | null;
  fecha: string;
}

interface ExamResult {
  tipo: string;
  puntaje: number;
  aprobado: boolean;
  fecha: string;
}

interface ConnectionLog {
  date: string;
  count: number;
}

const COLORS = ['hsl(160,60%,50%)', 'hsl(210,90%,55%)', 'hsl(25,95%,55%)', 'hsl(330,85%,60%)', 'hsl(270,80%,60%)'];

export default function StudentStatsTab({ students }: { students: Profile[] }) {
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [sesiones, setSesiones] = useState<{ id: string; numero: number; titulo: string }[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [connectionData, setConnectionData] = useState<ConnectionLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('sesiones').select('id, numero, titulo').order('numero').then(({ data }) => {
      if (data) setSesiones(data);
    });
  }, []);

  useEffect(() => {
    if (selectedStudent) loadStudentData(selectedStudent);
  }, [selectedStudent]);

  async function loadStudentData(userId: string) {
    setLoading(true);
    const [{ data: prof }, { data: prog }, { data: examData }, { data: connLogs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('progreso_estudiante').select('*').eq('user_id', userId),
      supabase.from('examenes').select('tipo, puntaje, aprobado, fecha').eq('user_id', userId).order('fecha'),
      supabase.from('connection_logs' as any).select('created_at, event_type, device_type, ip_address, user_agent').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
    ]);

    setProfile(prof);
    setProgress((prog || []) as StudentProgress[]);
    setExams((examData || []).map((e: any) => ({ ...e, puntaje: Number(e.puntaje) })));

    // Build real connection history from connection_logs
    const logsByDay = new Map<string, number>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      logsByDay.set(d.toISOString().split('T')[0], 0);
    }
    (connLogs || []).forEach((log: any) => {
      const day = log.created_at?.split('T')[0];
      if (day && logsByDay.has(day)) {
        logsByDay.set(day, (logsByDay.get(day) || 0) + 1);
      }
    });
    setConnectionData(Array.from(logsByDay.entries()).map(([date, count]) => ({ date, count })));
    setLoading(false);
  }

  function getDeviceIcon(type: string | null) {
    if (!type) return <Monitor className="w-4 h-4" />;
    if (type.includes('phone') || type.includes('móvil')) return <Smartphone className="w-4 h-4" />;
    if (type.includes('tablet')) return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  }

  // Compute stats
  const totalCorrects = progress.reduce((s, p) => s + (p.preguntas_correctas_total || 0), 0);
  const totalErrors = progress.reduce((s, p) => s + (p.errores_quiz || 0), 0);
  const totalAttempts = progress.reduce((s, p) => s + (p.intentos_quiz || 0), 0);
  const totalTime = progress.reduce((s, p) => s + (p.tiempo_invertido || 0), 0);
  const avgAccuracy = totalCorrects + totalErrors > 0 ? Math.round((totalCorrects / (totalCorrects + totalErrors)) * 100) : 0;
  const completedSessions = progress.filter(p => p.completada).length;
  const avgTimePerQuiz = totalAttempts > 0 ? Math.round(totalTime / totalAttempts) : 0;
  const activeDays = connectionData.filter(c => c.count > 0).length;

  // Session progression data
  const sessionChartData = sesiones.map(s => {
    const p = progress.find(pr => pr.sesion_id === s.id);
    return {
      name: `S${s.numero}`,
      correctas: p?.preguntas_correctas_total || 0,
      errores: p?.errores_quiz || 0,
      intentos: p?.intentos_quiz || 0,
      precision: p ? Math.round(((p.preguntas_correctas_total || 0) / Math.max((p.preguntas_correctas_total || 0) + (p.errores_quiz || 0), 1)) * 100) : 0,
    };
  });

  // Cognitive analysis
  const learningRate = sessionChartData.length > 1
    ? sessionChartData.filter(s => s.precision > 0).map((s, i, arr) => i > 0 ? s.precision - arr[i - 1].precision : 0).reduce((a, b) => a + b, 0) / Math.max(sessionChartData.filter(s => s.precision > 0).length - 1, 1)
    : 0;

  const consistencyScore = sessionChartData.filter(s => s.precision > 0).length > 0
    ? Math.round(100 - (sessionChartData.filter(s => s.precision > 0).reduce((sum, s) => {
        const diff = Math.abs(s.precision - avgAccuracy);
        return sum + diff;
      }, 0) / sessionChartData.filter(s => s.precision > 0).length))
    : 0;

  const pieData = [
    { name: 'Correctas', value: totalCorrects },
    { name: 'Errores', value: totalErrors },
  ];

  return (
    <div className="space-y-4">
      {/* Student selector */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estudiante para ver estadísticas..." />
            </SelectTrigger>
            <SelectContent>
              {students.map(s => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.nombre} {s.apellidos} — {s.cedula}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-muted-foreground py-8">Cargando estadísticas...</p>}

      {profile && !loading && (
        <>
          {/* Device & Connection Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="card-elevated">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {getDeviceIcon(profile.device_type)}
                  <span className="text-xs font-medium">Dispositivo</span>
                </div>
                <p className="text-sm font-bold text-foreground">{profile.device_type || 'No registrado'}</p>
                {profile.ip_address && <p className="text-[10px] text-muted-foreground mt-0.5">IP: {profile.ip_address}</p>}
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Wifi className="w-4 h-4 text-[hsl(var(--neon-mint))]" />
                  <span className="text-xs font-medium">Última conexión</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </p>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[hsl(var(--neon-blue))]" />
                  <span className="text-xs font-medium">Días activo</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{activeDays}</p>
                <p className="text-[10px] text-muted-foreground">últimos 30 días</p>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-[hsl(var(--neon-orange))]" />
                  <span className="text-xs font-medium">Tiempo total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{Math.round(totalTime / 60)}m</p>
                <p className="text-[10px] text-muted-foreground">~{avgTimePerQuiz}s por quiz</p>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="card-elevated border-l-4 border-[hsl(var(--neon-mint))]">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1"><Target className="w-3 h-3 text-[hsl(var(--neon-mint))]" /><span className="text-[10px] text-muted-foreground">Precisión</span></div>
                <p className="text-2xl font-bold">{avgAccuracy}%</p>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-[hsl(var(--neon-blue))]">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1"><Activity className="w-3 h-3 text-[hsl(var(--neon-blue))]" /><span className="text-[10px] text-muted-foreground">Sesiones</span></div>
                <p className="text-2xl font-bold">{completedSessions}/{sesiones.length}</p>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-[hsl(var(--neon-violet))]">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1"><Brain className="w-3 h-3 text-[hsl(var(--neon-violet))]" /><span className="text-[10px] text-muted-foreground">Consistencia</span></div>
                <p className="text-2xl font-bold">{consistencyScore}%</p>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-[hsl(var(--neon-orange))]">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3 text-[hsl(var(--neon-orange))]" /><span className="text-[10px] text-muted-foreground">Tendencia</span></div>
                <p className="text-2xl font-bold">{learningRate > 0 ? '+' : ''}{learningRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-primary">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1"><span className="text-[10px] text-muted-foreground">Total intentos</span></div>
                <p className="text-2xl font-bold">{totalAttempts}</p>
                <p className="text-[10px] text-muted-foreground">{totalCorrects}✓ {totalErrors}✗</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Session Progression */}
            <Card className="card-elevated">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold text-sm mb-3">📈 Progresión por Sesión</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sessionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="correctas" fill="hsl(160,60%,50%)" name="Correctas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="errores" fill="hsl(330,85%,60%)" name="Errores" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Accuracy trend */}
            <Card className="card-elevated">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold text-sm mb-3">🎯 Precisión por Sesión</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={sessionChartData.filter(s => s.precision > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Line type="monotone" dataKey="precision" stroke="hsl(210,90%,55%)" strokeWidth={2} dot={{ fill: 'hsl(210,90%,55%)', r: 4 }} name="Precisión %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Connections per day */}
            <Card className="card-elevated">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold text-sm mb-3">📅 Actividad (últimos 30 días)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={connectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 8 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="count" fill="hsl(270,80%,60%)" name="Conexiones" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card className="card-elevated">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold text-sm mb-3">🧠 Distribución Correctas/Errores</h3>
                {totalCorrects + totalErrors > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">Sin datos</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Exam results */}
          {exams.length > 0 && (
            <Card className="card-elevated">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold text-sm mb-3">📝 Historial de Exámenes</h3>
                <div className="grid gap-2">
                  {exams.map((e, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Badge variant={e.aprobado ? 'default' : 'destructive'} className="text-[10px]">
                          {e.aprobado ? '✅ Aprobado' : '❌ Reprobado'}
                        </Badge>
                        <span className="text-sm font-medium">{e.tipo}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{e.puntaje}/{e.tipo === 'exam_final' ? '1000' : '100'}</span>
                        <span>{new Date(e.fecha).toLocaleDateString('es-EC')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pedagogical insights */}
          <Card className="card-elevated border border-[hsl(var(--neon-violet)/0.3)]">
            <CardContent className="p-4">
              <h3 className="font-display font-semibold text-sm mb-3">🔬 Análisis Cognitivo-Pedagógico</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Ritmo de aprendizaje</p>
                    <Progress value={Math.max(0, Math.min(100, 50 + learningRate * 5))} className="h-2 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {learningRate > 2 ? '⬆️ Progresión ascendente — Excelente evolución' :
                       learningRate > 0 ? '➡️ Progresión estable — Buen ritmo' :
                       learningRate > -2 ? '⚠️ Estancamiento detectado — Reforzar conceptos' :
                       '🔻 Regresión — Requiere atención pedagógica'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Consistencia cognitiva</p>
                    <Progress value={consistencyScore} className="h-2 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {consistencyScore > 80 ? '🧠 Alta consistencia — Dominio sólido' :
                       consistencyScore > 60 ? '📊 Consistencia media — Algunas variaciones' :
                       '⚡ Baja consistencia — Rendimiento irregular'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Dedicación</p>
                    <Progress value={Math.min(100, (activeDays / 30) * 100)} className="h-2 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeDays > 20 ? '🔥 Muy comprometido — Hábito de estudio sólido' :
                       activeDays > 10 ? '📚 Compromiso moderado — Puede mejorar frecuencia' :
                       '💤 Baja frecuencia — Necesita motivación'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidad de respuesta</p>
                    <Progress value={Math.min(100, avgTimePerQuiz > 0 ? Math.max(0, 100 - avgTimePerQuiz / 2) : 0)} className="h-2 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {avgTimePerQuiz < 30 ? '⚡ Respuestas rápidas — Buena retención' :
                       avgTimePerQuiz < 60 ? '⏱️ Tiempo normal — Proceso reflexivo' :
                       '🐢 Respuestas lentas — Posible inseguridad conceptual'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedStudent && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-display">Selecciona un estudiante</p>
          <p className="text-sm">para ver sus estadísticas detalladas</p>
        </div>
      )}
    </div>
  );
}
