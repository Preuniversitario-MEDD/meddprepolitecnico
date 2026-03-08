import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, TrendingUp, CheckCircle, Activity, Award, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';

const statIcons = [Users, BookOpen, TrendingUp, CheckCircle, Activity, Award];

interface StudentRanking {
  nombre: string;
  apellidos: string;
  cedula: string;
  colegio: string;
  completadas: number;
  accuracy: number;
  progreso: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSessions: 0,
    avgProgress: 0,
    completedSessions: 0,
  });
  const [sessionData, setSessionData] = useState<{ name: string; completados: number }[]>([]);
  const [ranking, setRanking] = useState<StudentRanking[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [{ count: studentCount }, { data: sesiones }, { data: progress }, { data: allSesiones }, { data: profiles }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('sesiones').select('*').eq('estado', 'abierta'),
      supabase.from('progreso_estudiante').select('*'),
      supabase.from('sesiones').select('*').order('numero'),
      supabase.from('profiles').select('*'),
    ]);

    const completed = progress?.filter(p => p.completada).length || 0;
    const total = progress?.length || 1;

    setStats({
      totalStudents: (studentCount || 1) - 1,
      activeSessions: sesiones?.length || 0,
      avgProgress: Math.round((completed / total) * 100),
      completedSessions: completed,
    });

    if (allSesiones) {
      setSessionData(allSesiones.map(s => ({
        name: `S${s.numero}`,
        completados: progress?.filter(p => p.sesion_id === s.id && p.completada).length || 0,
      })));
    }

    // Build ranking
    if (profiles && progress) {
      const rankingData: StudentRanking[] = profiles
        .filter(p => p.cedula !== '0930620109') // exclude admin
        .map(profile => {
          const studentProgress = progress.filter(pr => pr.user_id === profile.user_id);
          const completadas = studentProgress.filter(p => p.completada).length;
          const totalCorrect = studentProgress.reduce((sum, p) => sum + (p.preguntas_correctas_total || 0), 0);
          const totalErrors = studentProgress.reduce((sum, p) => sum + (p.errores_quiz || 0), 0);
          const totalAnswered = totalCorrect + totalErrors;
          const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

          let progressSum = 0;
          studentProgress.forEach(p => {
            const ejerciciosP = Math.min((p.ejercicios_correctos || 0) / 20, 1) * 40;
            const quizP = Math.min((p.preguntas_correctas_total || 0) / 150, 1) * 60;
            progressSum += ejerciciosP + quizP;
          });

          return {
            nombre: profile.nombre,
            apellidos: profile.apellidos,
            cedula: profile.cedula,
            colegio: (profile as any).colegio || '',
            completadas,
            accuracy,
            progreso: Math.round(progressSum / 14),
          };
        })
        .sort((a, b) => b.progreso - a.progreso);

      setRanking(rankingData);
    }
  }

  function exportCSV() {
    const headers = ['Posición', 'Nombre', 'Apellidos', 'Cédula', 'Colegio', 'Progreso %', 'Precisión Quiz %', 'Sesiones Completadas'];
    const rows = ranking.map((r, i) => [
      i + 1, r.nombre, r.apellidos, r.cedula, r.colegio, r.progreso, r.accuracy, r.completadas
    ]);

    // Add KPIs at the top
    const kpiRows = [
      ['--- KPIs ESPOLMEDD ---'],
      [`Total Estudiantes: ${stats.totalStudents}`],
      [`Sesiones Abiertas: ${stats.activeSessions}`],
      [`Progreso Promedio: ${stats.avgProgress}%`],
      [`Total Sesiones Completadas: ${stats.completedSessions}`],
      [''],
      headers,
      ...rows,
    ];

    const csv = kpiRows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESPOLMEDD_Ranking_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV descargado', description: `${ranking.length} estudiantes exportados` });
  }

  const statCards = [
    { label: 'Estudiantes', value: stats.totalStudents, icon: 0 },
    { label: 'Sesiones Abiertas', value: stats.activeSessions, icon: 1 },
    { label: 'Progreso Promedio', value: `${stats.avgProgress}%`, icon: 2 },
    { label: 'Sesiones Completadas', value: stats.completedSessions, icon: 3 },
  ];

  const pieData = [
    { name: 'Completadas', value: stats.completedSessions || 1 },
    { name: 'Pendientes', value: Math.max(0, (stats.totalStudents * 14) - stats.completedSessions) || 1 },
  ];
  const PIE_COLORS = ['hsl(160 60% 50%)', 'hsl(250 15% 88%)'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Panel de Administrador</h1>
          <p className="text-muted-foreground text-sm mt-1">Bienvenido al centro de control de ESPOLMEDD</p>
        </div>
        <Button onClick={exportCSV} className="gradient-cool text-primary-foreground gap-2" size="sm">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, i) => {
          const Icon = statIcons[i];
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="card-elevated neon-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      i === 0 ? 'gradient-primary' : i === 1 ? 'gradient-cool' : i === 2 ? 'gradient-warm' : 'gradient-neon'
                    }`}>
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base font-display">Progreso por Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sessionData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="completados" fill="hsl(270 70% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base font-display">Estado General</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      {ranking.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Award className="w-5 h-5 text-[hsl(var(--neon-orange))]" /> Ranking de Estudiantes
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">#</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Estudiante</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Colegio</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">Progreso</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">Precisión</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">Completadas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.cedula} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 font-bold text-muted-foreground">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="py-2 px-2">
                      <p className="font-medium">{r.nombre} {r.apellidos}</p>
                      <p className="text-xs text-muted-foreground">{r.cedula}</p>
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{r.colegio || '—'}</td>
                    <td className="py-2 px-2 text-right font-bold text-primary">{r.progreso}%</td>
                    <td className="py-2 px-2 text-right">{r.accuracy}%</td>
                    <td className="py-2 px-2 text-right">{r.completadas}/14</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
