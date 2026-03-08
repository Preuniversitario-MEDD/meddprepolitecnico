import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Zap, Trophy, Crown, Medal, Award, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useGameSounds } from '@/hooks/useGameSounds';

interface Competencia {
  id: string; titulo: string; pin: string; modo: string; estado: string;
  pregunta_actual: number; tiempo_por_pregunta: number;
}
interface Pregunta {
  id: string; orden: number; pregunta: string; imagen_url?: string;
  opciones: string[]; respuesta_correcta: number; tiempo: number;
}
interface Participante {
  id: string; user_id: string; nombre: string; puntaje: number;
  racha: number; mejor_racha: number; powerups: any;
}

const OPTION_COLORS = [
  'bg-[hsl(var(--neon-pink))]/20 border-[hsl(var(--neon-pink))] hover:bg-[hsl(var(--neon-pink))]/40',
  'bg-[hsl(var(--neon-blue))]/20 border-[hsl(var(--neon-blue))] hover:bg-[hsl(var(--neon-blue))]/40',
  'bg-[hsl(var(--neon-mint))]/20 border-[hsl(var(--neon-mint))] hover:bg-[hsl(var(--neon-mint))]/40',
  'bg-[hsl(var(--neon-orange))]/20 border-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/40',
  'bg-[hsl(var(--neon-violet))]/20 border-[hsl(var(--neon-violet))] hover:bg-[hsl(var(--neon-violet))]/40',
  'bg-[hsl(var(--neon-fuchsia))]/20 border-[hsl(var(--neon-fuchsia))] hover:bg-[hsl(var(--neon-fuchsia))]/40',
];

