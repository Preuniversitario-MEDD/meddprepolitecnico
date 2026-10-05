import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Eye, EyeOff, GraduationCap, Target, History, Brain } from "lucide-react";

const List = ({ items }: { items?: string[] }) => (
  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">{(items || []).map((t, i) => <li key={i}>{t}</li>)}</ul>
);

export default function InformeIntegral({ a, mostrarHistorico = true }: { a: any; mostrarHistorico?: boolean }) {
  if (!a) return null;
  const radar = (a.dimensiones || []).map((d: any) => ({ dim: d.nombre, Visible: d.visible, Invisible: d.invisible }));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Resumen</CardTitle>
          <Badge variant="secondary">Precisión estimada: {a.precisionEstimada}%</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{a.resumen}</p>
          <p><b className="text-foreground">Forma de pensar:</b> {a.estiloPensamiento}</p>
          <p><b className="text-foreground">Cómo enfrenta problemas:</b> {a.manejoProblemas}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lo que dices vs. lo que muestras</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="h-80">
            <ResponsiveContainer>
              <RadarChart data={radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar name="Visible" dataKey="Visible" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Radar name="Invisible" dataKey="Invisible" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {(a.dimensiones || []).map((d: any) => (
              <div key={d.nombre}>
                <div className="flex justify-between text-sm"><span className="font-medium">{d.nombre}</span><span>{d.final}%</span></div>
                <Progress value={d.final} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{d.evidencia}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Tu realidad visible</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm font-semibold mb-1">Fortalezas</p><List items={a.visible?.fortalezas} /></div>
            <div><p className="text-sm font-semibold mb-1">Debilidades</p><List items={a.visible?.debilidades} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><EyeOff className="w-5 h-5" /> Tu realidad invisible</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm font-semibold mb-1">Fortalezas ocultas</p><List items={a.invisible?.fortalezasOcultas} /></div>
            <div><p className="text-sm font-semibold mb-1">Áreas con esperanza de mejora</p><List items={a.invisible?.areasDeMejora} /></div>
            {a.invisible?.contradicciones?.length > 0 && <div><p className="text-sm font-semibold mb-1">Lo que dices vs. lo que haces</p><List items={a.invisible.contradicciones} /></div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Carreras que se ajustan a ti</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(a.carreras || []).map((c: any, i: number) => (
            <div key={c.id + i} className="p-3 rounded-lg border border-border">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold">{i + 1}. {c.nombre} <span className="text-muted-foreground text-sm">· {c.universidad}</span></span>
                <Badge>{c.porcentaje}%</Badge>
              </div>
              <Progress value={c.porcentaje} className="h-1.5 my-2" />
              <p className="text-sm text-muted-foreground">{c.porque}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Plan de mejora</CardTitle></CardHeader>
          <CardContent><List items={a.planMejora} /></CardContent>
        </Card>
        {mostrarHistorico && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Comparación con tests anteriores</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{a.comparacionHistorica}</p></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
