import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Tablet, LogIn, LogOut, Search, RefreshCw, Wifi } from 'lucide-react';
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

function deviceIcon(t: string | null) {
  if (t === 'phone') return Smartphone;
  if (t === 'tablet') return Tablet;
  return Monitor;
}

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function timeAgo(s: string) {
  const ms = Date.now() - new Date(s).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export default function ConnectionsTab({ students }: { students: Profile[] }) {
  const [logs, setLogs] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const studentMap = Object.fromEntries(students.map((s) => [s.user_id, s]));

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('connection_logs')
      .select('id, user_id, event_type, device_type, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    setLogs((data as ConnectionRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter((l) => {
    const p = studentMap[l.user_id];
    const txt = `${p?.nombre || ''} ${p?.apellidos || ''} ${p?.cedula || ''} ${l.ip_address || ''}`.toLowerCase();
    return txt.includes(search.toLowerCase());
  });

  // Estado: en linea = último evento es 'login' en últimas 30 min
  const onlineCount = (() => {
    const lastByUser: Record<string, ConnectionRow> = {};
    for (const l of logs) {
      if (!lastByUser[l.user_id]) lastByUser[l.user_id] = l;
    }
    const cutoff = Date.now() - 30 * 60 * 1000;
    return Object.values(lastByUser).filter((l) => l.event_type === 'login' && new Date(l.created_at).getTime() > cutoff).length;
  })();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Wifi className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-mint))]" />
          <p className="text-xl font-bold">{onlineCount}</p>
          <p className="text-[10px] text-muted-foreground">En línea (30 min)</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <LogIn className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{logs.filter((l) => l.event_type === 'login').length}</p>
          <p className="text-[10px] text-muted-foreground">Logins recientes</p>
        </CardContent></Card>
        <Card className="card-elevated"><CardContent className="p-3 text-center">
          <Monitor className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--neon-violet))]" />
          <p className="text-xl font-bold">{logs.length}</p>
          <p className="text-[10px] text-muted-foreground">Total eventos</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, cédula o IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" size="icon" onClick={load} title="Actualizar"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 && !loading && (
          <p className="text-center py-8 text-muted-foreground text-sm">Sin conexiones registradas</p>
        )}
        {filtered.map((l, i) => {
          const p = studentMap[l.user_id];
          const Icon = deviceIcon(l.device_type);
          const isLogin = l.event_type === 'login';
          return (
            <motion.div key={l.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}>
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
      </div>
    </div>
  );
}
