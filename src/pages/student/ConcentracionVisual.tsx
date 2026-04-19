import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Search, Brain, Timer, Clock, BookOpen, Flame, CheckCircle2, Lock, Trophy, Award, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import ExercisePuntoFocal from '@/components/concentracion/ExercisePuntoFocal';
import ExerciseBusquedaRapida from '@/components/concentracion/ExerciseBusquedaRapida';
import ExerciseMemoriaVisual from '@/components/concentracion/ExerciseMemoriaVisual';
import ExercisePomodoro from '@/components/concentracion/ExercisePomodoro';
import Exercise202020 from '@/components/concentracion/Exercise202020';
import ExerciseLecturaRapida from '@/components/concentracion/ExerciseLecturaRapida';

type Sesion = { id: string; ejercicio: string; duracion_segundos: number; precision_porcentaje: number; completado: boolean; fecha: string };

const EXERCISES = [
  { key: 'punto_focal', titulo: 'Punto Focal', desc: 'Fija la mirada y mejora el enfoque sostenido', icon: Eye, color: 'from-blue-500 to-cyan-500', tiempo: '3 min' },
  { key: 'busqueda_rapida', titulo: 'Búsqueda Rápida', desc: 'Detecta el número o símbolo diferente en la grilla', icon: Search, color: 'from-emerald-500 to-green-500', tiempo: '2 min' },
  { key: 'memoria_visual', titulo: 'Memoria Visual', desc: 'Recuerda patrones y secuencias', icon: Brain, color: 'from-purple-500 to-fuchsia-500', tiempo: '4 min' },
  { key: 'pomodoro', titulo: 'Pomodoro Guiado', desc: 'Bloques de estudio con descanso visual', icon: Timer, color: 'from-amber-500 to-yellow-500', tiempo: '30 min' },
  { key: 'regla_20', titulo: 'Regla 20-20-20', desc: 'Descansa los ojos cada 20 minutos de pantalla', icon: Clock, color: 'from-orange-500 to-rose-500', tiempo: '20 seg' },
  { key: 'lectura_rapida', titulo: 'Lectura Rápida', desc: 'Mejora tu velocidad lectora con textos de ciencias', icon: BookOpen, color: 'from-teal-500 to-cyan-500', tiempo: '5 min' },
] as const;

