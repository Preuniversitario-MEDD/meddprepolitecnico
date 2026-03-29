import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Eye, Clock, Zap, BookOpen, AlertTriangle, TrendingUp, ArrowLeft } from 'lucide-react';

interface ExamConfig {
  tipo: string;
  label: string;
  sessions: number[];
  puntaje_aprobacion: number;
}

interface ExamResultRow {
  id: string;
  user_id: string;
  tipo: string;
  puntaje: number;
  aprobado: boolean;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  respuestas: any[];
  profile?: { nombre: string; apellidos: string };
}

interface TopicAnalysis {
  sesionNumero: number;
  sesionTitulo: string;
  total: number;
  correctas: number;
  porcentaje: number;
  estado: 'dominado' | 'en_proceso' | 'requiere_retroalimentacion';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  examTipo: string | null;
  configs: ExamConfig[];
}

export default function ExamResultsDialog({ open, onOpenChange, examTipo, configs }: Props) {
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResultRow | null>(null);
  const [questionDetails, setQuestionDetails] = useState<any[]>([]);
  const [topicAnalysis, setTopicAnalysis] = useState<TopicAnalysis[]>([]);
  const [sesionesMap, setSesionesMap] = useState<Record<string, { numero: number; titulo: string }>>({});

  useEffect(() => {
    if (open && examTipo) loadResults();
    if (!open) { setSelectedResult(null); setQuestionDetails([]); }
  }, [open, examTipo]);

  async function loadResults() {
    setLoading(true);
    const cfg = configs.find(c => c.tipo === examTipo);
    
    const [{ data: exams }, { data: sesiones }] = await Promise.all([
      supabase.from('examenes').select('*').eq('tipo', examTipo!).order('fecha', { ascending: false }),
      supabase.from('sesiones').select('id, numero, titulo').order('numero'),
    ]);

    const sesMap: Record<string, { numero: number; titulo: string }> = {};
    (sesiones || []).forEach((s: any) => { sesMap[s.id] = { numero: s.numero, titulo: s.titulo }; });
    setSesionesMap(sesMap);

    if (exams && exams.length > 0) {
      const userIds = [...new Set(exams.map((e: any) => e.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, nombre, apellidos').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setResults(exams.map((e: any) => ({
        ...e,
        respuestas: Array.isArray(e.respuestas) ? e.respuestas : [],
        profile: profileMap.get(e.user_id),
      })));
    } else {
      setResults([]);
    }
    setLoading(false);
  }

  async function viewExamDetail(result: ExamResultRow) {
    setSelectedResult(result);
    
    if (result.respuestas && result.respuestas.length > 0) {
      const questionIds = result.respuestas.map((r: any) => r.questionId);
      const { data: questions } = await supabase.from('quiz_preguntas')
        .select('id, pregunta, opciones, respuesta_correcta, sesion_id, imagen_url')
        .in('id', questionIds);

      if (questions) {
        const qMap = new Map(questions.map(q => [q.id, q]));
        const details = result.respuestas.map((r: any) => {
          const q = qMap.get(r.questionId);
          return { ...r, question: q || null };
        });
        setQuestionDetails(details);

        // Topic analysis
        const topicMap = new Map<string, { total: number; correctas: number }>();
        details.forEach((d: any) => {
          if (d.question?.sesion_id) {
            const sid = d.question.sesion_id;
            const curr = topicMap.get(sid) || { total: 0, correctas: 0 };
            curr.total++;
            if (d.correct) curr.correctas++;
            topicMap.set(sid, curr);
          }
        });

        const analysis: TopicAnalysis[] = Array.from(topicMap.entries()).map(([sid, data]) => {
          const ses = sesionesMap[sid] || { numero: 0, titulo: 'Desconocida' };
          const pct = data.total > 0 ? Math.round((data.correctas / data.total) * 100) : 0;
          return {
            sesionNumero: ses.numero,
            sesionTitulo: ses.titulo,
            total: data.total,
            correctas: data.correctas,
            porcentaje: pct,
            estado: pct >= 80 ? 'dominado' : pct >= 50 ? 'en_proceso' : 'requiere_retroalimentacion',
          };
        }).sort((a, b) => a.sesionNumero - b.sesionNumero);
        setTopicAnalysis(analysis);
      }
    }
  }

  const cfg = configs.find(c => c.tipo === examTipo);
  const isFinal = examTipo === 'exam_final';
  const maxScore = isFinal ? 1000 : 100;

  function calcAvgSpeed(r: ExamResultRow) {
    if (!r.hora_inicio || !r.hora_fin) return null;
    const start = new Date(r.hora_inicio).getTime();
    const end = new Date(r.hora_fin).getTime();
    const totalSec = (end - start) / 1000;
    const answered = r.respuestas?.length || 1;
    return Math.round(totalSec / answered);
  }

  function formatDuration(r: ExamResultRow) {
    if (!r.hora_inicio || !r.hora_fin) return '—';
    const start = new Date(r.hora_inicio).getTime();
    const end = new Date(r.hora_fin).getTime();
    const mins = Math.floor((end - start) / 60000);
    const secs = Math.floor(((end - start) % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  // Detail view
  if (selectedResult) {
    const avgSpeed = calcAvgSpeed(selectedResult);
    const correctCount = selectedResult.respuestas?.filter((r: any) => r.correct).length || 0;
    const totalQ = selectedResult.respuestas?.length || 0;
    const dominados = topicAnalysis.filter(t => t.estado === 'dominado');
    const enProceso = topicAnalysis.filter(t => t.estado === 'en_proceso');
    const retroalimentacion = topicAnalysis.filter(t => t.estado === 'requiere_retroalimentacion');

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedResult(null); setQuestionDetails([]); }} className="mr-1 h-7 w-7 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Detalle: {selectedResult.profile ? `${selectedResult.profile.nombre} ${selectedResult.profile.apellidos}` : 'Estudiante'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-2">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Puntaje</p>
                  <p className={`text-xl font-bold ${selectedResult.aprobado ? 'text-accent' : 'text-destructive'}`}>{selectedResult.puntaje}/{maxScore}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Duración</p>
                  <p className="text-xl font-bold text-foreground">{formatDuration(selectedResult)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Vel. promedio</p>
                  <p className="text-xl font-bold text-foreground">{avgSpeed ? `${avgSpeed}s` : '—'}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Precisión</p>
                  <p className="text-xl font-bold text-foreground">{totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0}%</p>
                </CardContent></Card>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Hora inicio</p>
                    <p className="text-sm font-medium">{selectedResult.hora_inicio ? new Date(selectedResult.hora_inicio).toLocaleTimeString('es-EC') : '—'}</p>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Hora fin</p>
                    <p className="text-sm font-medium">{selectedResult.hora_fin ? new Date(selectedResult.hora_fin).toLocaleTimeString('es-EC') : '—'}</p>
                  </div>
                </CardContent></Card>
              </div>

              {/* Topic analysis */}
              {topicAnalysis.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Análisis por Tema</h4>
                  
                  {dominados.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-accent flex items-center gap-1 mb-1"><CheckCircle className="w-3 h-3" /> Temas Dominados</p>
                      <div className="flex flex-wrap gap-1">
                        {dominados.map(t => (
                          <Badge key={t.sesionNumero} variant="outline" className="text-[10px] border-accent text-accent">
                            S{t.sesionNumero}: {t.sesionTitulo} ({t.porcentaje}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {enProceso.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[hsl(var(--neon-orange))] flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3" /> Temas en Proceso</p>
                      <div className="flex flex-wrap gap-1">
                        {enProceso.map(t => (
                          <Badge key={t.sesionNumero} variant="outline" className="text-[10px] border-[hsl(var(--neon-orange))] text-[hsl(var(--neon-orange))]">
                            S{t.sesionNumero}: {t.sesionTitulo} ({t.porcentaje}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {retroalimentacion.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> Requieren Retroalimentación</p>
                      <div className="flex flex-wrap gap-1">
                        {retroalimentacion.map(t => (
                          <Badge key={t.sesionNumero} variant="outline" className="text-[10px] border-destructive text-destructive">
                            S{t.sesionNumero}: {t.sesionTitulo} ({t.porcentaje}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Exam questions detail */}
              <div className="space-y-2">
                <h4 className="font-display font-bold text-sm flex items-center gap-2"><Eye className="w-4 h-4" /> Preguntas del Examen ({totalQ})</h4>
                {questionDetails.map((d: any, idx: number) => {
                  const q = d.question;
                  if (!q) return null;
                  const opciones = (q.opciones as string[]) || [];
                  const sesInfo = sesionesMap[q.sesion_id];
                  return (
                    <Card key={idx} className={`border-l-4 ${d.correct ? 'border-accent' : 'border-destructive'}`}>
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${d.correct ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-foreground">{q.pregunta}</p>
                            {sesInfo && <p className="text-[10px] text-muted-foreground">S{sesInfo.numero}: {sesInfo.titulo}</p>}
                          </div>
                          {d.correct ? <CheckCircle className="w-4 h-4 text-accent shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                        </div>
                        {q.imagen_url && <img src={q.imagen_url} alt="" className="rounded max-h-24" />}
                        <div className="space-y-0.5">
                          {opciones.map((op: string, i: number) => {
                            const isCorrect = i === q.respuesta_correcta;
                            const wasSelected = d.respuesta !== undefined ? d.respuesta === i : false;
                            // The respuestas array stores {questionId, correct, dificultad} but not the selected index
                            // We need to infer: if correct=true, selected=respuesta_correcta; if false, we don't know which was selected
                            let bg = '';
                            if (isCorrect) bg = 'bg-accent/10 border-accent';
                            return (
                              <div key={i} className={`p-1.5 rounded border text-[11px] flex items-center gap-1.5 ${bg || 'border-border'}`}>
                                {isCorrect && <CheckCircle className="w-3 h-3 text-accent shrink-0" />}
                                {!isCorrect && <span className="w-3 shrink-0" />}
                                <span><span className="font-medium mr-1">{String.fromCharCode(65 + i)}.</span>{op}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // List view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resultados: {cfg?.label}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Vel/preg</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(r => {
                const avgSpeed = calcAvgSpeed(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.profile ? `${r.profile.nombre} ${r.profile.apellidos}` : r.user_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-bold">{r.puntaje}/{maxScore}</TableCell>
                    <TableCell>
                      <Badge variant={r.aprobado ? 'default' : 'destructive'} className="text-[10px]">{r.aprobado ? 'Aprobado' : 'Reprobado'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(r.fecha).toLocaleDateString('es-EC')}</TableCell>
                    <TableCell className="text-xs">{r.hora_inicio ? new Date(r.hora_inicio).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                    <TableCell className="text-xs">{r.hora_fin ? new Date(r.hora_fin).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                    <TableCell className="text-xs">{avgSpeed ? `${avgSpeed}s` : '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => viewExamDetail(r)} className="h-7 text-xs gap-1">
                        <Eye className="w-3 h-3" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {results.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados aún</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
