import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Eye } from 'lucide-react';

type Row = { user_id: string; nombre: string; apellidos: string; dias: number; minutos: number; favorito: string; ultima: string };

export default function AdminConcentracion() {
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('all');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      let since: Date | null = null;
      if (filter === 'week') { since = new Date(); since.setDate(since.getDate() - 7); }
      if (filter === 'month') { since = new Date(); since.setMonth(since.getMonth() - 1); }

      let q = supabase.from('concentracion_sesiones').select('user_id, ejercicio, duracion_segundos, fecha');
      if (since) q = q.gte('fecha', since.toISOString());
      const { data: ses } = await q;
      const { data: profs } = await supabase.from('profiles').select('user_id, nombre, apellidos');
      if (!ses || !profs) return;

      const map = new Map<string, { dias: Set<string>; minutos: number; favs: Record<string, number>; ultima: string }>();
      ses.forEach(s => {
        const e = map.get(s.user_id) || { dias: new Set(), minutos: 0, favs: {}, ultima: s.fecha };
        e.dias.add(new Date(s.fecha).toDateString());
        e.minutos += Math.round((s.duracion_segundos || 0) / 60);
        e.favs[s.ejercicio] = (e.favs[s.ejercicio] || 0) + 1;
        if (s.fecha > e.ultima) e.ultima = s.fecha;
        map.set(s.user_id, e);
      });

      const result: Row[] = profs
        .filter(p => map.has(p.user_id))
        .map(p => {
          const e = map.get(p.user_id)!;
          const fav = Object.entries(e.favs).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
          return { user_id: p.user_id, nombre: p.nombre, apellidos: p.apellidos, dias: e.dias.size, minutos: e.minutos, favorito: fav, ultima: e.ultima };
        })
        .sort((a, b) => b.minutos - a.minutos);
      setRows(result);
    })();
  }, [filter]);

  const totals = useMemo(() => ({
    estudiantes: rows.length,
    minutos: rows.reduce((a, r) => a + r.minutos, 0),
  }), [rows]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" /> Concentración Visual
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Estadísticas de uso por estudiante</p>
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="all">Todo el tiempo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Estudiantes activos</p><p className="text-2xl font-bold">{totals.estudiantes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Minutos totales</p><p className="text-2xl font-bold">{totals.minutos}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalle por estudiante</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="text-right">Días activos</TableHead>
                  <TableHead className="text-right">Minutos</TableHead>
                  <TableHead>Favorito</TableHead>
                  <TableHead>Última sesión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos en este rango</TableCell></TableRow>
                )}
                {rows.map(r => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.nombre} {r.apellidos}</TableCell>
                    <TableCell className="text-right">{r.dias}</TableCell>
                    <TableCell className="text-right">{r.minutos}</TableCell>
                    <TableCell className="text-xs">{r.favorito.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.ultima).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
