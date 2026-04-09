import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

interface PerformanceChartsProps {
  sesiones: Sesion[];
  progress: Record<string, { completada: boolean; correctasTotal: number; erroresTotal: number }>;
}

const BAR_COLORS = {
  correct: 'hsl(var(--neon-mint))',
  incorrect: 'hsl(var(--destructive))',
};

const PIE_COLORS = ['hsl(var(--neon-mint))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export default function PerformanceCharts({ sesiones, progress }: PerformanceChartsProps) {
  const barData = useMemo(() => {
    return sesiones
      .filter(s => {
        const p = progress[s.id];
        return p && (p.correctasTotal + p.erroresTotal) > 0;
      })
      .map(s => {
        const p = progress[s.id];
        return {
          name: `S${s.numero}`,
          fullName: s.titulo,
          Correctas: p.correctasTotal,
          Incorrectas: p.erroresTotal,
        };
      });
  }, [sesiones, progress]);

  const pieData = useMemo(() => {
    let totalCorrect = 0;
    let totalErrors = 0;
    Object.values(progress).forEach(p => {
      totalCorrect += p.correctasTotal;
      totalErrors += p.erroresTotal;
    });
    const total = totalCorrect + totalErrors;
    if (total === 0) return [];
    return [
      { name: 'Correctas', value: totalCorrect, pct: Math.round((totalCorrect / total) * 100) },
      { name: 'Incorrectas', value: totalErrors, pct: Math.round((totalErrors / total) * 100) },
    ];
  }, [progress]);

  if (barData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aún no hay datos suficientes. ¡Completa algunos quizzes!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-neon-violet" />
        Rendimiento por Sesión
      </h3>

      <div className="grid gap-4 md:grid-cols-5">
        {/* Bar chart — takes 3 cols */}
        <Card className="border-border/50 md:col-span-3">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Correctas vs Incorrectas por Tema</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barGap={2}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                  labelFormatter={(label: string) => {
                    const item = barData.find(d => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="Correctas" fill={BAR_COLORS.correct} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Incorrectas" fill={BAR_COLORS.incorrect} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart — takes 2 cols */}
        <Card className="border-border/50 md:col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Precisión General</p>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={30}
                      formatter={(value: string) => (
                        <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-1">
                  {pieData.map((d, i) => (
                    <span key={d.name} className="text-xs font-bold" style={{ color: PIE_COLORS[i] }}>
                      {d.pct}% {d.name.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
