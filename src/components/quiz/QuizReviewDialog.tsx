import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, CheckCircle, AlertTriangle, XCircle, Wrench, RefreshCw } from 'lucide-react';

interface QuizPregunta {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  imagen_url: string | null;
  grupo: number;
  sesion_id: string;
}

interface ReviewResult {
  index: number;
  claridad: string;
  correccion: string;
  distractores: string;
  nivel: string;
  comentario: string;
  correccion_sugerida: string | null;
  respuesta_correcta_sugerida: number | null;
  pregunta_mejorada: string | null;
  opciones_mejoradas: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preguntas: QuizPregunta[];
  onQuestionsUpdated: () => void;
}

const ratingColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  excelente: { bg: 'bg-[hsl(var(--neon-mint))]/20', text: 'text-[hsl(var(--neon-mint))]', icon: <CheckCircle className="w-3 h-3" /> },
  buena: { bg: 'bg-[hsl(var(--neon-blue))]/20', text: 'text-[hsl(var(--neon-blue))]', icon: <CheckCircle className="w-3 h-3" /> },
  mejorable: { bg: 'bg-[hsl(var(--neon-orange))]/20', text: 'text-[hsl(var(--neon-orange))]', icon: <AlertTriangle className="w-3 h-3" /> },
  problematica: { bg: 'bg-[hsl(var(--neon-pink))]/20', text: 'text-[hsl(var(--neon-pink))]', icon: <XCircle className="w-3 h-3" /> },
};

function RatingBadge({ rating }: { rating: string }) {
  const style = ratingColors[rating] || ratingColors.mejorable;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
      {style.icon} {rating}
    </span>
  );
}

