import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingDown } from 'lucide-react';

const NIVELES = [{ n: 1, label: '3×3' }, { n: 2, label: '4×4' }, { n: 3, label: '5×5' }, { n: 4, label: '7×7' }];

interface Resultado { nivel: number; tiempo_segundos: number; fecha: string }

function semanaKey(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${String(week).padStart(2, '0')}`;
}

export default function SchulteEvolucion() {
  const { user } = useAuth();
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [tab, setTab] = useState('1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('schulte_resultados')
        .select('nivel, tiempo_segundos, fecha')
        .eq('user_id', user.id)
        .eq('completado', true)
        .order('fecha', { ascending: true });
      setResultados((data as any) || []);
      setLoading(false);
    })();
  }, [user]);

  const dataPorNivel = useMemo(() => {
    const out: Record<number, { semana: string; mejor: number }[]> = {};
    NIVELES.forEach(({ n }) => {
      const filtrados = resultados.filter(r => r.nivel === n);
      const porSemana = new Map<string, number>();
      filtrados.forEach(r => {
        const k = semanaKey(new Date(r.fecha));
        const t = Number(r.tiempo_segundos);
        if (!porSemana.has(k) || t < (porSemana.get(k) as number)) porSemana.set(k, t);
      });
      out[n] = [...porSemana.entries()].map(([semana, mejor]) => ({ semana, mejor: Number(mejor.toFixed(1)) }));
    });
    return out;
  }, [resultados]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" /> Evolución personal Schulte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full">
            {NIVELES.map(l => <TabsTrigger key={l.n} value={String(l.n)}>{l.label}</TabsTrigger>)}
          </TabsList>
          {NIVELES.map(l => (
            <TabsContent key={l.n} value={String(l.n)} className="mt-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Cargando…</p>
              ) : dataPorNivel[l.n].length < 2 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  Necesitas al menos 2 partidas en semanas distintas para ver tu evolución.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dataPorNivel[l.n]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="semana" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} reversed />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`${v}s`, 'Mejor tiempo']} />
                    <Line type="monotone" dataKey="mejor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Cuanto más bajo el punto, mejor. Tu meta es bajar la línea cada semana.
        </p>
      </CardContent>
    </Card>
  );
}
