import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, CheckCircle, Activity, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const statIcons = [Users, BookOpen, TrendingUp, CheckCircle, Activity, Award];
const statColors = ['primary', 'secondary', 'accent', 'neon-mint', 'neon-orange', 'neon-pink'] as const;

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSessions: 0,
    avgProgress: 0,
    completedSessions: 0,
  });
  const [sessionData, setSessionData] = useState<{ name: string; completados: number }[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: sesiones } = await supabase
      .from('sesiones')
      .select('*')
      .eq('estado', 'abierta');

    const { data: progress } = await supabase
      .from('progreso_estudiante')
      .select('*');

    const completed = progress?.filter(p => p.completada).length || 0;
    const total = progress?.length || 1;

    setStats({
      totalStudents: (studentCount || 1) - 1, // minus admin
      activeSessions: sesiones?.length || 0,
      avgProgress: Math.round((completed / total) * 100),
      completedSessions: completed,
    });

    // Session chart data
    const { data: allSesiones } = await supabase.from('sesiones').select('*').order('numero');
    if (allSesiones) {
      setSessionData(allSesiones.map(s => ({
        name: `S${s.numero}`,
        completados: progress?.filter(p => p.sesion_id === s.id && p.completada).length || 0,
      })));
    }
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
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Panel de Administrador</h1>
        <p className="text-muted-foreground text-sm mt-1">Bienvenido al centro de control de ESPOLMEDD</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, i) => {
          const Icon = statIcons[i];
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
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
    </div>
  );
}