export default function QuizReviewDialog({ open, onOpenChange, preguntas, onQuestionsUpdated }: Props) {
  const [reviews, setReviews] = useState<ReviewResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [fixing, setFixing] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const BATCH_SIZE = 25;

  async function runReview() {
    if (preguntas.length === 0) return;
    setLoading(true);
    setReviews([]);

    try {
      const allReviews: ReviewResult[] = [];
      const totalBatches = Math.ceil(preguntas.length / BATCH_SIZE);

      for (let b = 0; b < totalBatches; b++) {
        const start = b * BATCH_SIZE;
        const batch = preguntas.slice(start, start + BATCH_SIZE);
        setProgress(`Lote ${b + 1}/${totalBatches} (${start + 1}-${start + batch.length} de ${preguntas.length})`);

        const { data, error } = await supabase.functions.invoke('review-quiz-questions', {
          body: { questions: batch.map(q => ({ pregunta: q.pregunta, opciones: q.opciones, respuesta_correcta: q.respuesta_correcta })) },
        });
        if (error) throw error;
        if (data?.error) { toast({ title: 'Error de IA', description: data.error, variant: 'destructive' }); setLoading(false); setProgress(''); return; }

        const batchReviews = (data?.reviews || []).map((r: ReviewResult) => ({
          ...r,
          index: r.index + start, // offset index to match global position
        }));
        allReviews.push(...batchReviews);
        setReviews([...allReviews]);
      }

      setReviews(allReviews);
    } catch (err: any) {
      toast({ title: 'Error al revisar', description: err.message || 'Intenta de nuevo', variant: 'destructive' });
    }
    setLoading(false);
    setProgress('');
  }

  async function fixQuestion(reviewIndex: number) {
    const review = reviews[reviewIndex];
    if (review.respuesta_correcta_sugerida === null && !review.pregunta_mejorada) return;
    const pregunta = preguntas[review.index];
    if (!pregunta) return;

    setFixing(prev => new Set(prev).add(reviewIndex));

    const updatePayload: any = {};
    if (review.pregunta_mejorada) {
      updatePayload.pregunta = review.pregunta_mejorada;
    }
    if (review.opciones_mejoradas && review.opciones_mejoradas.length >= 2) {
      updatePayload.opciones = review.opciones_mejoradas;
    }
    if (review.respuesta_correcta_sugerida !== null && review.respuesta_correcta_sugerida !== undefined) {
      updatePayload.respuesta_correcta = review.respuesta_correcta_sugerida;
    }

    const { error } = await supabase.from('quiz_preguntas').update(updatePayload).eq('id', pregunta.id);

    if (error) {
      toast({ title: 'Error al corregir', description: error.message, variant: 'destructive' });
    } else {
      const label = review.pregunta_mejorada ? 'mejorada' : 'corregida';
      toast({ title: `Pregunta ${review.index + 1} ${label}` });
      setReviews(prev => prev.map((r, i) => i === reviewIndex ? {
        ...r,
        correccion: review.pregunta_mejorada ? 'buena' : (r.respuesta_correcta_sugerida !== null ? 'buena' : r.correccion),
        claridad: review.pregunta_mejorada ? 'buena' : r.claridad,
        distractores: review.opciones_mejoradas ? 'buena' : r.distractores,
        respuesta_correcta_sugerida: null,
        pregunta_mejorada: null,
        opciones_mejoradas: null,
      } : r));
      onQuestionsUpdated();
    }
    setFixing(prev => { const n = new Set(prev); n.delete(reviewIndex); return n; });
  }

  async function fixAllProblematic() {
    const fixable = reviews.filter(r =>
      (r.correccion === 'problematica' && r.respuesta_correcta_sugerida !== null) ||
      r.pregunta_mejorada !== null
    );
    if (fixable.length === 0) return;

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      if ((r.correccion === 'problematica' && r.respuesta_correcta_sugerida !== null) || r.pregunta_mejorada) {
        await fixQuestion(i);
      }
    }
    toast({ title: `${fixable.length} preguntas corregidas/mejoradas` });
  }

  const hasFixableAnswer = (r: ReviewResult) => r.correccion === 'problematica' && r.respuesta_correcta_sugerida !== null;
  const hasImprovedVersion = (r: ReviewResult) => r.pregunta_mejorada !== null;
  const fixableCount = reviews.filter(r => hasFixableAnswer(r) || hasImprovedVersion(r)).length;

  const overallScore = reviews.length > 0
    ? Math.round((reviews.filter(r => r.correccion !== 'problematica' && r.claridad !== 'problematica').length / reviews.length) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Revisión de Calidad con IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {reviews.length === 0 && !loading && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                La IA evaluará {preguntas.length} preguntas y sugerirá mejoras cuando detecte problemas.
              </p>
              <Button onClick={runReview} className="gap-2 bg-gradient-to-r from-[hsl(var(--neon-violet))] via-[hsl(var(--neon-fuchsia))] to-[hsl(var(--neon-pink))] text-white hover:opacity-90 shadow-[0_0_12px_hsl(var(--neon-violet)/0.4)]">
                <ShieldCheck className="w-4 h-4" /> Iniciar Revisión ({preguntas.length} preguntas)
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Analizando preguntas con IA...</p>
            </div>
          )}

          {reviews.length > 0 && (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div>
                  <p className="text-sm font-medium">Calidad general: <span className={overallScore >= 80 ? 'text-[hsl(var(--neon-mint))]' : overallScore >= 50 ? 'text-[hsl(var(--neon-orange))]' : 'text-[hsl(var(--neon-pink))]'}>{overallScore}%</span></p>
                  <p className="text-[10px] text-muted-foreground">{reviews.length} preguntas evaluadas</p>
                </div>
                {fixableCount > 0 && (
                  <Button size="sm" onClick={fixAllProblematic} className="gap-1 bg-[hsl(var(--neon-pink))] text-white hover:opacity-90 shadow-[0_0_10px_hsl(var(--neon-pink)/0.4)]">
                    <Wrench className="w-3 h-3" /> Corregir {fixableCount}
                  </Button>
                )}
              </div>

              {/* Individual reviews */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {reviews.map((r, i) => {
                  const pregunta = preguntas[r.index];
                  if (!pregunta) return null;
                  const hasIssue = r.correccion === 'problematica' || r.claridad === 'problematica';
                  const canFix = hasFixableAnswer(r) || hasImprovedVersion(r);

                  return (
                    <div key={i} className={`p-3 rounded-lg border ${hasIssue ? 'border-[hsl(var(--neon-pink))]/40 bg-[hsl(var(--neon-pink))]/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium line-clamp-2 flex-1">{r.index + 1}. {pregunta.pregunta}</p>
                        {canFix && (
                          <Button
                            size="sm"
                            onClick={() => fixQuestion(i)}
                            disabled={fixing.has(i)}
                            className="shrink-0 gap-1 text-[10px] h-6 bg-[hsl(var(--neon-orange))] text-white hover:opacity-90 shadow-[0_0_8px_hsl(var(--neon-orange)/0.3)]"
                          >
                            {hasImprovedVersion(r) ? <RefreshCw className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                            {fixing.has(i) ? '...' : hasImprovedVersion(r) ? 'Aplicar mejora' : `Corregir → ${String.fromCharCode(65 + (r.respuesta_correcta_sugerida ?? 0))}`}
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">Claridad:</span><RatingBadge rating={r.claridad} />
                        <span className="text-[10px] text-muted-foreground">Corrección:</span><RatingBadge rating={r.correccion} />
                        <span className="text-[10px] text-muted-foreground">Distractores:</span><RatingBadge rating={r.distractores} />
                        <span className="text-[10px] text-muted-foreground">Nivel:</span><RatingBadge rating={r.nivel} />
                      </div>
                      {r.comentario && <p className="text-[11px] text-muted-foreground mt-1">{r.comentario}</p>}

                      {/* Show improved version preview */}
                      {r.pregunta_mejorada && (
                        <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                          <p className="text-[10px] font-semibold text-primary mb-1">💡 Versión mejorada sugerida:</p>
                          <p className="text-[11px] font-medium">{r.pregunta_mejorada}</p>
                          {r.opciones_mejoradas && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.opciones_mejoradas.map((o, j) => (
                                <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${j === r.respuesta_correcta_sugerida ? 'bg-accent/20 text-accent font-bold' : 'bg-muted text-muted-foreground'}`}>
                                  {String.fromCharCode(65 + j)}. {o}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" onClick={() => { setReviews([]); }} className="w-full">
                Volver a revisar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
