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
import { Plus, Trash2, Edit, Image, ClipboardPaste, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

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

  // Find option lines matching patterns like: a) ..., A. ..., a. ..., A) ..., (a) ...
  const optionRegex = /^[\(\[]?([a-eA-E])[\)\]\.:\-]\s*(.+)/;
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

  // Handle paste image from clipboard
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
    const result = parseQuestionText(pasteText);
    if (!result) {
      toast({ title: 'No se pudo detectar la pregunta', description: 'Formato esperado: pregunta seguida de opciones a) b) c) d) e)', variant: 'destructive' });
      return;
    }
    setForm({
      pregunta: result.pregunta,
      opciones: result.opciones,
      respuesta_correcta: 0,
      grupo: form.grupo,
      imagen_url: form.imagen_url,
    });
    setPasteDialogOpen(false);
    setPasteText('');
    setDialogOpen(true);
    setEditItem(null);
    toast({ title: `Pregunta detectada con ${result.opciones.length} opciones`, description: 'Selecciona la respuesta correcta' });
  }

  return (
    <div className="p-4 md:p-6 space-y-4" onPaste={handlePasteImage}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Banco de Preguntas</h1>
        <span className="text-sm text-muted-foreground">{preguntas.length} preguntas</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedSesion} onValueChange={setSelectedSesion}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Selecciona sesión" /></SelectTrigger>
          <SelectContent>
            {sesiones.map(s => <SelectItem key={s.id} value={s.id}>S{s.numero}: {s.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={() => { setPasteText(''); setPasteDialogOpen(true); }} variant="outline" className="gap-2">
            <ClipboardPaste className="w-4 h-4" /> Pegar Pregunta
          </Button>
          <Button onClick={() => { setEditItem(null); resetForm(); setDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Nueva Pregunta
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {preguntas.map((p, i) => (
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
        {preguntas.length === 0 && <p className="text-center text-muted-foreground py-8">No hay preguntas en esta sesión</p>}
      </div>

      {/* Paste Question Dialog */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Pegar Pregunta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pega el texto completo de la pregunta con sus opciones (a-e). Se detectarán automáticamente.</p>
            <Textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={8}
              placeholder={`Ejemplo:\n¿Cuál es el elemento más abundante?\na) Oxígeno\nb) Hidrógeno\nc) Nitrógeno\nd) Carbono\ne) Helio`}
            />
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
            <div>
              <Label>Pregunta</Label>
              <Textarea value={form.pregunta} onChange={e => setForm({ ...form, pregunta: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Grupo</Label>
                <Input type="number" min={1} value={form.grupo} onChange={e => setForm({ ...form, grupo: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>Respuesta correcta</Label>
                <Select value={String(form.respuesta_correcta)} onValueChange={v => setForm({ ...form, respuesta_correcta: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {form.opciones.map((_, i) => <SelectItem key={i} value={String(i)}>{String.fromCharCode(65 + i)}</SelectItem>)}
                  </SelectContent>
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
                  <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="shrink-0 mb-0.5">
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {form.opciones.length < 6 && (
              <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                <Plus className="w-3 h-3 mr-1" /> Agregar opción {String.fromCharCode(65 + form.opciones.length)}
              </Button>
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
    </div>
  );
}
