import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Brain, Eye, EyeOff, Sparkles, Loader2, Timer, Target, AlertTriangle, Trophy, PartyPopper, ChevronDown, Download, ExternalLink, Play, FileText } from 'lucide-react';
import QuizComponent from '@/components/quiz/QuizComponent';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;
type Sesion = Tables<'sesiones'>;

interface Pestana { id: string; sesion_id: string; nombre: string; clave: string; orden: number; }
interface AIExercise { titulo: string; enunciado: string; solucion: string; }

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [pestanas, setPestanas] = useState<Pestana[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showSolutions, setShowSolutions] = useState<Record<string, boolean>>({});
  const [aiExercise, setAiExercise] = useState<AIExercise | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSolution, setShowAiSolution] = useState(false);
  const [stats, setStats] = useState({ intentos: 0, errores: 0, tiempo: 0, correctasTotal: 0 });
  const [sessionProgress, setSessionProgress] = useState(0);
  const [show80Message, setShow80Message] = useState(false);
  // Accordion: only one group open at a time
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => { if (id) loadData(); }, [id]);

  // Reset open group when tab changes
  useEffect(() => { setOpenGroup(null); }, [activeTab]);

  async function loadData() {
    const [{ data: s }, { data: c }, { data: tabs }] = await Promise.all([
      supabase.from('sesiones').select('*').eq('id', id!).single(),
      supabase.from('contenido').select('*').eq('sesion_id', id!).order('orden'),
      supabase.from('pestanas_sesion').select('*').eq('sesion_id', id!).order('orden'),
    ]);
    setSesion(s);
    setContenido(c || []);
    
    const tabList = (tabs || []) as Pestana[];
    setPestanas(tabList);
    if (tabList.length > 0 && !activeTab) setActiveTab(tabList[0].clave);

    if (user) {
      const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', user.id).eq('sesion_id', id!).maybeSingle();
      if (prog) {
        const intentos = prog.intentos_quiz || 0;
        const errores = prog.errores_quiz || 0;
        const tiempo = prog.tiempo_invertido || 0;
        const correctas = prog.preguntas_correctas_total || 0;
        setStats({ intentos, errores, tiempo, correctasTotal: correctas });
        const ejerciciosProgress = Math.min((prog.ejercicios_correctos || 0) / 20, 1) * 40;
        const quizProgress = Math.min(correctas / 150, 1) * 60;
        const total = Math.round(ejerciciosProgress + quizProgress);
        setSessionProgress(total);
        if (total >= 80 && total < 100) setShow80Message(true);
      }
    }
  }

  async function generateAIExercise() {
    if (!sesion) return;
    setAiLoading(true);
    setAiExercise(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exercise', {
        body: { sessionTitle: sesion.titulo, sessionNumber: sesion.numero }
      });
      if (error) throw error;
      setAiExercise(data);
      setShowAiSolution(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo generar el ejercicio', variant: 'destructive' });
    }
    setAiLoading(false);
  }

  const formatTime = (s: number) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };

  function getGroupedContent(clave: string) {
    const items = contenido.filter(c => c.tipo === clave);
    const groups = new Map<string, Contenido[]>();
    items.forEach(item => {
      const g = (item as any).grupo_nombre || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    });
    return groups;
  }

  if (!sesion) return <div className="p-6 text-center text-muted-foreground">Cargando sesión...</div>;

  const allTabs = [...pestanas, { id: 'quiz', sesion_id: id!, nombre: 'Quiz', clave: 'quiz', orden: 999 }];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold truncate">Sesión {sesion.numero}: {sesion.titulo}</h1>
          <p className="text-sm text-muted-foreground">{sesion.descripcion}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: Target, label: 'Intentos Quiz', value: stats.intentos, color: 'text-primary' },
          { icon: AlertTriangle, label: 'Errores', value: stats.errores, color: 'text-destructive' },
          { icon: Timer, label: 'Tiempo', value: formatTime(stats.tiempo), color: 'text-neon-orange' },
          { icon: Trophy, label: 'Correctas', value: `${stats.correctasTotal}/150`, color: 'text-accent' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="card-elevated">
            <CardContent className="p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-elevated">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Progreso de la Sesión</span>
            <span className="text-sm font-bold text-primary">{sessionProgress}%</span>
          </div>
          <Progress value={sessionProgress} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Ejercicios (40%)</span>
            <span>Quiz (60%)</span>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {show80Message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-bold text-accent">¡Felicitaciones! Llevas {sessionProgress}%</p>
                <p className="text-xs text-muted-foreground">Para completar: responde 20 ejercicios correctamente y alcanza 150/200 correctas en el quiz.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={activeTab || allTabs[0]?.clave} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto">
          {allTabs.map(tab => (
            <TabsTrigger key={tab.clave} value={tab.clave} className="gap-1 text-xs md:text-sm">
              {tab.clave === 'quiz' && <Brain className="w-3.5 h-3.5" />}
              {tab.nombre}
            </TabsTrigger>
          ))}
        </TabsList>

        {pestanas.map(tab => {
          const groups = getGroupedContent(tab.clave);
          const hasExercises = tab.clave === 'ejercicio';

          return (
            <TabsContent key={tab.clave} value={tab.clave} className="space-y-3 mt-4">
              {Array.from(groups.entries()).map(([groupName, items]) => {
                if (!groupName) {
                  return items.map((item, i) => (
                    <ContentItem key={item.id} item={item} index={i}
                      showSolutions={showSolutions}
                      onToggleSolution={(id) => setShowSolutions(prev => ({ ...prev, [id]: !prev[id] }))} />
                  ));
                }
                const isOpen = openGroup === `${tab.clave}::${groupName}`;
                return (
                  <Collapsible key={groupName} open={isOpen} onOpenChange={(open) => setOpenGroup(open ? `${tab.clave}::${groupName}` : null)}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                      <span className="font-semibold text-sm">{groupName}</span>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pl-4 border-l-2 border-muted ml-2 mt-1">
                      {items.map((item, i) => (
                        <ContentItem key={item.id} item={item} index={i}
                          showSolutions={showSolutions}
                          onToggleSolution={(id) => setShowSolutions(prev => ({ ...prev, [id]: !prev[id] }))} />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {Array.from(groups.values()).flat().length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay contenido aún</p>
              )}

              {hasExercises && (
                <>
                  <Button onClick={generateAIExercise} disabled={aiLoading} variant="outline" className="w-full gap-2 neon-border">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-neon-fuchsia" />}
                    {aiLoading ? 'Generando...' : 'Generar ejercicio con IA'}
                  </Button>
                  <AnimatePresence>
                    {aiExercise && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="card-elevated neon-border">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-neon-fuchsia" />
                              <h3 className="font-display font-bold text-sm">🤖 {aiExercise.titulo}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{aiExercise.enunciado}</p>
                            <Button variant="outline" size="sm" onClick={() => setShowAiSolution(!showAiSolution)} className="mt-3 gap-2">
                              {showAiSolution ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {showAiSolution ? 'Ocultar' : 'Ver solución'}
                            </Button>
                            {showAiSolution && (
                              <div className="mt-2 p-3 rounded-lg bg-accent/10 text-sm whitespace-pre-wrap break-words max-w-full">
                                {aiExercise.solucion}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="quiz" className="mt-4">
          {id && user && <QuizComponent sesionId={id} userId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtu\.?be|youtube|vimeo|dailymotion/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\/|$|\?)/i.test(url);
}

function getLinkIcon(url: string) {
  if (isVideoUrl(url)) return Play;
  if (isPdfUrl(url)) return FileText;
  return Download;
}

function getLinkLabel(url: string): string {
  if (isVideoUrl(url)) return 'Ver video';
  if (isPdfUrl(url)) {
    try {
      const parts = new URL(url).pathname.split('/');
      const filename = parts.find(p => p.endsWith('.pdf')) || 'Documento PDF';
      return filename.length > 40 ? filename.substring(0, 37) + '...' : filename;
    } catch { return 'Documento PDF'; }
  }
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || url;
    return filename.length > 40 ? filename.substring(0, 37) + '...' : filename;
  } catch { return url.length > 40 ? url.substring(0, 37) + '...' : url; }
}

function ContentItem({ item, index, showSolutions, onToggleSolution }: {
  item: Contenido; index: number;
  showSolutions: Record<string, boolean>;
  onToggleSolution: (id: string) => void;
}) {
  const hasSolution = !!(item.solucion);
  const links = (item.imagen_url || '').split('\n').filter(l => l.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
      <Card className="card-elevated">
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm mb-2">{item.titulo}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{item.texto}</p>
          
          {/* Render multiple links: images inline, others as download/open buttons */}
          {links.length > 0 && (
            <div className="mt-3 space-y-2">
              {links.map((link, i) => {
                const trimmed = link.trim();
                if (isImageUrl(trimmed)) {
                  return <img key={i} src={trimmed} alt={`${item.titulo} - ${i + 1}`} className="rounded-lg max-w-full h-auto" />;
                }
                const Icon = getLinkIcon(trimmed);
                return (
                  <a key={i} href={trimmed} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm text-secondary">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{getLinkLabel(trimmed)}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                  </a>
                );
              })}
            </div>
          )}

          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-secondary underline">Ver recurso →</a>
          )}
          {hasSolution && (
            <>
              <Button variant="outline" size="sm"
                onClick={() => onToggleSolution(item.id)}
                className="mt-3 gap-2">
                {showSolutions[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showSolutions[item.id] ? 'Ocultar solución' : 'Ver solución'}
              </Button>
              <AnimatePresence>
                {showSolutions[item.id] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-2 p-3 rounded-lg bg-accent/10 text-sm overflow-hidden break-words max-w-full whitespace-pre-wrap">
                    {item.solucion}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
