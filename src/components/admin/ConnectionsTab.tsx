import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Monitor, Smartphone, Tablet, LogIn, LogOut, Search, RefreshCw, Wifi,
  Activity, Coffee, EyeOff, Timer, ArrowUpDown, CalendarIcon, X, AlertTriangle, Radio,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Profile = { user_id: string; nombre: string; apellidos: string; cedula: string };

interface ConnectionRow {
  id: string;
  user_id: string;
  event_type: string;
  device_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  last_heartbeat_at: string;
  active_seconds: number;
  idle_seconds: number;
  background_seconds: number;
  device_type: string | null;
  ip_address: string | null;
}

function deviceIcon(t: string | null) {
  if (t === 'phone') return Smartphone;
  if (t === 'tablet') return Tablet;
  return Monitor;
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function timeAgo(s: string) {
  const ms = Date.now() - new Date(s).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function fmtDur(sec: number) {
  if (!sec || sec < 1) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function isLive(s: SessionRow) {
  if (s.ended_at) return false;
  return Date.now() - new Date(s.last_heartbeat_at).getTime() < 2 * 60 * 1000; // <2min
}

type DatePreset = 'all' | '7' | '30' | '90' | 'custom';
type AggSort = 'total_desc' | 'total_asc' | 'active_desc' | 'idle_desc' | 'name_asc' | 'last_seen_desc' | 'live_first';
type SessSort = 'recent' | 'oldest' | 'duration_desc' | 'duration_asc' | 'live_first' | 'name_asc';
type LiveFilter = 'all' | 'live' | 'offline';

export default function ConnectionsTab({ students }: { students: Profile[] }) {
  const [logs, setLogs] = useState<ConnectionRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filtros de fecha
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  // Ordenamientos y filtros
  const [aggSort, setAggSort] = useState<AggSort>('total_desc');
  const [sessSort, setSessSort] = useState<SessSort>('recent');
  const [liveFilter, setLiveFilter] = useState<LiveFilter>('all');

  const studentMap = useMemo(
    () => Object.fromEntries(students.map((s) => [s.user_id, s])),
    [students]
  );

  async function load() {
    setLoading(true);
    const [logRes, sessRes] = await Promise.all([
      supabase.from('connection_logs')
        .select('id, user_id, event_type, device_type, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false }).limit(500),
      supabase.from('connection_sessions')
        .select('id, user_id, started_at, ended_at, last_heartbeat_at, active_seconds, idle_seconds, background_seconds, device_type, ip_address')
        .order('started_at', { ascending: false }).limit(1000),
    ]);
    setLogs((logRes.data as ConnectionRow[]) || []);
    setSessions((sessRes.data as SessionRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Auto-refresh cada 15s y tick cada 1s para los contadores en vivo
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t1 = setInterval(load, 15000);
    const t2 = setInterval(() => setTick((x) => x + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);
  void tick;

  // Rango de fechas activo
  const dateRange = useMemo<{ from?: Date; to?: Date }>(() => {
    const now = new Date();
    if (datePreset === '7') return { from: new Date(now.getTime() - 7 * 86400e3) };
    if (datePreset === '30') return { from: new Date(now.getTime() - 30 * 86400e3) };
    if (datePreset === '90') return { from: new Date(now.getTime() - 90 * 86400e3) };
    if (datePreset === 'custom') {
      const to = customTo ? new Date(customTo) : undefined;
      if (to) to.setHours(23, 59, 59, 999);
      return { from: customFrom, to };
    }
    return {};
  }, [datePreset, customFrom, customTo]);

  const inDateRange = (iso: string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const t = new Date(iso).getTime();
    if (dateRange.from && t < dateRange.from.getTime()) return false;
    if (dateRange.to && t > dateRange.to.getTime()) return false;
    return true;
  };

  const q = search.trim().toLowerCase();
  const matchUser = (uid: string, extra = '') => {
    if (!q) return true;
    const p = studentMap[uid];
    return `${p?.nombre || ''} ${p?.apellidos || ''} ${p?.cedula || ''} ${p?.cedula || ''} ${extra}`
      .toLowerCase()
      .includes(q);
  };

  // SESIONES filtradas
  const filteredSessionsBase = sessions.filter((s) => matchUser(s.user_id, s.ip_address || '') && inDateRange(s.started_at));
  const filteredSessions = filteredSessionsBase.filter((s) => {
    if (liveFilter === 'live') return isLive(s);
    if (liveFilter === 'offline') return !isLive(s);
    return true;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const ta = (a.active_seconds || 0) + (a.idle_seconds || 0) + (a.background_seconds || 0);
    const tb = (b.active_seconds || 0) + (b.idle_seconds || 0) + (b.background_seconds || 0);
    const nameA = `${studentMap[a.user_id]?.nombre || ''} ${studentMap[a.user_id]?.apellidos || ''}`.toLowerCase();
    const nameB = `${studentMap[b.user_id]?.nombre || ''} ${studentMap[b.user_id]?.apellidos || ''}`.toLowerCase();
    switch (sessSort) {
      case 'oldest': return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      case 'duration_desc': return tb - ta;
      case 'duration_asc': return ta - tb;
      case 'live_first': return Number(isLive(b)) - Number(isLive(a)) || new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      case 'name_asc': return nameA.localeCompare(nameB);
      case 'recent':
      default: return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    }
  });

  // EVENTOS filtrados (mismo search/fecha)
  const filteredLogs = logs.filter((l) => matchUser(l.user_id, l.ip_address || '') && inDateRange(l.created_at));

  // Online ahora (global, no filtrado por fecha)
  const onlineCount = sessions.filter(isLive).length;

  // Agregado por estudiante usando el rango de fechas
  type Agg = { user_id: string; sessions: number; active: number; idle: number; background: number; total: number; lastSeen: string; live: boolean };
  const aggMap = new Map<string, Agg>();
  for (const s of filteredSessionsBase) {
    const a = aggMap.get(s.user_id) || { user_id: s.user_id, sessions: 0, active: 0, idle: 0, background: 0, total: 0, lastSeen: s.last_heartbeat_at, live: false };
    a.sessions += 1;
    a.active += s.active_seconds || 0;
    a.idle += s.idle_seconds || 0;
    a.background += s.background_seconds || 0;
    a.total = a.active + a.idle + a.background;
    if (new Date(s.last_heartbeat_at) > new Date(a.lastSeen)) a.lastSeen = s.last_heartbeat_at;
    if (isLive(s)) a.live = true;
    aggMap.set(s.user_id, a);
  }
  let aggregates = Array.from(aggMap.values());
  if (liveFilter === 'live') aggregates = aggregates.filter((a) => a.live);
  if (liveFilter === 'offline') aggregates = aggregates.filter((a) => !a.live);

  aggregates.sort((a, b) => {
    const nameA = `${studentMap[a.user_id]?.nombre || ''} ${studentMap[a.user_id]?.apellidos || ''}`.toLowerCase();
    const nameB = `${studentMap[b.user_id]?.nombre || ''} ${studentMap[b.user_id]?.apellidos || ''}`.toLowerCase();
    switch (aggSort) {
      case 'total_asc': return a.total - b.total;
      case 'active_desc': return b.active - a.active;
      case 'idle_desc': return b.idle - a.idle;
      case 'name_asc': return nameA.localeCompare(nameB);
      case 'last_seen_desc': return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      case 'live_first': return Number(b.live) - Number(a.live) || b.total - a.total;
      case 'total_desc':
      default: return b.total - a.total;
    }
  });

  const dateLabel = (() => {
    if (datePreset === 'all') return 'Todo el tiempo';
    if (datePreset === '7') return 'Últimos 7 días';
    if (datePreset === '30') return 'Últimos 30 días';
    if (datePreset === '90') return 'Últimos 90 días';
    if (customFrom && customTo) return `${format(customFrom, 'dd MMM', { locale: es })} – ${format(customTo, 'dd MMM', { locale: es })}`;
    if (customFrom) return `Desde ${format(customFrom, 'dd MMM yyyy', { locale: es })}`;
    return 'Rango personalizado';
  })();

  const clearFilters = () => {
    setSearch('');
    setDatePreset('all');
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setLiveFilter('all');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Wifi className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-mint))]" />
          <p className="text-xl font-bold">{onlineCount}</p>
          <p className="text-[10px] text-muted-foreground">En línea ahora</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Timer className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{filteredSessionsBase.length}</p>
          <p className="text-[10px] text-muted-foreground">Sesiones en rango</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Activity className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-mint))]" />
          <p className="text-xl font-bold">{fmtDur(filteredSessionsBase.reduce((s, x) => s + (x.active_seconds || 0), 0))}</p>
          <p className="text-[10px] text-muted-foreground">Total activo</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Coffee className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-orange))]" />
          <p className="text-xl font-bold">{fmtDur(filteredSessionsBase.reduce((s, x) => s + (x.idle_seconds || 0), 0))}</p>
          <p className="text-[10px] text-muted-foreground">Total inactivo</p>
        </CardContent></Card>
      </div>

      {/* Barra de búsqueda + filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cédula o IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Preset fechas */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="h-9 w-auto min-w-[160px]">
              <CalendarIcon className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
              <SelectItem value="custom">Personalizado…</SelectItem>
            </SelectContent>
          </Select>

          {/* Calendario personalizado */}
          {datePreset === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-9 justify-start gap-2', !customFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customFrom
                    ? `${format(customFrom, 'dd MMM', { locale: es })}${customTo ? ' – ' + format(customTo, 'dd MMM', { locale: es }) : ''}`
                    : 'Elegir fechas'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: customFrom, to: customTo }}
                  onSelect={(r: any) => { setCustomFrom(r?.from); setCustomTo(r?.to); }}
                  numberOfMonths={2}
                  locale={es}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Filtro EN VIVO */}
          <Select value={liveFilter} onValueChange={(v) => setLiveFilter(v as LiveFilter)}>
            <SelectTrigger className="h-9 w-auto min-w-[120px]">
              <Wifi className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="live">Solo EN VIVO</SelectItem>
              <SelectItem value="offline">Solo desconectados</SelectItem>
            </SelectContent>
          </Select>

          {(search || datePreset !== 'all' || liveFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
              <X className="w-3.5 h-3.5" /> Limpiar
            </Button>
          )}

          <Badge variant="outline" className="ml-auto text-[10px]">{dateLabel}</Badge>
        </div>
      </div>

      <Tabs defaultValue="en-vivo" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="en-vivo" className="gap-1 text-xs">
            <Radio className="w-3 h-3" /> En vivo
            {onlineCount > 0 && <Badge className="ml-1 h-4 text-[9px] bg-[hsl(var(--neon-mint))] text-background">{onlineCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-1 text-xs">
            <AlertTriangle className="w-3 h-3" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="por-estudiante" className="text-xs">Por estudiante</TabsTrigger>
          <TabsTrigger value="sesiones" className="text-xs">Sesiones</TabsTrigger>
          <TabsTrigger value="eventos" className="text-xs">Eventos</TabsTrigger>
        </TabsList>

        {/* EN VIVO – tiempo real */}
        <TabsContent value="en-vivo" className="space-y-1.5 mt-3">
          {(() => {
            const liveSessions = sessions
              .filter(isLive)
              .filter((s) => matchUser(s.user_id, s.ip_address || ''));
            if (liveSessions.length === 0) {
              return <p className="text-center py-8 text-muted-foreground text-sm">Nadie conectado en este momento</p>;
            }
            return liveSessions
              .sort((a, b) => (b.active_seconds || 0) - (a.active_seconds || 0))
              .map((s, i) => {
                const p = studentMap[s.user_id];
                const Icon = deviceIcon(s.device_type);
                const sinceStart = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);
                const sinceHb = Math.floor((Date.now() - new Date(s.last_heartbeat_at).getTime()) / 1000);
                // Si el último heartbeat fue hace <60s, sumamos ese tiempo al "activo" en vivo
                const liveActive = (s.active_seconds || 0) + (sinceHb < 60 ? sinceHb : 0);
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}>
                    <Card className="card-elevated border-[hsl(var(--neon-mint))]/30">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[hsl(var(--neon-mint)/0.15)] text-[hsl(var(--neon-mint))]">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[hsl(var(--neon-mint))] ring-2 ring-background animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">
                              {p ? `${p.nombre} ${p.apellidos}` : <span className="text-muted-foreground italic">Usuario eliminado</span>}
                            </p>
                            <Badge className="text-[9px] h-4 bg-[hsl(var(--neon-mint))] text-background animate-pulse">EN VIVO</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                            {p?.cedula && <span>📋 {p.cedula}</span>}
                            <span className="flex items-center gap-1 text-[hsl(var(--neon-mint))] font-mono">
                              <Activity className="w-3 h-3" /> Activo ahora: {fmtDur(liveActive)}
                            </span>
                            <span>Conectado hace {fmtDur(sinceStart)}</span>
                            {s.ip_address && <span>🌐 {s.ip_address}</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              });
          })()}
        </TabsContent>

        {/* ALERTAS – inactivos / segundo plano prolongado */}
        <TabsContent value="alertas" className="space-y-1.5 mt-3">
          {(() => {
            const IDLE_ALERT = 10 * 60; // 10 min
            const BG_ALERT = 15 * 60; // 15 min
            const alerts = sessions
              .filter(isLive)
              .filter((s) => matchUser(s.user_id, s.ip_address || ''))
              .map((s) => {
                const sinceHb = Math.floor((Date.now() - new Date(s.last_heartbeat_at).getTime()) / 1000);
                const reasons: { type: 'idle' | 'background'; seconds: number }[] = [];
                if ((s.idle_seconds || 0) >= IDLE_ALERT) reasons.push({ type: 'idle', seconds: s.idle_seconds });
                if ((s.background_seconds || 0) >= BG_ALERT) reasons.push({ type: 'background', seconds: s.background_seconds });
                return { s, sinceHb, reasons };
              })
              .filter((x) => x.reasons.length > 0)
              .sort((a, b) => Math.max(...b.reasons.map((r) => r.seconds)) - Math.max(...a.reasons.map((r) => r.seconds)));

            if (alerts.length === 0) {
              return <p className="text-center py-8 text-muted-foreground text-sm">Sin alertas activas. Todos los estudiantes conectados están participando 👌</p>;
            }
            return alerts.map(({ s, sinceHb, reasons }, i) => {
              const p = studentMap[s.user_id];
              const primary = reasons[0];
              const color = primary.type === 'idle' ? 'hsl(var(--neon-orange))' : 'hsl(var(--muted-foreground))';
              return (
                <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}>
                  <Card className="card-elevated" style={{ borderColor: color + '55' }}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {p ? `${p.nombre} ${p.apellidos}` : <span className="text-muted-foreground italic">Usuario eliminado</span>}
                          {p?.cedula && <span className="ml-2 text-[11px] text-muted-foreground font-normal">📋 {p.cedula}</span>}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                          {reasons.map((r) => (
                            <span key={r.type} className="flex items-center gap-1">
                              {r.type === 'idle' ? <Coffee className="w-3 h-3 text-[hsl(var(--neon-orange))]" /> : <EyeOff className="w-3 h-3" />}
                              {r.type === 'idle' ? 'Inactivo' : 'Segundo plano'} {fmtDur(r.seconds)}
                            </span>
                          ))}
                          <span>Última actividad: hace {fmtDur(sinceHb)}</span>
                          {s.ip_address && <span>🌐 {s.ip_address}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: color, color }}>
                        {primary.type === 'idle' ? 'Inactivo' : '2.º plano'}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            });
          })()}
        </TabsContent>

        {/* RANKING POR ESTUDIANTE */}
        <TabsContent value="por-estudiante" className="space-y-1.5 mt-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">{aggregates.length} estudiante{aggregates.length !== 1 ? 's' : ''}</p>
            <Select value={aggSort} onValueChange={(v) => setAggSort(v as AggSort)}>
              <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_desc">Mayor duración total</SelectItem>
                <SelectItem value="total_asc">Menor duración total</SelectItem>
                <SelectItem value="active_desc">Más tiempo activo</SelectItem>
                <SelectItem value="idle_desc">Más tiempo inactivo</SelectItem>
                <SelectItem value="last_seen_desc">Visto más reciente</SelectItem>
                <SelectItem value="live_first">EN VIVO primero</SelectItem>
                <SelectItem value="name_asc">Nombre (A→Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {aggregates.length === 0 && !loading && (
            <p className="text-center py-8 text-muted-foreground text-sm">Sin datos para el rango seleccionado</p>
          )}
          {aggregates.map((a, i) => {
            const p = studentMap[a.user_id];
            const total = Math.max(1, a.total);
            const pctActive = Math.round((a.active / total) * 100);
            const pctIdle = Math.round((a.idle / total) * 100);
            const pctBg = 100 - pctActive - pctIdle;
            return (
              <motion.div key={a.user_id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                <Card className="card-elevated">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">
                            {p ? `${p.nombre} ${p.apellidos}` : <span className="text-muted-foreground italic">Usuario eliminado</span>}
                          </p>
                          {a.live && <Badge className="text-[9px] h-4 bg-[hsl(var(--neon-mint))] text-background">EN VIVO</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {p?.cedula && <span className="mr-2">📋 {p.cedula}</span>}
                          {a.sessions} sesión{a.sessions !== 1 ? 'es' : ''} · última: {timeAgo(a.lastSeen)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Total {fmtDur(a.total)}</Badge>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      <div className="bg-[hsl(var(--neon-mint))]" style={{ width: `${pctActive}%` }} title={`Activo ${pctActive}%`} />
                      <div className="bg-[hsl(var(--neon-orange))]" style={{ width: `${pctIdle}%` }} title={`Inactivo ${pctIdle}%`} />
                      <div className="bg-muted-foreground/40" style={{ width: `${pctBg}%` }} title={`Segundo plano ${pctBg}%`} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-1.5">
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[hsl(var(--neon-mint))]" /> Activo {fmtDur(a.active)}</span>
                      <span className="flex items-center gap-1"><Coffee className="w-3 h-3 text-[hsl(var(--neon-orange))]" /> Inactivo {fmtDur(a.idle)}</span>
                      <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> 2.º plano {fmtDur(a.background)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* SESIONES INDIVIDUALES */}
        <TabsContent value="sesiones" className="space-y-1.5 mt-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">{sortedSessions.length} sesión{sortedSessions.length !== 1 ? 'es' : ''}</p>
            <Select value={sessSort} onValueChange={(v) => setSessSort(v as SessSort)}>
              <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguas</SelectItem>
                <SelectItem value="duration_desc">Mayor duración</SelectItem>
                <SelectItem value="duration_asc">Menor duración</SelectItem>
                <SelectItem value="live_first">EN VIVO primero</SelectItem>
                <SelectItem value="name_asc">Nombre (A→Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sortedSessions.length === 0 && !loading && (
            <p className="text-center py-8 text-muted-foreground text-sm">Sin sesiones para el rango seleccionado</p>
          )}
          {sortedSessions.map((s, i) => {
            const p = studentMap[s.user_id];
            const Icon = deviceIcon(s.device_type);
            const live = isLive(s);
            const total = (s.active_seconds || 0) + (s.idle_seconds || 0) + (s.background_seconds || 0);
            return (
              <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}>
                <Card className="card-elevated">
                  <CardContent className="p-2.5 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${live ? 'bg-[hsl(var(--neon-mint)/0.15)] text-[hsl(var(--neon-mint))]' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">
                          {p ? `${p.nombre} ${p.apellidos}` : <span className="text-muted-foreground italic">Usuario eliminado</span>}
                        </p>
                        {live ? (
                          <Badge className="text-[10px] h-4 bg-[hsl(var(--neon-mint))] text-background">EN VIVO</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-4">{fmtDur(total)}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                        {p?.cedula && <span>📋 {p.cedula}</span>}
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[hsl(var(--neon-mint))]" /> {fmtDur(s.active_seconds)}</span>
                        <span className="flex items-center gap-1"><Coffee className="w-3 h-3 text-[hsl(var(--neon-orange))]" /> {fmtDur(s.idle_seconds)}</span>
                        <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> {fmtDur(s.background_seconds)}</span>
                        {s.ip_address && <span>🌐 {s.ip_address}</span>}
                        <span title={formatDate(s.started_at)}>🕐 {timeAgo(s.started_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* EVENTOS LOGIN/LOGOUT */}
        <TabsContent value="eventos" className="space-y-1.5 mt-3">
          {filteredLogs.length === 0 && !loading && (
            <p className="text-center py-8 text-muted-foreground text-sm">Sin eventos para el rango seleccionado</p>
          )}
          {filteredLogs.map((l, i) => {
            const p = studentMap[l.user_id];
            const Icon = deviceIcon(l.device_type);
            const isLogin = l.event_type === 'login';
            return (
              <motion.div key={l.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}>
                <Card className="card-elevated">
                  <CardContent className="p-2.5 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isLogin ? 'bg-[hsl(var(--neon-mint)/0.15)] text-[hsl(var(--neon-mint))]' : 'bg-muted text-muted-foreground'}`}>
                      {isLogin ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">
                          {p ? `${p.nombre} ${p.apellidos}` : <span className="text-muted-foreground italic">Usuario eliminado</span>}
                        </p>
                        <Badge variant={isLogin ? 'default' : 'secondary'} className="text-[10px] h-4">
                          {isLogin ? 'Login' : 'Logout'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                        {p?.cedula && <span>📋 {p.cedula}</span>}
                        <span className="flex items-center gap-1"><Icon className="w-3 h-3" /> {l.device_type || 'desconocido'}</span>
                        {l.ip_address && <span>🌐 {l.ip_address}</span>}
                        <span title={formatDate(l.created_at)}>🕐 {timeAgo(l.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
