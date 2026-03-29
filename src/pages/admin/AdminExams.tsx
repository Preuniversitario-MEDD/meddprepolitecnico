import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Settings2, Eye, Users, CheckCircle, XCircle, Brain, Pencil, Save, Plus, Trophy, Lock, Unlock, AlertTriangle, RotateCcw, Play } from 'lucide-react';
import ExamResultsDialog from '@/components/admin/ExamResultsDialog';

interface ExamConfig {
  id: string;
  tipo: string;
  label: string;
  sessions: number[];
  tiempo_minutos: number;
  cantidad_preguntas: number;
  puntaje_aprobacion: number;
  activo: boolean;
  modo: 'libre' | 'secuencial';
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
  const navigate = useNavigate();
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
  const [newExam, setNewExam] = useState({ tipo: '', label: '', sessions: [] as number[], tiempo_minutos: 50, cantidad_preguntas: 30, puntaje_aprobacion: 80, modo: 'libre' as 'libre' | 'secuencial' });
  const [statusExam, setStatusExam] = useState<string | null>(null);
  const [studentStatuses, setStudentStatuses] = useState<any[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: cfgs }, { data: exams }, { data: ses }] = await Promise.all([
      supabase.from('exam_configuracion').select('*').order('tipo'),
      supabase.from('examenes').select('*').order('fecha', { ascending: false }),
      supabase.from('sesiones').select('id, numero, titulo').order('numero'),
    ]);

    if (ses) setSesiones(ses as Sesion[]);
    if (cfgs) setConfigs(cfgs.map((c: any) => ({ ...c, sessions: c.sessions || [], modo: c.modo || 'libre' })));

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
      modo: newExam.modo,
    });
    if (error) { toast.error('Error: ' + error.message); return; }
    setCreateOpen(false);
    setNewExam({ tipo: '', label: '', sessions: [], tiempo_minutos: 50, cantidad_preguntas: 30, puntaje_aprobacion: 80, modo: 'libre' });
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
                        {' · '}{cfg.modo === 'secuencial' ? '➡️ Secuencial' : '🔀 Libre'}
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

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Temporizador</Label>
                    <Select value={String(cfg.tiempo_minutos)} onValueChange={(v) => updateConfig(cfg.tipo, 'tiempo_minutos', parseInt(v))}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMER_OPTIONS.map(t => <SelectItem key={t} value={String(t)}>{t} minutos</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cantidad de preguntas</Label>
                    <Select value={String(cfg.cantidad_preguntas)} onValueChange={(v) => updateConfig(cfg.tipo, 'cantidad_preguntas', parseInt(v))}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {QUESTION_OPTIONS.map(q => <SelectItem key={q} value={String(q)}>{q} preguntas</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Puntaje aprobación</Label>
                    <Select value={String(cfg.puntaje_aprobacion)} onValueChange={(v) => updateConfig(cfg.tipo, 'puntaje_aprobacion', parseInt(v))}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[60, 70, 80, 90, 900].map(p => <SelectItem key={p} value={String(p)}>{p}/{isFinal ? '1000' : '100'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" variant="outline" onClick={() => assignDifficultyAI(cfg.tipo)} className="w-full gap-1 h-9 text-xs">
                      <Brain className="w-3.5 h-3.5" /> Dificultad IA
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Modo</Label>
                    <Select value={cfg.modo || 'libre'} onValueChange={(v) => updateConfig(cfg.tipo, 'modo', v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libre">🔀 Libre</SelectItem>
                        <SelectItem value="secuencial">➡️ Secuencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap border-t border-border pt-3 mt-1">
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md"><Users className="w-3 h-3" /> {totalStudents}</span>
                  <span className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-md text-accent"><CheckCircle className="w-3 h-3" /> {aprobados}</span>
                  <span className="flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded-md text-destructive"><XCircle className="w-3 h-3" /> {examRes.length - aprobados}</span>
                  <div className="ml-auto flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3 gap-1" onClick={() => navigate(`/admin/exam-preview/${cfg.tipo}`)}>
                      <Play className="w-3 h-3" /> Vista previa
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={() => setSelectedExam(cfg.tipo)}>
                      <Eye className="w-3 h-3 mr-1" /> Resultados
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3 border-[hsl(var(--neon-violet))]/40 text-[hsl(var(--neon-violet))] hover:bg-[hsl(var(--neon-violet))]/10" onClick={() => setStatusExam(cfg.tipo)}>
                      <Users className="w-3 h-3 mr-1" /> Estado por estudiante
                    </Button>
                  </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
              <div>
                <Label className="text-xs">Modo</Label>
                <Select value={newExam.modo} onValueChange={v => setNewExam({ ...newExam, modo: v as 'libre' | 'secuencial' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="libre">🔀 Libre</SelectItem>
                    <SelectItem value="secuencial">➡️ Secuencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={createExam} className="w-full gradient-primary text-primary-foreground">Crear Examen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results dialog */}
      <ExamResultsDialog
        open={!!selectedExam}
        onOpenChange={() => setSelectedExam(null)}
        examTipo={selectedExam}
        configs={configs}
      />

      {/* Student exam status dialog */}
      <Dialog open={!!statusExam} onOpenChange={() => setStatusExam(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Estado: {configs.find(c => c.tipo === statusExam)?.label}
            </DialogTitle>
          </DialogHeader>
          <StudentExamStatusTable examTipo={statusExam} configs={configs} sesiones={sesiones} results={results} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentExamStatusTable({ examTipo, configs, sesiones, results }: { examTipo: string | null; configs: ExamConfig[]; sesiones: Sesion[]; results: ExamResult[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceExamUserId, setForceExamUserId] = useState<string | null>(null);
  const activeConfigs = configs.filter(c => c.activo);

  useEffect(() => {
    if (examTipo) loadStatus();
  }, [examTipo]);

  async function loadStatus() {
    setLoading(true);
    const cfg = configs.find(c => c.tipo === examTipo);
    if (!cfg) { setLoading(false); return; }

    const [{ data: profiles }, { data: allProgress }, { data: allExams }, { data: bloqueos }] = await Promise.all([
      supabase.from('profiles').select('user_id, nombre, apellidos'),
      supabase.from('progreso_estudiante').select('user_id, sesion_id, preguntas_correctas_total, errores_quiz'),
      supabase.from('examenes').select('user_id, tipo, puntaje, aprobado, fecha').eq('tipo', examTipo!),
      supabase.from('exam_bloqueos').select('user_id, exam_tipo'),
    ]);

    const sesionIds = sesiones.filter(s => cfg.sessions.includes(s.numero)).map(s => s.id);
    const bloqueoSet = new Set((bloqueos || []).map((b: any) => `${b.user_id}:${b.exam_tipo}`));

    const studentMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => {
      const sessionStatuses = sesionIds.map(sid => {
        const prog = (allProgress || []).find((pr: any) => pr.user_id === p.user_id && pr.sesion_id === sid);
        if (!prog) return { met: false, accuracy: 0 };
        const total = (prog.preguntas_correctas_total || 0) + (prog.errores_quiz || 0);
        const accuracy = total > 0 ? Math.round(((prog.preguntas_correctas_total || 0) / total) * 100) : 0;
        return { met: accuracy >= 80, accuracy };
      });

      const unlocked = sessionStatuses.every(s => s.met);
      const studentExams = (allExams || []).filter((e: any) => e.user_id === p.user_id);
      const attempts = studentExams.length;
      const bestScore = studentExams.length > 0 ? Math.max(...studentExams.map((e: any) => Number(e.puntaje))) : 0;
      const approved = studentExams.some((e: any) => e.aprobado);
      const blocked = attempts >= 3 && !approved && bestScore < 70;
      const extraChance = attempts >= 3 && !approved && bestScore >= 70;
      const examBloqueado = bloqueoSet.has(`${p.user_id}:${examTipo}`);

      studentMap.set(p.user_id, {
        ...p,
        unlocked,
        sessionAccuracies: sessionStatuses,
        attempts,
        bestScore,
        approved,
        blocked,
        extraChance,
        examBloqueado,
      });
    });

    setData(Array.from(studentMap.values()).sort((a, b) => {
      if (a.approved !== b.approved) return a.approved ? -1 : 1;
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.bestScore - a.bestScore;
    }));
    setLoading(false);
  }

  async function forceUnlockExam(userId: string, targetTipo: string) {
    const cfg = configs.find(c => c.tipo === targetTipo);
    if (!cfg) return;

    const sesionIds = sesiones.filter(s => cfg.sessions.includes(s.numero)).map(s => s.id);
    for (const sid of sesionIds) {
      const { data: existing } = await supabase.from('progreso_estudiante')
        .select('id').eq('user_id', userId).eq('sesion_id', sid).maybeSingle();
      
      if (existing) {
        await supabase.from('progreso_estudiante').update({
          preguntas_correctas_total: 150,
          errores_quiz: 0,
          completada: true,
        }).eq('id', existing.id);
      } else {
        await supabase.from('progreso_estudiante').insert({
          user_id: userId,
          sesion_id: sid,
          preguntas_correctas_total: 150,
          errores_quiz: 0,
          completada: true,
        });
      }
    }
    toast.success(`Examen "${cfg.label}" activado para el estudiante`);
    setForceExamUserId(null);
    loadStatus();
  }

  async function resetAttempts(userId: string) {
    await supabase.from('examenes').delete().eq('user_id', userId).eq('tipo', examTipo!);
    await supabase.from('examen_historial').delete().eq('user_id', userId).eq('exam_tipo', examTipo!);
    toast.success('Intentos reseteados');
    loadStatus();
  }

  async function toggleBloqueo(userId: string, currentlyBlocked: boolean) {
    if (currentlyBlocked) {
      await supabase.from('exam_bloqueos').delete().eq('user_id', userId).eq('exam_tipo', examTipo!);
      toast.success('Examen desbloqueado para el estudiante');
    } else {
      await supabase.from('exam_bloqueos').insert({ user_id: userId, exam_tipo: examTipo! } as any);
      toast.success('Examen bloqueado para el estudiante');
    }
    loadStatus();
  }

  if (loading) return <p className="text-center text-muted-foreground py-4">Cargando...</p>;

  const cfg = configs.find(c => c.tipo === examTipo);

  return (
    <>
      {/* Force-enable exam selector dialog */}
      <Dialog open={!!forceExamUserId} onOpenChange={() => setForceExamUserId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Habilitar Examen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Selecciona el examen que deseas activar para este estudiante:
          </p>
          <div className="space-y-2">
            {activeConfigs.map(c => (
              <Button
                key={c.tipo}
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3 text-left"
                onClick={() => forceExamUserId && forceUnlockExam(forceExamUserId, c.tipo)}
              >
                <Unlock className="w-4 h-4 text-[hsl(var(--neon-orange))] shrink-0" />
                <div>
                  <p className="font-medium text-sm">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground">Sesiones: {c.sessions.join(', ')}</p>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead className="hidden sm:table-cell">Desbloqueo</TableHead>
            <TableHead>Intentos</TableHead>
            <TableHead>Mejor nota</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(s => (
            <TableRow key={s.user_id}>
              <TableCell className="font-medium text-sm">{s.nombre} {s.apellidos}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {s.unlocked ? (
                  <Badge variant="outline" className="text-[10px] gap-1 border-accent text-accent">
                    <Unlock className="w-3 h-3" /> Desbloqueado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-1 border-destructive text-destructive">
                    <Lock className="w-3 h-3" /> Bloqueado ({s.sessionAccuracies.filter((a: any) => a.met).length}/{s.sessionAccuracies.length})
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span className={`text-sm font-bold ${s.attempts >= 3 ? 'text-destructive' : 'text-foreground'}`}>
                  {s.attempts}/3
                </span>
              </TableCell>
              <TableCell>
                <span className={`text-sm font-bold ${s.bestScore >= (cfg?.puntaje_aprobacion || 80) ? 'text-accent' : s.bestScore > 0 ? 'text-[hsl(var(--neon-orange))]' : 'text-muted-foreground'}`}>
                  {s.bestScore > 0 ? `${s.bestScore}/${cfg?.tipo === 'exam_final' ? '1000' : '100'}` : '—'}
                </span>
              </TableCell>
              <TableCell>
                {s.examBloqueado ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <Lock className="w-3 h-3" /> Deshabilitado
                  </Badge>
                ) : s.approved ? (
                  <Badge className="text-[10px] bg-accent text-accent-foreground">✅ Aprobado</Badge>
                ) : s.blocked ? (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" /> Bloqueado
                  </Badge>
                ) : s.extraChance ? (
                  <Badge className="text-[10px] bg-[hsl(var(--neon-orange))] text-primary-foreground gap-1">
                    <RotateCcw className="w-3 h-3" /> Extra
                  </Badge>
                ) : s.attempts > 0 ? (
                  <Badge variant="outline" className="text-[10px]">En progreso</Badge>
                ) : s.unlocked ? (
                  <Badge variant="outline" className="text-[10px] border-[hsl(var(--neon-orange))] text-[hsl(var(--neon-orange))]">Pendiente</Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">No disponible</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {!s.approved && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-[hsl(var(--neon-orange))]/50 text-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/10" onClick={() => setForceExamUserId(s.user_id)}>
                      <Unlock className="w-3 h-3" /> Habilitar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className={`h-7 text-[10px] gap-1 ${s.examBloqueado ? 'border-accent/50 text-accent hover:bg-accent/10' : 'border-destructive/50 text-destructive hover:bg-destructive/10'}`}
                    onClick={() => toggleBloqueo(s.user_id, s.examBloqueado)}>
                    {s.examBloqueado ? <><Unlock className="w-3 h-3" /> Desbloquear</> : <><Lock className="w-3 h-3" /> Bloquear</>}
                  </Button>
                  {(s.blocked || s.attempts > 0) && !s.approved && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 hover:bg-destructive/10" onClick={() => resetAttempts(s.user_id)}>
                      <RotateCcw className="w-3 h-3" /> Reset
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin estudiantes</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
