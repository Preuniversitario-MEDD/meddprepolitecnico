import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PsychometricTest } from "@/data/psychometricTests";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  test: PsychometricTest;
  onComplete: (scores: Record<string, number>, answers: Record<number, number>) => void;
}

export default function UniversalTestEngine({ test, onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const q = test.questions[current];
  const total = test.questions.length;
  const pct = Math.round(((current + (answers[q.id] !== undefined ? 1 : 0)) / total) * 100);

  const allAnswered = useMemo(
    () => test.questions.every((q) => answers[q.id] !== undefined),
    [answers, test.questions]
  );

  const handleAnswer = useCallback(
    (value: number) => {
      setAnswers((prev) => ({ ...prev, [q.id]: value }));
    },
    [q.id]
  );

  const handleFinish = useCallback(() => {
    // Calculate percentage scores per category
    const catTotals: Record<string, { sum: number; count: number }> = {};
    test.categories.forEach((c) => {
      catTotals[c.key] = { sum: 0, count: 0 };
    });
    test.questions.forEach((question) => {
      const val = answers[question.id];
      if (val !== undefined && catTotals[question.category]) {
        catTotals[question.category].sum += val;
        catTotals[question.category].count += 1;
      }
    });
    const scores: Record<string, number> = {};
    Object.entries(catTotals).forEach(([key, { sum, count }]) => {
      scores[key] = count > 0 ? Math.round((sum / (count * 5)) * 100) : 0;
    });
    onComplete(scores, answers);
  }, [answers, test, onComplete]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-display font-bold">{test.title}</h2>
        <p className="text-sm text-muted-foreground">{test.description}</p>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Pregunta {current + 1} de {total}</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="card-elevated">
            <CardContent className="p-6 space-y-6">
              <p className="text-base font-medium leading-relaxed">{q.text}</p>

              {/* Likert Scale */}
              <div className="grid grid-cols-5 gap-2">
                {test.scaleLabels.map((label, i) => {
                  const value = i + 1;
                  const isSelected = answers[q.id] === value;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <span className={`text-lg font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                        {value}
                      </span>
                      <span className="text-[9px] leading-tight text-muted-foreground">{label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>

        {current < total - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrent((c) => c + 1)}
            disabled={answers[q.id] === undefined}
          >
            Siguiente <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleFinish}
            disabled={!allAnswered}
            className="gradient-primary text-primary-foreground"
          >
            Ver Resultados
          </Button>
        )}
      </div>

      {/* Quick nav dots */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {test.questions.map((question, i) => (
          <button
            key={question.id}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === current
                ? "bg-primary scale-125"
                : answers[question.id] !== undefined
                ? "bg-primary/40"
                : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
