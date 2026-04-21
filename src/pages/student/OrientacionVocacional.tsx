import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Sparkles, Building2, ListChecks, Download, Save, ChevronDown, AlertTriangle, ArrowRight, ExternalLink, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CARRERAS_ECUADOR } from '@/data/carrerasEcuador';
import {
  calcularCompatibilidad,
  normalizarPerfil,
  contarTestsRelevantes,
  type PerfilEstudiante,
  type ResultadoCompatibilidad,
} from '@/lib/compatibilidadVocacional';

const UNIVERSIDADES = ['ESPOL', 'ECOTEC', 'UEES', 'UNEMI'] as const;
const MODALIDADES = ['presencial', 'semipresencial', 'online', 'hibrida'] as const;

function RingProgress({ percent, size = 96, color = 'hsl(var(--primary))' }: { percent: number; size?: number; color?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(percent * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);
  const dash = (animated / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center" fontSize="20" fontWeight="700" fill="currentColor">{animated}%</text>
    </svg>
  );
}

function RadarPerfil({ perfil }: { perfil: PerfilEstudiante }) {
  const dims = [
    { label: 'Empatía', val: perfil.empatia },
    { label: 'I. Emocional', val: perfil.inteligenciaEmocional },
    { label: 'Prosocial', val: perfil.prosocial },
    { label: 'H. Sociales', val: perfil.habilidadesSociales },
    { label: 'Aprendizaje', val: perfil.estilosDominantes.length ? 80 : 50 },
  ];
  const cx = 140, cy = 140, r = 100;
  const n = dims.length;
  const angles = dims.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);
  const pts = (scale: number) => angles.map((a, i) => [cx + Math.cos(a) * (dims[i].val / 100) * scale, cy + Math.sin(a) * (dims[i].val / 100) * scale]);
  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-[280px] mx-auto">
      {[25, 50, 75, 100].map(g => (
        <polygon key={g} points={angles.map((a, i) => [cx + Math.cos(a) * (r * g / 100), cy + Math.sin(a) * (r * g / 100)].join(',')).join(' ')} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}
      <polygon points={pts(r).map(p => p.join(',')).join(' ')} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {pts(r).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill="hsl(var(--primary))" />)}
      {dims.map((d, i) => {
        const a = angles[i]; const lx = cx + Math.cos(a) * (r + 18); const ly = cy + Math.sin(a) * (r + 18);
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="hsl(var(--muted-foreground))">{d.label}</text>;
      })}
    </svg>
  );
}

