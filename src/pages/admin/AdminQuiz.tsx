import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, ClipboardPaste, X, Download, Upload, FileUp, Copy, Scissors, Sparkles, Filter, ShieldCheck, BarChart3 } from 'lucide-react';
import QuizReviewDialog from '@/components/quiz/QuizReviewDialog';
import QuizStatsDialog from '@/components/quiz/QuizStatsDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import type { Tables } from '@/integrations/supabase/types';
import mammoth from 'mammoth';

type Sesion = Tables<'sesiones'>;

interface QuizPregunta {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  imagen_url: string | null;
  grupo: number;
  sesion_id: string;
}

function parseQuestionText(text: string): { pregunta: string; opciones: string[] } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  const optionRegex = /^[\(\[]?([a-fA-F])[\)\]\.:\-]\s*(.+)/;
  let questionLines: string[] = [];
  const opciones: string[] = [];

  let foundFirstOption = false;
  for (const line of lines) {
    const match = line.match(optionRegex);
    if (match) {
      foundFirstOption = true;
      opciones.push(match[2].trim());
    } else if (!foundFirstOption) {
      questionLines.push(line);
    }
  }

  if (opciones.length < 2 || questionLines.length === 0) return null;
  return { pregunta: questionLines.join('\n'), opciones };
}

function parseMultipleQuestions(text: string): { pregunta: string; opciones: string[] }[] {
  const questionBlocks = text.split(/(?=\n\s*\d+[\.\)]\s)/);
  const results: { pregunta: string; opciones: string[] }[] = [];
  for (const block of questionBlocks) {
    const cleaned = block.replace(/^\s*\d+[\.\)]\s*/, '').trim();
    if (!cleaned) continue;
    const parsed = parseQuestionText(cleaned);
    if (parsed) results.push(parsed);
  }
  if (results.length === 0) {
    const single = parseQuestionText(text);
    if (single) results.push(single);
  }
  return results;
}

