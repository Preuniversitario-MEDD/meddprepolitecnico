import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allTests, testsByKey } from "@/data/psychometricTests";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { Users, Eye, CheckCircle, Clock, Brain } from "lucide-react";

interface StudentRow {
  user_id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  results: Record<string, Record<string, number>>;
  completedCount: number;
}

export default function AdminPsychometricView() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [activeTab, setActiveTab] = useState<string>(allTests[0].key);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: profiles }, { data: results }] = await Promise.all([
      supabase.from("profiles").select("user_id, nombre, apellidos, cedula"),
      supabase.from("psychometric_results").select("user_id, test_key, scores"),
    ]);

    const resultMap: Record<string, Record<string, Record<string, number>>> = {};
    results?.forEach((r: any) => {
      if (!resultMap[r.user_id]) resultMap[r.user_id] = {};
      resultMap[r.user_id][r.test_key] = r.scores;
    });

    const rows: StudentRow[] = (profiles || []).map((p) => ({
      user_id: p.user_id,
      nombre: p.nombre,
      apellidos: p.apellidos,
      cedula: p.cedula,
      results: resultMap[p.user_id] || {},
      completedCount: Object.keys(resultMap[p.user_id] || {}).length,
    }));

    setStudents(rows.sort((a, b) => b.completedCount - a.completedCount));
    setLoading(false);
  }

  const selectedTest = testsByKey[activeTab];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" /> Analítica Psicométrica
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Perfil psicológico y aptitudinal de todos los estudiantes.
        </p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="card-elevated">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">Estudiantes</p>
          </CardContent>
        </Card>
        {allTests.slice(0, 3).map((t) => {
          const done = students.filter((s) => s.results[t.key]).length;
          return (
            <Card key={t.key} className="card-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{done}</p>
                <p className="text-xs text-muted-foreground truncate">{t.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Student table */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Estudiantes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead className="text-center">Tests</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin estudiantes</TableCell>
                </TableRow>
              ) : (
                students.map((s) => (
                  <TableRow key={s.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelected(s); setActiveTab(allTests[0].key); }}>
                    <TableCell className="font-medium">{s.nombre} {s.apellidos}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.cedula}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold">{s.completedCount}</span>
                      <span className="text-muted-foreground">/{allTests.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.completedCount === allTests.length ? "default" : "secondary"} className="text-[10px]">
                        {s.completedCount === allTests.length ? (
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completo</span>
                        ) : (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.completedCount === 0 ? "Sin iniciar" : "Parcial"}</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(s); setActiveTab(allTests[0].key); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selected?.nombre} {selected?.apellidos}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Test tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allTests.map((t) => {
                  const done = !!selected.results[t.key];
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        activeTab === t.key
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.title.split("(")[0].trim()}
                      {done && " ✓"}
                    </button>
                  );
                })}
              </div>

              {/* Selected test results */}
              {selected.results[activeTab] ? (
                <div className="space-y-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedTest.chartType === "radar" ? (
                        <RadarChart
                          data={selectedTest.categories.map((c) => ({
                            cat: c.label,
                            value: selected.results[activeTab][c.key] || 0,
                          }))}
                        >
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="cat" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                          <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                        </RadarChart>
                      ) : (
                        <BarChart
                          data={selectedTest.categories.map((c) => ({
                            cat: c.label,
                            value: selected.results[activeTab][c.key] || 0,
                            fill: c.color,
                          }))}
                          layout="vertical"
                          margin={{ left: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <YAxis dataKey="cat" type="category" width={110} tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(v: number) => [`${v}%`, "Puntaje"]} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {selectedTest.categories.map((c, i) => (
                              <Cell key={i} fill={c.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Score bars */}
                  <div className="space-y-2">
                    {selectedTest.categories.map((cat) => {
                      const score = selected.results[activeTab][cat.key] || 0;
                      return (
                        <div key={cat.key}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span>{cat.label}</span>
                            <span className="font-bold">{score}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Este estudiante aún no ha completado este test.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
