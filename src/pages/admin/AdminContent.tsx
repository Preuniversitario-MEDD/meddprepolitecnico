import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Lock, Unlock, ArrowUp, ArrowDown, Pencil, Check, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;
type Contenido = Tables<'contenido'>;

export default function AdminContent() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [selectedSesion, setSelectedSesion] = useState<string>('');
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Contenido | null>(null);
  const [form, setForm] = useState({ tipo: 'teoria', titulo: '', texto: '', url: '', imagen_url: '', solucion: '' });
  const [editingSesion, setEditingSesion] = useState(false);
  const [sesionForm, setSesionForm] = useState({ titulo: '', descripcion: '' });
  const { toast } = useToast();

  useEffect(() => { loadSesiones(); }, []);
  useEffect(() => { if (selectedSesion) loadContenido(); }, [selectedSesion]);

  async function loadSesiones() {
    const { data } = await supabase.from('sesiones').select('*').order('numero');
    if (data) { setSesiones(data); if (data.length > 0 && !selectedSesion) setSelectedSesion(data[0].id); }
  }

  async function loadContenido() {
    const { data } = await supabase.from('contenido').select('*').eq('sesion_id', selectedSesion).order('orden');
    setContenido(data || []);
  }

  async function toggleSesion(sesion: Sesion) {
    const newEstado = sesion.estado === 'abierta' ? 'bloqueada' : 'abierta';
    await supabase.from('sesiones').update({ estado: newEstado }).eq('id', sesion.id);
    toast({ title: newEstado === 'abierta' ? 'Sesión abierta' : 'Sesión bloqueada' });
    loadSesiones();
  }

  async function saveSesionName() {
    await supabase.from('sesiones').update({ titulo: sesionForm.titulo, descripcion: sesionForm.descripcion }).eq('id', selectedSesion);
    toast({ title: 'Sesión actualizada' });
    setEditingSesion(false);
    loadSesiones();
  }

  async function saveContent() {
    const payload: any = { tipo: form.tipo, titulo: form.titulo, texto: form.texto, url: form.url, imagen_url: form.imagen_url };
    // Use solucion field for exercises
    if (form.tipo === 'ejercicio') payload.solucion = form.solucion;

    if (editItem) {
      await supabase.from('contenido').update(payload).eq('id', editItem.id);
      toast({ title: 'Actualizado' });
    } else {
      await supabase.from('contenido').insert({ ...payload, sesion_id: selectedSesion, orden: contenido.length });
      toast({ title: 'Contenido agregado' });
    }
    setAddOpen(false);
    setEditItem(null);
    setForm({ tipo: 'teoria', titulo: '', texto: '', url: '', imagen_url: '', solucion: '' });
    loadContenido();
  }

  async function deleteContent(id: string) {
    if (!confirm('¿Eliminar este contenido?')) return;
    await supabase.from('contenido').delete().eq('id', id);
    toast({ title: 'Eliminado' });
    loadContenido();
  }

  async function moveContent(item: Contenido, direction: 'up' | 'down') {
    const filtered = contenido.filter(c => c.tipo === item.tipo);
    const idx = filtered.findIndex(c => c.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;
    const other = filtered[swapIdx];
    await supabase.from('contenido').update({ orden: other.orden }).eq('id', item.id);
    await supabase.from('contenido').update({ orden: item.orden }).eq('id', other.id);
    loadContenido();
  }

  const currentSesion = sesiones.find(s => s.id === selectedSesion);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">Gestión de Contenido</h1>

      {/* Session selector and toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedSesion} onValueChange={setSelectedSesion}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Selecciona sesión" /></SelectTrigger>
          <SelectContent>
            {sesiones.map(s => <SelectItem key={s.id} value={s.id}>S{s.numero}: {s.titulo}</SelectItem>)}
          </SelectContent>
        </Select>

        {currentSesion && (
          <div className="flex items-center gap-2">
            <Switch checked={currentSesion.estado === 'abierta'} onCheckedChange={() => toggleSesion(currentSesion)} />
            <span className="text-sm flex items-center gap-1">
              {currentSesion.estado === 'abierta' ? <><Unlock className="w-4 h-4 text-accent" /> Abierta</> : <><Lock className="w-4 h-4 text-muted-foreground" /> Bloqueada</>}
            </span>
          </div>
        )}
      </div>

      {/* Edit session name */}
      {currentSesion && (
        <Card className="card-elevated">
          <CardContent className="p-3">
            {editingSesion ? (
              <div className="space-y-2">
                <Input value={sesionForm.titulo} onChange={e => setSesionForm({ ...sesionForm, titulo: e.target.value })} placeholder="Título" />
                <Input value={sesionForm.descripcion} onChange={e => setSesionForm({ ...sesionForm, descripcion: e.target.value })} placeholder="Descripción" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveSesionName} className="gap-1"><Check className="w-3 h-3" /> Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingSesion(false)}><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">S{currentSesion.numero}: {currentSesion.titulo}</p>
                  <p className="text-xs text-muted-foreground">{currentSesion.descripcion}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setSesionForm({ titulo: currentSesion.titulo, descripcion: currentSesion.descripcion || '' }); setEditingSesion(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content types tabs */}
      <Tabs defaultValue="teoria">
        <TabsList>
          <TabsTrigger value="teoria">Teoría</TabsTrigger>
          <TabsTrigger value="truco">Trucos</TabsTrigger>
          <TabsTrigger value="ejercicio">Ejercicios</TabsTrigger>
        </TabsList>

        {['teoria', 'truco', 'ejercicio'].map(tipo => (
          <TabsContent key={tipo} value={tipo} className="space-y-3">
            <Button onClick={() => { setForm({ tipo, titulo: '', texto: '', url: '', imagen_url: '', solucion: '' }); setEditItem(null); setAddOpen(true); }}
              className="gradient-primary text-primary-foreground gap-2" size="sm">
              <Plus className="w-4 h-4" /> Agregar
            </Button>

            {contenido.filter(c => c.tipo === tipo).map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="card-elevated">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.texto}</p>
                        {item.url && <p className="text-xs text-secondary mt-1 truncate">🔗 {item.url}</p>}
                        {item.imagen_url && <p className="text-xs text-neon-pink mt-1 truncate">🖼️ {item.imagen_url}</p>}
                        {(item as any).solucion && <p className="text-xs text-accent mt-1 truncate">✅ Con solución</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => moveContent(item, 'up')}><ArrowUp className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveContent(item, 'down')}><ArrowDown className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditItem(item);
                          setForm({ tipo: item.tipo, titulo: item.titulo, texto: item.texto || '', url: item.url || '', imagen_url: item.imagen_url || '', solucion: (item as any).solucion || '' });
                          setAddOpen(true);
                        }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteContent(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Agregar'} Contenido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Texto / Contenido</Label><Textarea value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} rows={5} /></div>
            <div><Label>URL (link, PDF, video)</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>URL de Imagen</Label><Input value={form.imagen_url} onChange={e => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://..." /></div>
            {form.tipo === 'ejercicio' && (
              <div><Label>Solución</Label><Textarea value={form.solucion} onChange={e => setForm({ ...form, solucion: e.target.value })} rows={4} placeholder="Escribe la solución paso a paso..." /></div>
            )}
            <Button onClick={saveContent} className="w-full gradient-primary text-primary-foreground">{editItem ? 'Guardar Cambios' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
