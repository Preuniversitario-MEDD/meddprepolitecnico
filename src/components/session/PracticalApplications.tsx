import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Beaker, ArrowRight } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;

/** Shows practical applications block derived from theory content titles */
export default function PracticalApplications({ items }: { items: Contenido[] }) {
  if (items.length === 0) return null;

  // Generate applications from content - take up to 4 items
  const applications = items.slice(0, 4).map((item, i) => ({
    id: item.id,
    title: item.titulo,
    description: item.texto?.split('\n')[0]?.substring(0, 120) || 'Aplicación práctica del concepto',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
    >
      <Card className="border-l-4 border-neon-orange/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-neon-orange/10 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neon-orange/15 border border-neon-orange/30 flex items-center justify-center shrink-0">
              <Beaker className="w-5 h-5 text-neon-orange" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm md:text-base text-foreground">🔬 Aplicaciones Prácticas</h3>
              <p className="text-[11px] text-muted-foreground">Cómo se aplican estos conceptos en la práctica</p>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {applications.map((app, i) => (
              <div
                key={app.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-neon-orange/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-neon-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-neon-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{app.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
