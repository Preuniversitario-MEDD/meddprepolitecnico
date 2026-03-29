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
import { ArrowLeft, Brain, Sparkles, Loader2, Timer, Target, AlertTriangle, Trophy, PartyPopper, ChevronDown, Eye, EyeOff, BookOpen, Lightbulb, PenTool } from 'lucide-react';
import QuizComponent from '@/components/quiz/QuizComponent';
import ContentItem from '@/components/session/ContentItem';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;
type Sesion = Tables<'sesiones'>;

interface Pestana { id: string; sesion_id: string; nombre: string; clave: string; orden: number; }
interface AIExercise { titulo: string; enunciado: string; solucion: string; }

const TAB_ICONS: Record<string, typeof BookOpen> = {
  teoria: BookOpen,
  truco: Lightbulb,
  ejercicio: PenTool,
  quiz: Brain,
};

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => { if (id) loadData(); }, [id]);
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

  if (!sesion) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  const allTabs = [...pestanas, { id: 'quiz', sesion_id: id!, nombre: 'Quiz', clave: 'quiz', orden: 999 }];

  const statCards = [
    { icon: Target, label: 'Intentos Quiz', value: stats.intentos, gradient: 'from-primary/20 to-primary/5', borderColor: 'border-primary/30', iconColor: 'text-primary' },
    { icon: AlertTriangle, label: 'Errores', value: stats.errores, gradient: 'from-destructive/20 to-destructive/5', borderColor: 'border-destructive/30', iconColor: 'text-destructive' },
    { icon: Timer, label: 'Tiempo', value: formatTime(stats.tiempo), gradient: 'from-neon-orange/20 to-neon-orange/5', borderColor: 'border-neon-orange/30', iconColor: 'text-neon-orange' },
    { icon: Trophy, label: 'Correctas', value: `${stats.correctasTotal}/150`, gradient: 'from-neon-mint/20 to-neon-mint/5', borderColor: 'border-neon-mint/30', iconColor: 'text-neon-mint' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5 shrink-0 hover:bg-primary/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold truncate text-foreground">
            Sesión {sesion.numero}: {sesion.titulo}
          </h1>
          {sesion.descripcion && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{sesion.descripcion}</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {statCards.map(({ icon: Icon, label, value, gradient, borderColor, iconColor }) => (
          <Card key={label} className={`border ${borderColor} bg-gradient-to-br ${gradient} backdrop-blur-sm`}>
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center mx-auto mb-1.5`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-lg font-bold font-display text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progreso de la Sesión</span>
            <span className="text-sm font-bold font-display text-primary">{sessionProgress}%</span>
          </div>
          <div className="relative">
            <Progress value={sessionProgress} className="h-2.5" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
            <span>Ejercicios (40%)</span>
            <span>Quiz (60%)</span>
          </div>
        </CardContent>
      </Card>

      {/* 80% Message */}
      <AnimatePresence>
        {show80Message && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-4 rounded-xl bg-neon-mint/10 border border-neon-mint/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-mint/20 flex items-center justify-center shrink-0">
                <PartyPopper className="w-5 h-5 text-neon-mint" />
              </div>
              <div>
                <p className="text-sm font-bold text-neon-mint font-display">¡Felicitaciones! Llevas {sessionProgress}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Para completar: responde 20 ejercicios correctamente y alcanza 150/200 correctas en el quiz.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Tabs value={activeTab || allTabs[0]?.clave} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          {allTabs.map(tab => {
            const TabIcon = TAB_ICONS[tab.clave];
            return (
              <TabsTrigger
                key={tab.clave}
                value={tab.clave}
                className="gap-1.5 text-xs md:text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                {tab.nombre}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {pestanas.map(tab => {
          const groups = getGroupedContent(tab.clave);
          const hasExercises = tab.clave === 'ejercicio';

          return (
            <TabsContent key={tab.clave} value={tab.clave} className="space-y-3 mt-5">
              {Array.from(groups.entries()).map(([groupName, items]) => {
                if (!groupName) {
                  return items.map((item, i) => (
                    <ContentItem
                      key={item.id}
                      item={item}
                      index={i}
                      showSolutions={showSolutions}
                      onToggleSolution={(id) => setShowSolutions(prev => ({ ...prev, [id]: !prev[id] }))}
                    />
                  ));
                }
                const isOpen = openGroup === `${tab.clave}::${groupName}`;
                return (
                  <Collapsible key={groupName} open={isOpen} onOpenChange={(open) => setOpenGroup(open ? `${tab.clave}::${groupName}` : null)}>
                    <CollapsibleTrigger className="flex items-center gap-2.5 w-full p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all group">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ChevronDown className={`w-4 h-4 text-primary transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                      </div>
                      <span className="font-display font-semibold text-sm text-foreground">{groupName}</span>
                      <span className="text-xs text-muted-foreground ml-auto bg-muted/60 px-2 py-0.5 rounded-full">{items.length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2.5 pl-4 border-l-2 border-primary/20 ml-3.5 mt-2">
                      {items.map((item, i) => (
                        <ContentItem
                          key={item.id}
                          item={item}
                          index={i}
                          showSolutions={showSolutions}
                          onToggleSolution={(id) => setShowSolutions(prev => ({ ...prev, [id]: !prev[id] }))}
                        />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {Array.from(groups.values()).flat().length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No hay contenido aún</p>
                </div>
              )}

              {hasExercises && (
                <>
                  <Button
                    onClick={generateAIExercise}
                    disabled={aiLoading}
                    className="w-full gap-2.5 h-12 rounded-xl bg-gradient-to-r from-neon-fuchsia/20 to-neon-violet/20 border border-neon-fuchsia/30 text-foreground hover:from-neon-fuchsia/30 hover:to-neon-violet/30 transition-all"
                    variant="outline"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-neon-fuchsia" />}
                    {aiLoading ? 'Generando ejercicio...' : 'Generar ejercicio con IA'}
                  </Button>
                  <AnimatePresence>
                    {aiExercise && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="border-neon-fuchsia/30 bg-gradient-to-br from-neon-fuchsia/5 to-neon-violet/5 overflow-hidden">
                          <CardContent className="p-4 md:p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-neon-fuchsia/15 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-neon-fuchsia" />
                              </div>
                              <h3 className="font-display font-bold text-sm text-foreground">🤖 {aiExercise.titulo}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">{aiExercise.enunciado}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAiSolution(!showAiSolution)}
                              className="gap-2 border-neon-mint/30 hover:bg-neon-mint/10"
                            >
                              {showAiSolution ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {showAiSolution ? 'Ocultar' : 'Ver solución'}
                            </Button>
                            <AnimatePresence>
                              {showAiSolution && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 rounded-xl bg-neon-mint/10 border border-neon-mint/20 text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
                                    {aiExercise.solucion}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
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

        <TabsContent value="quiz" className="mt-5">
          {id && user && <QuizComponent sesionId={id} userId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
