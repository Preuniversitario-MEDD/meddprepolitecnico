import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Grid3x3, Download } from 'lucide-react';

type Row = { user_id: string; nombre: string; apellidos: string; dias: number; minutos: number; favorito: string; ultima: string };
type SchulteRow = { user_id: string; nombre: string; nivel: number; tiempo: number; errores: number; fecha: string; calificacion: string };

export default function AdminConcentracion() {
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [schulte, setSchulte] = useState<SchulteRow[]>([]);

  useEffect(() => {
    (async () => {
      let since: Date | null = null;
      if (filter === 'week') { since = new Date(); since.setDate(since.getDate() - 7); }
      if (filter === 'month') { since = new Date(); since.setMonth(since.getMonth() - 1); }

      let q = supabase.from('concentracion_sesiones').select('user_id, ejercicio, duracion_segundos, fecha');
      if (since) q = q.gte('fecha', since.toISOString());
      const { data: ses } = await q;
      const { data: profs } = await supabase.from('profiles').select('user_id, nombre, apellidos');
      const { data: sch } = await supabase.from('schulte_resultados').select('user_id, nivel, tiempo_segundos, errores, fecha, calificacion').eq('completado', true);
      if (!profs) return;
      const profMap = new Map(profs.map(p => [p.user_id, p]));

      if (ses) {
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
      }

      if (sch) {
        const sRows: SchulteRow[] = (sch as any[]).map(r => {
          const p = profMap.get(r.user_id);
          return {
            user_id: r.user_id,
            nombre: p ? `${p.nombre} ${p.apellidos}`.trim() : 'Estudiante',
            nivel: r.nivel, tiempo: Number(r.tiempo_segundos), errores: r.errores, fecha: r.fecha, calificacion: r.calificacion,
          };
        });
        setSchulte(sRows);
      }
    })();
  }, [filter]);

  const totals = useMemo(() => ({
    estudiantes: rows.length,
    minutos: rows.reduce((a, r) => a + r.minutos, 0),
  }), [rows]);

  // Resumen Schulte por estudiante x nivel
  const schulteResumen = useMemo(() => {
    const byUser = new Map<string, { nombre: string; best: Record<number, number>; nivelMax: number; intentos: number; ultima: string }>();
    schulte.forEach(r => {
      const cur = byUser.get(r.user_id) || { nombre: r.nombre, best: {}, nivelMax: 0, intentos: 0, ultima: r.fecha };
      cur.intentos++;
      if (!cur.best[r.nivel] || r.tiempo < cur.best[r.nivel]) cur.best[r.nivel] = r.tiempo;
      if (r.nivel > cur.nivelMax) cur.nivelMax = r.nivel;
      if (r.fecha > cur.ultima) cur.ultima = r.fecha;
      byUser.set(r.user_id, cur);
    });
    return [...byUser.entries()].map(([uid, v]) => ({ uid, ...v }));
  }, [schulte]);

  // Mejores tiempos globales por nivel
  const globalBest = useMemo(() => {
    const out: Record<number, { uid: string; t: number } | null> = { 1: null, 2: null, 3: null, 4: null };
    schulteResumen.forEach(u => {
      [1, 2, 3, 4].forEach(n => {
        const t = u.best[n];
        if (t !== undefined && (!out[n] || t < out[n]!.t)) out[n] = { uid: u.uid, t };
      });
    });
    return out;
  }, [schulteResumen]);

  // Top 3 por nivel
  const top3PerLevel = useMemo(() => {
    const out: Record<number, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
    [1, 2, 3, 4].forEach(n => {
      const list = schulteResumen.filter(u => u.best[n] !== undefined).sort((a, b) => a.best[n] - b.best[n]).slice(0, 3);
      list.forEach(u => out[n].add(u.uid));
    });
    return out;
  }, [schulteResumen]);

  const cellColor = (uid: string, n: number, t?: number) => {
    if (t === undefined) return 'text-muted-foreground';
    if (globalBest[n]?.uid === uid) return 'text-emerald-500 font-bold';
    if (top3PerLevel[n].has(uid)) return 'text-blue-500 font-medium';
    return '';
  };

  const exportCSV = () => {
    const header = 'Estudiante,Nivel,Tiempo(s),Errores,Calificacion,Fecha\n';
    const body = schulte.map(r => `"${r.nombre}",${r.nivel},${r.tiempo.toFixed(1)},${r.errores},"${r.calificacion}","${new Date(r.fecha).toISOString()}"`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `schulte_resultados_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const tiempoNivel3Best = (uid: string) => schulteResumen.find(u => u.uid === uid)?.best[3];

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

      {/* Schulte general */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Grid3x3 className="w-4 h-4" /> Schulte — Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="text-right">Nivel máx.</TableHead>
                  <TableHead className="text-right">Mejor 5×5</TableHead>
                  <TableHead className="text-right">Intentos</TableHead>
                  <TableHead>Último</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schulteResumen.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin resultados aún</TableCell></TableRow>
                )}
                {schulteResumen.map(u => {
                  const t3 = tiempoNivel3Best(u.uid);
                  return (
                    <TableRow key={u.uid}>
                      <TableCell className="font-medium">{u.nombre}</TableCell>
                      <TableCell className="text-right">{u.nivelMax}</TableCell>
                      <TableCell className={`text-right font-mono ${cellColor(u.uid, 3, t3)}`}>{t3 ? `${t3.toFixed(1)}s` : '—'}</TableCell>
                      <TableCell className="text-right">{u.intentos}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.ultima).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Schulte récords completos */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Récords Schulte por nivel</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="text-right">3×3</TableHead>
                  <TableHead className="text-right">4×4</TableHead>
                  <TableHead className="text-right">5×5</TableHead>
                  <TableHead className="text-right">7×7</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schulteResumen.map(u => (
                  <TableRow key={u.uid}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    {[1, 2, 3, 4].map(n => (
                      <TableCell key={n} className={`text-right font-mono ${cellColor(u.uid, n, u.best[n])}`}>
                        {u.best[n] !== undefined ? `${u.best[n].toFixed(1)}s` : '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[10px] text-muted-foreground mt-2">Verde = mejor global · Azul = top 3 · Gris = sin jugar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
