import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Timer, Play, Pause, RotateCcw, CalendarDays, ListTodo, Flame, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const db = supabase as any;

type Tarea = {
  id: string;
  titulo: string;
  notas: string | null;
  materia: string | null;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente' | 'en_progreso' | 'hecha';
  fecha_limite: string | null;
  duracion_estimada: number;
  duracion_real: number;
  completada_en: string | null;
};

const PRIORIDADES: Record<string, { label: string; clase: string }> = {
  alta: { label: 'Alta', clase: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
  media: { label: 'Media', clase: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
  baja: { label: 'Baja', clase: 'border-sky-500/40 text-sky-400 bg-sky-500/10' },
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function Productividad() {
  const { user } = useAuth();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [minutosHoy, setMinutosHoy] = useState(0);
  const [tareaEnfoque, setTareaEnfoque] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    const desde = new Date(); desde.setHours(0, 0, 0, 0);
    const [{ data: t }, { data: f }] = await Promise.all([
      db.from('productividad_tareas').select('*').eq('user_id', user.id).order('estado').order('orden').order('created_at'),
      db.from('productividad_focus').select('minutos_completados').eq('user_id', user.id).eq('tipo', 'enfoque').gte('created_at', desde.toISOString()),
    ]);
    setTareas((t || []) as Tarea[]);
    setMinutosHoy((f || []).reduce((s: number, r: any) => s + (r.minutos_completados || 0), 0));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const actualizar = async (id: string, cambios: Partial<Tarea>) => {
    setTareas(ts => ts.map(t => (t.id === id ? { ...t, ...cambios } as Tarea : t)));
    await db.from('productividad_tareas').update(cambios).eq('id', id);
  };

  const eliminar = async (id: string) => {
    setTareas(ts => ts.filter(t => t.id !== id));
    await db.from('productividad_tareas').delete().eq('id', id);
  };

  const alternarHecha = async (t: Tarea) => {
    const hecha = t.estado !== 'hecha';
    await actualizar(t.id, {
      estado: hecha ? 'hecha' : 'pendiente',
      completada_en: hecha ? new Date().toISOString() : null,
    });
    if (hecha) confetti({ particleCount: 60, spread: 65, origin: { y: 0.75 } });
  };

  const pendientes = useMemo(() => tareas.filter(t => t.estado !== 'hecha'), [tareas]);
  const hechasHoy = useMemo(
    () => tareas.filter(t => t.estado === 'hecha' && (t.completada_en || '').slice(0, 10) === hoyISO()).length,
    [tareas]
  );
  const cargaHoy = useMemo(
    () => pendientes.filter(t => (t.fecha_limite || '').slice(0, 10) <= hoyISO() && t.fecha_limite).reduce((s, t) => s + t.duracion_estimada, 0),
    [pendientes]
  );

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Productividad</h1>
          <p className="text-xs text-muted-foreground">Planifica tus tareas y enfócate con sesiones cronometradas.</p>
        </div>
        <NuevaTarea onCreada={cargar} userId={user?.id} orden={tareas.length} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metrica icon={ListTodo} label="Pendientes" valor={String(pendientes.length)} />
        <Metrica icon={CheckCircle2} label="Hechas hoy" valor={String(hechasHoy)} />
        <Metrica icon={Timer} label="Min. enfocado hoy" valor={String(minutosHoy)} />
        <Metrica icon={Flame} label="Carga de hoy" valor={`${cargaHoy} min`} />
      </div>

      <Tabs defaultValue="tareas">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="plan">Planificador</TabsTrigger>
          <TabsTrigger value="enfoque">Enfoque</TabsTrigger>
        </TabsList>

        <TabsContent value="tareas" className="mt-4">
          <ListaTareas
            tareas={tareas}
            onToggle={alternarHecha}
            onEliminar={eliminar}
            onEstado={(t, estado) => actualizar(t.id, { estado })}
            onEnfocar={id => setTareaEnfoque(id)}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <Planificador tareas={tareas} onFecha={(id, fecha) => actualizar(id, { fecha_limite: fecha })} />
        </TabsContent>

        <TabsContent value="enfoque" className="mt-4">
          <Pomodoro
            tareas={pendientes}
            tareaId={tareaEnfoque}
            setTareaId={setTareaEnfoque}
            userId={user?.id}
            onSesion={cargar}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metrica({ icon: Icon, label, valor }: { icon: any; label: string; valor: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </Card>
  );
}

function NuevaTarea({ onCreada, userId, orden }: { onCreada: () => void; userId?: string; orden: number }) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [notas, setNotas] = useState('');
  const [materia, setMateria] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [fecha, setFecha] = useState('');
  const [estimada, setEstimada] = useState('25');
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!titulo.trim() || !userId) return;
    setGuardando(true);
    const { error } = await db.from('productividad_tareas').insert({
      user_id: userId,
      titulo: titulo.trim(),
      notas: notas.trim() || null,
      materia: materia.trim() || null,
      prioridad,
      fecha_limite: fecha ? new Date(`${fecha}T12:00:00`).toISOString() : null,
      duracion_estimada: Math.max(5, Number(estimada) || 25),
      orden,
    });
    setGuardando(false);
    if (error) return toast.error('No se pudo crear la tarea');
    setTitulo(''); setNotas(''); setMateria(''); setFecha(''); setEstimada('25');
    setOpen(false);
    toast.success('Tarea creada');
    onCreada();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Nueva tarea</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="¿Qué vas a estudiar?" value={titulo} onChange={e => setTitulo(e.target.value)} />
          <Textarea placeholder="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Materia" value={materia} onChange={e => setMateria(e.target.value)} />
            <Select value={prioridad} onValueChange={setPrioridad}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Prioridad alta</SelectItem>
                <SelectItem value="media">Prioridad media</SelectItem>
                <SelectItem value="baja">Prioridad baja</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            <Input type="number" min={5} step={5} value={estimada} onChange={e => setEstimada(e.target.value)} placeholder="Minutos" />
          </div>
          <Button className="w-full" onClick={crear} disabled={guardando || !titulo.trim()}>
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear tarea'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ListaTareas({ tareas, onToggle, onEliminar, onEstado, onEnfocar }: {
  tareas: Tarea[];
  onToggle: (t: Tarea) => void;
  onEliminar: (id: string) => void;
  onEstado: (t: Tarea, estado: Tarea['estado']) => void;
  onEnfocar: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'en_progreso' | 'hecha'>('todas');
  const lista = tareas.filter(t => filtro === 'todas' || t.estado === filtro);

  if (!tareas.length) return <Card className="p-10 text-center text-muted-foreground">Aún no tienes tareas. Crea la primera para empezar.</Card>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['todas', 'pendiente', 'en_progreso', 'hecha'] as const).map(f => (
          <Button key={f} size="sm" variant={filtro === f ? 'default' : 'outline'} onClick={() => setFiltro(f)}>
            {f === 'todas' ? 'Todas' : f === 'en_progreso' ? 'En progreso' : f === 'hecha' ? 'Hechas' : 'Pendientes'}
          </Button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {lista.map(t => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className={`p-4 flex items-start gap-3 ${t.estado === 'hecha' ? 'opacity-60' : ''}`}>
              <Checkbox checked={t.estado === 'hecha'} onCheckedChange={() => onToggle(t)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${t.estado === 'hecha' ? 'line-through' : ''}`}>{t.titulo}</p>
                {t.notas && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.notas}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className={PRIORIDADES[t.prioridad]?.clase}>{PRIORIDADES[t.prioridad]?.label}</Badge>
                  {t.materia && <Badge variant="secondary">{t.materia}</Badge>}
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" /> {t.duracion_estimada} min est. · {t.duracion_real} min real</span>
                  {t.fecha_limite && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> {new Date(t.fecha_limite).toLocaleDateString('es-EC')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {t.estado !== 'hecha' && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => { onEstado(t, 'en_progreso'); onEnfocar(t.id); }}>
                      <Play className="w-3.5 h-3.5" /> Enfocar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="text-pink-400" onClick={() => onEliminar(t.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      {!lista.length && <Card className="p-8 text-center text-muted-foreground">Sin tareas en este filtro.</Card>}
    </div>
  );
}

function Planificador({ tareas, onFecha }: { tareas: Tarea[]; onFecha: (id: string, fecha: string | null) => void }) {
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);

  const pendientes = tareas.filter(t => t.estado !== 'hecha');
  const sinFecha = pendientes.filter(t => !t.fecha_limite);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dias.map(d => {
          const clave = d.toISOString().slice(0, 10);
          const delDia = pendientes.filter(t => (t.fecha_limite || '').slice(0, 10) === clave);
          const carga = delDia.reduce((s, t) => s + t.duracion_estimada, 0);
          return (
            <Card key={clave} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm capitalize">
                  {d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <Badge variant="secondary">{carga} min</Badge>
              </div>
              <Progress value={Math.min(100, (carga / 180) * 100)} className="h-1.5" />
              {delDia.length ? delDia.map(t => (
                <div key={t.id} className="text-xs rounded-md border p-2 flex items-center justify-between gap-2">
                  <span className="truncate">{t.titulo}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => onFecha(t.id, null)}>Quitar</Button>
                </div>
              )) : <p className="text-xs text-muted-foreground">Día libre.</p>}
            </Card>
          );
        })}
      </div>

      <Card className="p-4 space-y-2">
        <p className="font-semibold text-sm">Sin fecha asignada</p>
        {sinFecha.length ? sinFecha.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-sm border rounded-md p-2">
            <span className="flex-1 truncate">{t.titulo}</span>
            <Input
              type="date"
              className="w-40 h-8"
              onChange={e => e.target.value && onFecha(t.id, new Date(`${e.target.value}T12:00:00`).toISOString())}
            />
          </div>
        )) : <p className="text-xs text-muted-foreground">Todas tus tareas están planificadas.</p>}
      </Card>
    </div>
  );
}

function Pomodoro({ tareas, tareaId, setTareaId, userId, onSesion }: {
  tareas: Tarea[]; tareaId: string | null; setTareaId: (v: string | null) => void; userId?: string; onSesion: () => void;
}) {
  const [minutos, setMinutos] = useState(25);
  const [descanso, setDescanso] = useState(5);
  const [modo, setModo] = useState<'enfoque' | 'descanso'>('enfoque');
  const [restante, setRestante] = useState(25 * 60);
  const [corriendo, setCorriendo] = useState(false);
  const [ciclos, setCiclos] = useState(0);
  const finRef = useRef<() => void>(() => {});

  useEffect(() => { if (!corriendo) setRestante((modo === 'enfoque' ? minutos : descanso) * 60); }, [minutos, descanso, modo, corriendo]);

  const registrar = useCallback(async (tipo: 'enfoque' | 'descanso', mins: number) => {
    if (!userId || mins <= 0) return;
    await db.from('productividad_focus').insert({
      user_id: userId, tarea_id: tipo === 'enfoque' ? tareaId : null, tipo,
      minutos_planificados: tipo === 'enfoque' ? minutos : descanso, minutos_completados: mins, completada: true,
    });
    if (tipo === 'enfoque' && tareaId) {
      const t = tareas.find(x => x.id === tareaId);
      if (t) await db.from('productividad_tareas').update({ duracion_real: (t.duracion_real || 0) + mins }).eq('id', tareaId);
    }
    onSesion();
  }, [userId, tareaId, minutos, descanso, tareas, onSesion]);

  finRef.current = () => {
    const mins = modo === 'enfoque' ? minutos : descanso;
    registrar(modo, mins);
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
    toast.success(modo === 'enfoque' ? '¡Bloque de enfoque completado!' : 'Descanso terminado, volvamos.');
    if (modo === 'enfoque') { setCiclos(c => c + 1); setModo('descanso'); setRestante(descanso * 60); }
    else { setModo('enfoque'); setRestante(minutos * 60); }
  };

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => {
      setRestante(s => {
        if (s <= 1) { finRef.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [corriendo]);

  const total = (modo === 'enfoque' ? minutos : descanso) * 60;
  const mm = Math.floor(restante / 60), ss = restante % 60;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-8 text-center space-y-5 border-primary/30">
        <Badge variant="secondary" className="uppercase tracking-wider text-[11px]">
          {modo === 'enfoque' ? 'Bloque de enfoque' : 'Descanso'}
        </Badge>
        <motion.p key={modo} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-6xl md:text-7xl font-mono font-bold text-primary">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </motion.p>
        <Progress value={total ? ((total - restante) / total) * 100 : 0} className="h-2" />
        <div className="flex justify-center gap-2">
          <Button className="gap-2" onClick={() => setCorriendo(c => !c)}>
            {corriendo ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Iniciar</>}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => { setCorriendo(false); setRestante(total); }}>
            <RotateCcw className="w-4 h-4" /> Reiniciar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Ciclos completados en esta visita: {ciclos}</p>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <p className="text-sm font-medium mb-1.5">Tarea en foco</p>
          <Select value={tareaId ?? 'ninguna'} onValueChange={v => setTareaId(v === 'ninguna' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Sin tarea" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguna">Sin tarea específica</SelectItem>
              {tareas.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Enfoque (min)</p>
            <Input type="number" min={5} step={5} value={minutos} disabled={corriendo}
              onChange={e => setMinutos(Math.max(5, Number(e.target.value) || 25))} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Descanso (min)</p>
            <Input type="number" min={1} step={1} value={descanso} disabled={corriendo}
              onChange={e => setDescanso(Math.max(1, Number(e.target.value) || 5))} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Técnica Pomodoro: trabaja concentrado durante el bloque, luego descansa. El tiempo se suma automáticamente a la tarea seleccionada.
        </p>
      </Card>
    </div>
  );
}
