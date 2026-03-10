import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, CheckCircle, AlertTriangle, XCircle, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preguntas: QuizPregunta[];
  onQuestionsUpdated: () => void;
}

const ratingColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  excelente: { bg: 'bg-accent/20', text: 'text-accent', icon: <CheckCircle className="w-3 h-3" /> },
  buena: { bg: 'bg-primary/20', text: 'text-primary', icon: <CheckCircle className="w-3 h-3" /> },
  mejorable: { bg: 'bg-warning/20', text: 'text-warning', icon: <AlertTriangle className="w-3 h-3" /> },
  problematica: { bg: 'bg-destructive/20', text: 'text-destructive', icon: <XCircle className="w-3 h-3" /> },
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
  const [fixing, setFixing] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  async function runReview() {
    if (preguntas.length === 0) return;
    setLoading(true);
    setReviews([]);

    try {
      // Send in batches of 20 max
      const batch = preguntas.slice(0, 30);
      const { data, error } = await supabase.functions.invoke('review-quiz-questions', {
        body: { questions: batch.map(q => ({ pregunta: q.pregunta, opciones: q.opciones, respuesta_correcta: q.respuesta_correcta })) },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Error de IA', description: data.error, variant: 'destructive' }); setLoading(false); return; }
      setReviews(data?.reviews || []);
    } catch (err: any) {
      toast({ title: 'Error al revisar', description: err.message || 'Intenta de nuevo', variant: 'destructive' });
    }
    setLoading(false);
  }

  async function fixQuestion(reviewIndex: number) {
    const review = reviews[reviewIndex];
    if (review.respuesta_correcta_sugerida === null || review.respuesta_correcta_sugerida === undefined) return;
    const pregunta = preguntas[review.index];
    if (!pregunta) return;

    setFixing(prev => new Set(prev).add(reviewIndex));
    const { error } = await supabase.from('quiz_preguntas').update({
      respuesta_correcta: review.respuesta_correcta_sugerida,
    }).eq('id', pregunta.id);

    if (error) {
      toast({ title: 'Error al corregir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Pregunta ${review.index + 1} corregida` });
      // Update the review to reflect the fix
      setReviews(prev => prev.map((r, i) => i === reviewIndex ? { ...r, correccion: 'buena', respuesta_correcta_sugerida: null } : r));
      onQuestionsUpdated();
    }
    setFixing(prev => { const n = new Set(prev); n.delete(reviewIndex); return n; });
  }

  async function fixAllProblematic() {
    const problematic = reviews.filter(r => r.correccion === 'problematica' && r.respuesta_correcta_sugerida !== null && r.respuesta_correcta_sugerida !== undefined);
    if (problematic.length === 0) return;

    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      if (r.correccion === 'problematica' && r.respuesta_correcta_sugerida !== null) {
        await fixQuestion(i);
      }
    }
    toast({ title: `${problematic.length} preguntas corregidas` });
  }

  const problematicCount = reviews.filter(r => r.correccion === 'problematica' && r.respuesta_correcta_sugerida !== null).length;
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
                La IA evaluará {Math.min(preguntas.length, 30)} preguntas en: claridad, corrección de respuesta, calidad de distractores y nivel.
              </p>
              <Button onClick={runReview} className="gradient-primary text-primary-foreground gap-2">
                <ShieldCheck className="w-4 h-4" /> Iniciar Revisión ({Math.min(preguntas.length, 30)} preguntas)
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
                  <p className="text-sm font-medium">Calidad general: <span className={overallScore >= 80 ? 'text-accent' : overallScore >= 50 ? 'text-warning' : 'text-destructive'}>{overallScore}%</span></p>
                  <p className="text-[10px] text-muted-foreground">{reviews.length} preguntas evaluadas</p>
                </div>
                {problematicCount > 0 && (
                  <Button variant="outline" size="sm" onClick={fixAllProblematic} className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <Wrench className="w-3 h-3" /> Corregir {problematicCount} problemáticas
                  </Button>
                )}
              </div>

              {/* Individual reviews */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {reviews.map((r, i) => {
                  const pregunta = preguntas[r.index];
                  if (!pregunta) return null;
                  const hasIssue = r.correccion === 'problematica' || r.claridad === 'problematica';

                  return (
                    <div key={i} className={`p-3 rounded-lg border ${hasIssue ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium line-clamp-2 flex-1">{r.index + 1}. {pregunta.pregunta}</p>
                        {r.respuesta_correcta_sugerida !== null && r.respuesta_correcta_sugerida !== undefined && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fixQuestion(i)}
                            disabled={fixing.has(i)}
                            className="shrink-0 gap-1 text-[10px] h-6 border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <Wrench className="w-3 h-3" />
                            {fixing.has(i) ? '...' : `Corregir → ${String.fromCharCode(65 + r.respuesta_correcta_sugerida)}`}
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
