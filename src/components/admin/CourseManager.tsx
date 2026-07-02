import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2, BookOpen, Users, ChevronDown, ChevronUp, UserPlus, UserMinus, ExternalLink, Pencil, Check, X, FolderPlus, Layers, FileStack } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { MODULE_LABELS, type CourseModules } from '@/hooks/useCourseModules';
import { deepCloneCurso } from '@/lib/cloneCurso';

type Profile = Tables<'profiles'>;

const DEFAULT_MODULES: CourseModules = {
  concentracion: true,
  psicometria: true,
  mensajes: true,
  biblioteca: true,
  tutor: true,
  orientacion_vocacional: true,
};

interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  modulos: CourseModules;
  created_at: string;
  sesiones_count?: number;
  estudiantes_count?: number;
}

interface CursoSesion {
  id: string;
  curso_id: string;
  sesion_id: string;
  orden: number;
  sesion?: { id: string; numero: number; titulo: string; estado: string };
}

export default function CourseManager({ students }: { students: Profile[] }) {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cursoSesiones, setCursoSesiones] = useState<CursoSesion[]>([]);
  const [cursoEstudiantes, setCursoEstudiantes] = useState<string[]>([]);
  const [allSesiones, setAllSesiones] = useState<{ id: string; numero: number; titulo: string; estado: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [linkSesionOpen, setLinkSesionOpen] = useState(false);
  const [createSesionOpen, setCreateSesionOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '' });
  const [createMode, setCreateMode] = useState<'blank' | 'reuse'>('blank');
  const [reuseSourceId, setReuseSourceId] = useState<string>('');
  const [creatingCurso, setCreatingCurso] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [newSesionForm, setNewSesionForm] = useState({ numero: 0, titulo: '' });
  const [creatingSession, setCreatingSession] = useState(false);
  const [editingCursoId, setEditingCursoId] = useState<string | null>(null);
  const [editCursoForm, setEditCursoForm] = useState({ titulo: '', descripcion: '' });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { loadCursos(); loadAllSesiones(); }, []);

  async function loadCursos() {
    const { data: cursosData } = await supabase.from('cursos').select('*').order('created_at', { ascending: false });
    if (!cursosData) return;
    const enriched: Curso[] = [];
    for (const c of cursosData) {
      const { count: sc } = await supabase.from('curso_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', c.id);
      const { count: ec } = await supabase.from('curso_estudiantes').select('*', { count: 'exact', head: true }).eq('curso_id', c.id);
      const rawMod = (c as any).modulos;
      const mod: CourseModules = rawMod && typeof rawMod === 'object' && !Array.isArray(rawMod)
        ? { ...DEFAULT_MODULES, ...(rawMod as Partial<CourseModules>) }
        : DEFAULT_MODULES;
      enriched.push({
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion || '',
        created_at: c.created_at,
        modulos: mod,
        sesiones_count: sc || 0,
        estudiantes_count: ec || 0,
      });
    }
    setCursos(enriched);
  }

  async function loadAllSesiones() {
    const { data } = await supabase.from('sesiones').select('id, numero, titulo, estado').order('numero');
    if (data) setAllSesiones(data);
  }

  async function loadCursoDetail(cursoId: string) {
    const { data: ses } = await supabase.from('curso_sesiones').select('*').eq('curso_id', cursoId).order('orden');
    if (ses) {
      const enriched: CursoSesion[] = [];
      for (const s of ses) {
        const found = allSesiones.find(a => a.id === s.sesion_id);
        enriched.push({ ...s, sesion: found });
      }
      setCursoSesiones(enriched);
    }
    const { data: est } = await supabase.from('curso_estudiantes').select('user_id').eq('curso_id', cursoId);
    if (est) setCursoEstudiantes(est.map(e => e.user_id));
  }

  async function createCurso() {
    if (!form.titulo.trim()) return;
    await supabase.from('cursos').insert({ titulo: form.titulo, descripcion: form.descripcion });
    toast({ title: '¡Curso creado!', description: form.titulo });
    setForm({ titulo: '', descripcion: '' });
    setAddOpen(false);
    loadCursos();
  }

  async function updateCurso(cursoId: string) {
    if (!editCursoForm.titulo.trim()) return;
    await supabase.from('cursos').update({ titulo: editCursoForm.titulo, descripcion: editCursoForm.descripcion }).eq('id', cursoId);
    toast({ title: 'Curso actualizado' });
    setEditingCursoId(null);
    loadCursos();
  }

  async function toggleModulo(curso: Curso, key: keyof CourseModules) {
    const next = { ...curso.modulos, [key]: !curso.modulos[key] };
    setCursos((cs) => cs.map((c) => (c.id === curso.id ? { ...c, modulos: next } : c)));
    const { error } = await supabase.from('cursos').update({ modulos: next as any }).eq('id', curso.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      loadCursos();
    }
  }

  async function copyCurso(curso: Curso) {
    const { data: newCurso } = await supabase.from('cursos').insert({
      titulo: `${curso.titulo} (copia)`,
      descripcion: curso.descripcion,
    }).select().single();
    if (!newCurso) return;
    const { data: originalSesiones } = await supabase.from('curso_sesiones').select('sesion_id, orden').eq('curso_id', curso.id);
    if (originalSesiones?.length) {
      for (const os of originalSesiones) {
        const original = allSesiones.find(s => s.id === os.sesion_id);
        if (!original) continue;
        const { data: newSesion } = await supabase.from('sesiones').insert({
          numero: original.numero, titulo: original.titulo, estado: 'bloqueada',
        }).select().single();
        if (newSesion) {
          await supabase.from('curso_sesiones').insert({ curso_id: newCurso.id, sesion_id: newSesion.id, orden: os.orden });
        }
      }
    }
    toast({ title: '¡Curso copiado!', description: `${curso.titulo} → copia creada con sesiones vacías` });
    loadCursos();
  }

  async function deleteCurso(curso: Curso) {
    if (!confirm(`¿Eliminar el curso "${curso.titulo}"?`)) return;
    await supabase.from('cursos').delete().eq('id', curso.id);
    toast({ title: 'Eliminado', description: curso.titulo });
    if (expanded === curso.id) setExpanded(null);
    loadCursos();
  }

  async function createSesionAndLink(cursoId: string) {
    if (!newSesionForm.titulo.trim() || !newSesionForm.numero) return;
    setCreatingSession(true);
    const { data: newSesion } = await supabase.from('sesiones').insert({
      numero: newSesionForm.numero, titulo: newSesionForm.titulo, estado: 'bloqueada',
    }).select().single();
    if (newSesion) {
      await supabase.from('curso_sesiones').insert({ curso_id: cursoId, sesion_id: newSesion.id, orden: cursoSesiones.length });
      toast({ title: '✨ Sesión creada y vinculada', description: `S${newSesion.numero} - ${newSesion.titulo}` });
      setNewSesionForm({ numero: 0, titulo: '' });
      setCreateSesionOpen(false);
      loadAllSesiones();
      loadCursoDetail(cursoId);
      loadCursos();
    }
    setCreatingSession(false);
  }

  async function toggleSesion(cursoId: string, sesionId: string) {
    const exists = cursoSesiones.find(cs => cs.sesion_id === sesionId);
    if (exists) {
      await supabase.from('curso_sesiones').delete().eq('id', exists.id);
    } else {
      await supabase.from('curso_sesiones').insert({ curso_id: cursoId, sesion_id: sesionId, orden: cursoSesiones.length });
    }
    loadCursoDetail(cursoId);
    loadCursos();
  }

  async function toggleEstudiante(cursoId: string, userId: string) {
    if (cursoEstudiantes.includes(userId)) {
      await supabase.from('curso_estudiantes').delete().eq('curso_id', cursoId).eq('user_id', userId);
    } else {
      await supabase.from('curso_estudiantes').insert({ curso_id: cursoId, user_id: userId });
    }
    loadCursoDetail(cursoId);
    loadCursos();
  }

  function toggleExpand(cursoId: string) {
    if (expanded === cursoId) {
      setExpanded(null);
    } else {
      setExpanded(cursoId);
      loadCursoDetail(cursoId);
    }
  }

  const filteredStudentsForAssign = students.filter(s =>
    `${s.nombre} ${s.apellidos} ${s.cedula}`.toLowerCase().includes(searchStudent.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">Cursos</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-gradient-to-r from-[hsl(var(--neon-violet))] to-[hsl(var(--neon-blue))] text-white border-0">
              <Plus className="w-4 h-4" /> Nuevo Curso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Nuevo Curso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Preparación Politécnica 2026" /></div>
              <div><Label>Descripción</Label><Input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" /></div>
              <Button onClick={createCurso} className="w-full bg-gradient-to-r from-[hsl(var(--neon-violet))] to-[hsl(var(--neon-blue))] text-white">Crear Curso</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cursos.length === 0 && <p className="text-center py-6 text-muted-foreground text-sm">No hay cursos creados</p>}

      <div className="space-y-2">
        {cursos.map(curso => (
          <motion.div key={curso.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="card-elevated overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="p-3 md:p-4 flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(curso.id)}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-violet)/0.2)] to-[hsl(var(--neon-blue)/0.2)] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-[hsl(var(--neon-violet))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingCursoId === curso.id ? (
                      <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                        <Input value={editCursoForm.titulo} onChange={e => setEditCursoForm({ ...editCursoForm, titulo: e.target.value })} className="h-7 text-sm font-semibold" />
                        <Input value={editCursoForm.descripcion} onChange={e => setEditCursoForm({ ...editCursoForm, descripcion: e.target.value })} className="h-7 text-xs" placeholder="Descripción" />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs gap-1" onClick={() => updateCurso(curso.id)}><Check className="w-3 h-3" /> Guardar</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingCursoId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold truncate">{curso.titulo}</p>
                        {curso.descripcion && <p className="text-xs text-muted-foreground truncate">{curso.descripcion}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <BookOpen className="w-3 h-3" /> {curso.sesiones_count}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Users className="w-3 h-3" /> {curso.estudiantes_count}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setEditingCursoId(curso.id); setEditCursoForm({ titulo: curso.titulo, descripcion: curso.descripcion }); }} title="Editar curso">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); copyCurso(curso); }} title="Copiar curso">
                      <Copy className="w-4 h-4 text-[hsl(var(--neon-blue))]" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); deleteCurso(curso); }} title="Eliminar">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    {expanded === curso.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded === curso.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border overflow-hidden"
                    >
                      <div className="p-3 md:p-4 space-y-4">
                        {/* Sesiones */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-1"><BookOpen className="w-4 h-4" /> Sesiones</h3>
                            <div className="flex gap-1">
                              {/* Vincular existing */}
                              <Dialog open={linkSesionOpen} onOpenChange={setLinkSesionOpen}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                                    <Plus className="w-3 h-3" /> Vincular
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader><DialogTitle>Vincular Sesiones Existentes</DialogTitle></DialogHeader>
                                  <div className="space-y-2 max-h-72 overflow-y-auto">
                                    {allSesiones.map(s => {
                                      const linked = cursoSesiones.some(cs => cs.sesion_id === s.id);
                                      return (
                                        <div key={s.id} className={`flex items-center justify-between p-2 rounded-lg border ${linked ? 'border-[hsl(var(--neon-mint))] bg-[hsl(var(--neon-mint)/0.05)]' : 'border-border'}`}>
                                          <span className="text-sm">S{s.numero} - {s.titulo}</span>
                                          <Button size="sm" variant={linked ? 'default' : 'outline'} className={`h-7 text-xs ${linked ? 'bg-[hsl(var(--neon-mint))] text-white hover:bg-[hsl(var(--neon-mint)/0.8)]' : ''}`} onClick={() => toggleSesion(curso.id, s.id)}>
                                            {linked ? '✓ Vinculada' : 'Vincular'}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {/* Create new session */}
                              <Dialog open={createSesionOpen} onOpenChange={setCreateSesionOpen}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7 border-[hsl(var(--neon-violet)/0.4)] text-[hsl(var(--neon-violet))]">
                                    <FolderPlus className="w-3 h-3" /> Crear Sesión
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm">
                                  <DialogHeader><DialogTitle>Crear Nueva Sesión</DialogTitle></DialogHeader>
                                  <div className="space-y-3">
                                    <div><Label>Número de sesión</Label><Input type="number" placeholder="#" value={newSesionForm.numero || ''} onChange={e => setNewSesionForm({ ...newSesionForm, numero: parseInt(e.target.value) || 0 })} /></div>
                                    <div><Label>Título</Label><Input placeholder="Título de la sesión" value={newSesionForm.titulo} onChange={e => setNewSesionForm({ ...newSesionForm, titulo: e.target.value })} /></div>
                                    <Button className="w-full bg-gradient-to-r from-[hsl(var(--neon-violet))] to-[hsl(var(--neon-blue))] text-white" disabled={creatingSession || !newSesionForm.titulo.trim() || !newSesionForm.numero} onClick={() => createSesionAndLink(curso.id)}>
                                      {creatingSession ? 'Creando...' : 'Crear y vincular al curso'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          {cursoSesiones.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin sesiones vinculadas</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {cursoSesiones.map(cs => (
                                <Badge key={cs.id} variant="outline" className="gap-1 cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/admin/content?sesion=${cs.sesion_id}`)}>
                                  S{cs.sesion?.numero} {cs.sesion?.titulo}
                                  <ExternalLink className="w-3 h-3" />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Estudiantes */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold flex items-center gap-1"><Users className="w-4 h-4" /> Estudiantes ({cursoEstudiantes.length})</h3>
                            <Dialog open={assignOpen} onOpenChange={o => { setAssignOpen(o); setSearchStudent(''); }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                                  <UserPlus className="w-3 h-3" /> Asignar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Asignar Estudiantes</DialogTitle></DialogHeader>
                                <Input placeholder="Buscar estudiante..." value={searchStudent} onChange={e => setSearchStudent(e.target.value)} className="mb-2" />
                                <div className="space-y-1 max-h-80 overflow-y-auto">
                                  {filteredStudentsForAssign.map(s => {
                                    const assigned = cursoEstudiantes.includes(s.user_id);
                                    return (
                                      <div key={s.id} className={`flex items-center justify-between p-2 rounded-lg border ${assigned ? 'border-[hsl(var(--neon-mint))] bg-[hsl(var(--neon-mint)/0.05)]' : 'border-border'}`}>
                                        <div>
                                          <span className="text-sm font-medium">{s.nombre} {s.apellidos}</span>
                                          <span className="text-xs text-muted-foreground ml-2">{s.cedula}</span>
                                        </div>
                                        <Button size="sm" variant={assigned ? 'default' : 'outline'} className={`h-7 text-xs ${assigned ? 'bg-[hsl(var(--neon-mint))] text-white hover:bg-[hsl(var(--neon-mint)/0.8)]' : ''}`} onClick={() => toggleEstudiante(curso.id, s.user_id)}>
                                          {assigned ? <><UserMinus className="w-3 h-3 mr-1" /> Quitar</> : <><UserPlus className="w-3 h-3 mr-1" /> Asignar</>}
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          {cursoEstudiantes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin estudiantes asignados</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {students.filter(s => cursoEstudiantes.includes(s.user_id)).map(s => (
                                <Badge key={s.id} variant="secondary" className="text-xs">
                                  {s.nombre} {s.apellidos?.[0]}.
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Módulos del curso */}
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-1 mb-2">
                            <Layers className="w-4 h-4" /> Módulos disponibles
                          </h3>
                          <p className="text-[11px] text-muted-foreground mb-2">
                            Activa o desactiva funciones para los estudiantes asignados a este curso.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(Object.keys(MODULE_LABELS) as Array<keyof CourseModules>).map((k) => (
                              <div key={k} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-card/40">
                                <span className="text-sm">{MODULE_LABELS[k]}</span>
                                <Switch checked={curso.modulos[k]} onCheckedChange={() => toggleModulo(curso, k)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
