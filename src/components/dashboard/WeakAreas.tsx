import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

interface WeakAreasProps {
  sesiones: Sesion[];
  progress: Record<string, { completada: boolean; correctasTotal: number; erroresTotal: number }>;
  onReview: (sessionId: string) => void;
}

export default function WeakAreas({ sesiones, progress, onReview }: WeakAreasProps) {
  const weakAreas = useMemo(() => {
    return sesiones
      .map(s => {
        const p = progress[s.id];
        if (!p) return null;
        const total = p.correctasTotal + p.erroresTotal;
        if (total === 0) return null;
        const errorRate = p.erroresTotal / total;
        const accuracy = Math.round((p.correctasTotal / total) * 100);
        return {
          id: s.id,
          numero: s.numero,
          titulo: s.titulo,
          errores: p.erroresTotal,
          accuracy,
          errorRate,
          total,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.errorRate > 0.3)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
  }, [sesiones, progress]);

  if (weakAreas.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-5 h-5 text-accent" />
          </div>
          <p className="text-sm font-medium text-foreground">¡Buen trabajo!</p>
          <p className="text-xs text-muted-foreground mt-1">No tienes áreas débiles significativas. Sigue así.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-neon-orange" />
        Áreas Débiles — Requieren Repaso
      </h3>
      <div className="space-y-2">
        {weakAreas.map((area, i) => (
          <motion.div
            key={area.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-l-4 border-destructive/40 hover:border-destructive/60 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-destructive">{area.accuracy}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    S{area.numero}: {area.titulo}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {area.errores} errores de {area.total} respuestas
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(area.id)}
                  className="shrink-0 gap-1.5 border-neon-orange/30 text-neon-orange hover:bg-neon-orange/10 hover:text-neon-orange"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Repasar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
