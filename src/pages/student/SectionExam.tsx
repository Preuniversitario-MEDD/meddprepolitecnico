import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Timer, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamQuestion {
  id: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  imagen_url: string | null;
}

const EXAM_BLOCKS = [
  { tipo: 'exam_1_3', sessions: [1, 2, 3], label: 'Secciones 1-3' },
  { tipo: 'exam_4_6', sessions: [4, 5, 6], label: 'Secciones 4-6' },
  { tipo: 'exam_7_9', sessions: [7, 8, 9], label: 'Secciones 7-9' },
  { tipo: 'exam_10_12', sessions: [10, 11, 12], label: 'Secciones 10-12' },
  { tipo: 'exam_13_14', sessions: [13, 14], label: 'Secciones 13-14' },
];

export default function SectionExam() {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(50 * 60); // 50 min
  const [state, setState] = useState<'loading' | 'playing' | 'results'>('loading');
  const [score, setScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const block = EXAM_BLOCKS.find(b => b.tipo === tipo);

  useEffect(() => {
    if (block && user) loadExamQuestions();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tipo, user]);

  async function loadExamQuestions() {
    // Get session IDs for the block
    const { data: sesiones } = await supabase.from('sesiones').select('id, numero').in('numero', block!.sessions);
    if (!sesiones) return;
    const sesionIds = sesiones.map(s => s.id);

    // Get all questions from those sessions
    const { data: allQ } = await supabase.from('quiz_preguntas').select('*').in('sesion_id', sesionIds);
    if (!allQ || allQ.length === 0) return;

    // Shuffle and pick 30
    const shuffled = allQ.sort(() => Math.random() - 0.5).slice(0, 30);
    setQuestions(shuffled.map(q => ({
      id: q.id,
      pregunta: q.pregunta,
      opciones: (q.opciones as string[]) || [],
      respuesta_correcta: q.respuesta_correcta,
      imagen_url: q.imagen_url,
    })));
    setState('playing');
    startTimer();
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { finishExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleAnswer(index: number) {
    if (selected !== null) return;
    setSelected(index);
    const correct = index === questions[currentIndex].respuesta_correcta;
    if (correct) setScore(prev => prev + 1);
    setAnswers(prev => [...prev, { questionId: questions[currentIndex].id, correct }]);

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        finishExam();
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelected(null);
      }
    }, 1000);
  }

  async function finishExam() {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('results');
    const finalScore = Math.round((score / questions.length) * 100);
    const aprobado = finalScore >= 80;

    if (user) {
      await supabase.from('examenes').insert({
        user_id: user.id,
        tipo: tipo!,
        puntaje: finalScore,
        aprobado,
        respuestas: answers,
      });
    }

    if (aprobado) {
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const currentQ = questions[currentIndex];
  const timerWarn = timeLeft < 300;

  if (state === 'loading') return <div className="p-6 text-center text-muted-foreground">Cargando examen...</div>;

  if (state === 'results') {
    const finalPct = Math.round((score / questions.length) * 100);
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/student')} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <h1 className="text-3xl font-display font-bold">
            {finalPct >= 80 ? '🎉 ¡Examen Aprobado!' : '😔 No aprobado'}
          </h1>
          <p className="text-5xl font-bold text-gradient-primary">{finalPct}/100</p>
          <p className="text-muted-foreground">Necesitas 80/100 para aprobar</p>
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-accent" /> {score} correctas</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-destructive" /> {questions.length - score} incorrectas</span>
          </div>
          {finalPct < 80 && <Button onClick={() => navigate('/student')} className="gradient-primary text-primary-foreground">Volver al Dashboard</Button>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display font-bold">Examen: {block?.label}</h1>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${timerWarn ? 'bg-destructive/20 text-destructive' : 'bg-muted'}`}>
          {timerWarn && <AlertTriangle className="w-4 h-4" />}
          <Timer className="w-4 h-4" />
          <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">Pregunta {currentIndex + 1} de {questions.length} · No puedes retroceder</p>

      {currentQ && (
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="card-elevated">
            <CardContent className="p-4 md:p-6">
              <p className="font-display font-bold text-base md:text-lg mb-4">{currentQ.pregunta}</p>
              {currentQ.imagen_url && <img src={currentQ.imagen_url} alt="Pregunta" className="rounded-lg mb-4 max-w-full h-auto" />}
              <div className="space-y-2">
                {currentQ.opciones.map((op, i) => {
                  let bg = 'bg-card hover:bg-muted';
                  if (selected !== null) {
                    if (i === currentQ.respuesta_correcta) bg = 'bg-accent/20 border-accent';
                    else if (i === selected) bg = 'bg-destructive/20 border-destructive';
                  }
                  return (
                    <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm text-foreground ${bg} ${selected === null ? 'cursor-pointer' : 'cursor-default'}`}>
                      <span className="font-medium mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{op}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
