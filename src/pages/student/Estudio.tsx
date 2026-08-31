import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Plus, Sparkles, Trash2, Play, Loader2, Flame, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

type Mazo = {
  id: string; titulo: string; descripcion: string | null; publico: boolean;
  created_by: string; curso_id: string | null; sesion_id: string | null; created_at: string;
};

export default function Estudio() {
  const { user } = useAuth();
  const { activeCursoId } = useActiveCourse();
  const navigate = useNavigate();

  const [mazos, setMazos] = useState<Mazo[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [vencidas, setVencidas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // formulario manual
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [publico, setPublico] = useState(false);
  const [manual, setManual] = useState('');

  // IA
  const [tema, setTema] = useState('');
  const [cantidad, setCantidad] = useState('12');
  const [nivel, setNivel] = useState('medio');
  const [generando, setGenerando] = useState(false);

  // desde quiz
  const [sesiones, setSesiones] = useState<{ id: string; numero: number; titulo: string }[]>([]);
  const [sesionSel, setSesionSel] = useState('');

  const cargar = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await db
      .from('estudio_mazos')
      .select('*')
      .order('created_at', { ascending: false });
    const lista: Mazo[] = data || [];
    setMazos(lista);

    if (lista.length) {
      const ids = lista.map(m => m.id);
      const { data: cards } = await db.from('estudio_tarjetas').select('id, mazo_id').in('mazo_id', ids);
      const c: Record<string, number> = {};
      (cards || []).forEach((t: any) => { c[t.mazo_id] = (c[t.mazo_id] || 0) + 1; });
      setConteos(c);

      const { data: prog } = await db
        .from('estudio_progreso')
        .select('mazo_id, proxima_revision')
        .eq('user_id', user.id)
        .in('mazo_id', ids);
      const vistos: Record<string, number> = {};
      const pend: Record<string, number> = {};
      (prog || []).forEach((p: any) => {
        vistos[p.mazo_id] = (vistos[p.mazo_id] || 0) + 1;
        if (new Date(p.proxima_revision).getTime() <= Date.now()) pend[p.mazo_id] = (pend[p.mazo_id] || 0) + 1;
      });
      // tarjetas nunca estudiadas también cuentan como pendientes
      Object.keys(c).forEach(id => { pend[id] = (pend[id] || 0) + (c[id] - (vistos[id] || 0)); });
      setVencidas(pend);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    (async () => {
      let q = db.from('sesiones').select('id, numero, titulo').order('numero');
      if (activeCursoId) q = q.eq('curso_id', activeCursoId);
      const { data } = await q;
      setSesiones(data || []);
    })();
  }, [activeCursoId]);

  const totalPendientes = useMemo(() => Object.values(vencidas).reduce((a, b) => a + b, 0), [vencidas]);

  const crearMazo = async (tarjetas: { frente: string; reverso: string; pista?: string | null }[]) => {
    if (!user) return;
    if (!titulo.trim()) { toast.error('Ponle un título al mazo'); return; }
    if (!tarjetas.length) { toast.error('El mazo necesita al menos una tarjeta'); return; }
    setSaving(true);
    const { data: mazo, error } = await db.from('estudio_mazos').insert({
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      publico,
      curso_id: activeCursoId || null,
      sesion_id: sesionSel || null,
      created_by: user.id,
    }).select().single();
    if (error || !mazo) { setSaving(false); toast.error(error?.message || 'No se pudo crear'); return; }

    const { error: e2 } = await db.from('estudio_tarjetas').insert(
      tarjetas.map((t, i) => ({ mazo_id: mazo.id, frente: t.frente, reverso: t.reverso, pista: t.pista ?? null, orden: i }))
    );
    setSaving(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success(`Mazo creado con ${tarjetas.length} tarjetas`);
    setOpen(false);
    setTitulo(''); setDescripcion(''); setManual(''); setTema(''); setSesionSel('');
    cargar();
  };

  const parsearManual = () =>
    manual.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [frente, ...resto] = l.split(/\s*[|\t]\s*|\s+-\s+/);
      return { frente: (frente || '').trim(), reverso: resto.join(' - ').trim() };
    }).filter(t => t.frente && t.reverso);

  const generarIA = async () => {
    if (!tema.trim()) { toast.error('Escribe un tema'); return; }
    setGenerando(true);
    const { data, error } = await supabase.functions.invoke('generate-flashcards', {
      body: { tema, cantidad: parseInt(cantidad, 10), nivel },
    });
    setGenerando(false);
    if (error) { toast.error('No se pudo generar. Intenta de nuevo.'); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    const tarjetas = (data as any)?.tarjetas || [];
    if (!tarjetas.length) { toast.error('La IA no devolvió tarjetas'); return; }
    if (!titulo.trim()) setTitulo(tema.slice(0, 60));
    await crearMazo(tarjetas);
  };

  const importarQuiz = async () => {
    if (!sesionSel) { toast.error('Elige una sesión'); return; }
    const { data } = await db.from('quiz_preguntas').select('pregunta, opciones, respuesta_correcta').eq('sesion_id', sesionSel);
    const preguntas = data || [];
    if (!preguntas.length) { toast.error('Esa sesión no tiene preguntas de quiz'); return; }
    const tarjetas = preguntas.map((q: any) => ({
      frente: q.pregunta,
      reverso: String((q.opciones || [])[q.respuesta_correcta] ?? ''),
      pista: null,
    })).filter((t: any) => t.reverso);
    const ses = sesiones.find(s => s.id === sesionSel);
    if (!titulo.trim() && ses) setTitulo(`Sesión ${ses.numero} — ${ses.titulo}`);
    await crearMazo(tarjetas);
  };

  const eliminar = async (id: string) => {
    const { error } = await db.from('estudio_mazos').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Mazo eliminado');
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" /> Estudio inteligente
          </h1>
          <p className="text-sm text-muted-foreground">Tarjetas con repaso espaciado: aprende, repite y domina cada tema.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuevo mazo</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Mazos</p>
          <p className="text-2xl font-bold">{mazos.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Tarjetas</p>
          <p className="text-2xl font-bold">{Object.values(conteos).reduce((a, b) => a + b, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Para repasar hoy</p>
          <p className="text-2xl font-bold text-orange-400">{totalPendientes}</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : mazos.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <BookOpenCheck className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="font-medium">Todavía no tienes mazos</p>
          <p className="text-sm text-muted-foreground">Crea uno manualmente, genera tarjetas con IA o impórtalas desde el quiz de una sesión.</p>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Crear mi primer mazo</Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mazos.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-5 h-full flex flex-col gap-3 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{m.titulo}</h3>
                  {m.created_by === user?.id && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => eliminar(m.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                {m.descripcion && <p className="text-xs text-muted-foreground line-clamp-2">{m.descripcion}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{conteos[m.id] || 0} tarjetas</Badge>
                  {(vencidas[m.id] || 0) > 0 && <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">{vencidas[m.id]} por repasar</Badge>}
                  {m.publico && <Badge variant="outline">Público</Badge>}
                </div>
                <Button className="mt-auto gap-2" onClick={() => navigate(`/student/estudio/${m.id}`)}>
                  <Play className="w-4 h-4" /> Estudiar
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo mazo de estudio</DialogTitle></DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Estequiometría básica" />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Compartir con mis compañeros</p>
                <p className="text-xs text-muted-foreground">Otros estudiantes podrán estudiar este mazo.</p>
              </div>
              <Switch checked={publico} onCheckedChange={setPublico} />
            </div>
          </div>

          <Tabs defaultValue="ia" className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="ia">IA</TabsTrigger>
              <TabsTrigger value="quiz">Desde quiz</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="ia" className="space-y-3 pt-3">
              <div>
                <Label>Tema</Label>
                <Input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej. Leyes de Newton, nomenclatura orgánica..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad</Label>
                  <Select value={cantidad} onValueChange={setCantidad}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['8', '12', '20', '30'].map(n => <SelectItem key={n} value={n}>{n} tarjetas</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Select value={nivel} onValueChange={setNivel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="medio">Medio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={generarIA} disabled={generando || saving}>
                {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generar con MR. VICTOR
              </Button>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-3 pt-3">
              <Label>Sesión</Label>
              <Select value={sesionSel} onValueChange={setSesionSel}>
                <SelectTrigger><SelectValue placeholder="Elige una sesión" /></SelectTrigger>
                <SelectContent>
                  {sesiones.map(s => <SelectItem key={s.id} value={s.id}>Sesión {s.numero} — {s.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Convierte las preguntas del quiz en tarjetas (pregunta → respuesta correcta).</p>
              <Button className="w-full" onClick={importarQuiz} disabled={saving}>Importar preguntas</Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-3 pt-3">
              <Label>Una tarjeta por línea: <span className="font-mono">frente | reverso</span></Label>
              <Textarea rows={8} value={manual} onChange={e => setManual(e.target.value)}
                placeholder={'Mol | Cantidad de sustancia: 6.022e23 partículas\nNúmero atómico | Número de protones del átomo'} />
              <Button className="w-full" onClick={() => crearMazo(parsearManual())} disabled={saving}>Crear mazo</Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
