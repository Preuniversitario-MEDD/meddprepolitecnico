import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { allTests, testsByKey } from "@/data/psychometricTests";
import UniversalTestEngine from "./UniversalTestEngine";
import ResultsProfile from "./ResultsProfile";
import { Brain, UserCircle, Compass, GraduationCap, Heart, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  brain: Brain,
  "user-circle": UserCircle,
  compass: Compass,
  "graduation-cap": GraduationCap,
  heart: Heart,
};

type View = "hub" | "test" | "results";

export default function AssessmentHub() {
  const { user } = useAuth();
  const [completedTests, setCompletedTests] = useState<Record<string, Record<string, number>>>({});
  const [view, setView] = useState<View>("hub");
  const [activeTestKey, setActiveTestKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("psychometric_results")
      .select("test_key, scores")
      .eq("user_id", user.id);
    const map: Record<string, Record<string, number>> = {};
    data?.forEach((r: any) => {
      map[r.test_key] = r.scores as Record<string, number>;
    });
    setCompletedTests(map);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleComplete = async (scores: Record<string, number>, answers: Record<number, number>) => {
    if (!user?.id || !activeTestKey) return;
    const { error } = await supabase.from("psychometric_results").upsert(
      { user_id: user.id, test_key: activeTestKey, scores, answers },
      { onConflict: "user_id,test_key" }
    );
    if (error) {
      toast.error("Error al guardar resultados");
      return;
    }
    toast.success("¡Test completado!");
    setCompletedTests((prev) => ({ ...prev, [activeTestKey]: scores }));
    setView("results");
  };

  const openTest = (key: string) => {
    setActiveTestKey(key);
    if (completedTests[key]) {
      setView("results");
    } else {
      setView("test");
    }
  };

  if (view === "test" && activeTestKey) {
    const test = testsByKey[activeTestKey];
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => { setView("hub"); setActiveTestKey(null); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al Hub
        </Button>
        <UniversalTestEngine test={test} onComplete={handleComplete} />
      </div>
    );
  }

  if (view === "results" && activeTestKey) {
    const test = testsByKey[activeTestKey];
    const scores = completedTests[activeTestKey];
    if (!scores) {
      setView("hub");
      return null;
    }
    return (
      <div className="p-4 md:p-6">
        <ResultsProfile
          test={test}
          scores={scores}
          onBack={() => { setView("hub"); setActiveTestKey(null); }}
        />
        <div className="max-w-3xl mx-auto mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setView("test"); }}
            className="w-full"
          >
            Repetir Test
          </Button>
        </div>
      </div>
    );
  }

  // Hub view
  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Centro de Evaluación Psicométrica</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completa los 5 tests para obtener tu perfil integral de aptitudes, personalidad y bienestar.
        </p>
      </motion.div>

      {/* Progress summary */}
      <Card className="card-elevated neon-border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-sm">Progreso General</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Object.keys(completedTests).length} de {allTests.length} tests completados
            </p>
          </div>
          <div className="text-2xl font-bold text-primary">
            {Math.round((Object.keys(completedTests).length / allTests.length) * 100)}%
          </div>
        </CardContent>
      </Card>

      {/* Test cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allTests.map((test, i) => {
          const isCompleted = !!completedTests[test.key];
          const Icon = iconMap[test.icon] || Brain;
          return (
            <motion.div
              key={test.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`card-elevated cursor-pointer transition-all hover:shadow-lg ${
                  isCompleted ? "border-l-4 border-l-accent" : "border-l-4 border-l-primary/30"
                }`}
                onClick={() => openTest(test.key)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${test.color}`}>
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <Badge variant={isCompleted ? "default" : "secondary"} className="text-[10px]">
                      {isCompleted ? (
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completado</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pendiente</span>
                      )}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">{test.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.description}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {test.questions.length} preguntas · {test.categories.length} categorías
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