export default function StudentCompetencia() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { play: playSound } = useNotificationSound();
  const { playCorrect, playIncorrect, playPodium, playCountdown, playPowerup } = useGameSounds();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [comp, setComp] = useState<Competencia | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [myParticipant, setMyParticipant] = useState<Participante | null>(null);
  const [joined, setJoined] = useState(false);
  const [timer, setTimer] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [x2Active, setX2Active] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Join by PIN
  async function joinByPin() {
    if (!pin.trim() || !user || !profile) return;
    const { data: c } = await supabase.from('competencias').select('*').eq('pin', pin.trim()).single();
    if (!c) { toast({ title: 'PIN inválido', variant: 'destructive' }); return; }
    if ((c as any).estado === 'finalizada') { toast({ title: 'Esta competencia ya finalizó', variant: 'destructive' }); return; }

    // Join
    const nombre = `${profile.nombre} ${profile.apellidos}`.trim();
    await supabase.from('competencia_participantes').upsert({
      competencia_id: c.id, user_id: user.id, nombre, avatar_url: profile.avatar_url,
    }, { onConflict: 'competencia_id,user_id' });

    setComp(c as Competencia);
    setJoined(true);
    loadGameData(c.id);
  }

  const loadGameData = useCallback(async (compId: string) => {
    const [{ data: q }, { data: p }] = await Promise.all([
      supabase.from('competencia_preguntas').select('*').eq('competencia_id', compId).order('orden'),
      supabase.from('competencia_participantes').select('*').eq('competencia_id', compId).order('puntaje', { ascending: false }),
    ]);
    setPreguntas((q as unknown as Pregunta[]) || []);
    setParticipantes((p as unknown as Participante[]) || []);
    if (user) {
      const me = (p as unknown as Participante[])?.find(x => x.user_id === user.id);
      setMyParticipant(me || null);
    }
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!comp?.id) return;
    const ch = supabase.channel(`comp-student-${comp.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'competencias', filter: `id=eq.${comp.id}` }, (payload) => {
        const updated = payload.new as Competencia;
        setComp(updated);
        if (updated.estado === 'en_curso') {
          setAnswered(false);
          setSelectedAnswer(null);
          setShowResult(false);
          setHiddenOptions([]);
          setX2Active(false);
          setQuestionStartTime(Date.now());
          playSound();
        }
        if (updated.estado === 'finalizada') {
          confetti({ particleCount: 200, spread: 100 });
          playPodium();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competencia_participantes', filter: `competencia_id=eq.${comp.id}` }, () => {
        loadGameData(comp.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [comp?.id, loadGameData, playSound]);

  // Timer
  useEffect(() => {
    if (!comp || comp.estado !== 'en_curso' || answered) return;
    const currentQ = preguntas[comp.pregunta_actual];
    if (!currentQ) return;
    setTimer(currentQ.tiempo);
    setQuestionStartTime(Date.now());
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setAnswered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [comp?.estado, comp?.pregunta_actual, preguntas]);

  async function submitAnswer(optionIndex: number) {
    if (answered || !comp || !user) return;
    setAnswered(true);
    setSelectedAnswer(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQ = preguntas[comp.pregunta_actual];
    const correcta = optionIndex === currentQ.respuesta_correcta;
    const timeMs = Date.now() - questionStartTime;
    const maxTime = currentQ.tiempo * 1000;
    const speedBonus = Math.max(0, Math.round((1 - timeMs / maxTime) * 500));
    let puntaje = correcta ? 1000 + speedBonus : 0;
    if (x2Active && correcta) puntaje *= 2;

    const newRacha = correcta ? (myParticipant?.racha || 0) + 1 : 0;
    const streakBonus = correcta && newRacha >= 3 ? newRacha * 50 : 0;
    puntaje += streakBonus;

    await supabase.from('competencia_respuestas').insert({
      competencia_id: comp.id, pregunta_id: currentQ.id, user_id: user.id,
      respuesta: optionIndex, correcta, tiempo_ms: timeMs, puntaje,
    });

    // Update participant score
    const newTotal = (myParticipant?.puntaje || 0) + puntaje;
    const mejorRacha = Math.max(myParticipant?.mejor_racha || 0, newRacha);
    await supabase.from('competencia_participantes').update({
      puntaje: newTotal, racha: newRacha, mejor_racha: mejorRacha,
    }).eq('competencia_id', comp.id).eq('user_id', user.id);

    setShowResult(true);
    if (correcta) {
      playCorrect();
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } else {
      playIncorrect();
    }
  }

  async function usePowerup(type: 'freeze' | 'fifty' | 'x2') {
    if (!myParticipant || !comp) return;
    const pups = myParticipant.powerups || { freeze: 1, fifty: 1, x2: 1 };
    if ((pups as any)[type] <= 0) { toast({ title: 'Sin usos disponibles', variant: 'destructive' }); return; }

    const updatedPups = { ...pups, [type]: (pups as any)[type] - 1 };

    if (type === 'fifty') {
      const currentQ = preguntas[comp.pregunta_actual];
      const wrongIndices = currentQ.opciones.map((_, i) => i).filter(i => i !== currentQ.respuesta_correcta);
      const toHide = wrongIndices.sort(() => Math.random() - 0.5).slice(0, Math.ceil(wrongIndices.length / 2));
      setHiddenOptions(toHide);
      playPowerup();
      toast({ title: '🎯 50/50 activado' });
    } else if (type === 'x2') {
      setX2Active(true);
      playPowerup();
      toast({ title: '✨ x2 activado para esta pregunta' });
    } else if (type === 'freeze') {
      setTimer(prev => prev + 5);
      toast({ title: '❄️ +5 segundos' });
    }

    await supabase.from('competencia_participantes').update({ powerups: updatedPups })
      .eq('competencia_id', comp.id).eq('user_id', user!.id);
    setMyParticipant(prev => prev ? { ...prev, powerups: updatedPups } : null);
  }

  // Not joined yet
  if (!joined) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[70vh]">
        <Card className="card-elevated w-full max-w-sm">
          <CardContent className="p-6 space-y-6 text-center">
            <Zap className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-2xl font-display font-bold">Competencia en Vivo</h1>
            <p className="text-muted-foreground text-sm">Ingresa el PIN para unirte</p>
            <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" className="text-center text-3xl font-mono tracking-[0.5em] h-16"
              maxLength={6} onKeyDown={e => e.key === 'Enter' && joinByPin()} />
            <Button onClick={joinByPin} className="w-full gradient-primary text-primary-foreground text-lg h-12" disabled={pin.length < 6}>
              Unirse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!comp) return null;

  const currentQ = preguntas[comp.pregunta_actual];
  const sorted = [...participantes].sort((a, b) => b.puntaje - a.puntaje);
  const myRank = sorted.findIndex(p => p.user_id === user?.id) + 1;
  const pups = myParticipant?.powerups || { freeze: 1, fifty: 1, x2: 1 };

  // Lobby
  if (comp.estado === 'lobby') {
    return (
      <div className="p-4 md:p-6 text-center space-y-6 min-h-[70vh] flex flex-col items-center justify-center">
        <Zap className="w-16 h-16 text-primary animate-pulse" />
        <h1 className="text-2xl font-display font-bold">{comp.titulo}</h1>
        <p className="text-muted-foreground">Esperando que el profesor inicie...</p>
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {participantes.map(p => (
            <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${p.user_id === user?.id ? 'gradient-primary text-primary-foreground' : 'bg-muted/50'}`}>
              {p.nombre}
            </motion.div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground"><strong>{participantes.length}</strong> jugadores conectados</p>
      </div>
    );
  }

  // Finished
  if (comp.estado === 'finalizada') {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-display font-bold text-center">🏆 {comp.titulo}</h1>
        {/* Podium */}
        <div className="flex justify-center items-end gap-4 py-6">
          {[1, 0, 2].map(pos => {
            const p = sorted[pos]; if (!p) return null;
            const heights = ['h-28', 'h-20', 'h-16'];
            const icons = [<Crown key="c" className="w-8 h-8 text-[hsl(var(--neon-orange))]" />, <Medal key="m" className="w-6 h-6 text-muted-foreground" />, <Award key="a" className="w-6 h-6 text-[hsl(var(--neon-orange))]/60" />];
            const actualPos = pos === 1 ? 0 : pos === 0 ? 1 : 2;
            const isMe = p.user_id === user?.id;
            return (
              <motion.div key={p.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: actualPos * 0.3 }}
                className={`flex flex-col items-center gap-1 ${isMe ? 'scale-110' : ''}`}>
                {icons[actualPos]}
                <p className={`font-display font-bold text-xs ${isMe ? 'text-primary' : ''}`}>{p.nombre}</p>
                <div className={`w-16 ${heights[actualPos]} rounded-t-lg gradient-primary flex items-center justify-center`}>
                  <span className="text-primary-foreground font-bold">{p.puntaje}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-sm">Tu posición: <strong className="text-primary">#{myRank}</strong> de {sorted.length}</p>
        <Button variant="outline" className="mx-auto block" onClick={() => { setJoined(false); setComp(null); setPin(''); }}>
          Volver
        </Button>
      </div>
    );
  }

  // In-game
  if (!currentQ) return null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{comp.pregunta_actual + 1}/{preguntas.length}</span>
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${timer <= 5 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          <span className={`font-mono font-bold ${timer <= 5 ? 'text-destructive text-2xl' : 'text-lg'}`}>{timer}</span>
        </div>
        <div className="text-xs text-right">
          <span className="text-primary font-bold">{myParticipant?.puntaje || 0}</span> pts
          {(myParticipant?.racha || 0) >= 3 && <span className="ml-1 text-[hsl(var(--neon-orange))]">🔥{myParticipant?.racha}</span>}
        </div>
      </div>

      <Progress value={((comp.pregunta_actual + 1) / preguntas.length) * 100} className="h-1.5" />

      {/* Question */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <h2 className="text-lg font-display font-bold text-center">{currentQ.pregunta}</h2>
          {currentQ.imagen_url && <img src={currentQ.imagen_url} alt="" className="max-h-40 mx-auto mt-3 rounded-lg" />}
        </CardContent>
      </Card>

      {/* Power-ups */}
      {!answered && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" disabled={pups.freeze <= 0} onClick={() => usePowerup('freeze')}>
            ❄️ Congelar ({pups.freeze})
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" disabled={pups.fifty <= 0} onClick={() => usePowerup('fifty')}>
            🎯 50/50 ({pups.fifty})
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" disabled={pups.x2 <= 0} onClick={() => usePowerup('x2')}>
            ✨ x2 ({pups.x2})
          </Button>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence>
          {currentQ.opciones.map((opt, i) => {
            if (hiddenOptions.includes(i)) return null;
            const isCorrect = i === currentQ.respuesta_correcta;
            const isSelected = selectedAnswer === i;
            let classes = OPTION_COLORS[i % OPTION_COLORS.length];
            if (showResult) {
              if (isCorrect) classes = 'bg-[hsl(var(--neon-mint))]/40 border-[hsl(var(--neon-mint))] ring-2 ring-[hsl(var(--neon-mint))]';
              else if (isSelected && !isCorrect) classes = 'bg-destructive/20 border-destructive';
              else classes = 'opacity-40 border-border';
            } else if (isSelected) {
              classes += ' ring-2 ring-primary';
            }
            return (
              <motion.button key={i} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                disabled={answered} onClick={() => submitAnswer(i)}
                className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${classes}`}>
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt as string}
                {showResult && isCorrect && <span className="ml-2">✅</span>}
                {showResult && isSelected && !isCorrect && <span className="ml-2">❌</span>}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Result feedback */}
      {showResult && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-2">
          {selectedAnswer === currentQ.respuesta_correcta ? (
            <p className="text-lg font-display font-bold text-[hsl(var(--neon-mint))]">
              ¡Correcto! {x2Active && '(x2)'} {(myParticipant?.racha || 0) >= 3 && `🔥 Racha de ${myParticipant?.racha}`}
            </p>
          ) : (
            <p className="text-lg font-display font-bold text-destructive">Incorrecto</p>
          )}
        </motion.div>
      )}

      {answered && !showResult && (
        <p className="text-center text-muted-foreground animate-pulse">Esperando resultados...</p>
      )}

      {/* Mini leaderboard */}
      <Card className="card-elevated">
        <CardContent className="p-3">
          <p className="font-display font-bold text-xs mb-2">🏆 Top 5</p>
          {sorted.slice(0, 5).map((p, i) => (
            <div key={p.id} className={`flex items-center gap-2 text-xs py-1 ${p.user_id === user?.id ? 'text-primary font-bold' : ''}`}>
              <span className="w-4 text-center">{i + 1}</span>
              <span className="flex-1 truncate">{p.nombre}</span>
              <span>{p.puntaje}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
