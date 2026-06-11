import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allTests, Test, InterpretResult } from "@/data/testData";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { motion } from "framer-motion";
import { Users, Eye, CheckCircle, Clock, Brain, Search, History, TrendingUp, TrendingDown, Minus, RotateCcw, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface AttemptRow {
  id: string;
  user_id: string;
  test_key: string;
  scores: Record<string, number>;
  duration_seconds: number;
  created_at: string;
}

interface StudentRow {
  user_id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  results: Record<string, { scores: Record<string, number> }>;
  attempts: Record<string, AttemptRow[]>; // test_key -> attempts ordered ASC
  totalAttempts: number;
  completedCount: number;
}

const AREA_COLORS: Record<string, string> = {
  personalidad: "#534AB7", vocacional: "#0F6E56", emocional: "#854F0B",
  actitudes: "#993C1D", aptitudes: "#185FA5", inteligencias: "#3C3489",
  aprendizaje: "#27500A", bienestar: "#A32D2D",
};

function fmtDuration(s: number) {
  if (!s || s < 1) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}m ${r}s`;
}

export default function AdminPsychometricView() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [activeTab, setActiveTab] = useState<string>(allTests[0].id);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: profiles }, { data: results }, { data: attempts }] = await Promise.all([
      supabase.from("profiles").select("user_id, nombre, apellidos, cedula"),
      supabase.from("psychometric_results").select("user_id, test_key, scores"),
      supabase.from("psychometric_attempts").select("id, user_id, test_key, scores, duration_seconds, created_at").order("created_at", { ascending: true }),
    ]);

    const resultMap: Record<string, Record<string, { scores: Record<string, number> }>> = {};
    results?.forEach((r: any) => {
      if (!resultMap[r.user_id]) resultMap[r.user_id] = {};
      resultMap[r.user_id][r.test_key] = { scores: r.scores };
    });

    const attemptMap: Record<string, Record<string, AttemptRow[]>> = {};
    (attempts as AttemptRow[] | null)?.forEach((a) => {
      if (!attemptMap[a.user_id]) attemptMap[a.user_id] = {};
      if (!attemptMap[a.user_id][a.test_key]) attemptMap[a.user_id][a.test_key] = [];
      attemptMap[a.user_id][a.test_key].push(a);
    });

    const rows: StudentRow[] = (profiles || []).map((p) => {
      const studentAttempts = attemptMap[p.user_id] || {};
      const totalAttempts = Object.values(studentAttempts).reduce((s, arr) => s + arr.length, 0);
      return {
        user_id: p.user_id,
        nombre: p.nombre,
        apellidos: p.apellidos,
        cedula: p.cedula,
        results: resultMap[p.user_id] || {},
        attempts: studentAttempts,
        totalAttempts,
        completedCount: Object.keys(resultMap[p.user_id] || {}).length,
      };
    });

    setStudents(rows.sort((a, b) => b.completedCount - a.completedCount));
    setLoading(false);
  }

  const selectedTest = allTests.find(t => t.id === activeTab);
  const filteredStudents = students.filter(s =>
    `${s.nombre} ${s.apellidos} ${s.cedula}`.toLowerCase().includes(search.toLowerCase())
  );

  function getInterpretedResults(student: StudentRow, test: Test): InterpretResult[] | null {
    const data = student.results[test.id];
    if (!data) return null;
    return test.interpret(data.scores);
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Brain className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Analítica Psicométrica
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Perfil psicológico y aptitudinal — {allTests.length} tests disponibles
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        <Card className="card-elevated">
          <CardContent className="p-3 md:p-4 text-center">
            <Users className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg md:text-2xl font-bold">{students.length}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Estudiantes</p>
          </CardContent>
        </Card>
        {allTests.slice(0, 4).map((t) => {
          const done = students.filter((s) => s.results[t.id]).length;
          return (
            <Card key={t.id} className="card-elevated">
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-lg md:text-2xl font-bold">{done}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{t.shortName}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + Student table */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <CardTitle className="text-sm font-display">Estudiantes</CardTitle>
            <div className="relative sm:ml-auto w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o cédula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="hidden md:table-cell">Cédula</TableHead>
                  <TableHead className="text-center">Tests</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Intentos</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="text-center">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <TableRow key={s.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelected(s); setActiveTab(allTests[0].id); }}>
                      <TableCell className="font-medium text-xs md:text-sm">{s.nombre} {s.apellidos}</TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{s.cedula}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">{s.completedCount}</span>
                        <span className="text-muted-foreground">/{allTests.length}</span>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">
                          <History className="w-3 h-3 mr-1" /> {s.totalAttempts}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant={s.completedCount === allTests.length ? "default" : "secondary"} className="text-[10px]">
                          {s.completedCount === allTests.length ? (
                            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completo</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.completedCount === 0 ? "Sin iniciar" : "Parcial"}</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(s); setActiveTab(allTests[0].id); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base md:text-lg">
              {selected?.nombre} {selected?.apellidos}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Test tabs - scrollable */}
              <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {allTests.map((t) => {
                  const done = !!selected.results[t.id];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                        activeTab === t.id
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.shortName}
                      {done && " ✓"}
                    </button>
                  );
                })}
              </div>

              {/* Selected test results */}
              {selectedTest && (() => {
                const interpreted = getInterpretedResults(selected, selectedTest);
                if (!interpreted) {
                  return (
                    <div className="py-12 text-center text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Este estudiante aún no ha completado este test.</p>
                    </div>
                  );
                }

                const chartData = interpreted.map(r => ({
                  cat: r.label.length > 12 ? r.label.slice(0, 12) + "…" : r.label,
                  fullLabel: r.label,
                  value: r.percent,
                }));

                const useRadar = interpreted.length >= 4;
                const areaColor = AREA_COLORS[selectedTest.area] || "hsl(var(--primary))";

                return (
                  <div className="space-y-4">
                    {/* Chart */}
                    <div className="h-[240px] md:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {useRadar ? (
                          <RadarChart data={chartData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="cat" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                            <Radar dataKey="value" stroke={areaColor} fill={areaColor} fillOpacity={0.25} strokeWidth={2} />
                          </RadarChart>
                        ) : (
                          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <YAxis dataKey="cat" type="category" width={110} tick={{ fontSize: 9 }} />
                            <Tooltip formatter={(v: number) => [`${v}%`, "Puntaje"]} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={areaColor} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    {/* Score bars */}
                    <div className="space-y-2">
                      {interpreted.map((r) => {
                        const barColor = r.level === "alto" ? "#1D9E75" : r.level === "medio" ? "#EF9F27" : "#E24B4A";
                        return (
                          <div key={r.category}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="truncate mr-2">{r.label}</span>
                              <span className="font-bold shrink-0">{r.percent}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.percent}%`, backgroundColor: barColor }} />
                            </div>
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Historial de intentos + Evolución temporal */}
                    {(() => {
                      const attempts = selected.attempts[selectedTest.id] || [];
                      if (attempts.length === 0) {
                        return (
                          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                            <History className="w-4 h-4 mx-auto mb-1 opacity-50" />
                            Sin intentos registrados (resultado previo a la activación del historial).
                          </div>
                        );
                      }
                      const avgDur = Math.round(attempts.reduce((a, x) => a + (x.duration_seconds || 0), 0) / attempts.length);
                      const categories = Object.keys(attempts[0].scores || {});

                      // Build line chart data
                      const lineData = attempts.map((a, i) => {
                        const row: any = { n: `#${i + 1}`, fecha: new Date(a.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit" }) };
                        categories.forEach(c => { row[c] = a.scores[c] ?? 0; });
                        return row;
                      });

                      // Variation between first and last attempt
                      const firstA = attempts[0]; const lastA = attempts[attempts.length - 1];
                      const variations = categories.map(c => {
                        const f = firstA.scores[c] ?? 0; const l = lastA.scores[c] ?? 0;
                        const diff = l - f;
                        return { cat: c, first: f, last: l, diff };
                      });

                      const palette = ["#534AB7", "#0F6E56", "#854F0B", "#993C1D", "#185FA5", "#3C3489", "#27500A", "#A32D2D"];

                      return (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <History className="w-4 h-4 text-primary" />
                              <p className="font-semibold text-sm">Historial de intentos</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">{attempts.length} intento{attempts.length !== 1 ? "s" : ""}</Badge>
                              <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Prom. {fmtDuration(avgDur)}</Badge>
                            </div>
                          </div>

                          {/* Tabla de intentos */}
                          <div className="overflow-x-auto rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-[10px] h-8">#</TableHead>
                                  <TableHead className="text-[10px] h-8">Fecha</TableHead>
                                  <TableHead className="text-[10px] h-8 text-center">Duración</TableHead>
                                  {categories.map(c => (
                                    <TableHead key={c} className="text-[10px] h-8 text-center">{c}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {attempts.map((a, i) => (
                                  <TableRow key={a.id}>
                                    <TableCell className="text-[10px] py-1.5 font-mono">#{i + 1}</TableCell>
                                    <TableCell className="text-[10px] py-1.5">{new Date(a.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                                    <TableCell className="text-[10px] py-1.5 text-center">{fmtDuration(a.duration_seconds)}</TableCell>
                                    {categories.map(c => (
                                      <TableCell key={c} className="text-[10px] py-1.5 text-center font-mono">{a.scores[c] ?? "—"}</TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Gráfico de evolución (solo si hay ≥2 intentos) */}
                          {attempts.length >= 2 && (
                            <>
                              <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={lineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="n" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ fontSize: 11 }} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    {categories.map((c, i) => (
                                      <Line key={c} type="monotone" dataKey={c} stroke={palette[i % palette.length]} strokeWidth={2} dot={{ r: 3 }} />
                                    ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Variaciones primer vs último */}
                              <div className="rounded-lg border p-3 space-y-1.5 bg-muted/20">
                                <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Variación entre primer y último intento</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                  {variations.map(v => {
                                    const Icon = v.diff > 0 ? TrendingUp : v.diff < 0 ? TrendingDown : Minus;
                                    const color = v.diff > 2 ? "text-emerald-600 dark:text-emerald-400" : v.diff < -2 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground";
                                    return (
                                      <div key={v.cat} className="flex items-center justify-between gap-1 text-[11px] px-2 py-1 rounded bg-card border">
                                        <span className="truncate">{v.cat}</span>
                                        <span className={`flex items-center gap-0.5 font-mono font-semibold ${color}`}>
                                          <Icon className="w-3 h-3" />
                                          {v.diff > 0 ? "+" : ""}{v.diff}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
