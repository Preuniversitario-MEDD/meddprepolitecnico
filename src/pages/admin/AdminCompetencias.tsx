import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Play, Users, Trophy, Copy, Zap, Clock, Import } from 'lucide-react';
import { motion } from 'framer-motion';

interface Competencia {
  id: string;
  titulo: string;
  pin: string;
  modo: string;
  estado: string;
  pregunta_actual: number;
  tiempo_por_pregunta: number;
  created_at: string;
}

interface CompPregunta {
  id?: string;
  competencia_id?: string;
  orden: number;
  pregunta: string;
  imagen_url?: string;
  opciones: string[];
  respuesta_correcta: number;
  tiempo: number;
}

interface Sesion {
  id: string;
  numero: number;
  titulo: string;
}

export default function AdminCompetencias() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [modo, setModo] = useState('controlado');
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState(20);
  const [preguntas, setPreguntas] = useState<CompPregunta[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [selectedSesion, setSelectedSesion] = useState('');
  const [importSource, setImportSource] = useState<'quiz' | 'paste'>('quiz');

  const loadCompetencias = useCallback(async () => {
    const { data } = await supabase.from('competencias').select('*').order('created_at', { ascending: false });
    setCompetencias((data as Competencia[]) || []);
  }, []);

  useEffect(() => { loadCompetencias(); }, [loadCompetencias]);

  useEffect(() => {
    supabase.from('sesiones').select('id, numero, titulo').order('numero').then(({ data }) => setSesiones(data || []));
  }, []);

  const generatePin = () => String(Math.floor(100000 + Math.random() * 900000));

  async function importFromSession(sesionId: string) {
    const { data } = await supabase.from('quiz_preguntas').select('*').eq('sesion_id', sesionId);
    if (!data?.length) { toast({ title: 'Sin preguntas en esta sesión', variant: 'destructive' }); return; }
    const imported: CompPregunta[] = data.map((q: any, i: number) => ({
      orden: preguntas.length + i,
      pregunta: q.pregunta,
      imagen_url: q.imagen_url || '',
      opciones: Array.isArray(q.opciones) ? q.opciones : [],
      respuesta_correcta: q.respuesta_correcta,
      tiempo: tiempoPorPregunta,
    }));
    setPreguntas(prev => [...prev, ...imported]);
    toast({ title: `${imported.length} preguntas importadas` });
    setImportOpen(false);
  }

  function parsePastedQuestions(text: string) {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    const parsed: CompPregunta[] = [];
    blocks.forEach((block, idx) => {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 3) return;
      const pregunta = lines[0].replace(/^\d+[\.\)\-]\s*/, '');
      const opciones: string[] = [];
      let respuesta = 0;
      lines.slice(1).forEach((line, oi) => {
        const m = line.match(/^([a-fA-F])[\.\)\-]\s*(.+)/);
        if (m) {
          opciones.push(m[2]);
          if (line.includes('*') || line.includes('✓')) respuesta = oi;
        }
      });
      if (opciones.length >= 2) {
        parsed.push({ orden: preguntas.length + idx, pregunta, opciones, respuesta_correcta: respuesta, tiempo: tiempoPorPregunta });
      }
    });
    return parsed;
  }

  function handlePaste() {
    const parsed = parsePastedQuestions(pasteText);
    if (!parsed.length) { toast({ title: 'No se detectaron preguntas válidas', variant: 'destructive' }); return; }
    setPreguntas(prev => [...prev, ...parsed]);
    toast({ title: `${parsed.length} preguntas detectadas` });
    setPasteText('');
    setImportOpen(false);
  }

  async function createCompetencia() {
    if (!titulo.trim() || !preguntas.length || !user) {
      toast({ title: 'Título y al menos 1 pregunta requeridos', variant: 'destructive' }); return;
    }
    const pin = generatePin();
    const { data: comp, error } = await supabase.from('competencias').insert({
      titulo, pin, modo, tiempo_por_pregunta: tiempoPorPregunta, created_by: user.id,
    }).select().single();
    if (error || !comp) { toast({ title: 'Error al crear', variant: 'destructive' }); return; }

    const questionsToInsert = preguntas.map((q, i) => ({
      competencia_id: comp.id, orden: i, pregunta: q.pregunta,
      imagen_url: q.imagen_url || null, opciones: q.opciones,
      respuesta_correcta: q.respuesta_correcta, tiempo: q.tiempo,
    }));
    await supabase.from('competencia_preguntas').insert(questionsToInsert);

    toast({ title: `Competencia creada — PIN: ${pin}` });
    setCreateOpen(false);
    setTitulo(''); setPreguntas([]); setModo('controlado');
    loadCompetencias();
  }

  async function deleteComp(id: string) {
    if (!confirm('¿Eliminar esta competencia?')) return;
    await supabase.from('competencias').delete().eq('id', id);
    loadCompetencias();
  }

  function copyPin(pin: string) {
    navigator.clipboard.writeText(pin);
    toast({ title: `PIN ${pin} copiado` });
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Competencias en Vivo</h1>
        </div>
        <Button onClick={() => { setCreateOpen(true); setPreguntas([]); setTitulo(''); }} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {competencias.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`card-elevated ${c.estado === 'en_curso' ? 'border-l-4 border-[hsl(var(--neon-mint))]' : c.estado === 'finalizada' ? 'opacity-60' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-display font-bold">{c.titulo}</p>
                    <p className="text-xs text-muted-foreground">{c.modo === 'controlado' ? '🎮 Controlado' : '🏃 Libre'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.estado === 'lobby' ? 'bg-[hsl(var(--neon-orange))]/20 text-[hsl(var(--neon-orange))]' : c.estado === 'en_curso' ? 'bg-[hsl(var(--neon-mint))]/20 text-[hsl(var(--neon-mint))]' : 'bg-muted text-muted-foreground'}`}>
                    {c.estado === 'lobby' ? 'Esperando' : c.estado === 'en_curso' ? 'En vivo' : 'Finalizada'}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                  <span className="font-mono text-lg font-bold tracking-wider text-primary">{c.pin}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyPin(c.pin)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {c.estado !== 'finalizada' && (
                    <Button size="sm" className="flex-1 gap-1" onClick={() => navigate(`/admin/competencia/${c.id}`)}>
                      <Play className="w-3.5 h-3.5" /> {c.estado === 'lobby' ? 'Iniciar' : 'Continuar'}
                    </Button>
                  )}
                  {c.estado === 'finalizada' && (
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => navigate(`/admin/competencia/${c.id}`)}>
                      <Trophy className="w-3.5 h-3.5" /> Resultados
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteComp(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {competencias.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay competencias aún</p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Competencia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Competencia de Anatomía" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Modo</Label>
                <Select value={modo} onValueChange={setModo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controlado">🎮 Controlado por admin</SelectItem>
                    <SelectItem value="libre">🏃 A su propio ritmo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tiempo por pregunta (seg)</Label>
                <Input type="number" value={tiempoPorPregunta} onChange={e => setTiempoPorPregunta(Number(e.target.value))} min={5} max={120} />
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-sm">Preguntas ({preguntas.length})</p>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setImportOpen(true)}>
                  <Import className="w-3.5 h-3.5" /> Importar
                </Button>
              </div>
              {preguntas.map((q, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/30 rounded p-2 text-xs">
                  <span className="font-bold text-primary">{i + 1}.</span>
                  <span className="flex-1 truncate">{q.pregunta}</span>
                  <span className="text-muted-foreground">{q.opciones.length} opc</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreguntas(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={createCompetencia} className="w-full gradient-primary text-primary-foreground" disabled={!titulo.trim() || !preguntas.length}>
              Crear Competencia
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importar Preguntas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={importSource === 'quiz' ? 'default' : 'outline'} size="sm" onClick={() => setImportSource('quiz')}>Desde Sesión/Quiz</Button>
              <Button variant={importSource === 'paste' ? 'default' : 'outline'} size="sm" onClick={() => setImportSource('paste')}>Pegado Inteligente</Button>
            </div>
            {importSource === 'quiz' ? (
              <div className="space-y-3">
                <Select value={selectedSesion} onValueChange={setSelectedSesion}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sesión..." /></SelectTrigger>
                  <SelectContent>
                    {sesiones.map(s => <SelectItem key={s.id} value={s.id}>S{s.numero}: {s.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => selectedSesion && importFromSession(selectedSesion)} disabled={!selectedSesion} className="w-full">
                  Importar preguntas
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={8} placeholder={"1. ¿Cuál es...?\na) Opción A\nb) Opción B *\nc) Opción C\n\n2. ¿Qué es...?"} />
                <p className="text-[10px] text-muted-foreground">Marca la correcta con * o ✓. Separa preguntas con línea en blanco.</p>
                <Button onClick={handlePaste} disabled={!pasteText.trim()} className="w-full">Detectar preguntas</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
