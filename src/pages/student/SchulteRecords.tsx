import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Lock, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import SchulteEvolucion from '@/components/concentracion/SchulteEvolucion';

type Row = { user_id: string; nombre: string; tiempo: number; errores: number; fecha: string; calificacion: string };
const NIVELES = [
  { n: 1, label: '3×3' },
  { n: 2, label: '4×4' },
  { n: 3, label: '5×5' },
  { n: 4, label: '7×7' },
];

function relFecha(s: string) {
  const d = new Date(s);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 7) return `hace ${diff} días`;
  return d.toLocaleDateString();
}

export default function SchulteRecords() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('1');
  const [data, setData] = useState<Record<number, Row[]>>({});
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set([1]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: res } = await supabase
        .from('schulte_resultados')
        .select('user_id, nivel, tiempo_segundos, errores, fecha, calificacion')
        .eq('completado', true);
      const { data: profs } = await (supabase.from('public_profiles' as any).select('user_id, nombre, apellidos') as any);
      if (!res || !profs) { setLoading(false); return; }
      const profMap = new Map((profs as any[]).map((p: any) => [p.user_id as string, `${p.nombre} ${p.apellidos}`.trim()]));

      const byNivel: Record<number, Row[]> = {};
      const u = new Set<number>([1]);
      [1, 2, 3, 4].forEach(n => {
        const filtered = res.filter((r: any) => r.nivel === n);
        // Mejor por usuario
        const bestByUser = new Map<string, Row>();
        filtered.forEach((r: any) => {
          const t = Number(r.tiempo_segundos);
          const cur = bestByUser.get(r.user_id);
          if (!cur || t < cur.tiempo || (t === cur.tiempo && r.errores < cur.errores)) {
            bestByUser.set(r.user_id, {
              user_id: r.user_id,
              nombre: profMap.get(r.user_id) || 'Estudiante',
              tiempo: t, errores: r.errores, fecha: r.fecha, calificacion: r.calificacion,
            });
          }
        });
        const sorted = [...bestByUser.values()].sort((a, b) => a.tiempo - b.tiempo || a.errores - b.errores);
        byNivel[n] = sorted;
        if (user && bestByUser.has(user.id) && n < 4) u.add(n + 1);
      });
      setData(byNivel);
      setUnlocked(u);
      setLoading(false);
    })();
  }, [user]);

  const myBest = useMemo(() => {
    const out: Record<number, { tiempo: number; pos: number; total: number } | null> = {};
    [1, 2, 3, 4].forEach(n => {
      const list = data[n] || [];
      const idx = list.findIndex(r => r.user_id === user?.id);
      out[n] = idx >= 0 ? { tiempo: list[idx].tiempo, pos: idx + 1, total: list.length } : null;
    });
    return out;
  }, [data, user]);

  const renderTable = (n: number) => {
    const list = data[n] || [];
    const top10 = list.slice(0, 10);
    const myIdx = list.findIndex(r => r.user_id === user?.id);
    const myInTop = myIdx >= 0 && myIdx < 10;
    const me = myIdx >= 0 ? list[myIdx] : null;

    if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
    if (top10.length === 0) return <p className="text-center text-muted-foreground py-8 text-sm">Aún no hay récords en este nivel. ¡Sé el primero!</p>;

    const renderRow = (r: Row, pos: number, isMe: boolean) => {
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
      return (
        <TableRow key={r.user_id + pos} className={isMe ? 'bg-primary/10 font-medium' : ''}>
          <TableCell className="font-bold w-10">{medal || `#${pos}`}</TableCell>
          <TableCell>
            {r.nombre} {isMe && <Badge variant="secondary" className="ml-1 text-[10px]">¡Tú!</Badge>}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">{r.tiempo.toFixed(1)}s</TableCell>
          <TableCell className="text-right text-xs text-muted-foreground">{r.errores}</TableCell>
          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{relFecha(r.fecha)}</TableCell>
          <TableCell className="text-xs hidden md:table-cell">{r.calificacion}</TableCell>
        </TableRow>
      );
    };

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Estudiante</TableHead>
              <TableHead className="text-right">Tiempo</TableHead>
              <TableHead className="text-right">Errores</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="hidden md:table-cell">Calificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top10.map((r, i) => renderRow(r, i + 1, r.user_id === user?.id))}
            {!myInTop && me && (
              <>
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-1">···</TableCell></TableRow>
                {renderRow(me, myIdx + 1, true)}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/student/concentracion')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <Button size="sm" onClick={() => navigate('/student/schulte')}>
          <Play className="w-4 h-4 mr-1" /> Jugar ahora
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" /> Tabla de récords
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Los estudiantes más rápidos de cada nivel</p>
      </motion.div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full">
              {NIVELES.map(l => <TabsTrigger key={l.n} value={String(l.n)}>{l.label}</TabsTrigger>)}
            </TabsList>
            {NIVELES.map(l => (
              <TabsContent key={l.n} value={String(l.n)} className="mt-4">{renderTable(l.n)}</TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <SchulteEvolucion />

      <Card>
        <CardHeader><CardTitle className="text-base">Tu progreso personal</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {NIVELES.map(l => {
              const mb = myBest[l.n];
              const lock = !unlocked.has(l.n);
              const worldBest = data[l.n]?.[0]?.tiempo;
              const pct = mb && worldBest ? Math.min(100, (worldBest / mb.tiempo) * 100) : 0;
              return (
                <div key={l.n} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{l.label}</p>
                    {lock && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xl font-mono font-bold tabular-nums">{mb ? `${mb.tiempo.toFixed(1)}s` : '—'}</p>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground">{mb ? `#${mb.pos} de ${mb.total}` : lock ? 'Bloqueado' : 'Sin jugar'}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
