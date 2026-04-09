import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Lightbulb, BookOpen, Calendar } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

interface StudyTimelineProps {
  sesiones: Sesion[];
  progress: Record<string, { completada: boolean; correctasTotal: number; erroresTotal: number }>;
  onNavigate: (sessionId: string) => void;
}

const STUDY_TIPS = [
  { icon: Lightbulb, tip: 'Repasa los conceptos clave antes de intentar los ejercicios. La teoría es tu base.' },
  { icon: BookOpen, tip: 'Haz el quiz varias veces — cada intento refuerza tu memoria a largo plazo.' },
  { icon: Calendar, tip: 'Estudia 1-2 sesiones por día. La consistencia supera a la intensidad.' },
];

const DAY_COLORS = [
  'border-primary/40 bg-primary/5',
  'border-neon-violet/40 bg-neon-violet/5',
  'border-neon-blue/40 bg-neon-blue/5',
  'border-neon-mint/40 bg-neon-mint/5',
  'border-neon-orange/40 bg-neon-orange/5',
  'border-neon-fuchsia/40 bg-neon-fuchsia/5',
];

const DOT_COLORS = [
  'bg-primary', 'bg-neon-violet', 'bg-neon-blue', 'bg-neon-mint', 'bg-neon-orange', 'bg-neon-fuchsia',
];

export default function StudyTimeline({ sesiones, progress, onNavigate }: StudyTimelineProps) {
  const plan = useMemo(() => {
    // Group sessions into study days (2 sessions per day)
    const available = sesiones.filter(s => s.estado !== 'bloqueada');
    const days: { day: number; sessions: Sesion[]; label: string }[] = [];
    for (let i = 0; i < available.length; i += 2) {
      const chunk = available.slice(i, i + 2);
      days.push({
        day: Math.floor(i / 2) + 1,
        sessions: chunk,
        label: chunk.map(s => s.titulo).join(' + '),
      });
    }
    return days;
  }, [sesiones]);

  return (
    <div className="space-y-4">
      {/* Study Tips */}
      <Card className="border-l-4 border-neon-mint/50 bg-neon-mint/5">
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-neon-mint" />
            Consejos de Estudio
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {STUDY_TIPS.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background/60">
                <t.icon className="w-4 h-4 text-neon-mint shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{t.tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Plan de Estudio Cronológico
      </h3>
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        <div className="space-y-3">
          {plan.map((day, i) => {
            const allDone = day.sessions.every(s => progress[s.id]?.completada);
            const anyStarted = day.sessions.some(s => progress[s.id]);
            const colorIdx = i % DAY_COLORS.length;

            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                {/* Dot */}
                <div className={`absolute -left-6 top-3 w-3.5 h-3.5 rounded-full border-2 border-background ${
                  allDone ? 'bg-accent' : anyStarted ? DOT_COLORS[colorIdx] : 'bg-muted'
                }`} />

                <Card
                  className={`border-l-2 ${DAY_COLORS[colorIdx]} cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => day.sessions[0] && onNavigate(day.sessions[0].id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Día {day.day}
                      </span>
                      {allDone && <CheckCircle className="w-4 h-4 text-accent" />}
                      {!allDone && anyStarted && <Clock className="w-4 h-4 text-neon-orange" />}
                    </div>
                    <div className="space-y-1">
                      {day.sessions.map(s => {
                        const p = progress[s.id];
                        const total = p ? p.correctasTotal + p.erroresTotal : 0;
                        const acc = total > 0 ? Math.round((p.correctasTotal / total) * 100) : 0;
                        return (
                          <div key={s.id} className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">
                              S{s.numero}: {s.titulo}
                            </p>
                            {total > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                acc >= 80 ? 'bg-accent/20 text-accent' : acc >= 50 ? 'bg-neon-orange/20 text-neon-orange' : 'bg-destructive/20 text-destructive'
                              }`}>
                                {acc}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
