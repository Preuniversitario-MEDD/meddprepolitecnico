import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Clock, FlaskConical } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [progress, setProgress] = useState<Record<string, { completada: boolean; puntaje: number }>>({});
  const [globalProgress, setGlobalProgress] = useState(0);

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    const { data: ses } = await supabase.from('sesiones').select('*').order('numero');
    setSesiones(ses || []);

    if (user) {
      const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', user.id);
      const map: Record<string, { completada: boolean; puntaje: number }> = {};
      prog?.forEach(p => {
        map[p.sesion_id] = { completada: p.completada, puntaje: Number(p.puntaje_quiz) || 0 };
      });
      setProgress(map);

      const completed = prog?.filter(p => p.completada).length || 0;
      setGlobalProgress(Math.round((completed / 14) * 100));
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
    'from-neon-violet to-neon-blue',
    'from-neon-pink to-neon-fuchsia',
    'from-neon-blue to-neon-mint',
    'from-neon-orange to-neon-pink',
    'from-neon-mint to-neon-blue',
    'from-neon-fuchsia to-neon-violet',
    'from-neon-orange to-neon-violet',
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">
          ¡Hola, <span className="text-gradient-primary">{firstName}</span>! 👋
        </h1>
        <p className="text-muted-foreground text-sm">Sigue avanzando en tu preparación de Química</p>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-elevated neon-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold text-sm">Progreso Global</p>
              <span className="text-2xl font-bold text-gradient-primary">{globalProgress}%</span>
            </div>
            <Progress value={globalProgress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {Object.values(progress).filter(p => p.completada).length} de 14 sesiones completadas
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sessions Grid */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3">Sesiones de Química</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sesiones.map((sesion, i) => {
            const status = getSessionStatus(sesion);
            const config = statusConfig[status];
            const colorIndex = i % sessionColors.length;

            return (
              <motion.div
                key={sesion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={status !== 'locked' ? { scale: 1.03 } : {}}
                whileTap={status !== 'locked' ? { scale: 0.97 } : {}}
              >
                <Card
                  className={`card-elevated cursor-pointer transition-all overflow-hidden ${
                    status === 'locked' ? 'opacity-50 cursor-not-allowed' : 'hover:glow-primary'
                  } border-l-4 ${config.border}`}
                  onClick={() => status !== 'locked' && navigate(`/student/session/${sesion.id}`)}
                >
                  <CardContent className="p-3">
                    <div className={`w-10 h-10 rounded-xl mb-2 flex items-center justify-center bg-gradient-to-br ${sessionColors[colorIndex]}`}>
                      <config.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="font-display font-bold text-sm">S{sesion.numero}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sesion.titulo}</p>
                    <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      status === 'completed' ? 'bg-accent/20 text-accent' :
                      status === 'in-progress' ? 'bg-neon-orange/20 text-neon-orange' :
                      status === 'locked' ? 'bg-muted text-muted-foreground' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {config.label}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