export default function AdminQuiz() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [selectedSesion, setSelectedSesion] = useState('');
  const [preguntas, setPreguntas] = useState<QuizPregunta[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<QuizPregunta | null>(null);
  const [form, setForm] = useState({ pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: 0, grupo: 1, imagen_url: '' });
  const [uploading, setUploading] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importSessionDialogOpen, setImportSessionDialogOpen] = useState(false);
  const [importSourceSesion, setImportSourceSesion] = useState('');
  const [importSourcePreguntas, setImportSourcePreguntas] = useState<QuizPregunta[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [loadingImport, setLoadingImport] = useState(false);
  const [importMoveMode, setImportMoveMode] = useState(false);
  const [filterGrupo, setFilterGrupo] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiQuantity, setAiQuantity] = useState(5);
  const [aiGrupo, setAiGrupo] = useState(1);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ pregunta: string; opciones: string[]; respuesta_correcta: number }[]>([]);
  const [aiSelectedIds, setAiSelectedIds] = useState<Set<number>>(new Set());
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadSesiones(); }, []);
  useEffect(() => { if (selectedSesion) loadPreguntas(); }, [selectedSesion]);

  async function loadSesiones() {
    const { data } = await supabase.from('sesiones').select('*').order('numero');
    if (data) { setSesiones(data); if (data.length > 0) setSelectedSesion(data[0].id); }
  }

  async function loadPreguntas() {
    const { data } = await supabase.from('quiz_preguntas').select('*').eq('sesion_id', selectedSesion).order('grupo');
    setPreguntas((data || []).map(q => ({ ...q, opciones: (q.opciones as string[]) || [] })));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Solo imágenes PNG/JPG', variant: 'destructive' }); return; }
    setUploading(true);
    const path = `quiz/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('quiz-images').upload(path, file);
    if (error) { toast({ title: 'Error al subir', description: error.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('quiz-images').getPublicUrl(path);
    setForm({ ...form, imagen_url: publicUrl });
    setUploading(false);
  }

  async function handlePasteImage(e: React.ClipboardEvent) {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;
    for (const item of Array.from(clipboardItems)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setUploading(true);
        const file = item.getAsFile();
        if (!file) { setUploading(false); return; }
        const path = `quiz/${Date.now()}_pasted.png`;
        const { error } = await supabase.storage.from('quiz-images').upload(path, file);
        if (error) { toast({ title: 'Error al subir imagen', variant: 'destructive' }); setUploading(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('quiz-images').getPublicUrl(path);
        setForm(prev => ({ ...prev, imagen_url: publicUrl }));
        toast({ title: 'Imagen pegada correctamente' });
        setUploading(false);
      }
    }
  }

  function addOption() {
    if (form.opciones.length >= 6) return;
    setForm({ ...form, opciones: [...form.opciones, ''] });
  }

  function removeOption(index: number) {
    if (form.opciones.length <= 2) return;
    const newOpciones = form.opciones.filter((_, i) => i !== index);
    let newCorrect = form.respuesta_correcta;
    if (index === newCorrect) newCorrect = 0;
    else if (index < newCorrect) newCorrect--;
    setForm({ ...form, opciones: newOpciones, respuesta_correcta: newCorrect });
  }

  async function savePregunta() {
    if (!form.pregunta.trim() || form.opciones.some(o => !o.trim())) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' }); return;
    }
    const payload = {
      sesion_id: selectedSesion,
      pregunta: form.pregunta,
      opciones: form.opciones,
      respuesta_correcta: form.respuesta_correcta,
      grupo: form.grupo,
      imagen_url: form.imagen_url || null,
    };
    if (editItem) {
      await supabase.from('quiz_preguntas').update(payload).eq('id', editItem.id);
      toast({ title: 'Pregunta actualizada' });
    } else {
      await supabase.from('quiz_preguntas').insert(payload);
      toast({ title: 'Pregunta agregada' });
    }
    setDialogOpen(false);
    setEditItem(null);
    resetForm();
    loadPreguntas();
  }

  function resetForm() {
    setForm({ pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: 0, grupo: 1, imagen_url: '' });
  }

  async function deletePregunta(id: string) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await supabase.from('quiz_preguntas').delete().eq('id', id);
    toast({ title: 'Eliminada' });
    loadPreguntas();
  }

  function openEdit(p: QuizPregunta) {
    setEditItem(p);
    setForm({ pregunta: p.pregunta, opciones: [...p.opciones], respuesta_correcta: p.respuesta_correcta, grupo: p.grupo, imagen_url: p.imagen_url || '' });
    setDialogOpen(true);
  }

  function handlePasteQuestion() {
    const results = parseMultipleQuestions(pasteText);
    if (results.length === 0) {
      toast({ title: 'No se pudo detectar la pregunta', description: 'Formato esperado: pregunta seguida de opciones a) b) c) d) e)', variant: 'destructive' });
      return;
    }
    if (results.length === 1) {
      setForm({ pregunta: results[0].pregunta, opciones: results[0].opciones, respuesta_correcta: 0, grupo: form.grupo, imagen_url: form.imagen_url });
      setPasteDialogOpen(false);
      setPasteText('');
      setDialogOpen(true);
      setEditItem(null);
      toast({ title: `Pregunta detectada con ${results[0].opciones.length} opciones`, description: 'Selecciona la respuesta correcta' });
    } else {
      handleBatchImport(results);
    }
  }

  async function handleBatchImport(questions: { pregunta: string; opciones: string[] }[]) {
    const payloads = questions.map(q => ({
      sesion_id: selectedSesion, pregunta: q.pregunta, opciones: q.opciones, respuesta_correcta: 0, grupo: form.grupo, imagen_url: null,
    }));
    await supabase.from('quiz_preguntas').insert(payloads);
    toast({ title: `${questions.length} preguntas importadas`, description: 'Recuerda asignar la respuesta correcta a cada una' });
    setPasteDialogOpen(false);
    setPasteText('');
    loadPreguntas();
  }

  function exportQuestions() {
    const data = preguntas.map(({ pregunta, opciones, respuesta_correcta, grupo, imagen_url }) => ({
      pregunta, opciones, respuesta_correcta, grupo, imagen_url,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quiz_${selectedSesion.slice(0, 8)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const sesion = sesiones.find(s => s.id === selectedSesion);
    const header = 'Grupo,Pregunta,Opción A,Opción B,Opción C,Opción D,Opción E,Opción F,Respuesta Correcta';
    const rows = filteredPreguntas.map(p => {
      const ops = [...p.opciones];
      while (ops.length < 6) ops.push('');
      const correctLetter = String.fromCharCode(65 + p.respuesta_correcta);
      return [p.grupo, p.pregunta, ...ops, correctLetter].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quiz_${sesion ? `S${sesion.numero}` : selectedSesion.slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Debe ser un array');
      const payloads = data.map((q: any) => ({
        sesion_id: selectedSesion, pregunta: q.pregunta, opciones: q.opciones,
        respuesta_correcta: q.respuesta_correcta || 0, grupo: q.grupo || 1, imagen_url: q.imagen_url || null,
      }));
      await supabase.from('quiz_preguntas').insert(payloads);
      toast({ title: `${payloads.length} preguntas importadas desde JSON` });
      loadPreguntas();
    } catch (err: any) {
      toast({ title: 'Error al importar JSON', description: err.message, variant: 'destructive' });
    }
    e.target.value = '';
  }

  async function importWord(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      const questions = parseMultipleQuestions(text);
      if (questions.length === 0) {
        const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
        const parsed: { pregunta: string; opciones: string[] }[] = [];
        for (const block of blocks) { const p = parseQuestionText(block.trim()); if (p) parsed.push(p); }
        if (parsed.length === 0) { toast({ title: 'No se detectaron preguntas en el Word', variant: 'destructive' }); return; }
        await handleBatchImport(parsed);
      } else {
        await handleBatchImport(questions);
      }
    } catch (err: any) {
      toast({ title: 'Error al leer el archivo Word', description: err.message, variant: 'destructive' });
    }
    e.target.value = '';
  }

  async function loadImportSourcePreguntas(sesionId: string) {
    setImportSourceSesion(sesionId);
    setImportSelectedIds(new Set());
    if (!sesionId) { setImportSourcePreguntas([]); return; }
    const { data } = await supabase.from('quiz_preguntas').select('*').eq('sesion_id', sesionId).order('grupo');
    setImportSourcePreguntas((data || []).map(q => ({ ...q, opciones: (q.opciones as string[]) || [] })));
  }

  function toggleImportSelection(id: string) {
    setImportSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllImport() {
    if (importSelectedIds.size === importSourcePreguntas.length) setImportSelectedIds(new Set());
    else setImportSelectedIds(new Set(importSourcePreguntas.map(p => p.id)));
  }

  async function importFromSession() {
    const selected = importSourcePreguntas.filter(p => importSelectedIds.has(p.id));
    if (selected.length === 0) { toast({ title: 'Selecciona al menos una pregunta', variant: 'destructive' }); return; }
    setLoadingImport(true);
    const payloads = selected.map(q => ({
      sesion_id: selectedSesion, pregunta: q.pregunta, opciones: q.opciones,
      respuesta_correcta: q.respuesta_correcta, grupo: q.grupo, imagen_url: q.imagen_url || null,
    }));
    const { error } = await supabase.from('quiz_preguntas').insert(payloads);
    if (error) { toast({ title: 'Error al importar', description: error.message, variant: 'destructive' }); setLoadingImport(false); return; }

    // If move mode, delete originals from source session
    if (importMoveMode) {
      const idsToDelete = selected.map(q => q.id);
      await supabase.from('quiz_preguntas').delete().in('id', idsToDelete);
    }

    toast({ title: `${selected.length} preguntas ${importMoveMode ? 'movidas' : 'copiadas'}` });
    setLoadingImport(false);
    setImportSessionDialogOpen(false);
    loadPreguntas();
  }

  // AI generation
  async function generateWithAI() {
    const sesion = sesiones.find(s => s.id === selectedSesion);
    if (!sesion) return;
    setAiGenerating(true);
    setAiPreview([]);
    setAiSelectedIds(new Set());

    try {
      const existingQuestions = preguntas.slice(0, 30).map(p => p.pregunta.slice(0, 80));
      const { data, error } = await supabase.functions.invoke('generate-quiz-questions', {
        body: { sessionTitle: sesion.titulo, sessionNumber: sesion.numero, quantity: aiQuantity, existingQuestions },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Error de IA', description: data.error, variant: 'destructive' }); setAiGenerating(false); return; }
      const questions = data?.questions || [];
      if (questions.length === 0) { toast({ title: 'No se generaron preguntas', description: 'Intenta de nuevo', variant: 'destructive' }); setAiGenerating(false); return; }
      setAiPreview(questions);
      setAiSelectedIds(new Set(questions.map((_: any, i: number) => i)));
    } catch (err: any) {
      toast({ title: 'Error al generar', description: err.message || 'Intenta de nuevo', variant: 'destructive' });
    }
    setAiGenerating(false);
  }

  async function saveAiQuestions() {
    const selected = aiPreview.filter((_, i) => aiSelectedIds.has(i));
    if (selected.length === 0) return;
    const payloads = selected.map(q => ({
      sesion_id: selectedSesion, pregunta: q.pregunta, opciones: q.opciones,
      respuesta_correcta: q.respuesta_correcta, grupo: aiGrupo, imagen_url: null,
    }));
    await supabase.from('quiz_preguntas').insert(payloads);
    toast({ title: `${selected.length} preguntas de IA agregadas` });
    setAiDialogOpen(false);
    setAiPreview([]);
    loadPreguntas();
  }

  // Filtered questions
  const grupos = [...new Set(preguntas.map(p => p.grupo))].sort((a, b) => a - b);
  const filteredPreguntas = preguntas.filter(p => {
    if (filterGrupo !== 'all' && p.grupo !== parseInt(filterGrupo)) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return p.pregunta.toLowerCase().includes(q) || p.opciones.some(o => o.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4" onPaste={handlePasteImage}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Banco de Preguntas</h1>
        <span className="text-sm text-muted-foreground">{filteredPreguntas.length}/{preguntas.length} preguntas</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedSesion} onValueChange={setSelectedSesion}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Selecciona sesión" /></SelectTrigger>
          <SelectContent>
            {sesiones.map(s => <SelectItem key={s.id} value={s.id}>S{s.numero}: {s.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setPasteText(''); setPasteDialogOpen(true); }} variant="outline" className="gap-2">
            <ClipboardPaste className="w-4 h-4" /> Pegar Pregunta
          </Button>
          <Button onClick={() => { setEditItem(null); resetForm(); setDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Nueva
          </Button>
        </div>
      </div>

      {/* Search + Filter + Import/Export row */}
      <div className="flex gap-2 flex-wrap items-center">
        <Input 
          placeholder="Buscar pregunta..." 
          value={searchText} 
          onChange={e => setSearchText(e.target.value)} 
          className="h-8 w-40 text-xs"
        />
        {grupos.length > 1 && (
          <Select value={filterGrupo} onValueChange={setFilterGrupo}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Filtrar grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {grupos.map(g => <SelectItem key={g} value={String(g)}>Grupo {g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1" disabled={filteredPreguntas.length === 0}>
          <Download className="w-3 h-3" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportQuestions} className="gap-1" disabled={preguntas.length === 0}>
          <Download className="w-3 h-3" /> JSON
        </Button>
        <label>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <span><Upload className="w-3 h-3" /> Importar JSON</span>
          </Button>
          <input type="file" accept=".json" onChange={importJSON} className="hidden" />
        </label>
        <label>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <span><FileUp className="w-3 h-3" /> Importar Word</span>
          </Button>
          <input type="file" accept=".docx,.doc" onChange={importWord} className="hidden" />
        </label>
        <Button variant="outline" size="sm" onClick={() => { setImportSourceSesion(''); setImportSourcePreguntas([]); setImportSelectedIds(new Set()); setImportMoveMode(false); setImportSessionDialogOpen(true); }} className="gap-1">
          <Copy className="w-3 h-3" /> Desde Sesión
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setAiPreview([]); setAiSelectedIds(new Set()); setAiQuantity(5); setAiGrupo(1); setAiDialogOpen(true); }} className="gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <Sparkles className="w-3 h-3" /> Generar con IA
        </Button>
        {preguntas.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={() => setReviewDialogOpen(true)} className="gap-1 border-accent/30 text-accent hover:bg-accent/10">
              <ShieldCheck className="w-3 h-3" /> Revisar con IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStatsDialogOpen(true)} className="gap-1">
              <BarChart3 className="w-3 h-3" /> Estadísticas
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {filteredPreguntas.map((p, i) => (
          <Card key={p.id} className="card-elevated">
            <CardContent className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">G{p.grupo}</span>
                    <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{p.pregunta}</p>
                  {p.imagen_url && <p className="text-xs text-neon-pink mt-1">🖼️ Con imagen</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.opciones.map((o, j) => (
                      <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${j === p.respuesta_correcta ? 'bg-accent/20 text-accent font-bold' : 'bg-muted text-muted-foreground'}`}>
                        {String.fromCharCode(65 + j)}. {o.slice(0, 30)}{o.length > 30 ? '...' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deletePregunta(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredPreguntas.length === 0 && <p className="text-center text-muted-foreground py-8">
          {preguntas.length === 0 ? 'No hay preguntas en esta sesión' : 'No hay preguntas en este grupo'}
        </p>}
      </div>

      {/* Paste Question Dialog */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Pegar Pregunta(s)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pega una o varias preguntas con opciones (a-f). Se detectarán automáticamente. Para varias preguntas, numera con 1. 2. 3.</p>
            <Textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={10}
              placeholder={`Ejemplo:\n1. ¿Cuál es el elemento más abundante?\na) Oxígeno\nb) Hidrógeno\nc) Nitrógeno\nd) Carbono\ne) Helio`} />
            <Button onClick={handlePasteQuestion} disabled={!pasteText.trim()} className="w-full gradient-primary text-primary-foreground">
              <ClipboardPaste className="w-4 h-4 mr-2" /> Detectar y cargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Question Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Nueva'} Pregunta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Pregunta</Label><Textarea value={form.pregunta} onChange={e => setForm({ ...form, pregunta: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Grupo</Label><Input type="number" min={1} value={form.grupo} onChange={e => setForm({ ...form, grupo: parseInt(e.target.value) || 1 })} /></div>
              <div><Label>Respuesta correcta</Label>
                <Select value={String(form.respuesta_correcta)} onValueChange={v => setForm({ ...form, respuesta_correcta: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{form.opciones.map((_, i) => <SelectItem key={i} value={String(i)}>{String.fromCharCode(65 + i)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.opciones.map((op, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Opción {String.fromCharCode(65 + i)} {i === form.respuesta_correcta && '✅'}</Label>
                  <Input value={op} onChange={e => { const ops = [...form.opciones]; ops[i] = e.target.value; setForm({ ...form, opciones: ops }); }} />
                </div>
                {form.opciones.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="shrink-0 mb-0.5"><X className="w-4 h-4 text-destructive" /></Button>
                )}
              </div>
            ))}
            {form.opciones.length < 6 && (
              <Button variant="outline" size="sm" onClick={addOption} className="w-full"><Plus className="w-3 h-3 mr-1" /> Agregar opción {String.fromCharCode(65 + form.opciones.length)}</Button>
            )}
            <div>
              <Label>Imagen (opcional — también puedes pegar con Ctrl+V)</Label>
              <div className="flex gap-2 items-center">
                <Input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleImageUpload} disabled={uploading} />
                {form.imagen_url && <img src={form.imagen_url} alt="preview" className="w-12 h-12 object-cover rounded" />}
              </div>
            </div>
            <Button onClick={savePregunta} className="w-full gradient-primary text-primary-foreground">
              {editItem ? 'Guardar Cambios' : 'Agregar Pregunta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import from Session Dialog */}
      <Dialog open={importSessionDialogOpen} onOpenChange={setImportSessionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Importar desde otra Sesión</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Sesión origen</Label>
              <Select value={importSourceSesion} onValueChange={loadImportSourcePreguntas}>
                <SelectTrigger><SelectValue placeholder="Selecciona una sesión" /></SelectTrigger>
                <SelectContent>
                  {sesiones.filter(s => s.id !== selectedSesion).map(s => (
                    <SelectItem key={s.id} value={s.id}>S{s.numero}: {s.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Copy vs Move toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                {importMoveMode ? <Scissors className="w-4 h-4 text-warning" /> : <Copy className="w-4 h-4 text-primary" />}
                <div>
                  <p className="text-sm font-medium">{importMoveMode ? 'Mover (cortar)' : 'Copiar'}</p>
                  <p className="text-[10px] text-muted-foreground">{importMoveMode ? 'Las preguntas se eliminan de la sesión origen' : 'Las preguntas se duplican'}</p>
                </div>
              </div>
              <Switch checked={importMoveMode} onCheckedChange={setImportMoveMode} />
            </div>

            {importSourcePreguntas.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <button onClick={toggleAllImport} className="text-sm text-primary hover:underline">
                    {importSelectedIds.size === importSourcePreguntas.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                  <span className="text-xs text-muted-foreground">{importSelectedIds.size}/{importSourcePreguntas.length} seleccionadas</span>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto border rounded-md p-2">
                  {importSourcePreguntas.map((p) => (
                    <label key={p.id} className="flex items-start gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                      <Checkbox checked={importSelectedIds.has(p.id)} onCheckedChange={() => toggleImportSelection(p.id)} className="mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium mr-1">G{p.grupo}</span>
                        <span className="text-sm line-clamp-2">{p.pregunta}</span>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {p.opciones.map((o, j) => (
                            <span key={j} className={`text-[10px] px-1 py-0.5 rounded ${j === p.respuesta_correcta ? 'bg-accent/20 text-accent font-bold' : 'bg-muted text-muted-foreground'}`}>
                              {String.fromCharCode(65 + j)}. {o.slice(0, 25)}{o.length > 25 ? '…' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {importSourceSesion && importSourcePreguntas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay preguntas en esa sesión</p>
            )}

            <Button onClick={importFromSession} disabled={importSelectedIds.size === 0 || loadingImport} className="w-full gradient-primary text-primary-foreground">
              {importMoveMode ? <Scissors className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {importMoveMode ? 'Mover' : 'Copiar'} {importSelectedIds.size > 0 ? `${importSelectedIds.size} preguntas` : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Generar preguntas con IA</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La IA generará preguntas de opción múltiple basadas en el tema de la sesión seleccionada. Podrás revisar y seleccionar antes de guardar.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Cantidad</Label>
                <Select value={String(aiQuantity)} onValueChange={v => setAiQuantity(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n} preguntas</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Grupo destino</Label>
                <Input type="number" min={1} value={aiGrupo} onChange={e => setAiGrupo(parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <Button onClick={generateWithAI} disabled={aiGenerating} className="w-full gradient-primary text-primary-foreground gap-2">
              <Sparkles className="w-4 h-4" /> {aiGenerating ? 'Generando...' : 'Generar preguntas'}
            </Button>

            {aiPreview.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <button onClick={() => {
                    if (aiSelectedIds.size === aiPreview.length) setAiSelectedIds(new Set());
                    else setAiSelectedIds(new Set(aiPreview.map((_, i) => i)));
                  }} className="text-sm text-primary hover:underline">
                    {aiSelectedIds.size === aiPreview.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                  <span className="text-xs text-muted-foreground">{aiSelectedIds.size}/{aiPreview.length} seleccionadas</span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto border rounded-md p-2">
                  {aiPreview.map((q, i) => (
                    <label key={i} className="flex items-start gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                      <Checkbox checked={aiSelectedIds.has(i)} onCheckedChange={() => {
                        setAiSelectedIds(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
                      }} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-2">{q.pregunta}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {q.opciones.map((o, j) => (
                            <span key={j} className={`text-[10px] px-1 py-0.5 rounded ${j === q.respuesta_correcta ? 'bg-accent/20 text-accent font-bold' : 'bg-muted text-muted-foreground'}`}>
                              {String.fromCharCode(65 + j)}. {o.slice(0, 30)}{o.length > 30 ? '…' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={saveAiQuestions} disabled={aiSelectedIds.size === 0} className="w-full gradient-primary text-primary-foreground">
                  Guardar {aiSelectedIds.size} preguntas seleccionadas
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Review Dialog */}
      <QuizReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        preguntas={filteredPreguntas}
        onQuestionsUpdated={loadPreguntas}
      />

      {/* Stats Dialog */}
      <QuizStatsDialog
        open={statsDialogOpen}
        onOpenChange={setStatsDialogOpen}
        preguntas={preguntas}
        sesionId={selectedSesion}
      />
    </div>
  );
}
