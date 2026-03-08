import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, SkipForward, Users, Trophy, Crown, Medal, Award, Zap, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Competencia {
  id: string; titulo: string; pin: string; modo: string; estado: string;
  pregunta_actual: number; tiempo_por_pregunta: number;
}
interface Pregunta {
  id: string; orden: number; pregunta: string; imagen_url?: string;
  opciones: string[]; respuesta_correcta: number; tiempo: number;
}
interface Participante {
  id: string; user_id: string; nombre: string; avatar_url?: string;
  puntaje: number; racha: number; mejor_racha: number;
}

export default function AdminCompetenciaLive() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comp, setComp] = useState<Competencia | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [timer, setTimer] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, { correcta: boolean; respuesta: number }>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [{ data: c }, { data: q }, { data: p }] = await Promise.all([
      supabase.from('competencias').select('*').eq('id', id).single(),
      supabase.from('competencia_preguntas').select('*').eq('competencia_id', id).order('orden'),
      supabase.from('competencia_participantes').select('*').eq('competencia_id', id).order('puntaje', { ascending: false }),
    ]);
    setComp(c as Competencia);
    setPreguntas((q as Pregunta[]) || []);
    setParticipantes((p as Participante[]) || []);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime participants & answers
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`comp-admin-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competencia_participantes', filter: `competencia_id=eq.${id}` }, () => {
        supabase.from('competencia_participantes').select('*').eq('competencia_id', id).order('puntaje', { ascending: false })
          .then(({ data }) => setParticipantes((data as Participante[]) || []));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competencia_respuestas', filter: `competencia_id=eq.${id}` }, (payload) => {
        const ans = payload.new as any;
        setQuestionAnswers(prev => ({ ...prev, [ans.user_id]: { correcta: ans.correcta, respuesta: ans.respuesta } }));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Timer
  useEffect(() => {
    if (comp?.estado !== 'en_curso' || showResults) return;
    const currentQ = preguntas[comp.pregunta_actual];
    if (!currentQ) return;
    setTimer(currentQ.tiempo);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [comp?.estado, comp?.pregunta_actual, preguntas, showResults]);

  async function startGame() {
    if (!id) return;
    await supabase.from('competencias').update({ estado: 'en_curso', pregunta_actual: 0 }).eq('id', id);
    setShowResults(false);
    setQuestionAnswers({});
    loadData();
  }

  async function nextQuestion() {
    if (!comp || !id) return;
    const next = comp.pregunta_actual + 1;
    if (next >= preguntas.length) {
      await supabase.from('competencias').update({ estado: 'finalizada' }).eq('id', id);
      confetti({ particleCount: 200, spread: 100 });
      loadData();
      return;
    }
    await supabase.from('competencias').update({ pregunta_actual: next }).eq('id', id);
    setShowResults(false);
    setQuestionAnswers({});
    setComp(prev => prev ? { ...prev, pregunta_actual: next } : null);
  }

  async function applyPowerup(type: string) {
    if (!comp || !id) return;
    if (type === 'freeze') {
      // Freeze timer - add 10 seconds
      setTimer(prev => prev + 10);
      toast({ title: '❄️ Tiempo congelado +10s para todos' });
    } else if (type === 'x5_penalty') {
      toast({ title: '💀 x5 penalización activa para errores' });
    }
  }

  if (!comp) return <div className="p-6 text-center text-muted-foreground">Cargando...</div>;

  const currentQ = preguntas[comp.pregunta_actual];
  const sorted = [...participantes].sort((a, b) => b.puntaje - a.puntaje);
  const answeredCount = Object.keys(questionAnswers).length;

  // Finished state
  if (comp.estado === 'finalizada') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/competencias')}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-2xl font-display font-bold">🏆 Resultados: {comp.titulo}</h1>
        </div>
        {/* Podium */}
        <div className="flex justify-center items-end gap-4 py-8">
          {[1, 0, 2].map(pos => {
            const p = sorted[pos];
            if (!p) return null;
            const heights = ['h-32', 'h-24', 'h-20'];
            const icons = [<Crown key="c" className="w-8 h-8 text-[hsl(var(--neon-orange))]" />, <Medal key="m" className="w-6 h-6 text-muted-foreground" />, <Award key="a" className="w-6 h-6 text-[hsl(var(--neon-orange))]/60" />];
            const actualPos = pos === 1 ? 0 : pos === 0 ? 1 : 2;
            return (
              <motion.div key={p.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: actualPos * 0.3 }}
                className="flex flex-col items-center gap-2">
                {icons[actualPos]}
                <Avatar className="w-12 h-12 border-2 border-primary">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">{p.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="font-display font-bold text-sm">{p.nombre}</p>
                <div className={`w-20 ${heights[actualPos]} rounded-t-lg gradient-primary flex items-center justify-center`}>
                  <span className="text-primary-foreground font-bold text-lg">{p.puntaje}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        {/* Full leaderboard */}
        <Card className="card-elevated">
          <CardContent className="p-4 space-y-2">
            {sorted.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="font-bold text-primary w-6 text-center">{i + 1}</span>
                <span className="flex-1 font-medium text-sm">{p.nombre}</span>
                <span className="text-xs text-muted-foreground">🔥 {p.mejor_racha}</span>
                <span className="font-bold text-primary">{p.puntaje} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/competencias')}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-display font-bold flex-1">{comp.titulo}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" /> {participantes.length}
        </div>
      </div>

      {/* Lobby */}
      {comp.estado === 'lobby' && (
        <div className="text-center space-y-6 py-8">
          <div className="space-y-2">
            <p className="text-muted-foreground">PIN de acceso</p>
            <p className="text-6xl font-mono font-bold tracking-[0.3em] text-primary">{comp.pin}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {participantes.map(p => (
              <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-muted/50 rounded-full px-3 py-1.5 text-sm font-medium">
                {p.nombre}
              </motion.div>
            ))}
          </div>
          {participantes.length > 0 && (
            <Button size="lg" className="gradient-primary text-primary-foreground gap-2 text-lg px-8" onClick={startGame}>
              <Play className="w-5 h-5" /> ¡Iniciar! ({preguntas.length} preguntas)
            </Button>
          )}
        </div>
      )}

      {/* In-game */}
      {comp.estado === 'en_curso' && currentQ && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pregunta {comp.pregunta_actual + 1}/{preguntas.length}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Timer className={`w-4 h-4 ${timer <= 5 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                <span className={`font-mono font-bold ${timer <= 5 ? 'text-destructive text-xl' : ''}`}>{timer}s</span>
              </div>
              <span className="text-xs bg-muted rounded-full px-2 py-1">{answeredCount}/{participantes.length} respondieron</span>
            </div>
          </div>

          <Progress value={((comp.pregunta_actual + 1) / preguntas.length) * 100} className="h-2" />

          {/* Question */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <h2 className="text-xl font-display font-bold text-center">{currentQ.pregunta}</h2>
              {currentQ.imagen_url && <img src={currentQ.imagen_url} alt="" className="max-h-48 mx-auto mt-4 rounded-lg" />}
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {currentQ.opciones.map((opt, i) => {
              const colors = ['bg-[hsl(var(--neon-pink))]/20 border-[hsl(var(--neon-pink))]', 'bg-[hsl(var(--neon-blue))]/20 border-[hsl(var(--neon-blue))]', 'bg-[hsl(var(--neon-mint))]/20 border-[hsl(var(--neon-mint))]', 'bg-[hsl(var(--neon-orange))]/20 border-[hsl(var(--neon-orange))]', 'bg-[hsl(var(--neon-violet))]/20 border-[hsl(var(--neon-violet))]', 'bg-[hsl(var(--neon-fuchsia))]/20 border-[hsl(var(--neon-fuchsia))]'];
              const isCorrect = i === currentQ.respuesta_correcta;
              return (
                <div key={i} className={`p-4 rounded-xl border-2 text-center font-medium transition-all ${showResults ? (isCorrect ? 'bg-[hsl(var(--neon-mint))]/30 border-[hsl(var(--neon-mint))] ring-2 ring-[hsl(var(--neon-mint))]' : 'opacity-40') : colors[i % colors.length]}`}>
                  <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt as string}
                </div>
              );
            })}
          </div>

          {/* Admin controls */}
          <div className="flex gap-2 justify-center">
            {showResults ? (
              <Button size="lg" className="gradient-primary text-primary-foreground gap-2" onClick={nextQuestion}>
                <SkipForward className="w-5 h-5" /> {comp.pregunta_actual + 1 >= preguntas.length ? 'Finalizar' : 'Siguiente'}
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowResults(true)}>Mostrar respuesta</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => applyPowerup('freeze')}>❄️ +10s</Button>
              </>
            )}
          </div>

          {/* Live leaderboard sidebar */}
          <Card className="card-elevated">
            <CardContent className="p-3">
              <p className="font-display font-bold text-sm mb-2 flex items-center gap-1"><Trophy className="w-4 h-4 text-primary" /> Clasificación</p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {sorted.slice(0, 10).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs py-1">
                    <span className={`w-5 text-center font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="flex-1 truncate">{p.nombre}</span>
                    {p.racha >= 3 && <span className="text-[hsl(var(--neon-orange))]">🔥{p.racha}</span>}
                    <span className="font-bold">{p.puntaje}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
