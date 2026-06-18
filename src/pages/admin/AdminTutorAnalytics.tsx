import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Sparkles, MessageSquare, Users, Activity, TrendingUp,
  Calendar as CalendarIcon, Download, RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, differenceInDays, eachDayOfInterval, eachHourOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Preset = '1d' | '7d' | '30d' | '90d' | 'custom';

interface UsageRow {
  id: string;
  user_id: string;
  created_at: string;
  kind: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
}

interface TopUser {
  user_id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  count: number;
  last: string;
}

export default function AdminTutorAnalytics() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<Preset>('7d');
  const [from, setFrom] = useState<Date>(startOfDay(subDays(new Date(), 6)));
  const [to, setTo] = useState<Date>(endOfDay(new Date()));
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { nombre: string; apellidos: string; cedula: string }>>({});
  const [loading, setLoading] = useState(false);

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === '1d') { setFrom(startOfDay(now)); setTo(endOfDay(now)); }
    else if (p === '7d') { setFrom(startOfDay(subDays(now, 6))); setTo(endOfDay(now)); }
    else if (p === '30d') { setFrom(startOfDay(subDays(now, 29))); setTo(endOfDay(now)); }
    else if (p === '90d') { setFrom(startOfDay(subDays(now, 89))); setTo(endOfDay(now)); }
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tutor_usage')
      .select('id, user_id, created_at, kind, tokens_in, tokens_out')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const usage = (data || []) as UsageRow[];
    setRows(usage);
    const userIds = Array.from(new Set(usage.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, nombre, apellidos, cedula')
        .in('user_id', userIds);
      const map: typeof profiles = {};
      (profs || []).forEach((p: any) => {
        map[p.user_id] = { nombre: p.nombre, apellidos: p.apellidos, cedula: p.cedula };
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const users = new Set(rows.map((r) => r.user_id)).size;
    const spanMin = Math.max(1, (to.getTime() - from.getTime()) / 60000);
    const msgsPerMin = total / spanMin;
    const tokensIn = rows.reduce((s, r) => s + (r.tokens_in || 0), 0);
    return { total, users, msgsPerMin, tokensIn };
  }, [rows, from, to]);

  const seriesData = useMemo(() => {
    const days = differenceInDays(to, from);
    if (days <= 1) {
      // hourly
      const hours = eachHourOfInterval({ start: from, end: to });
      return hours.map((h) => {
        const next = new Date(h.getTime() + 3600_000);
        const count = rows.filter((r) => {
          const d = new Date(r.created_at);
          return d >= h && d < next;
        }).length;
        return { label: format(h, 'HH:mm'), mensajes: count };
      });
    }
    const dayList = eachDayOfInterval({ start: from, end: to });
    return dayList.map((d) => {
      const start = startOfDay(d).getTime();
      const end = endOfDay(d).getTime();
      const count = rows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= start && t <= end;
      }).length;
      return { label: format(d, 'd MMM', { locale: es }), mensajes: count };
    });
  }, [rows, from, to]);

  const topUsers: TopUser[] = useMemo(() => {
    const grouped: Record<string, { count: number; last: string }> = {};
    rows.forEach((r) => {
      const g = grouped[r.user_id] || { count: 0, last: r.created_at };
      g.count += 1;
      if (r.created_at > g.last) g.last = r.created_at;
      grouped[r.user_id] = g;
    });
    return Object.entries(grouped)
      .map(([user_id, g]) => ({
        user_id,
        nombre: profiles[user_id]?.nombre || '—',
        apellidos: profiles[user_id]?.apellidos || '',
        cedula: profiles[user_id]?.cedula || '',
        count: g.count,
        last: g.last,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [rows, profiles]);

  function exportCSV() {
    const headers = ['#', 'Nombre', 'Cédula', 'Mensajes', 'Último uso'];
    const rowsCsv = topUsers.map((u, i) => [
      i + 1, `${u.nombre} ${u.apellidos}`, u.cedula, u.count, format(new Date(u.last), 'yyyy-MM-dd HH:mm'),
    ]);
    const csv = [
      `MR. VICTOR - Analytics (${format(from, 'yyyy-MM-dd')} a ${format(to, 'yyyy-MM-dd')})`,
      `Total mensajes,${kpis.total}`,
      `Usuarios únicos,${kpis.users}`,
      `Promedio msgs/min,${kpis.msgsPerMin.toFixed(3)}`,
      '',
      headers.join(','),
      ...rowsCsv.map((r) => r.join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MrVictor_Analytics_${format(from, 'yyyyMMdd')}-${format(to, 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpiCards = [
    { label: 'Mensajes totales', value: kpis.total, icon: MessageSquare, color: 'gradient-primary' },
    { label: 'Usuarios activos', value: kpis.users, icon: Users, color: 'gradient-cool' },
    { label: 'Msgs / minuto (prom.)', value: kpis.msgsPerMin.toFixed(2), icon: Activity, color: 'gradient-warm' },
    { label: 'Caracteres entrada', value: kpis.tokensIn.toLocaleString(), icon: TrendingUp, color: 'gradient-neon' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center glow-primary">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">MR. VICTOR · Analytics</h1>
            <p className="text-muted-foreground text-sm">Uso del tutor IA por rango de fechas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" size="sm" disabled={loading} className="gap-2">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refrescar
          </Button>
          <Button onClick={exportCSV} size="sm" className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Range controls */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          {(['1d', '7d', '30d', '90d'] as Preset[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={preset === p ? 'default' : 'outline'}
              onClick={() => applyPreset(p)}
            >
              {p === '1d' ? 'Hoy' : `Últimos ${p.replace('d', 'd')}`}
            </Button>
          ))}
          <div className="flex-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(from, 'd MMM', { locale: es })} - {format(to, 'd MMM yyyy', { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="end">
              <Calendar
                mode="range"
                selected={{ from, to }}
                onSelect={(r) => {
                  if (r?.from) setFrom(startOfDay(r.from));
                  if (r?.to) setTo(endOfDay(r.to));
                  setPreset('custom');
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="card-elevated neon-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>
                  <k.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold font-display truncate">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Activity className="w-4 h-4" /> Mensajes en el tiempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {seriesData.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin datos en este rango</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={seriesData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="mensajes" stroke="hsl(270 70% 55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top users */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Users className="w-4 h-4" /> Top usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topUsers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin uso registrado</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.min(40 + topUsers.length * 28, 400)}>
                <BarChart data={topUsers.slice(0, 10).map((u) => ({ name: u.nombre, mensajes: u.count }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="mensajes" fill="hsl(160 60% 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 px-2 text-xs text-muted-foreground font-medium">#</th>
                      <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Estudiante</th>
                      <th className="py-2 px-2 text-xs text-muted-foreground font-medium">Cédula</th>
                      <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">Mensajes</th>
                      <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">Último uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u, i) => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 font-bold text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-2 font-medium">{u.nombre} {u.apellidos}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{u.cedula}</td>
                        <td className="py-2 px-2 text-right">
                          <Badge variant="secondary">{u.count}</Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                          {format(new Date(u.last), 'd MMM HH:mm', { locale: es })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
