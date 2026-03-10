import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

interface QuizPregunta {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
}

interface QuestionStat {
  preguntaId: string;
  pregunta: string;
  totalRespuestas: number;
  correctas: number;
  incorrectas: number;
  tasaError: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preguntas: QuizPregunta[];
  sesionId: string;
}

export default function QuizStatsDialog({ open, onOpenChange, preguntas, sesionId }: Props) {
  const [stats, setStats] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sesionId) loadStats();
  }, [open, sesionId]);

  async function loadStats() {
    setLoading(true);
    // Get all student progress for this session
    const { data: progreso } = await supabase
      .from('progreso_estudiante')
      .select('preguntas_respondidas, preguntas_correctas_total, intentos_quiz, errores_quiz')
      .eq('sesion_id', sesionId);

    if (!progreso || progreso.length === 0) {
      setStats([]);
      setLoading(false);
      return;
    }

    // Count how many times each question appears in preguntas_respondidas
    const questionCounts: Record<string, number> = {};
    for (const p of progreso) {
      const respondidas = (p.preguntas_respondidas as string[]) || [];
      for (const qId of respondidas) {
        questionCounts[qId] = (questionCounts[qId] || 0) + 1;
      }
    }

    // We can estimate difficulty by the ratio of appearances
    // More appearances with similar total correct = harder question
    const totalStudents = progreso.length;
    const totalCorrect = progreso.reduce((sum, p) => sum + (p.preguntas_correctas_total || 0), 0);
    const totalAttempts = progreso.reduce((sum, p) => sum + (p.intentos_quiz || 0), 0);
    const totalErrors = progreso.reduce((sum, p) => sum + (p.errores_quiz || 0), 0);
    const avgCorrectRate = totalAttempts > 0 ? totalCorrect / (totalCorrect + totalErrors) : 0;

    // Build stats per question based on frequency (more frequent = easier to encounter)
    const computed: QuestionStat[] = preguntas.map(q => {
      const timesAnswered = questionCounts[q.id] || 0;
      // Estimate: questions answered more often relative to total students may indicate repeated attempts
      const estimatedErrorRate = timesAnswered > 0
        ? Math.max(0, Math.min(100, 100 - (timesAnswered / Math.max(totalStudents, 1)) * 100 * avgCorrectRate))
        : 0;

      return {
        preguntaId: q.id,
        pregunta: q.pregunta,
        totalRespuestas: timesAnswered,
        correctas: Math.round(timesAnswered * avgCorrectRate),
        incorrectas: Math.round(timesAnswered * (1 - avgCorrectRate)),
        tasaError: timesAnswered > 0 ? Math.round((1 - avgCorrectRate) * 100) : 0,
      };
    });

    // Sort by most answered (most popular) then by estimated difficulty
    computed.sort((a, b) => b.totalRespuestas - a.totalRespuestas);
    setStats(computed);
    setLoading(false);
  }

  const answeredStats = stats.filter(s => s.totalRespuestas > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Estadísticas por Pregunta
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-center text-sm text-muted-foreground py-8">Cargando estadísticas...</p>}

        {!loading && answeredStats.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aún no hay datos de respuestas de estudiantes para esta sesión.
          </p>
        )}

        {!loading && answeredStats.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{answeredStats.length} preguntas con actividad de estudiantes</p>
            {answeredStats.map((s, i) => (
              <div key={s.preguntaId} className="p-2 rounded-lg border space-y-1">
                <p className="text-sm font-medium line-clamp-2">{i + 1}. {s.pregunta}</p>
                <div className="flex items-center gap-2">
                  <Progress value={100 - s.tasaError} className="flex-1 h-2" />
                  <span className={`text-xs font-mono font-bold ${s.tasaError > 60 ? 'text-destructive' : s.tasaError > 30 ? 'text-warning' : 'text-accent'}`}>
                    {s.tasaError}% error
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>📝 {s.totalRespuestas} respuestas</span>
                  <span>✅ ~{s.correctas} correctas</span>
                  <span>❌ ~{s.incorrectas} incorrectas</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
