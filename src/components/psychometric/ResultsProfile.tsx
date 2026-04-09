import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import type { PsychometricTest } from "@/data/psychometricTests";
import { ArrowLeft, Trophy } from "lucide-react";

interface Props {
  test: PsychometricTest;
  scores: Record<string, number>;
  onBack: () => void;
}

export default function ResultsProfile({ test, scores, onBack }: Props) {
  const chartData = test.categories.map((cat) => ({
    category: cat.label,
    value: scores[cat.key] || 0,
    fill: cat.color,
  }));

  // Top 3 categories sorted by score
  const topCategories = [...chartData].sort((a, b) => b.value - a.value).slice(0, 3);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-display font-bold">{test.title}</h2>
          <p className="text-sm text-muted-foreground">Tu perfil de resultados</p>
        </div>
      </div>

      {/* Chart */}
      <Card className="card-elevated">
        <CardContent className="p-4 md:p-6">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {test.chartType === "radar" ? (
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Radar
                    name="Puntaje"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              ) : (
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [`${value}%`, "Puntaje"]}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <div>
        <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Fortalezas Principales
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {topCategories.map((item, i) => {
            const cat = test.categories.find((c) => c.label === item.category)!;
            return (
              <Card key={cat.key} className={`card-elevated border-l-4 ${i === 0 ? "border-primary" : "border-border"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    <span className="text-lg font-bold text-primary">{item.value}%</span>
                  </div>
                  <p className="font-display font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* All Scores */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Desglose Completo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {test.categories.map((cat) => {
            const score = scores[cat.key] || 0;
            return (
              <div key={cat.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{cat.label}</span>
                  <span className="text-muted-foreground">{score}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${score}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
