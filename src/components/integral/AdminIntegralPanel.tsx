import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Archive } from "lucide-react";
import InformeIntegral from "./InformeIntegral";

export default function AdminIntegralPanel() {
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [archivo, setArchivo] = useState<any[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, a, pr] = await Promise.all([
        supabase.from("perfil_integral").select("user_id, analisis, precision_estimada, created_at").order("created_at", { ascending: false }),
        supabase.from("tests_archivo").select("user_id, origen, test_key, datos, fecha_original").order("fecha_original", { ascending: false }),
        supabase.from("profiles").select("user_id, nombre, apellidos, cedula"),
      ]);
      setPerfiles(p.data || []); setArchivo(a.data || []);
      const m: Record<string, string> = {};
      (pr.data || []).forEach((x: any) => { m[x.user_id] = `${x.nombre} ${x.apellidos || ""}`.trim() + ` · ${x.cedula}`; });
      setNombres(m);
    })();
  }, []);

  const usuarios = useMemo(() => {
    const ids = new Set([...perfiles.map((p) => p.user_id), ...archivo.map((a) => a.user_id)]);
    return [...ids].map((id) => ({
      id, nombre: nombres[id] || id.slice(0, 8),
      ultimo: perfiles.find((p) => p.user_id === id),
      nArchivo: archivo.filter((a) => a.user_id === id && a.origen !== "psicometrico_intento").length,
    })).filter((u) => u.nombre.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => (b.ultimo ? 1 : 0) - (a.ultimo ? 1 : 0));
  }, [perfiles, archivo, nombres, busca]);

  const selPerfiles = perfiles.filter((p) => p.user_id === sel);
  const selArchivo = archivo.filter((a) => a.user_id === sel && a.origen !== "psicometrico_intento");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Test Integral y tests archivados</CardTitle>
        <Input placeholder="Buscar por nombre o cédula" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
      </CardHeader>
      <CardContent className="space-y-2 max-h-[420px] overflow-auto">
        {usuarios.length === 0 && <p className="text-sm text-muted-foreground">Sin datos aún.</p>}
        {usuarios.map((u) => (
          <button key={u.id} onClick={() => setSel(u.id)} className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 flex justify-between items-center gap-2">
            <span className="text-sm font-medium">{u.nombre}</span>
            <span className="flex gap-2">
              {u.ultimo ? <Badge>Integral · {u.ultimo.precision_estimada ?? "?"}% precisión</Badge> : <Badge variant="outline">Sin test integral</Badge>}
              <Badge variant="secondary"><Archive className="w-3 h-3 mr-1" />{u.nArchivo} archivados</Badge>
            </span>
          </button>
        ))}
      </CardContent>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{sel && (nombres[sel] || sel)}</DialogTitle></DialogHeader>
          <Tabs defaultValue="integral">
            <TabsList>
              <TabsTrigger value="integral">Test Integral ({selPerfiles.length})</TabsTrigger>
              <TabsTrigger value="archivo">Tests archivados ({selArchivo.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="integral" className="space-y-6">
              {selPerfiles.length === 0 && <p className="text-sm text-muted-foreground">Aún no ha realizado el Test Integral.</p>}
              {selPerfiles.map((p, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("es-EC")}</p>
                  <InformeIntegral a={p.analisis} />
                </div>
              ))}
            </TabsContent>
            <TabsContent value="archivo" className="space-y-2">
              {selArchivo.map((a, i) => (
                <div key={i} className="p-3 rounded border border-border text-xs">
                  <div className="flex justify-between mb-1"><b>{a.origen} · {a.test_key}</b><span>{a.fecha_original ? new Date(a.fecha_original).toLocaleDateString("es-EC") : ""}</span></div>
                  <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(a.origen === "psicometrico" ? a.datos?.scores : a.datos, null, 1)}</pre>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
