import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor, Smartphone, Tablet, LogIn, LogOut, Search, RefreshCw, Wifi,
  Activity, Coffee, EyeOff, Timer,
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

export default function ConnectionsTab({ students }: { students: Profile[] }) {
  const [logs, setLogs] = useState<ConnectionRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const studentMap = Object.fromEntries(students.map((s) => [s.user_id, s]));

  async function load() {
    setLoading(true);
    const [logRes, sessRes] = await Promise.all([
      supabase.from('connection_logs')
        .select('id, user_id, event_type, device_type, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false }).limit(300),
      supabase.from('connection_sessions')
        .select('id, user_id, started_at, ended_at, last_heartbeat_at, active_seconds, idle_seconds, background_seconds, device_type, ip_address')
        .order('started_at', { ascending: false }).limit(500),
    ]);
    setLogs((logRes.data as ConnectionRow[]) || []);
    setSessions((sessRes.data as SessionRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const q = search.toLowerCase();
  const matchUser = (uid: string, extra = '') => {
    const p = studentMap[uid];
    return `${p?.nombre || ''} ${p?.apellidos || ''} ${p?.cedula || ''} ${extra}`.toLowerCase().includes(q);
  };

  const filteredSessions = sessions.filter((s) => matchUser(s.user_id, s.ip_address || ''));
  const filteredLogs = logs.filter((l) => matchUser(l.user_id, l.ip_address || ''));

  // Online ahora: sesión sin ended_at y heartbeat < 2 min
  const onlineCount = sessions.filter(isLive).length;

  // Agregado por estudiante
  type Agg = { user_id: string; sessions: number; active: number; idle: number; background: number; total: number; lastSeen: string };
  const aggMap = new Map<string, Agg>();
  for (const s of filteredSessions) {
    const a = aggMap.get(s.user_id) || { user_id: s.user_id, sessions: 0, active: 0, idle: 0, background: 0, total: 0, lastSeen: s.last_heartbeat_at };
    a.sessions += 1;
    a.active += s.active_seconds || 0;
    a.idle += s.idle_seconds || 0;
    a.background += s.background_seconds || 0;
    a.total = a.active + a.idle + a.background;
    if (new Date(s.last_heartbeat_at) > new Date(a.lastSeen)) a.lastSeen = s.last_heartbeat_at;
    aggMap.set(s.user_id, a);
  }
  const aggregates = Array.from(aggMap.values()).sort((a, b) => b.total - a.total);

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
          <p className="text-xl font-bold">{sessions.length}</p>
          <p className="text-[10px] text-muted-foreground">Sesiones registradas</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Activity className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-mint))]" />
          <p className="text-xl font-bold">{fmtDur(sessions.reduce((s, x) => s + (x.active_seconds || 0), 0))}</p>
          <p className="text-[10px] text-muted-foreground">Total activo</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Coffee className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-orange))]" />
          <p className="text-xl font-bold">{fmtDur(sessions.reduce((s, x) => s + (x.idle_seconds || 0), 0))}</p>
          <p className="text-[10px] text-muted-foreground">Total inactivo</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, cédula o IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" size="icon" onClick={load} title="Actualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="por-estudiante" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="por-estudiante">Por estudiante</TabsTrigger>
          <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
        </TabsList>

        {/* RANKING POR ESTUDIANTE */}
        <TabsContent value="por-estudiante" className="space-y-1.5 mt-3">
          {aggregates.length === 0 && !loading && (
            <p className="text-center py-8 text-muted-foreground text-sm">Sin datos de sesión todavía</p>
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
                        <p className="font-semibold text-sm truncate">
                          {p ? `${p.nombre} ${p.apellidos}` : <span className="text-muted-foreground italic">Usuario eliminado</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
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
          {filteredSessions.length === 0 && !loading && (
            <p className="text-center py-8 text-muted-foreground text-sm">Sin sesiones registradas</p>
          )}
          {filteredSessions.map((s, i) => {
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
            <p className="text-center py-8 text-muted-foreground text-sm">Sin eventos registrados</p>
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