export default function OrientacionVocacional() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resultadosPorTest, setResultadosPorTest] = useState<Record<string, any>>({});
  const [fechaUltima, setFechaUltima] = useState<string | null>(null);
  const [savedTopId, setSavedTopId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filtros
  const [universidadesSel, setUniversidadesSel] = useState<string[]>([...UNIVERSIDADES]);
  const [modalidadSel, setModalidadSel] = useState<string>('todas');
  const [ciudadSel, setCiudadSel] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('psychometric_results')
        .select('test_key, scores, answers, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { if (!map[r.test_key]) map[r.test_key] = { scores: r.scores, answers: r.answers, updated_at: r.updated_at }; });
      setResultadosPorTest(map);
      setFechaUltima((data || [])[0]?.updated_at || null);

      const { data: ov } = await supabase.from('orientacion_vocacional').select('top_carreras, carrera_elegida').eq('user_id', user.id).maybeSingle();
      if (ov?.top_carreras && Array.isArray(ov.top_carreras) && ov.top_carreras.length > 0) {
        setSavedTopId((ov.top_carreras[0] as any)?.id || null);
      }
      setLoading(false);
    })();
  }, [user]);

  const testsCount = useMemo(() => contarTestsRelevantes(resultadosPorTest), [resultadosPorTest]);
  const perfil = useMemo(() => normalizarPerfil(resultadosPorTest), [resultadosPorTest]);
  const compatTotal = useMemo(() => calcularCompatibilidad(perfil, CARRERAS_ECUADOR), [perfil]);

  const ciudadesDisponibles = useMemo(() => {
    const set = new Set<string>();
    CARRERAS_ECUADOR.forEach(c => c.ciudad.forEach(ci => set.add(ci)));
    return Array.from(set).sort();
  }, []);

  const compat = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return compatTotal.filter(({ carrera }) => {
      if (!universidadesSel.includes(carrera.siglaUniversidad)) return false;
      if (modalidadSel !== 'todas' && !carrera.modalidad.includes(modalidadSel as any)) return false;
      if (ciudadSel !== 'todas' && !carrera.ciudad.includes(ciudadSel)) return false;
      if (q && !carrera.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [compatTotal, universidadesSel, modalidadSel, ciudadSel, busqueda]);

  const top1 = compat[0];

  useEffect(() => {
    if (loading || !top1 || !savedTopId) return;
    const flagKey = `vocac_change_notified_${user?.id}_${top1.carrera.id}`;
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, '1');
    if (savedTopId !== top1.carrera.id) {
      toast('¡Tu perfil ha evolucionado!', { description: 'Tu orientación vocacional podría haber cambiado.' });
    }
  }, [loading, top1, savedTopId, user]);

  function toggleUniv(u: string) {
    setUniversidadesSel(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  }

  async function guardarResultados() {
    if (!user || !top1) return;
    const payload = {
      user_id: user.id,
      top_carreras: compat.slice(0, 5).map(c => ({ id: c.carrera.id, nombre: c.carrera.nombre, porcentaje: c.porcentaje, universidad: c.carrera.siglaUniversidad })),
      perfil_normalizado: perfil as any,
      tests_usados: testsCount,
      fecha_calculo: new Date().toISOString(),
      carrera_elegida: top1.carrera.id,
    };
    const { error } = await supabase.from('orientacion_vocacional').upsert(payload, { onConflict: 'user_id' });
    if (error) { toast.error('No se pudo guardar', { description: error.message }); return; }
    setSavedTopId(top1.carrera.id);
    toast.success('Resultados guardados', { description: 'Tu carrera principal: ' + top1.carrera.nombre });
  }

  function descargar() {
    if (!top1) return;
    const lines: string[] = [];
    lines.push('ORIENTACIÓN VOCACIONAL ECUADOR — MEDD');
    lines.push('Fecha: ' + new Date().toLocaleString());
    lines.push('Tests usados: ' + testsCount + ' / 5');
    lines.push('');
    lines.push('TOP 5 CARRERAS COMPATIBLES');
    compat.slice(0, 5).forEach((c, i) => {
      lines.push(`${i + 1}. ${c.carrera.nombre} (${c.carrera.siglaUniversidad}) — ${c.porcentaje}%`);
      if (c.factoresPositivos.length) lines.push('   ✓ ' + c.factoresPositivos.join(', '));
      if (c.factoresADesarrollar.length) lines.push('   ⚠ A desarrollar: ' + c.factoresADesarrollar.join(', '));
    });
    lines.push('');
    lines.push('PLAN DE ACCIÓN — ' + top1.carrera.nombre);
    lines.push('Mes 1: Habla con un profesional de ' + top1.carrera.nombre + '.');
    lines.push('Mes 2: Refuerzo en ' + top1.carrera.materiasClaveExamen.join(', ') + '.');
    lines.push('Mes 3: Realiza al menos 3 simulacros completos del examen.');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orientacion-vocacional.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
        Cargando tu perfil…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Orientación Vocacional Ecuador</h1>
          <p className="text-sm text-muted-foreground">Cruzamos tus tests con carreras de ESPOL, ECOTEC, UEES y UNEMI</p>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">{testsCount} / 5 tests</Badge>
      </motion.div>

      {testsCount < 3 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Resultados parciales</p>
              <p className="text-xs text-muted-foreground">Para una orientación más precisa, completa al menos 3 de los 5 tests psicológicos.</p>
              <Button size="sm" onClick={() => navigate('/student/psicometria')}>Ir a tests <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Filtros</p>
            <p className="text-xs text-muted-foreground">{compat.length} carreras encontradas</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs mb-1.5 block">Universidades</Label>
              <div className="flex flex-wrap gap-3">
                {UNIVERSIDADES.map(u => (
                  <label key={u} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={universidadesSel.includes(u)} onCheckedChange={() => toggleUniv(u)} />
                    <span className="text-xs font-medium">{u}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Buscar carrera</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Ej. medicina" className="pl-8 h-9 text-sm" />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs mb-1.5 block">Modalidad</Label>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={modalidadSel === 'todas' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setModalidadSel('todas')}>Todas</Badge>
                {MODALIDADES.map(m => (
                  <Badge key={m} variant={modalidadSel === m ? 'default' : 'outline'} className="cursor-pointer text-xs capitalize" onClick={() => setModalidadSel(m)}>{m}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Ciudad</Label>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={ciudadSel === 'todas' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setCiudadSel('todas')}>Todas</Badge>
                {ciudadesDisponibles.map(c => (
                  <Badge key={c} variant={ciudadSel === c ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setCiudadSel(c)}>{c}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="carreras" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="carreras" className="text-xs"><Sparkles className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Carreras</TabsTrigger>
          <TabsTrigger value="perfil" className="text-xs">Factores</TabsTrigger>
          <TabsTrigger value="mapa" className="text-xs"><Building2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Universidades</TabsTrigger>
          <TabsTrigger value="plan" className="text-xs"><ListChecks className="w-3.5 h-3.5 mr-1 hidden sm:inline" />Plan</TabsTrigger>
        </TabsList>

        {/* TAB 1 — CARRERAS */}
        <TabsContent value="carreras" className="space-y-3">
          {compat.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sin resultados con los filtros actuales.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(showAll ? compat : compat.slice(0, 6)).map((c, i) => (
                <motion.div key={c.carrera.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`overflow-hidden transition-all ${expanded === c.carrera.id ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4 space-y-3 cursor-pointer" onClick={() => setExpanded(expanded === c.carrera.id ? null : c.carrera.id)}>
                      <div className="flex items-start gap-3">
                        <RingProgress percent={c.porcentaje} size={86} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-2xl">{c.carrera.icono}</span>
                            {i === 0 && <Badge className="bg-primary text-primary-foreground text-[10px]">Top</Badge>}
                            <Badge variant="outline" className="text-[10px] border-primary/40">{c.carrera.siglaUniversidad}</Badge>
                          </div>
                          <p className="font-semibold text-sm leading-tight mt-1">{c.carrera.nombre}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{c.carrera.facultad}</p>
                          <Progress value={c.porcentaje} className="h-1.5 mt-2" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.carrera.modalidad.slice(0, 2).map(m => (
                          <Badge key={m} variant="secondary" className="text-[10px] capitalize">{m}</Badge>
                        ))}
                        {c.carrera.ciudad.slice(0, 2).map(ci => (
                          <Badge key={ci} variant="outline" className="text-[10px]">📍 {ci}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.factoresPositivos.slice(0, 3).map(f => (
                          <Badge key={f} variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">{f}</Badge>
                        ))}
                      </div>
                      {expanded === c.carrera.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2 border-t text-xs">
                          <p className="text-muted-foreground">{c.carrera.descripcion}</p>
                          <div>
                            <p className="font-medium mb-1">Campo laboral</p>
                            <p className="text-muted-foreground">{c.carrera.campoLaboral.join(' · ')}</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Materias clave del examen</p>
                            <div className="flex gap-1 flex-wrap">
                              {c.carrera.materiasClaveExamen.map(m => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}
                            </div>
                          </div>
                          {c.factoresADesarrollar.length > 0 && (
                            <div>
                              <p className="font-medium mb-1 text-amber-600 dark:text-amber-400">A desarrollar</p>
                              <p className="text-muted-foreground">{c.factoresADesarrollar.join(', ')}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                    <div className="px-4 pb-3">
                      <Button size="sm" variant="outline" className="w-full text-xs gap-1" asChild>
                        <a href={c.carrera.urlUniversidad} target="_blank" rel="noopener noreferrer">
                          Ver carrera en {c.carrera.siglaUniversidad} <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          {compat.length > 6 && (
            <div className="flex flex-wrap gap-2 justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAll(s => !s)}>
                <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Ver menos' : `Ver todas (${compat.length})`}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={descargar}><Download className="w-4 h-4 mr-1" />Descargar</Button>
                <Button size="sm" onClick={guardarResultados}><Save className="w-4 h-4 mr-1" />Guardar</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2 — FACTORES */}
        <TabsContent value="perfil" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Tus 5 dimensiones</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  {[
                    { label: 'Empatía', val: perfil.empatia, info: 'Capacidad de comprender emociones ajenas. Clave en salud y educación.' },
                    { label: 'Inteligencia emocional', val: perfil.inteligenciaEmocional, info: 'Manejo de tus propias emociones bajo presión.' },
                    { label: 'Conducta prosocial', val: perfil.prosocial, info: 'Disposición a ayudar a otros. Determinante en carreras sociales.' },
                    { label: 'Habilidades sociales', val: perfil.habilidadesSociales, info: 'Comunicación efectiva en equipos.' },
                  ].map(d => (
                    <div key={d.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{d.label}</span>
                        <span className="text-muted-foreground">{d.val}%</span>
                      </div>
                      <Progress value={d.val} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">{d.info}</p>
                    </div>
                  ))}
                  <div className="pt-2">
                    <p className="text-xs font-medium mb-1">Estilo(s) de aprendizaje dominante(s)</p>
                    <div className="flex gap-1">
                      {perfil.estilosDominantes.map(e => <Badge key={e} variant="secondary">{e}</Badge>)}
                    </div>
                  </div>
                </div>
                <div><RadarPerfil perfil={perfil} /></div>
              </div>
              {fechaUltima && (
                <p className="text-[10px] text-muted-foreground">Basado en tus resultados del {new Date(fechaUltima).toLocaleDateString()}.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 — MAPA POR UNIVERSIDAD */}
        <TabsContent value="mapa" className="space-y-3">
          {Object.entries(
            compat.reduce((acc, c) => {
              const uni = c.carrera.siglaUniversidad;
              (acc[uni] ||= []).push(c);
              return acc;
            }, {} as Record<string, ResultadoCompatibilidad[]>)
          )
            .map(([uni, lista]) => ({
              uni,
              lista,
              prom: Math.round(lista.reduce((a, x) => a + x.porcentaje, 0) / lista.length),
              url: lista[0].carrera.urlUniversidad,
              fullName: lista[0].carrera.universidad,
            }))
            .sort((a, b) => b.prom - a.prom)
            .map(({ uni, lista, prom, url, fullName }) => (
              <Card key={uni}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{uni}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{fullName}</p>
                        <p className="text-[11px] text-muted-foreground">{lista.length} carrera{lista.length > 1 ? 's' : ''} · Compatibilidad promedio</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-base font-bold shrink-0">{prom}%</Badge>
                  </div>
                  <Progress value={prom} className="h-2" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-2">
                    {lista.map(c => (
                      <div key={c.carrera.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                        <span className="truncate">{c.carrera.icono} {c.carrera.nombre}</span>
                        <span className="font-mono font-semibold ml-2">{c.porcentaje}%</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1 mt-2" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Ver oferta académica de {uni} <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* TAB 4 — PLAN */}
        <TabsContent value="plan" className="space-y-3">
          {!top1 ? <p className="text-sm text-muted-foreground">Completa más tests o ajusta los filtros para generar tu plan.</p> : (
            <>
              <Card className="border-primary/40">
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <Badge className="mb-2">Carrera #1</Badge>
                    <p className="text-lg font-bold">{top1.carrera.icono} {top1.carrera.nombre}</p>
                    <p className="text-xs text-muted-foreground">{top1.carrera.siglaUniversidad} · {top1.carrera.facultad}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={top1.carrera.urlUniversidad} target="_blank" rel="noopener noreferrer">
                      Ver carrera <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-sm">Mes 1 — Confirmación vocacional</p>
                    <p className="text-xs text-muted-foreground">Habla con un profesional de {top1.carrera.nombre}. Busca alumnos de {top1.carrera.siglaUniversidad} en LinkedIn y pregúntales sobre su día a día.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Mes 2 — Refuerzo académico</p>
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                      {top1.carrera.materiasClaveExamen.map(m => {
                        const consejo = perfil.estilosDominantes[0] === 'V' ? `crea diagramas y mapas mentales de ${m}.`
                          : perfil.estilosDominantes[0] === 'A' ? `escucha podcasts y explica ${m} en voz alta.`
                          : perfil.estilosDominantes[0] === 'R' ? `resuelve y redacta ejercicios escritos de ${m}.`
                          : `practica con ejercicios manuales y experimentos de ${m}.`;
                        return <li key={m}>• <span className="font-medium">{m}:</span> {consejo}</li>;
                      })}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Mes 3 — Simulacros</p>
                    <p className="text-xs text-muted-foreground">Realiza mínimo 3 simulacros completos en la sección Exámenes.</p>
                  </div>
                  {top1.factoresADesarrollar.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm">Bonus — Desarrollo personal</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                        {top1.factoresADesarrollar.map(f => (
                          <li key={f}>• Trabaja en tu <span className="font-medium">{f.toLowerCase()}</span> — clave para destacar en {top1.carrera.nombre}.</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground text-center pt-4">
        Esta orientación es una guía educativa basada en tus características personales. La decisión final siempre es tuya.
      </p>
    </div>
  );
}
