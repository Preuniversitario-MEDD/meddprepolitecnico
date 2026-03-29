import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Lock, Unlock, ArrowUp, ArrowDown, Pencil, Check, X, ChevronDown, FolderPlus, Settings2, Copy, AlertTriangle, MoreVertical } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;
type Contenido = Tables<'contenido'>;

interface Pestana {
  id: string;
  sesion_id: string;
  nombre: string;
  clave: string;
  orden: number;
}

export default function AdminContent() {
  const [searchParams] = useSearchParams();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [selectedSesion, setSelectedSesion] = useState<string>('');
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [pestanas, setPestanas] = useState<Pestana[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Contenido | null>(null);
  const [form, setForm] = useState({ tipo: '', titulo: '', texto: '', url: '', imagen_url: '', solucion: '', grupo_nombre: '' });
  const [linkFields, setLinkFields] = useState<string[]>(['']);
  const [editingSesion, setEditingSesion] = useState(false);
  const [sesionForm, setSesionForm] = useState({ titulo: '', descripcion: '' });
  const [tabDialogOpen, setTabDialogOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<Pestana | null>(null);
  const [tabForm, setTabForm] = useState({ nombre: '', clave: '' });
  const [duplicating, setDuplicating] = useState(false);
  const [cursos, setCursos] = useState<{ id: string; titulo: string }[]>([]);
  const [filterCurso, setFilterCurso] = useState<string>('all');
  const [cursoSesionIds, setCursoSesionIds] = useState<Set<string> | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadSesiones(); loadCursos(); }, []);
  useEffect(() => { if (selectedSesion) { loadContenido(); loadPestanas(); } }, [selectedSesion]);
  useEffect(() => {
    if (filterCurso === 'all') {
      setCursoSesionIds(null);
    } else {
      loadCursoSesiones(filterCurso);
    }
  }, [filterCurso]);

  async function loadCursos() {
    const { data } = await supabase.from('cursos').select('id, titulo').order('created_at', { ascending: false });
    if (data) setCursos(data);
  }

  async function loadCursoSesiones(cursoId: string) {
    const { data } = await supabase.from('curso_sesiones').select('sesion_id').eq('curso_id', cursoId);
    if (data) setCursoSesionIds(new Set(data.map(d => d.sesion_id)));
  }

  async function loadSesiones() {
    const { data } = await supabase.from('sesiones').select('*').order('numero');
    if (data) {
      setSesiones(data);
      const paramSesion = searchParams.get('sesion');
      if (paramSesion && data.some(s => s.id === paramSesion)) {
        setSelectedSesion(paramSesion);
      } else if (data.length > 0 && !selectedSesion) {
        setSelectedSesion(data[0].id);
      }
    }
  }

  async function loadContenido() {
    const { data } = await supabase.from('contenido').select('*').eq('sesion_id', selectedSesion).order('orden');
    setContenido(data || []);
  }

  async function loadPestanas() {
    const { data } = await supabase.from('pestanas_sesion').select('*').eq('sesion_id', selectedSesion).order('orden');
    if (data && data.length > 0) {
      setPestanas(data as Pestana[]);
      if (!activeTab || !data.find((p: any) => p.clave === activeTab)) setActiveTab((data[0] as any).clave);
    } else {
      setPestanas([]);
      setActiveTab('');
    }
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
    const joinedLinks = linkFields.filter(l => l.trim()).join('\n');
    const payload: any = {
      tipo: form.tipo, titulo: form.titulo, texto: form.texto,
      url: form.url, imagen_url: joinedLinks, grupo_nombre: form.grupo_nombre
    };
    if (form.tipo === 'ejercicio' || form.solucion) payload.solucion = form.solucion;

    if (editItem) {
      await supabase.from('contenido').update(payload).eq('id', editItem.id);
      toast({ title: 'Actualizado' });
    } else {
      const maxOrden = contenido.filter(c => c.tipo === form.tipo).length;
      await supabase.from('contenido').insert({ ...payload, sesion_id: selectedSesion, orden: maxOrden });
      toast({ title: 'Contenido agregado' });
    }
    setAddOpen(false);
    setEditItem(null);
    setForm({ tipo: '', titulo: '', texto: '', url: '', imagen_url: '', solucion: '', grupo_nombre: '' });
    setLinkFields(['']);
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

  // Tab CRUD
  async function saveTab() {
    if (!tabForm.nombre.trim()) return;
    const clave = tabForm.clave.trim() || tabForm.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (editingTab) {
      await supabase.from('pestanas_sesion').update({ nombre: tabForm.nombre, clave }).eq('id', editingTab.id);
      // Update contenido tipo to match new clave
      if (editingTab.clave !== clave) {
        await supabase.from('contenido').update({ tipo: clave }).eq('sesion_id', selectedSesion).eq('tipo', editingTab.clave);
      }
      toast({ title: 'Pestaña actualizada' });
    } else {
      const orden = pestanas.length;
      await supabase.from('pestanas_sesion').insert({ sesion_id: selectedSesion, nombre: tabForm.nombre, clave, orden });
      toast({ title: 'Pestaña agregada' });
    }
    setTabDialogOpen(false);
    setEditingTab(null);
    setTabForm({ nombre: '', clave: '' });
    loadPestanas();
    loadContenido();
  }

  async function deleteTab(tab: Pestana) {
    if (!confirm(`¿Eliminar la pestaña "${tab.nombre}" y todo su contenido?`)) return;
    await supabase.from('contenido').delete().eq('sesion_id', selectedSesion).eq('tipo', tab.clave);
    await supabase.from('pestanas_sesion').delete().eq('id', tab.id);
    toast({ title: 'Pestaña eliminada' });
    loadPestanas();
    loadContenido();
  }

  async function moveTab(tab: Pestana, direction: 'up' | 'down') {
    const idx = pestanas.findIndex(p => p.id === tab.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pestanas.length) return;
    const other = pestanas[swapIdx];
    await supabase.from('pestanas_sesion').update({ orden: other.orden }).eq('id', tab.id);
    await supabase.from('pestanas_sesion').update({ orden: tab.orden }).eq('id', other.id);
    loadPestanas();
  }

  async function duplicateSesion(sesion: Sesion) {
    if (!confirm(`¿Duplicar la sesión "${sesion.titulo}" con todo su contenido?`)) return;
    setDuplicating(true);
    try {
      const newNumero = Math.max(...sesiones.map(s => s.numero)) + 1;
      const { data: newSesion, error: sesErr } = await supabase.from('sesiones').insert({
        numero: newNumero,
        titulo: `${sesion.titulo} (copia)`,
        descripcion: sesion.descripcion,
        estado: 'bloqueada',
      }).select().single();

      if (sesErr || !newSesion) throw sesErr;

      // Copy tabs
      const { data: tabs } = await supabase.from('pestanas_sesion').select('*').eq('sesion_id', sesion.id);
      if (tabs && tabs.length > 0) {
        await supabase.from('pestanas_sesion').insert(
          tabs.map((t: any) => ({ sesion_id: newSesion.id, nombre: t.nombre, clave: t.clave, orden: t.orden }))
        );
      }

      // Copy content
      const { data: content } = await supabase.from('contenido').select('*').eq('sesion_id', sesion.id);
      if (content && content.length > 0) {
        await supabase.from('contenido').insert(
          content.map((c: any) => ({
            sesion_id: newSesion.id, tipo: c.tipo, titulo: c.titulo, texto: c.texto,
            url: c.url, imagen_url: c.imagen_url, orden: c.orden, grupo_nombre: c.grupo_nombre, solucion: c.solucion,
          }))
        );
      }

      // Copy quiz questions
      const { data: quiz } = await supabase.from('quiz_preguntas').select('*').eq('sesion_id', sesion.id);
      if (quiz && quiz.length > 0) {
        await supabase.from('quiz_preguntas').insert(
          quiz.map((q: any) => ({
            sesion_id: newSesion.id, pregunta: q.pregunta, opciones: q.opciones,
            respuesta_correcta: q.respuesta_correcta, imagen_url: q.imagen_url, grupo: q.grupo,
          }))
        );
      }

      toast({ title: '¡Duplicada!', description: `Sesión S${newNumero}: ${sesion.titulo} (copia) creada` });
      loadSesiones();
      setSelectedSesion(newSesion.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'No se pudo duplicar', variant: 'destructive' });
    }
    setDuplicating(false);
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteSesion(sesion: Sesion) {
    setDeleting(true);
    try {
      const oldNumero = sesion.numero;

      // 1. Delete all related data in parallel
      await Promise.all([
        supabase.from('contenido').delete().eq('sesion_id', sesion.id),
        supabase.from('quiz_preguntas').delete().eq('sesion_id', sesion.id),
        supabase.from('pestanas_sesion').delete().eq('sesion_id', sesion.id),
        supabase.from('curso_sesiones').delete().eq('sesion_id', sesion.id),
        supabase.from('sesion_estudiante').delete().eq('sesion_id', sesion.id),
        supabase.from('progreso_estudiante').delete().eq('sesion_id', sesion.id),
      ]);

      // 2. Delete the session itself
      await supabase.from('sesiones').delete().eq('id', sesion.id);

      // 3. Renumber remaining sessions
      const { data: remaining } = await supabase.from('sesiones').select('id, numero').order('numero');
      if (remaining) {
        for (let i = 0; i < remaining.length; i++) {
          const newNum = i + 1;
          if (remaining[i].numero !== newNum) {
            await supabase.from('sesiones').update({ numero: newNum }).eq('id', remaining[i].id);
          }
        }
      }

      // 4. Update exam_configuracion: remove old number and shift down
      const { data: examConfigs } = await supabase.from('exam_configuracion').select('id, sessions, tipo');
      if (examConfigs) {
        for (const cfg of examConfigs) {
          const sessions: number[] = (cfg as any).sessions || [];
          const updated = sessions
            .filter((n: number) => n !== oldNumero)
            .map((n: number) => n > oldNumero ? n - 1 : n);
          await supabase.from('exam_configuracion').update({ sessions: updated } as any).eq('id', cfg.id);
        }
      }

      toast({ title: 'Sesión eliminada', description: `S${oldNumero}: ${sesion.titulo} y todo su contenido eliminado. Sesiones renumeradas.` });
      setDeleteConfirmOpen(false);
      setSelectedSesion('');
      loadSesiones();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err?.message || 'No se pudo eliminar', variant: 'destructive' });
    }
    setDeleting(false);
  }

  const currentSesion = sesiones.find(s => s.id === selectedSesion);

  const filteredSesiones = cursoSesionIds ? sesiones.filter(s => cursoSesionIds.has(s.id)) : sesiones;

  // Group content by grupo_nombre within active tab
  const tabContent = contenido.filter(c => c.tipo === activeTab);
  const groups = new Map<string, Contenido[]>();
  tabContent.forEach(item => {
    const g = (item as any).grupo_nombre || '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(item);
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">Gestión de Contenido</h1>

      {/* Course filter + Session selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterCurso} onValueChange={setFilterCurso}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder="Filtrar por curso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {cursos.map(c => <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedSesion} onValueChange={setSelectedSesion}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Selecciona sesión" /></SelectTrigger>
          <SelectContent>
            {filteredSesiones.map(s => <SelectItem key={s.id} value={s.id}>S{s.numero}: {s.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
        {currentSesion && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Settings2 className="w-4 h-4" /> Gestión <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => toggleSesion(currentSesion)} className="gap-2">
                  {currentSesion.estado === 'abierta' ? <><Lock className="w-4 h-4" /> Bloquear sesión</> : <><Unlock className="w-4 h-4" /> Abrir sesión</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSesionForm({ titulo: currentSesion.titulo, descripcion: currentSesion.descripcion || '' }); setEditingSesion(true); }} className="gap-2">
                  <Pencil className="w-4 h-4" /> Editar nombre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateSesion(currentSesion)} disabled={duplicating} className="gap-2">
                  <Copy className="w-4 h-4" /> {duplicating ? 'Duplicando...' : 'Duplicar sesión'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteConfirmOpen(true)} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4" /> Eliminar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className={`text-xs px-2 py-1 rounded-full ${currentSesion.estado === 'abierta' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
              {currentSesion.estado === 'abierta' ? '● Abierta' : '○ Bloqueada'}
            </span>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {currentSesion && (
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                ¿Eliminar sesión S{currentSesion.numero}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Se eliminará permanentemente <strong>"{currentSesion.titulo}"</strong> junto con:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Todo el contenido y pestañas</li>
                  <li>Todas las preguntas de quiz</li>
                  <li>Progreso de estudiantes en esta sesión</li>
                  <li>Vínculos con cursos</li>
                </ul>
                <p className="font-medium">Las sesiones restantes se renumerarán automáticamente y los exámenes se actualizarán.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSesion(currentSesion)}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit session name */}
      {currentSesion && editingSesion && (
        <Card className="card-elevated">
          <CardContent className="p-3">
            <div className="space-y-2">
              <Input value={sesionForm.titulo} onChange={e => setSesionForm({ ...sesionForm, titulo: e.target.value })} placeholder="Título" />
              <Input value={sesionForm.descripcion} onChange={e => setSesionForm({ ...sesionForm, descripcion: e.target.value })} placeholder="Descripción" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSesionName} className="gap-1"><Check className="w-3 h-3" /> Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingSesion(false)}><X className="w-3 h-3" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab management bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditingTab(null); setTabForm({ nombre: '', clave: '' }); setTabDialogOpen(true); }}>
          <Plus className="w-3 h-3" /> Agregar pestaña
        </Button>
        {pestanas.map(tab => (
          <div key={tab.id} className="flex items-center gap-0.5 border rounded-md px-2 py-1 text-xs bg-muted/50">
            <span>{tab.nombre}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingTab(tab); setTabForm({ nombre: tab.nombre, clave: tab.clave }); setTabDialogOpen(true); }}>
              <Pencil className="w-2.5 h-2.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveTab(tab, 'up')}><ArrowUp className="w-2.5 h-2.5" /></Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveTab(tab, 'down')}><ArrowDown className="w-2.5 h-2.5" /></Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteTab(tab)}><Trash2 className="w-2.5 h-2.5 text-destructive" /></Button>
          </div>
        ))}
      </div>

      {/* Dynamic content tabs */}
      {pestanas.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            {pestanas.map(tab => (
              <TabsTrigger key={tab.clave} value={tab.clave}>{tab.nombre}</TabsTrigger>
            ))}
          </TabsList>

          {pestanas.map(tab => (
            <TabsContent key={tab.clave} value={tab.clave} className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => { setForm({ tipo: tab.clave, titulo: '', texto: '', url: '', imagen_url: '', solucion: '', grupo_nombre: '' }); setLinkFields(['']); setEditItem(null); setAddOpen(true); }}
                  className="gradient-primary text-primary-foreground gap-2" size="sm">
                  <Plus className="w-4 h-4" /> Agregar contenido
                </Button>
              </div>

              {/* Render grouped content */}
              {Array.from(groups.entries()).filter(([_, items]) => items.some(i => i.tipo === tab.clave)).length === 0 && (
                <p className="text-center text-muted-foreground py-6 text-sm">Sin contenido en esta pestaña</p>
              )}

              {Array.from(groups.entries()).map(([groupName, items]) => {
                const groupItems = items.filter(i => i.tipo === tab.clave);
                if (groupItems.length === 0) return null;

                if (!groupName) {
                  // Ungrouped items
                  return groupItems.map((item, i) => (
                    <ContentCard key={item.id} item={item} index={i}
                      onEdit={() => { setEditItem(item); const links = (item.imagen_url || '').split('\n').filter(Boolean); setLinkFields(links.length ? links : ['']); setForm({ tipo: item.tipo, titulo: item.titulo, texto: item.texto || '', url: item.url || '', imagen_url: item.imagen_url || '', solucion: item.solucion || '', grupo_nombre: (item as any).grupo_nombre || '' }); setAddOpen(true); }}
                      onDelete={() => deleteContent(item.id)}
                      onMove={(dir) => moveContent(item, dir)} />
                  ));
                }

                return (
                  <Collapsible key={groupName} defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <ChevronDown className="w-4 h-4 transition-transform [&[data-state=open]]:rotate-180" />
                      <span className="font-semibold text-sm">{groupName}</span>
                      <span className="text-xs text-muted-foreground">({groupItems.length})</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pl-4 border-l-2 border-muted ml-2 mt-1">
                      {groupItems.map((item, i) => (
                        <ContentCard key={item.id} item={item} index={i}
                          onEdit={() => { setEditItem(item); const links = (item.imagen_url || '').split('\n').filter(Boolean); setLinkFields(links.length ? links : ['']); setForm({ tipo: item.tipo, titulo: item.titulo, texto: item.texto || '', url: item.url || '', imagen_url: item.imagen_url || '', solucion: item.solucion || '', grupo_nombre: (item as any).grupo_nombre || '' }); setAddOpen(true); }}
                          onDelete={() => deleteContent(item.id)}
                          onMove={(dir) => moveContent(item, dir)} />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Add/Edit Content Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Agregar'} Contenido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div>
              <Label>Texto / Contenido</Label>
              <Textarea value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} rows={5}
                onPaste={async (e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                      e.preventDefault();
                      const file = item.getAsFile();
                      if (!file) return;
                      const ext = file.type.split('/')[1] || 'png';
                      const fileName = `content-${Date.now()}.${ext}`;
                      toast({ title: 'Subiendo imagen...' });
                      const { data: uploaded, error } = await supabase.storage.from('quiz-images').upload(fileName, file);
                      if (error) { toast({ title: 'Error al subir imagen', variant: 'destructive' }); return; }
                      const { data: urlData } = supabase.storage.from('quiz-images').getPublicUrl(uploaded.path);
                      setForm(prev => ({ ...prev, imagen_url: urlData.publicUrl }));
                      toast({ title: '✅ Imagen pegada y subida' });
                      return;
                    }
                  }
                }}
                placeholder="Puedes pegar imágenes con Ctrl+V..."
              />
            </div>
            <div><Label>URL (link, PDF, video)</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div>
              <Label>URL de Imagen</Label>
              <Input value={form.imagen_url} onChange={e => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://... o pega imagen en el texto"
                onPaste={async (e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                      e.preventDefault();
                      const file = item.getAsFile();
                      if (!file) return;
                      const ext = file.type.split('/')[1] || 'png';
                      const fileName = `content-${Date.now()}.${ext}`;
                      toast({ title: 'Subiendo imagen...' });
                      const { data: uploaded, error } = await supabase.storage.from('quiz-images').upload(fileName, file);
                      if (error) { toast({ title: 'Error al subir imagen', variant: 'destructive' }); return; }
                      const { data: urlData } = supabase.storage.from('quiz-images').getPublicUrl(uploaded.path);
                      setForm(prev => ({ ...prev, imagen_url: urlData.publicUrl }));
                      toast({ title: '✅ Imagen pegada y subida' });
                      return;
                    }
                  }
                }}
              />
              {form.imagen_url && <img src={form.imagen_url} alt="Preview" className="mt-2 max-h-32 rounded-md border" />}
            </div>
            <div><Label>Grupo (para agrupar en desplegable)</Label><Input value={form.grupo_nombre} onChange={e => setForm({ ...form, grupo_nombre: e.target.value })} placeholder="Ej: Fundamentos, Avanzado..." /></div>
            {(form.tipo === 'ejercicio' || form.solucion) && (
              <div><Label>Solución</Label><Textarea value={form.solucion} onChange={e => setForm({ ...form, solucion: e.target.value })} rows={4} placeholder="Escribe la solución paso a paso..." /></div>
            )}
            <Button onClick={saveContent} className="w-full gradient-primary text-primary-foreground">{editItem ? 'Guardar Cambios' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Tab Dialog */}
      <Dialog open={tabDialogOpen} onOpenChange={setTabDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTab ? 'Editar' : 'Agregar'} Pestaña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre de la pestaña</Label><Input value={tabForm.nombre} onChange={e => setTabForm({ ...tabForm, nombre: e.target.value })} placeholder="Ej: Laboratorio, Fórmulas..." /></div>
            <div><Label>Clave interna (sin espacios)</Label><Input value={tabForm.clave} onChange={e => setTabForm({ ...tabForm, clave: e.target.value })} placeholder="Se genera automáticamente" /></div>
            <Button onClick={saveTab} className="w-full gradient-primary text-primary-foreground">{editingTab ? 'Guardar' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted content card component
function ContentCard({ item, index, onEdit, onDelete, onMove }: {
  item: Contenido; index: number;
  onEdit: () => void; onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }}>
      <Card className="card-elevated">
        <CardContent className="p-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{item.titulo}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.texto}</p>
              {item.url && <p className="text-xs text-secondary mt-1 truncate">🔗 {item.url}</p>}
              {item.imagen_url && <p className="text-xs text-neon-pink mt-1 truncate">🖼️ {item.imagen_url}</p>}
              {item.solucion && <p className="text-xs text-accent mt-1 truncate">✅ Con solución</p>}
              {(item as any).grupo_nombre && <p className="text-xs text-muted-foreground mt-1">📁 {(item as any).grupo_nombre}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onMove('up')}><ArrowUp className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" onClick={() => onMove('down')}><ArrowDown className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
