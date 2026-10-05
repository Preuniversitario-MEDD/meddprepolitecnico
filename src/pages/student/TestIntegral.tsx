import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { PREGUNTAS_INTEGRAL, LIKERT, calcularDimensiones } from "@/data/testIntegral";
import { CARRERAS_ECUADOR } from "@/data/carrerasEcuador";
import InformeIntegral from "@/components/integral/InformeIntegral";

export default function TestIntegral() {
  const { user } = useAuth();
  const [resp, setResp] = useState<Record<number, number>>({});
  const [idx, setIdx] = useState(0);
  const [analisis, setAnalisis] = useState<any>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analizando, setAnalizando] = useState(false);
  const [rehacer, setRehacer] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("perfil_integral").select("analisis, created_at").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.analisis) { setAnalisis(data.analisis); setFecha(data.created_at); } setLoading(false); });
  }, [user]);

  const total = PREGUNTAS_INTEGRAL.length;
  const q = PREGUNTAS_INTEGRAL[idx];

  const responder = (v: number) => {
    const n = { ...resp, [q.id]: v };
    setResp(n);
    if (idx < total - 1) setIdx(idx + 1);
  };

  const analizar = async () => {
    setAnalizando(true);
    const dimensiones = calcularDimensiones(resp);
    const carreras = CARRERAS_ECUADOR.map((c) => ({ id: c.id, n: c.nombre, u: c.siglaUniversidad, f: c.facultad }));
    const { data, error } = await supabase.functions.invoke("perfil-integral", { body: { respuestas: resp, dimensiones, carreras } });
    setAnalizando(false);
    if (error || data?.error) { toast.error(data?.error || "No se pudo completar el análisis"); return; }
    setAnalisis(data.analisis); setFecha(new Date().toISOString()); setRehacer(false); setResp({}); setIdx(0);
    toast.success("¡Tu análisis integral está listo!");
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Test Integral</h1>
            <p className="text-sm text-muted-foreground">Une lo que dices con lo que haces en la plataforma para encontrar tu carrera ideal</p>
          </div>
        </div>
        {analisis && !rehacer && <Button variant="outline" onClick={() => setRehacer(true)}><RotateCcw className="w-4 h-4 mr-2" />Repetir test</Button>}
      </div>

      {analisis && !rehacer ? (
        <>
          {fecha && <p className="text-xs text-muted-foreground">Análisis del {new Date(fecha).toLocaleString("es-EC")}</p>}
          <InformeIntegral a={analisis} />
        </>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Pregunta {idx + 1} de {total}</span><span>{q.dim}</span></div>
              <Progress value={(Object.keys(resp).length / total) * 100} className="h-2" />
            </div>
            <p className="text-lg font-medium min-h-[3.5rem]">{q.texto}</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {LIKERT.map((l, i) => (
                <Button key={l} variant={resp[q.id] === i + 1 ? "default" : "outline"} onClick={() => responder(i + 1)}>{l}</Button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Anterior</Button>
              {Object.keys(resp).length === total ? (
                <Button onClick={analizar} disabled={analizando}>
                  {analizando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando todo tu perfil…</> : "Ver mi análisis integral"}
                </Button>
              ) : (
                <Button variant="ghost" disabled={!resp[q.id] || idx === total - 1} onClick={() => setIdx(idx + 1)}>Siguiente</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Mientras más uses la plataforma (tests, concentración, flashcards, Pomodoro, quizzes), más preciso será tu análisis.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
