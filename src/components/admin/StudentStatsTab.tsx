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

          {/* Pedagogical insights with detailed improvement messages */}
          <Card className="card-elevated border border-[hsl(var(--neon-violet)/0.3)]">
            <CardContent className="p-4">
              <h3 className="font-display font-semibold text-sm mb-3">🔬 Análisis Cognitivo-Pedagógico</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Ritmo de aprendizaje</p>
                      <span className="text-[10px] font-bold text-foreground">{learningRate > 0 ? '+' : ''}{learningRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, 50 + learningRate * 5))} className="h-2 mt-1" />
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {learningRate > 3 ? '⬆️ Progresión ascendente excelente. El estudiante muestra una mejora constante entre sesiones, lo que indica buena comprensión y retención de conceptos previos. Mantener el ritmo actual con ejercicios de complejidad creciente.' :
                       learningRate > 0 ? '➡️ Progresión estable. El estudiante mejora gradualmente. Para acelerar el aprendizaje, se recomienda revisar los errores frecuentes en las sesiones anteriores y practicar ejercicios específicos en las áreas con menor precisión.' :
                       learningRate > -2 ? '⚠️ Estancamiento detectado. La precisión no está mejorando entre sesiones. Se recomienda: 1) Repasar los fundamentos de las sesiones con menor rendimiento, 2) Identificar patrones de error recurrentes, 3) Realizar prácticas adicionales con ejercicios de dificultad progresiva.' :
                       '🔻 Regresión en el rendimiento. La precisión está disminuyendo. Acciones recomendadas: 1) Revisión urgente de conceptos base, 2) Sesiones de refuerzo uno a uno, 3) Reducir el ritmo de avance hasta consolidar los temas previos, 4) Evaluar posibles factores externos que afecten la concentración.'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Consistencia cognitiva</p>
                      <span className="text-[10px] font-bold text-foreground">{consistencyScore}%</span>
                    </div>
                    <Progress value={consistencyScore} className="h-2 mt-1" />
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {consistencyScore > 85 ? '🧠 Alta consistencia. El estudiante mantiene un rendimiento uniforme entre sesiones, indicando dominio sólido y confiable de los contenidos. Está listo para desafíos de mayor complejidad y preguntas de análisis.' :
                       consistencyScore > 65 ? '📊 Consistencia media. El rendimiento varía entre sesiones, lo que puede indicar: 1) Algunos temas se dominan mejor que otros — identificar las sesiones con menor precisión, 2) Posible falta de repaso previo a cada sesión, 3) Diferentes niveles de concentración. Se recomienda establecer una rutina de estudio más regular.' :
                       '⚡ Baja consistencia. El rendimiento es irregular y poco predecible. Esto puede deberse a: 1) Lagunas en conceptos fundamentales que afectan temas posteriores, 2) Estudio fragmentado sin continuidad, 3) Dificultad para mantener la atención. Se recomienda un plan de estudio estructurado con micro-sesiones diarias de 15-20 minutos.'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Dedicación y frecuencia</p>
                      <span className="text-[10px] font-bold text-foreground">{activeDays}/30 días</span>
                    </div>
                    <Progress value={Math.min(100, (activeDays / 30) * 100)} className="h-2 mt-1" />
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {activeDays > 20 ? '🔥 Muy comprometido. El estudiante accede regularmente a la plataforma, lo que facilita la retención a largo plazo. La constancia es el mejor predictor de éxito académico. Reconocer y reforzar este hábito.' :
                       activeDays > 10 ? '📚 Compromiso moderado. El estudiante accede de forma intermitente. Para mejorar: 1) Establecer horarios fijos de estudio, 2) Activar notificaciones de recordatorio, 3) Fijar metas semanales pequeñas y alcanzables para generar hábito.' :
                       activeDays > 3 ? '💤 Baja frecuencia de uso. El estudiante apenas accede a la plataforma. Se recomienda: 1) Contactar al estudiante para verificar su situación, 2) Establecer compromisos de estudio mínimos (10 min/día), 3) Asignar tareas específicas con plazos para motivar el acceso regular.' :
                       '🚨 Casi sin actividad. El estudiante no está usando la plataforma. Es necesario: 1) Intervención directa para conocer las causas, 2) Verificar si hay problemas técnicos o de acceso, 3) Considerar estrategias de motivación alternativas o tutoría personalizada.'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Velocidad de respuesta</p>
                      <span className="text-[10px] font-bold text-foreground">{avgTimePerQuiz}s promedio</span>
                    </div>
                    <Progress value={Math.min(100, avgTimePerQuiz > 0 ? Math.max(0, 100 - avgTimePerQuiz / 2) : 0)} className="h-2 mt-1" />
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {avgTimePerQuiz > 0 && avgTimePerQuiz < 20 ? '⚡ Respuestas muy rápidas. Verificar que no se estén seleccionando opciones al azar. Si la precisión es alta, indica excelente retención y automatización del conocimiento.' :
                       avgTimePerQuiz < 40 ? '✅ Tiempo de respuesta óptimo. El estudiante procesa las preguntas con agilidad y seguridad. La combinación de velocidad con buena precisión indica dominio efectivo del material.' :
                       avgTimePerQuiz < 70 ? '⏱️ Tiempo reflexivo. El estudiante analiza las opciones cuidadosamente. Si la precisión es alta, esto es positivo. Si no, puede indicar indecisión por falta de claridad en los conceptos. Reforzar con ejercicios de práctica rápida.' :
                       avgTimePerQuiz > 0 ? '🐢 Respuestas lentas. El estudiante tarda significativamente en responder, lo que sugiere: 1) Inseguridad conceptual, 2) Necesidad de más práctica con los temas, 3) Posible dificultad de comprensión lectora. Se recomienda: flashcards de repaso rápido y ejercicios cronometrados.' :
                       '📝 Sin datos suficientes de tiempo. El estudiante necesita completar más quizzes para obtener un análisis preciso de velocidad.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall recommendation */}
              <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--neon-violet))]/10 border border-[hsl(var(--neon-violet))]/20">
                <p className="text-xs font-medium text-[hsl(var(--neon-violet))] mb-1">📋 Recomendación General</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {avgAccuracy >= 85 && consistencyScore > 75 && activeDays > 15
                    ? `Estudiante de alto rendimiento. Precisión del ${avgAccuracy}%, consistencia del ${consistencyScore}% y ${activeDays} días activos demuestran compromiso y dominio. Puede avanzar a contenido avanzado o servir como tutor par para otros estudiantes.`
                    : avgAccuracy >= 70 && consistencyScore > 60
                    ? `Estudiante con buen potencial. Precisión del ${avgAccuracy}% con margen de mejora. Enfocarse en las sesiones con menor rendimiento (${sessionChartData.filter(s => s.precision > 0 && s.precision < 70).map(s => s.name).join(', ') || 'ninguna identificada'}) y aumentar la frecuencia de práctica a al menos ${Math.max(15, 30 - activeDays)} días más por mes.`
                    : avgAccuracy > 0
                    ? `Estudiante que requiere apoyo. Precisión del ${avgAccuracy}% y consistencia del ${consistencyScore}% indican dificultades. Plan de acción: 1) Revisar sesiones ${sessionChartData.filter(s => s.precision > 0 && s.precision < 60).map(s => s.name).join(', ') || 'con menor rendimiento'}, 2) Establecer rutina diaria de 15 min, 3) Programar seguimiento semanal con el tutor.`
                    : 'Sin datos suficientes para generar una recomendación. El estudiante debe comenzar a realizar los quizzes de las sesiones asignadas.'}
                </p>
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
