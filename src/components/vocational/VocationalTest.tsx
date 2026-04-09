import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  questions,
  likertLabels,
  careerMatches,
  type AptitudeCategory,
} from "@/data/vocationalQuestions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  FlaskConical,
  Calculator,
  Atom,
  Scale,
  Landmark,
  BookOpen,
  Palette,
  Building,
  Film,
  Briefcase,
  Globe,
  Rocket,
  Monitor,
  BarChart3,
  Shield,
  HeartPulse,
  Microscope,
  Apple,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Trophy,
  Sparkles,
  Target,
} from "lucide-react";

/* ── Icon resolver ─────────────────────────────────────── */
const iconMap: Record<string, React.ElementType> = {
  "flask-conical": FlaskConical,
  calculator: Calculator,
  atom: Atom,
  scale: Scale,
  landmark: Landmark,
  "book-open": BookOpen,
  palette: Palette,
  building: Building,
  film: Film,
  briefcase: Briefcase,
  globe: Globe,
  rocket: Rocket,
  monitor: Monitor,
  "bar-chart-3": BarChart3,
  shield: Shield,
  "heart-pulse": HeartPulse,
  microscope: Microscope,
  apple: Apple,
};

/* ── Category accent colors (HSL design tokens) ───────── */
const categoryColors: Record<AptitudeCategory, string> = {
  "Ciencias Exactas": "hsl(var(--primary))",
  Humanidades: "hsl(var(--accent-foreground))",
  Artes: "hsl(330 70% 55%)",
  Liderazgo: "hsl(35 90% 55%)",
  Tecnología: "hsl(200 80% 50%)",
  "Ciencias de la Salud": "hsl(150 60% 45%)",
};

const categoryBg: Record<AptitudeCategory, string> = {
  "Ciencias Exactas": "bg-primary/10",
  Humanidades: "bg-accent/30",
  Artes: "bg-pink-500/10",
  Liderazgo: "bg-amber-500/10",
  Tecnología: "bg-sky-500/10",
  "Ciencias de la Salud": "bg-emerald-500/10",
};

/* ── Likert button styles by value ─────────────────────── */
const likertStyles = [
  "border-destructive/40 hover:bg-destructive/10 hover:border-destructive text-destructive",
  "border-orange-400/40 hover:bg-orange-400/10 hover:border-orange-400 text-orange-500",
  "border-muted-foreground/30 hover:bg-muted/50 hover:border-muted-foreground text-muted-foreground",
  "border-sky-400/40 hover:bg-sky-400/10 hover:border-sky-400 text-sky-500",
  "border-primary/40 hover:bg-primary/10 hover:border-primary text-primary",
];

const likertSelectedStyles = [
  "bg-destructive text-destructive-foreground border-destructive",
  "bg-orange-500 text-white border-orange-500",
  "bg-muted-foreground text-background border-muted-foreground",
  "bg-sky-500 text-white border-sky-500",
  "bg-primary text-primary-foreground border-primary",
];

export default function VocationalTest() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);

  const totalQuestions = questions.length;
  const progress = Math.round(
    (Object.keys(answers).length / totalQuestions) * 100
  );

  /* ── Scoring logic ─────────────────────────────────────── */
  const scores = useMemo(() => {
    const acc: Record<AptitudeCategory, { total: number; count: number }> = {
      "Ciencias Exactas": { total: 0, count: 0 },
      Humanidades: { total: 0, count: 0 },
      Artes: { total: 0, count: 0 },
      Liderazgo: { total: 0, count: 0 },
      Tecnología: { total: 0, count: 0 },
      "Ciencias de la Salud": { total: 0, count: 0 },
    };
    questions.forEach((q) => {
      acc[q.category].count += 1;
      if (answers[q.id] !== undefined) {
        acc[q.category].total += answers[q.id];
      }
    });
    return Object.entries(acc).map(([cat, { total, count }]) => ({
      category: cat as AptitudeCategory,
      score: total,
      maxScore: count * 5,
      pct: count > 0 ? Math.round((total / (count * 5)) * 100) : 0,
    }));
  }, [answers]);

  const topCategories = useMemo(
    () => [...scores].sort((a, b) => b.pct - a.pct).slice(0, 3),
    [scores]
  );

  /* ── Handlers ──────────────────────────────────────────── */
  const handleAnswer = (value: number) => {
    setAnswers((prev) => ({ ...prev, [questions[currentIndex].id]: value }));
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((i) => i + 1);
    else setFinished(true);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const reset = () => {
    setCurrentIndex(0);
    setAnswers({});
    setFinished(false);
  };

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ?.id];
  const allAnswered = Object.keys(answers).length === totalQuestions;

  /* ── Results view ──────────────────────────────────────── */
  if (finished) {
    const radarData = scores.map((s) => ({
      subject: s.category,
      value: s.pct,
      fullMark: 100,
    }));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Trophy className="w-4 h-4" />
            Resultados Completados
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Tu Perfil Vocacional
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Basado en tus respuestas, estas son tus áreas de mayor afinidad y
            las carreras que mejor se ajustan a tu perfil.
          </p>
        </div>

        {/* Radar Chart */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Mapa de Aptitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[320px] md:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Radar
                    name="Afinidad"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Afinidad"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Career Matches */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Carreras Recomendadas
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {topCategories.map((cat, idx) => {
              const careers = careerMatches[cat.category];
              const color = categoryColors[cat.category];
              const bg = categoryBg[cat.category];
              return (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                >
                  <Card className="border-border/60 h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${bg}`}
                          style={{ color }}
                        >
                          #{idx + 1} – {cat.category}
                        </span>
                        <span className="text-sm font-bold" style={{ color }}>
                          {cat.pct}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {careers.map((career) => {
                        const Icon = iconMap[career.icon] || Briefcase;
                        return (
                          <div
                            key={career.name}
                            className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40"
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}
                            >
                              <Icon className="w-4 h-4" style={{ color }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {career.name}
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {career.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Restart */}
        <div className="flex justify-center pt-2 pb-8">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Repetir Test
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ── Question view ─────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Pregunta {currentIndex + 1} de {totalQuestions}
          </span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      {/* Category pill */}
      <div className="flex justify-center">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryBg[currentQ.category]}`}
          style={{ color: categoryColors[currentQ.category] }}
        >
          {currentQ.category}
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-border/60">
            <CardContent className="p-6 md:p-8 space-y-6">
              <p className="text-lg md:text-xl font-semibold text-foreground text-center leading-relaxed">
                {currentQ.text}
              </p>

              {/* Likert scale */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {likertLabels.map((label, idx) => {
                  const value = idx + 1;
                  const selected = currentAnswer === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleAnswer(value)}
                      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-center ${
                        selected
                          ? likertSelectedStyles[idx]
                          : `bg-transparent ${likertStyles[idx]}`
                      }`}
                    >
                      <span className="text-lg font-bold">{value}</span>
                      <span className="text-[10px] leading-tight font-medium">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {currentIndex === totalQuestions - 1 ? (
          <Button
            onClick={() => setFinished(true)}
            disabled={!allAnswered}
            className="gap-1"
          >
            Ver Resultados
            <Trophy className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={currentAnswer === undefined}
            className="gap-1"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
