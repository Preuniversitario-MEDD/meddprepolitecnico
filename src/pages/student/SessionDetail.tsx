import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Brain, Eye, EyeOff, Sparkles, Loader2, Timer, Target, AlertTriangle, Trophy, PartyPopper } from 'lucide-react';
import QuizComponent from '@/components/quiz/QuizComponent';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;
type Sesion = Tables<'sesiones'>;

interface AIExercise {
  titulo: string;
  enunciado: string;
  solucion: string;
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [showSolutions, setShowSolutions] = useState<Record<string, boolean>>({});
  const [aiExercise, setAiExercise] = useState<AIExercise | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSolution, setShowAiSolution] = useState(false);
  const [stats, setStats] = useState({ intentos: 0, errores: 0, tiempo: 0, correctasTotal: 0 });
  const [sessionProgress, setSessionProgress] = useState(0);
  const [show80Message, setShow80Message] = useState(false);

  useEffect(() => { if (id) loadData(); }, [id]);

  async function loadData() {
    const { data: s } = await supabase.from('sesiones').select('*').eq('id', id!).single();
    setSesion(s);
    const { data: c } = await supabase.from('contenido').select('*').eq('sesion_id', id!).order('orden');
    setContenido(c || []);

    if (user) {
      const { data: prog } = await supabase.from('progreso_estudiante').select('*').eq('user_id', user.id).eq('sesion_id', id!).maybeSingle();
      if (prog) {
        const intentos = (prog as any).intentos_quiz || 0;
        const errores = (prog as any).errores_quiz || 0;
        const tiempo = (prog as any).tiempo_invertido || 0;
        const correctas = (prog as any).preguntas_correctas_total || 0;
        setStats({ intentos, errores, tiempo, correctasTotal: correctas });
        
        // Calculate session progress: exercises (40%) + quiz (60%)
        const ejerciciosProgress = Math.min(((prog as any).ejercicios_correctos || 0) / 20, 1) * 40;
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

  const teoria = contenido.filter(c => c.tipo === 'teoria');
  const trucos = contenido.filter(c => c.tipo === 'truco');
  const ejercicios = contenido.filter(c => c.tipo === 'ejercicio');
  const tabIcons = [BookOpen, Lightbulb, PenTool, Brain];
  const formatTime = (s: number) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };

  if (!sesion) return <div className="p-6 text-center text-muted-foreground">Cargando sesión...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-display font-bold truncate">Sesión {sesion.numero}: {sesion.titulo}</h1>
          <p className="text-sm text-muted-foreground">{sesion.descripcion}</p>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Session Progress */}
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

      {/* 80% Message */}
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

      {/* Tabs */}
      <Tabs defaultValue="teoria">
        <TabsList className="w-full grid grid-cols-4">
          {['teoria', 'trucos', 'ejercicios', 'quiz'].map((tab, i) => {
            const Icon = tabIcons[i];
            return (
              <TabsTrigger key={tab} value={tab} className="gap-1 text-xs md:text-sm">
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Teoría */}
        <TabsContent value="teoria" className="space-y-3 mt-4">
          {teoria.length === 0 && <p className="text-center text-muted-foreground py-8">No hay contenido teórico aún</p>}
          {teoria.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <h3 className="font-display font-bold text-sm mb-2">{item.titulo}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{item.texto}</p>
                  {item.imagen_url && <img src={item.imagen_url} alt={item.titulo} className="mt-3 rounded-lg max-w-full h-auto" />}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-secondary underline">Ver recurso →</a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* Trucos */}
        <TabsContent value="trucos" className="space-y-3 mt-4">
          {trucos.length === 0 && <p className="text-center text-muted-foreground py-8">No hay trucos aún</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {trucos.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                <Card className="card-elevated neon-border h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-sm">{item.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{item.texto}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Ejercicios */}
        <TabsContent value="ejercicios" className="space-y-3 mt-4">
          {ejercicios.length === 0 && <p className="text-center text-muted-foreground py-8">No hay ejercicios aún</p>}
          {ejercicios.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <h3 className="font-display font-bold text-sm mb-2">{item.titulo}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{item.texto}</p>
                  {item.imagen_url && <img src={item.imagen_url} alt={item.titulo} className="mt-3 rounded-lg max-w-full h-auto" />}
                  <Button variant="outline" size="sm"
                    onClick={() => setShowSolutions({ ...showSolutions, [item.id]: !showSolutions[item.id] })}
                    className="mt-3 gap-2">
                    {showSolutions[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showSolutions[item.id] ? 'Ocultar solución' : 'Ver solución'}
                  </Button>
                  <AnimatePresence>
                    {showSolutions[item.id] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="mt-2 p-3 rounded-lg bg-accent/10 text-sm overflow-hidden break-words max-w-full">
                        {(item as any).solucion || item.url || 'Solución no disponible'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* AI Exercise Generation */}
          <Button onClick={generateAIExercise} disabled={aiLoading} variant="outline" className="w-full gap-2 neon-border">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-neon-fuchsia" />}
            {aiLoading ? 'Generando...' : 'Generar ejercicio con IA'}
          </Button>

          {/* AI Generated Exercise */}
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
        </TabsContent>

        {/* Quiz */}
        <TabsContent value="quiz" className="mt-4">
          {id && user && <QuizComponent sesionId={id} userId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
