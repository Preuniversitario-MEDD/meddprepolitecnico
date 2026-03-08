import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Pregunta {
  id: string; orden: number; pregunta: string; opciones: string[]; respuesta_correcta: number; tiempo: number;
}
interface Participante {
  id: string; user_id: string; nombre: string; puntaje: number; racha: number; mejor_racha: number;
}
interface Respuesta {
  id: string; pregunta_id: string; user_id: string; respuesta: number; correcta: boolean; tiempo_ms: number; puntaje: number;
}

interface Props {
  competenciaId: string;
  preguntas: Pregunta[];
  participantes: Participante[];
}

export default function CompetenciaStats({ competenciaId, preguntas, participantes }: Props) {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);

  useEffect(() => {
    supabase.from('competencia_respuestas').select('*').eq('competencia_id', competenciaId)
      .then(({ data }) => setRespuestas((data as unknown as Respuesta[]) || []));
  }, [competenciaId]);

  const sorted = [...participantes].sort((a, b) => b.puntaje - a.puntaje);

  // Per-question stats
  const questionStats = preguntas.map(q => {
    const qAnswers = respuestas.filter(r => r.pregunta_id === q.id);
    const correct = qAnswers.filter(r => r.correcta).length;
    const total = qAnswers.length;
    const avgTime = total > 0 ? Math.round(qAnswers.reduce((s, r) => s + r.tiempo_ms, 0) / total / 1000 * 10) / 10 : 0;
    const distribution = q.opciones.map((_, i) => qAnswers.filter(r => r.respuesta === i).length);
    return { ...q, correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0, avgTime, distribution };
  });

  // Per-student stats
  const studentStats = sorted.map(p => {
    const pAnswers = respuestas.filter(r => r.user_id === p.user_id);
    const correct = pAnswers.filter(r => r.correcta).length;
    const total = pAnswers.length;
    const avgTime = total > 0 ? Math.round(pAnswers.reduce((s, r) => s + r.tiempo_ms, 0) / total / 1000 * 10) / 10 : 0;
    return { ...p, correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0, avgTime };
  });

  return (
    <Tabs defaultValue="preguntas">
      <TabsList className="w-full">
        <TabsTrigger value="preguntas" className="flex-1">Por Pregunta</TabsTrigger>
        <TabsTrigger value="estudiantes" className="flex-1">Por Estudiante</TabsTrigger>
      </TabsList>

      <TabsContent value="preguntas" className="space-y-3 mt-4">
        {questionStats.map((q, i) => (
          <Card key={q.id} className="card-elevated">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold text-sm"><span className="text-primary mr-1">{i + 1}.</span>{q.pregunta}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.pct >= 70 ? 'bg-[hsl(var(--neon-mint))]/20 text-[hsl(var(--neon-mint))]' : q.pct >= 40 ? 'bg-[hsl(var(--neon-orange))]/20 text-[hsl(var(--neon-orange))]' : 'bg-destructive/20 text-destructive'}`}>
                  {q.pct}% correcto
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{q.correct}/{q.total} correctas</span>
                <span>•</span>
                <span>⏱ {q.avgTime}s promedio</span>
              </div>
              <div className="space-y-1">
                {q.opciones.map((opt, oi) => {
                  const count = q.distribution[oi];
                  const pct = q.total > 0 ? (count / q.total) * 100 : 0;
                  const isCorrect = oi === q.respuesta_correcta;
                  return (
                    <div key={oi} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 font-bold ${isCorrect ? 'text-[hsl(var(--neon-mint))]' : ''}`}>{String.fromCharCode(65 + oi)}</span>
                      <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
                        <div className={`h-full rounded ${isCorrect ? 'bg-[hsl(var(--neon-mint))]/60' : 'bg-muted-foreground/20'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="estudiantes" className="space-y-2 mt-4">
        {studentStats.map((s, i) => (
          <Card key={s.id} className="card-elevated">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.nombre}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{s.correct}/{s.total} correctas ({s.pct}%)</span>
                    <span>⏱ {s.avgTime}s</span>
                    <span>🔥 {s.mejor_racha}</span>
                  </div>
                </div>
                <span className="font-bold text-primary">{s.puntaje} pts</span>
              </div>
              <Progress value={s.pct} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