export default function ConcentracionVisual() {
  const { user } = useAuth();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('concentracion_sesiones').select('*').eq('user_id', user.id).order('fecha', { ascending: false });
    if (data) setSesiones(data as Sesion[]);
  };
  useEffect(() => { load(); }, [user]);

  const today = new Date().toDateString();
  const completedToday = useMemo(() => new Set(sesiones.filter(s => new Date(s.fecha).toDateString() === today && s.completado).map(s => s.ejercicio)), [sesiones]);
  const minutosHoy = Math.round(sesiones.filter(s => new Date(s.fecha).toDateString() === today).reduce((a, s) => a + s.duracion_segundos, 0) / 60);
  const precisionAvg = sesiones.length ? Math.round(sesiones.reduce((a, s) => a + s.precision_porcentaje, 0) / sesiones.length) : 0;

  const racha = useMemo(() => {
    const dias = new Set(sesiones.filter(s => s.completado).map(s => new Date(s.fecha).toDateString()));
    let streak = 0;
    const d = new Date();
    while (dias.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }, [sesiones]);

  const weekData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const data = days.map(d => ({ dia: d, minutos: 0 }));
    const now = new Date();
    sesiones.forEach(s => {
      const d = new Date(s.fecha);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 7) data[d.getDay()].minutos += Math.round(s.duracion_segundos / 60);
    });
    return data;
  }, [sesiones]);

  const handleComplete = async (key: string, precision: number, duracion: number) => {
    if (!user) return;
    await supabase.from('concentracion_sesiones').insert({ user_id: user.id, ejercicio: key, duracion_segundos: duracion, precision_porcentaje: precision, completado: true });
    toast.success('¡Ejercicio completado!', { description: `Precisión: ${precision}% · ${Math.round(duracion / 60)} min` });
    setActiveKey(null);
    load();
  };

  const badges = [
    { id: 'first', label: 'Primera sesión', icon: Star, unlocked: sesiones.some(s => s.completado) },
    { id: 'd3', label: '3 días seguidos', icon: Flame, unlocked: racha >= 3 },
    { id: 'd7', label: '7 días seguidos', icon: Award, unlocked: racha >= 7 },
    { id: 'master', label: 'Maestro del enfoque', icon: Trophy, unlocked: completedToday.size >= EXERCISES.length },
  ];

  const renderExercise = () => {
    const cb = (p: number, d: number) => handleComplete(activeKey!, p, d);
    switch (activeKey) {
      case 'punto_focal': return <ExercisePuntoFocal onComplete={cb} />;
      case 'busqueda_rapida': return <ExerciseBusquedaRapida onComplete={cb} />;
      case 'memoria_visual': return <ExerciseMemoriaVisual onComplete={cb} />;
      case 'pomodoro': return <ExercisePomodoro onComplete={cb} />;
      case 'regla_20': return <Exercise202020 onComplete={cb} />;
      case 'lectura_rapida': return <ExerciseLecturaRapida onComplete={cb} />;
      default: return null;
    }
  };

  const activeMeta = EXERCISES.find(e => e.key === activeKey);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Concentración Visual</h1>
            <p className="text-sm text-muted-foreground mt-1">Entrena tu mente para el examen ESPOL</p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-orange-500/40 text-orange-500">
            <Flame className="w-4 h-4" /> {racha} {racha === 1 ? 'día' : 'días'} seguidos
          </Badge>
        </div>
      </motion.div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Días seguidos', value: racha, icon: Flame, color: 'text-orange-500' },
          { label: 'Minutos hoy', value: minutosHoy, icon: Timer, color: 'text-blue-500' },
          { label: 'Precisión', value: `${precisionAvg}%`, icon: Trophy, color: 'text-emerald-500' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4">
                <m.icon className={`w-5 h-5 ${m.color} mb-2`} />
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Ejercicios */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3">Ejercicios de hoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXERCISES.map((e, i) => {
            const done = completedToday.has(e.key);
            return (
              <motion.div key={e.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                  <div className={`h-1 bg-gradient-to-r ${e.color}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${e.color} flex items-center justify-center shrink-0`}>
                        <e.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold">{e.titulo}</h3>
                          {done && <Badge variant="secondary" className="gap-1 text-[10px] h-5"><CheckCircle2 className="w-3 h-3" /> Hoy</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">⏱ {e.tiempo}</span>
                      <Button size="sm" variant={done ? 'outline' : 'default'} onClick={() => setActiveKey(e.key)}>
                        {done ? 'Repetir' : 'Iniciar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        <Progress value={(completedToday.size / EXERCISES.length) * 100} className="mt-4" />
        <p className="text-xs text-muted-foreground text-center mt-2">{completedToday.size} de {EXERCISES.length} completados hoy</p>
      </div>

      {/* Progreso semanal */}
      <Card>
        <CardHeader><CardTitle className="text-base">Progreso semanal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData}>
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey="minutos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Logros */}
      <Card>
        <CardHeader><CardTitle className="text-base">Racha y logros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map(b => (
              <div key={b.id} className={`p-4 rounded-xl border text-center ${b.unlocked ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 opacity-60'}`}>
                {b.unlocked ? <b.icon className="w-7 h-7 mx-auto text-primary mb-2" /> : <Lock className="w-7 h-7 mx-auto text-muted-foreground mb-2" />}
                <p className="text-xs font-medium">{b.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog ejercicio */}
      <Dialog open={!!activeKey} onOpenChange={(o) => !o && setActiveKey(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeMeta && <activeMeta.icon className="w-5 h-5" />}
              {activeMeta?.titulo}
            </DialogTitle>
          </DialogHeader>
          {renderExercise()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
