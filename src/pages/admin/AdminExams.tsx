import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Settings2, Eye, Users, CheckCircle, XCircle, Brain, Pencil, Save, Plus, Trophy } from 'lucide-react';

interface ExamConfig {
  id: string;
  tipo: string;
  label: string;
  sessions: number[];
  tiempo_minutos: number;
  cantidad_preguntas: number;
  puntaje_aprobacion: number;
  activo: boolean;
}

interface ExamResult {
  id: string;
  user_id: string;
  tipo: string;
  puntaje: number;
  aprobado: boolean;
  fecha: string;
  profile?: { nombre: string; apellidos: string };
}

interface Sesion {
  id: string;
  numero: number;
  titulo: string;
}

const TIMER_OPTIONS = [30, 45, 50, 60, 90, 120];
const QUESTION_OPTIONS = [10, 20, 25, 30, 40, 50];

export default function AdminExams() {
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [editingExam, setEditingExam] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSessions, setEditSessions] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newExam, setNewExam] = useState({ tipo: '', label: '', sessions: [] as number[], tiempo_minutos: 50, cantidad_preguntas: 30, puntaje_aprobacion: 80 });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: cfgs }, { data: exams }, { data: ses }] = await Promise.all([
      supabase.from('exam_configuracion').select('*').order('tipo'),
      supabase.from('examenes').select('*').order('fecha', { ascending: false }),
      supabase.from('sesiones').select('id, numero, titulo').order('numero'),
    ]);

    if (ses) setSesiones(ses as Sesion[]);
    if (cfgs) setConfigs(cfgs.map((c: any) => ({ ...c, sessions: c.sessions || [] })));

    if (cfgs && ses) {
      const counts: Record<string, number> = {};
      for (const cfg of cfgs) {
        const sesionIds = (ses as any[]).filter(s => (cfg as any).sessions?.includes(s.numero)).map(s => s.id);
        if (sesionIds.length > 0) {
          const { count } = await supabase.from('quiz_preguntas').select('*', { count: 'exact', head: true }).in('sesion_id', sesionIds);
          counts[cfg.tipo] = count || 0;
        }
      }
      setQuestionCounts(counts);
    }

    if (exams) {
      const userIds = [...new Set(exams.map((e: any) => e.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setResults(exams.map((e: any) => ({ ...e, profile: profileMap.get(e.user_id) })));
    }
    setLoading(false);
  }

  async function updateConfig(tipo: string, field: string, value: any) {
    const { error } = await supabase.from('exam_configuracion').update({ [field]: value, updated_at: new Date().toISOString() } as any).eq('tipo', tipo);
    if (error) { toast.error('Error al guardar'); return; }
    setConfigs(prev => prev.map(c => c.tipo === tipo ? { ...c, [field]: value } : c));
    toast.success('Configuración guardada');
  }

  async function saveExamEdit(tipo: string) {
    await supabase.from('exam_configuracion').update({ label: editLabel, sessions: editSessions, updated_at: new Date().toISOString() } as any).eq('tipo', tipo);
    setConfigs(prev => prev.map(c => c.tipo === tipo ? { ...c, label: editLabel, sessions: editSessions } : c));
    setEditingExam(null);
    toast.success('Examen actualizado');
    loadAll();
  }

  async function createExam() {
    if (!newExam.tipo.trim() || !newExam.label.trim()) { toast.error('Completa tipo y nombre'); return; }
    const { error } = await supabase.from('exam_configuracion').insert({
      tipo: newExam.tipo,
      label: newExam.label,
      sessions: newExam.sessions,
      tiempo_minutos: newExam.tiempo_minutos,
      cantidad_preguntas: newExam.cantidad_preguntas,
      puntaje_aprobacion: newExam.puntaje_aprobacion,
    });
    if (error) { toast.error('Error: ' + error.message); return; }
    setCreateOpen(false);
    setNewExam({ tipo: '', label: '', sessions: [], tiempo_minutos: 50, cantidad_preguntas: 30, puntaje_aprobacion: 80 });
    toast.success('Examen creado');
    loadAll();
  }

  async function assignDifficultyAI(tipo: string) {
    const cfg = configs.find(c => c.tipo === tipo);
    if (!cfg) return;
    const sesionIds = sesiones.filter(s => cfg.sessions.includes(s.numero)).map(s => s.id);
    const { data: questions } = await supabase.from('quiz_preguntas').select('id, pregunta, opciones').in('sesion_id', sesionIds);
    if (!questions || questions.length === 0) { toast.error('No hay preguntas'); return; }

    toast.info(`Asignando dificultad a ${questions.length} preguntas con IA...`);
    const batchSize = 20;
    let totalAssigned = 0;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      try {
        const { data, error } = await supabase.functions.invoke('assign-difficulty', {
          body: { questions: batch.map(q => ({ pregunta: q.pregunta, opciones: q.opciones })) }
        });
        if (error) throw error;
        const levels: number[] = data?.levels || [];
        for (let j = 0; j < Math.min(levels.length, batch.length); j++) {
          await supabase.from('quiz_preguntas').update({ dificultad: levels[j] } as any).eq('id', batch[j].id);
          totalAssigned++;
        }
      } catch (e) {
        console.error('AI difficulty error:', e);
        toast.error(`Error en lote ${Math.floor(i / batchSize) + 1}`);
      }
    }
    toast.success(`Dificultad asignada a ${totalAssigned} preguntas`);
  }

  const examResults = (tipo: string) => results.filter(r => r.tipo === tipo);

  function toggleSession(list: number[], num: number): number[] {
    return list.includes(num) ? list.filter(n => n !== num) : [...list, num].sort((a, b) => a - b);
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Cargando exámenes...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Gestión de Exámenes</h1>
        <Button onClick={() => setCreateOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Crear Examen
        </Button>
      </div>

      <div className="grid gap-4">
        {configs.map(cfg => {
          const qCount = questionCounts[cfg.tipo] || 0;
          const examRes = examResults(cfg.tipo);
          const aprobados = examRes.filter(r => r.aprobado).length;
          const totalStudents = new Set(examRes.map(r => r.user_id)).size;
          const isEditing = editingExam === cfg.tipo;
          const isFinal = cfg.tipo === 'exam_final';

          return (
            <Card key={cfg.id} className={`card-elevated ${isFinal ? 'border-2 border-[hsl(var(--neon-orange))]' : ''}`}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFinal ? 'bg-[hsl(var(--neon-orange))]/20' : 'gradient-primary'}`}>
                      {isFinal ? <Trophy className="w-5 h-5 text-[hsl(var(--neon-orange))]" /> : <Settings2 className="w-5 h-5 text-primary-foreground" />}
                    </div>
                    <div>
                      {isEditing ? (
                        <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="font-display font-bold h-8 w-60" />
                      ) : (
                        <h3 className="font-display font-bold">{cfg.label}</h3>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Sesiones: {cfg.sessions.join(', ')} · Banco: {qCount} preguntas
                        {isFinal && ' · Sobre 1000 pts'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Button size="sm" onClick={() => saveExamEdit(cfg.tipo)} className="gap-1"><Save className="w-4 h-4" /> Guardar</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setEditingExam(cfg.tipo); setEditLabel(cfg.label); setEditSessions([...cfg.sessions]); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Switch checked={cfg.activo} onCheckedChange={(v) => updateConfig(cfg.tipo, 'activo', v)} />
                    <span className="text-xs text-muted-foreground">{cfg.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>

                {/* Session selector when editing */}
                {isEditing && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Seleccionar sesiones del banco:</Label>
                    <div className="flex flex-wrap gap-2">
                      {sesiones.map(s => (
                        <label key={s.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs cursor-pointer transition-colors ${editSessions.includes(s.numero) ? 'bg-primary/20 border-primary' : 'bg-muted/50 border-muted'}`}>
                          <Checkbox checked={editSessions.includes(s.numero)} onCheckedChange={() => setEditSessions(toggleSession(editSessions, s.numero))} />
                          S{s.numero}: {s.titulo}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Temporizador</Label>
                    <Select value={String(cfg.tiempo_minutos)} onValueChange={(v) => updateConfig(cfg.tipo, 'tiempo_minutos', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMER_OPTIONS.map(t => <SelectItem key={t} value={String(t)}>{t} minutos</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cantidad de preguntas</Label>
                    <Select value={String(cfg.cantidad_preguntas)} onValueChange={(v) => updateConfig(cfg.tipo, 'cantidad_preguntas', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUESTION_OPTIONS.map(q => <SelectItem key={q} value={String(q)}>{q} preguntas</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Puntaje aprobación</Label>
                    <Select value={String(cfg.puntaje_aprobacion)} onValueChange={(v) => updateConfig(cfg.tipo, 'puntaje_aprobacion', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[60, 70, 80, 90, 900].map(p => <SelectItem key={p} value={String(p)}>{p}/{isFinal ? '1000' : '100'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" variant="outline" onClick={() => assignDifficultyAI(cfg.tipo)} className="w-full gap-1">
                      <Brain className="w-4 h-4" /> Asignar dificultad IA
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {totalStudents} estudiantes</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-accent" /> {aprobados} aprobados</span>
                  <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> {examRes.length - aprobados} reprobados</span>
                  <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => setSelectedExam(cfg.tipo)}>
                    <Eye className="w-3 h-3 mr-1" /> Ver resultados
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create exam dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Crear Nuevo Examen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Identificador (único, ej: exam_final)</Label><Input value={newExam.tipo} onChange={e => setNewExam({ ...newExam, tipo: e.target.value })} /></div>
            <div><Label>Nombre del examen</Label><Input value={newExam.label} onChange={e => setNewExam({ ...newExam, label: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Sesiones del banco:</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {sesiones.map(s => (
                  <label key={s.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs cursor-pointer ${newExam.sessions.includes(s.numero) ? 'bg-primary/20 border-primary' : 'bg-muted/50'}`}>
                    <Checkbox checked={newExam.sessions.includes(s.numero)} onCheckedChange={() => setNewExam({ ...newExam, sessions: toggleSession(newExam.sessions, s.numero) })} />
                    S{s.numero}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Tiempo (min)</Label>
                <Select value={String(newExam.tiempo_minutos)} onValueChange={v => setNewExam({ ...newExam, tiempo_minutos: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMER_OPTIONS.map(t => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Preguntas</Label>
                <Select value={String(newExam.cantidad_preguntas)} onValueChange={v => setNewExam({ ...newExam, cantidad_preguntas: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QUESTION_OPTIONS.map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Aprobación</Label>
                <Input type="number" value={newExam.puntaje_aprobacion} onChange={e => setNewExam({ ...newExam, puntaje_aprobacion: parseInt(e.target.value) || 80 })} />
              </div>
            </div>
            <Button onClick={createExam} className="w-full gradient-primary text-primary-foreground">Crear Examen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results dialog */}
      <Dialog open={!!selectedExam} onOpenChange={() => setSelectedExam(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultados: {configs.find(c => c.tipo === selectedExam)?.label}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {examResults(selectedExam || '').map(r => {
                const cfg = configs.find(c => c.tipo === r.tipo);
                const isFinal = r.tipo === 'exam_final';
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.profile ? `${r.profile.nombre} ${r.profile.apellidos}` : r.user_id.slice(0, 8)}</TableCell>
                    <TableCell>{r.puntaje}/{isFinal ? '1000' : '100'}</TableCell>
                    <TableCell>
                      <Badge variant={r.aprobado ? 'default' : 'destructive'}>{r.aprobado ? 'Aprobado' : 'Reprobado'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(r.fecha).toLocaleDateString('es-EC')}</TableCell>
                  </TableRow>
                );
              })}
              {examResults(selectedExam || '').length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sin resultados aún</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
