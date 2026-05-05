import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Brain, Heart, GitCompare, ChevronRight, ExternalLink, Trophy, AlertCircle, Lightbulb, Target, GraduationCap, Building2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ResultadoCompatibilidad } from '@/lib/compatibilidadVocacional';
import type { PerfilEstudiante } from '@/lib/compatibilidadVocacional';
import { useCarrerasFavoritas } from '@/hooks/useCarrerasFavoritas';

interface Props {
  perfil: PerfilEstudiante;
  top: ResultadoCompatibilidad[]; // ya filtrado/ordenado, tomamos top 5
  testsCount: number;
  onIrATests: () => void;
}

interface AnalisisCarrera {
  porqueEsParaTi: string;
  fortalezasAlineadas: string[];
  desafiosPersonales: string[];
  encajeUniversidad: string;
  recomendacionesPracticas: string[];
}
interface AnalisisComparacion {
  resumen: string;
  carreraA: { pros: string[]; contras: string[]; universidad: string };
  carreraB: { pros: string[]; contras: string[]; universidad: string };
  veredicto: string;
}

function hashPerfil(p: PerfilEstudiante) {
  return `${p.empatia}-${p.inteligenciaEmocional}-${p.prosocial}-${p.habilidadesSociales}-${(p.estilosDominantes || []).join(',')}`;
}

export default function Perfil360({ perfil, top, testsCount, onIrATests }: Props) {
  const { user } = useAuth();
  const { favoritas } = useCarrerasFavoritas();
  const top5 = useMemo(() => top.slice(0, 5), [top]);
  const perfilHash = useMemo(() => hashPerfil(perfil), [perfil]);

  const [concentracion, setConcentracion] = useState<any>(null);
  const [schulte, setSchulte] = useState<any>(null);
  const [analisisCarreras, setAnalisisCarreras] = useState<Record<string, AnalisisCarrera>>({});
  const [loadingCarrera, setLoadingCarrera] = useState<string | null>(null);
  const [openCarrera, setOpenCarrera] = useState<string | null>(null);

  // Comparación
  const [carreraSelA, setCarreraSelA] = useState<string>('');
  const [carreraSelB, setCarreraSelB] = useState<string>('');
  const [analisisComp, setAnalisisComp] = useState<AnalisisComparacion | null>(null);
  const [loadingComp, setLoadingComp] = useState(false);

  // Cargar datos de concentración + schulte
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: conc }, { data: sch }] = await Promise.all([
        supabase.from('concentracion_sesiones').select('ejercicio, precision_porcentaje, duracion_segundos').eq('user_id', user.id).eq('completado', true).order('fecha', { ascending: false }).limit(20),
        supabase.from('schulte_resultados').select('nivel, tiempo_segundos, errores').eq('user_id', user.id).order('fecha', { ascending: false }).limit(10),
      ]);
      if (conc && conc.length) {
        const promPrecision = Math.round(conc.reduce((a, c) => a + (c.precision_porcentaje || 0), 0) / conc.length);
        setConcentracion({ sesionesCompletadas: conc.length, precisionPromedio: promPrecision });
      }
      if (sch && sch.length) {
        const mejor = sch.reduce((acc, s) => (s.nivel > (acc?.nivel || 0) ? s : acc), sch[0]);
        setSchulte({ mejorNivel: mejor.nivel, tiempo: Number(mejor.tiempo_segundos), errores: mejor.errores });
      }
    })();
  }, [user]);

  // Pre-cargar caché existente para top 5
  useEffect(() => {
    if (!user || top5.length === 0) return;
    (async () => {
      const keys = top5.map(c => `c:${c.carrera.id}`);
      const { data } = await supabase
        .from('perfil_360_cache')
        .select('cache_key, payload, perfil_hash')
        .eq('user_id', user.id).eq('tipo', 'carrera').in('cache_key', keys);
      const map: Record<string, AnalisisCarrera> = {};
      (data || []).forEach((r: any) => {
        if (r.perfil_hash === perfilHash) {
          const id = r.cache_key.replace('c:', '');
          map[id] = r.payload;
        }
      });
      setAnalisisCarreras(map);
    })();
  }, [user, top5, perfilHash]);

  async function generarAnalisisCarrera(carrera: any, force = false) {
    if (!force && analisisCarreras[carrera.id]) { setOpenCarrera(carrera.id); return; }
    setLoadingCarrera(carrera.id);
    setOpenCarrera(carrera.id);
    try {
      const { data, error } = await supabase.functions.invoke('perfil-360', {
        body: { tipo: 'carrera', carrera, perfil, perfilHash, concentracion, schulte },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalisisCarreras(prev => ({ ...prev, [carrera.id]: data as AnalisisCarrera }));
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('429') || msg.includes('RATE_LIMIT')) toast.error('Demasiadas solicitudes', { description: 'Espera unos segundos.' });
      else if (msg.includes('402') || msg.includes('PAYMENT')) toast.error('Sin créditos de IA', { description: 'Recarga tu workspace para continuar.' });
      else toast.error('No se pudo generar el análisis', { description: msg });
    } finally {
      setLoadingCarrera(null);
    }
  }

  async function generarComparacion() {
    const A = top5.find(c => c.carrera.id === carreraSelA);
    const B = top5.find(c => c.carrera.id === carreraSelB);
    if (!A || !B || A.carrera.id === B.carrera.id) {
      toast.error('Selecciona dos carreras distintas');
      return;
    }
    setLoadingComp(true);
    setAnalisisComp(null);
    try {
      const { data, error } = await supabase.functions.invoke('perfil-360', {
        body: { tipo: 'comparacion', carreraA: A.carrera, carreraB: B.carrera, perfil, perfilHash },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalisisComp(data as AnalisisComparacion);
    } catch (e: any) {
      toast.error('No se pudo comparar', { description: e?.message });
    } finally {
      setLoadingComp(false);
    }
  }

  // Universo de comparación: top 5 + favoritas (deduplicado)
  const universoCmp = useMemo(() => {
    const ids = new Set<string>();
    const arr: ResultadoCompatibilidad[] = [];
    top5.forEach(c => { if (!ids.has(c.carrera.id)) { ids.add(c.carrera.id); arr.push(c); } });
    top.forEach(c => { if (favoritas.includes(c.carrera.id) && !ids.has(c.carrera.id)) { ids.add(c.carrera.id); arr.push(c); } });
    return arr;
  }, [top5, top, favoritas]);

  if (testsCount < 3) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="p-6 text-center space-y-3">
          <Brain className="w-10 h-10 mx-auto text-amber-500" />
          <p className="font-semibold">Perfil 360 requiere más datos</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Para un análisis personalizado de alta precisión, completa al menos 3 tests psicológicos. Cuanto más completo tu perfil, más exacto el motor.</p>
          <Button size="sm" onClick={onIrATests}>Ir al Centro Psicométrico <ChevronRight className="w-3 h-3 ml-1" /></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del motor */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-fuchsia-500/5">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-bold text-lg leading-tight">Motor Perfil 360</h2>
              <p className="text-xs text-muted-foreground mt-1">Análisis profundo y personalizado por IA cruzando tus {testsCount} tests psicométricos{concentracion ? `, ${concentracion.sesionesCompletadas} sesiones de concentración` : ''}{schulte ? ` y tu mejor Schulte (nivel ${schulte.mejorNivel})` : ''}.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { l: 'Empatía', v: perfil.empatia },
              { l: 'I. Emocional', v: perfil.inteligenciaEmocional },
              { l: 'Prosocial', v: perfil.prosocial },
              { l: 'H. Sociales', v: perfil.habilidadesSociales },
            ].map(d => (
              <div key={d.l} className="rounded-lg border p-2 bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{d.l}</p>
                <p className="text-lg font-bold">{d.v}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 5 carreras */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-display font-semibold">Las 5 carreras más cercanas a tu perfil</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {top5.map((c, i) => {
            const tieneAnalisis = !!analisisCarreras[c.carrera.id];
            const cargando = loadingCarrera === c.carrera.id;
            return (
              <motion.div key={c.carrera.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{c.carrera.icono}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] h-5">#{i + 1}</Badge>
                          <Badge variant="outline" className="text-[10px] h-5 border-primary/40">{c.carrera.siglaUniversidad}</Badge>
                        </div>
                        <p className="font-semibold text-sm mt-1 leading-tight">{c.carrera.nombre}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{c.carrera.facultad}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-primary leading-none">{c.porcentaje}%</div>
                        <p className="text-[9px] text-muted-foreground uppercase mt-0.5">match</p>
                      </div>
                    </div>
                    <Progress value={c.porcentaje} className="h-1.5" />
                    <Button
                      size="sm"
                      variant={tieneAnalisis ? 'outline' : 'default'}
                      className="w-full text-xs gap-1.5"
                      onClick={() => generarAnalisisCarrera(c.carrera)}
                      disabled={cargando}
                    >
                      {cargando ? <><Loader2 className="w-3 h-3 animate-spin" /> Analizando con IA…</> : tieneAnalisis ? <><Brain className="w-3 h-3" /> Ver análisis</> : <><Sparkles className="w-3 h-3" /> Generar análisis personalizado</>}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Comparador IA */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitCompare className="w-4 h-4 text-fuchsia-500" />
          <h3 className="font-display font-semibold">Compara dos carreras (IA)</h3>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Elige dos del top 5 o de tus favoritas {favoritas.length > 0 && <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3 fill-pink-500 text-pink-500" /> ({favoritas.length})</span>}. La IA analizará pros y contras para TU perfil específico.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
              <Select value={carreraSelA} onValueChange={setCarreraSelA}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Carrera A" /></SelectTrigger>
                <SelectContent>
                  {universoCmp.map(c => (
                    <SelectItem key={c.carrera.id} value={c.carrera.id} className="text-xs">
                      {c.carrera.icono} {c.carrera.nombre} ({c.carrera.siglaUniversidad}) — {c.porcentaje}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground text-center">vs</span>
              <Select value={carreraSelB} onValueChange={setCarreraSelB}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Carrera B" /></SelectTrigger>
                <SelectContent>
                  {universoCmp.map(c => (
                    <SelectItem key={c.carrera.id} value={c.carrera.id} className="text-xs">
                      {c.carrera.icono} {c.carrera.nombre} ({c.carrera.siglaUniversidad}) — {c.porcentaje}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={generarComparacion} disabled={loadingComp || !carreraSelA || !carreraSelB} className="gap-1.5">
                {loadingComp ? <><Loader2 className="w-3 h-3 animate-spin" /> Comparando…</> : <><GitCompare className="w-3 h-3" /> Comparar</>}
              </Button>
            </div>

            {loadingComp && (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}

            {analisisComp && !loadingComp && (() => {
              const A = top.find(c => c.carrera.id === carreraSelA)!;
              const B = top.find(c => c.carrera.id === carreraSelB)!;
              return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Contexto</p>
                    <p className="text-sm leading-relaxed">{analisisComp.resumen}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[{ data: analisisComp.carreraA, c: A }, { data: analisisComp.carreraB, c: B }].map(({ data, c }, idx) => (
                      <Card key={idx} className="border-l-4" style={{ borderLeftColor: idx === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))' }}>
                        <CardContent className="p-3 space-y-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{c.carrera.icono}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight">{c.carrera.nombre}</p>
                              <p className="text-[10px] text-muted-foreground">{c.carrera.siglaUniversidad} · {c.porcentaje}% match</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-1">✓ Pros para ti</p>
                            <ul className="space-y-1">
                              {data.pros.map((p, i) => <li key={i} className="text-xs leading-snug flex gap-1.5"><span className="text-emerald-500 mt-0.5">•</span><span>{p}</span></li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold mb-1">✗ Contras</p>
                            <ul className="space-y-1">
                              {data.contras.map((p, i) => <li key={i} className="text-xs leading-snug flex gap-1.5"><span className="text-rose-500 mt-0.5">•</span><span>{p}</span></li>)}
                            </ul>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Universidad</p>
                            <p className="text-xs leading-snug">{data.universidad}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Veredicto personalizado</p>
                    <p className="text-sm leading-relaxed">{analisisComp.veredicto}</p>
                  </div>
                </motion.div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Modal de análisis individual */}
      <Dialog open={!!openCarrera} onOpenChange={(o) => !o && setOpenCarrera(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {openCarrera && (() => {
            const c = top5.find(x => x.carrera.id === openCarrera);
            const a = analisisCarreras[openCarrera];
            if (!c) return null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 pr-8">
                    <span className="text-2xl">{c.carrera.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base leading-tight">{c.carrera.nombre}</p>
                      <p className="text-xs font-normal text-muted-foreground">{c.carrera.siglaUniversidad} · {c.porcentaje}% match</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                {!a ? (
                  <div className="py-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">Generando análisis con IA…</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <section>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Por qué es para ti</p>
                      <p className="text-sm leading-relaxed">{a.porqueEsParaTi}</p>
                    </section>
                    <section>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1"><Trophy className="w-3 h-3" /> Tus fortalezas alineadas</p>
                      <ul className="space-y-1">
                        {a.fortalezasAlineadas.map((f, i) => <li key={i} className="text-sm flex gap-2"><span className="text-emerald-500">✓</span><span>{f}</span></li>)}
                      </ul>
                    </section>
                    <section>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Desafíos que enfrentarás</p>
                      <ul className="space-y-1">
                        {a.desafiosPersonales.map((f, i) => <li key={i} className="text-sm flex gap-2"><span className="text-amber-500">⚠</span><span>{f}</span></li>)}
                      </ul>
                    </section>
                    <section className="rounded-lg bg-muted/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Encaje con {c.carrera.siglaUniversidad}</p>
                      <p className="text-sm leading-relaxed">{a.encajeUniversidad}</p>
                    </section>
                    <section>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-fuchsia-600 dark:text-fuchsia-400 mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Recomendaciones prácticas</p>
                      <ul className="space-y-1">
                        {a.recomendacionesPracticas.map((f, i) => <li key={i} className="text-sm flex gap-2"><span className="text-fuchsia-500">→</span><span>{f}</span></li>)}
                      </ul>
                    </section>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => generarAnalisisCarrera(c.carrera, true)} disabled={loadingCarrera === c.carrera.id}>
                        <RefreshCw className="w-3 h-3" /> Regenerar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
                        <a href={c.carrera.urlUniversidad} target="_blank" rel="noopener noreferrer">
                          Web universidad <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
