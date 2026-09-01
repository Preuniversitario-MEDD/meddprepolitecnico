import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Lightbulb, RotateCcw, Check, X, Trophy, Timer } from 'lucide-react';
import { calcularSrs, esVencida, barajar, normalizar, type Calidad } from '@/lib/srs';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const db = supabase as any;

type Tarjeta = { id: string; frente: string; reverso: string; pista: string | null; orden: number };
type Prog = { tarjeta_id: string; facilidad: number; intervalo_dias: number; repeticiones: number; proxima_revision: string; aciertos: number; fallos: number };
type Modo = 'tarjetas' | 'aprender' | 'test' | 'emparejar';

export default function EstudioMazo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mazo, setMazo] = useState<{ titulo: string } | null>(null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [prog, setProg] = useState<Record<string, Prog>>({});
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<Modo>('tarjetas');
  const inicio = useRef(Date.now());

  useEffect(() => {
    (async () => {
      if (!id || !user) return;
      setLoading(true);
      const [{ data: m }, { data: t }, { data: p }] = await Promise.all([
        db.from('estudio_mazos').select('titulo').eq('id', id).maybeSingle(),
        db.from('estudio_tarjetas').select('*').eq('mazo_id', id).order('orden'),
        db.from('estudio_progreso').select('*').eq('mazo_id', id).eq('user_id', user.id),
      ]);
      setMazo(m || null);
      setTarjetas(t || []);
      const map: Record<string, Prog> = {};
      (p || []).forEach((r: any) => { map[r.tarjeta_id] = r; });
      setProg(map);
      setLoading(false);
    })();
  }, [id, user?.id]);

  const guardarRepaso = useCallback(async (tarjeta_id: string, calidad: Calidad) => {
    if (!user || !id) return;
    const prev = prog[tarjeta_id];
    const base = { facilidad: prev?.facilidad ?? 2.5, intervalo_dias: prev?.intervalo_dias ?? 0, repeticiones: prev?.repeticiones ?? 0 };
    const r = calcularSrs(base, calidad);
    const row = {
      user_id: user.id, tarjeta_id, mazo_id: id,
      facilidad: r.facilidad, intervalo_dias: r.intervalo_dias, repeticiones: r.repeticiones,
      estado: r.estado, proxima_revision: r.proxima_revision, ultima_revision: new Date().toISOString(),
      aciertos: (prev?.aciertos ?? 0) + (calidad > 0 ? 1 : 0),
      fallos: (prev?.fallos ?? 0) + (calidad === 0 ? 1 : 0),
    };
    setProg(s => ({ ...s, [tarjeta_id]: row as any }));
    await db.from('estudio_progreso').upsert(row, { onConflict: 'user_id,tarjeta_id' });
  }, [user, id, prog]);

  const registrarSesion = useCallback(async (vistas: number, aciertos: number) => {
    if (!user || !id || vistas === 0) return;
    await db.from('estudio_sesiones').insert({
      user_id: user.id, mazo_id: id, modo, tarjetas_vistas: vistas, aciertos,
      duracion_segundos: Math.round((Date.now() - inicio.current) / 1000),
    });
  }, [user, id, modo]);

  const pendientes = useMemo(
    () => tarjetas.filter(t => esVencida(prog[t.id]?.proxima_revision)),
    [tarjetas, prog]
  );
  const dominadas = useMemo(
    () => tarjetas.filter(t => (prog[t.id]?.intervalo_dias ?? 0) >= 21).length,
    [tarjetas, prog]
  );

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!mazo) return <Card className="p-10 text-center">Mazo no encontrado.</Card>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student/estudio')}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">{mazo.titulo}</h1>
          <p className="text-xs text-muted-foreground">
            {tarjetas.length} tarjetas · {pendientes.length} por repasar · {dominadas} dominadas
          </p>
        </div>
      </div>

      <Progress value={tarjetas.length ? (dominadas / tarjetas.length) * 100 : 0} className="h-2" />

      <Tabs value={modo} onValueChange={v => { setModo(v as Modo); inicio.current = Date.now(); }}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
          <TabsTrigger value="aprender">Aprender</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="emparejar">Emparejar</TabsTrigger>
        </TabsList>
      </Tabs>

      {tarjetas.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Este mazo no tiene tarjetas.</Card>
      ) : modo === 'tarjetas' ? (
        <ModoTarjetas tarjetas={tarjetas} onCalificar={guardarRepaso} onFin={registrarSesion} />
      ) : modo === 'aprender' ? (
        <ModoAprender tarjetas={pendientes.length ? pendientes : tarjetas} onCalificar={guardarRepaso} onFin={registrarSesion} />
      ) : modo === 'test' ? (
        <ModoTest tarjetas={tarjetas} onCalificar={guardarRepaso} onFin={registrarSesion} />
      ) : (
        <ModoEmparejar tarjetas={tarjetas} onFin={registrarSesion} />
      )}
    </div>
  );
}

/* ---------------- Modo Tarjetas (flip clásico) ---------------- */
function ModoTarjetas({ tarjetas, onCalificar, onFin }: {
  tarjetas: Tarjeta[]; onCalificar: (id: string, c: Calidad) => void; onFin: (v: number, a: number) => void;
}) {
  const [orden] = useState(() => barajar(tarjetas));
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const t = orden[i];

  const siguiente = (c: Calidad) => {
    onCalificar(t.id, c);
    if (c > 0) setAciertos(a => a + 1);
    setFlip(false);
    if (i + 1 >= orden.length) { onFin(orden.length, aciertos + (c > 0 ? 1 : 0)); confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } }); setI(0); }
    else setI(i + 1);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">Tarjeta {i + 1} de {orden.length}</p>
      <div className="perspective-1000" onClick={() => setFlip(f => !f)}>
        <motion.div
          key={t.id + String(flip)}
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="min-h-[220px] flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer border-primary/30">
            <Badge variant="secondary">{flip ? 'Respuesta' : 'Pregunta'}</Badge>
            <p className="text-lg md:text-xl font-medium whitespace-pre-wrap">{flip ? t.reverso : t.frente}</p>
            {!flip && t.pista && (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Lightbulb className="w-3 h-3" /> {t.pista}</p>
            )}
            <p className="text-[11px] text-muted-foreground">Toca la tarjeta para girarla</p>
          </Card>
        </motion.div>
      </div>

      {flip ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="border-pink-500/40 text-pink-400" onClick={() => siguiente(0)}>No la sabía</Button>
          <Button variant="outline" className="border-orange-500/40 text-orange-400" onClick={() => siguiente(3)}>Difícil</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => siguiente(5)}>La sabía</Button>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setFlip(true)}>Ver respuesta</Button>
      )}
    </div>
  );
}

/* ---------------- Modo Aprender (escribir la respuesta) ---------------- */
function ModoAprender({ tarjetas, onCalificar, onFin }: {
  tarjetas: Tarjeta[]; onCalificar: (id: string, c: Calidad) => void; onFin: (v: number, a: number) => void;
}) {
  const [orden] = useState(() => barajar(tarjetas));
  const [i, setI] = useState(0);
  const [valor, setValor] = useState('');
  const [estado, setEstado] = useState<'idle' | 'ok' | 'mal'>('idle');
  const [aciertos, setAciertos] = useState(0);
  const [pista, setPista] = useState(false);
  const t = orden[i];

  const comprobar = () => {
    if (estado !== 'idle') return avanzar();
    const correcto = normalizar(valor) && normalizar(t.reverso).includes(normalizar(valor)) || normalizar(valor) === normalizar(t.reverso);
    setEstado(correcto ? 'ok' : 'mal');
    if (correcto) setAciertos(a => a + 1);
    onCalificar(t.id, correcto ? 4 : 0);
  };

  const avanzar = () => {
    setValor(''); setEstado('idle'); setPista(false);
    if (i + 1 >= orden.length) { onFin(orden.length, aciertos); confetti({ particleCount: 90, spread: 80, origin: { y: 0.7 } }); setI(0); }
    else setI(i + 1);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">{i + 1} / {orden.length} · aciertos {aciertos}</p>
      <Card className="p-6 space-y-4">
        <p className="text-lg font-medium whitespace-pre-wrap">{t.frente}</p>
        {pista && t.pista && <p className="text-sm text-muted-foreground flex items-center gap-1"><Lightbulb className="w-4 h-4" /> {t.pista}</p>}
        <Input
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && comprobar()}
          placeholder="Escribe tu respuesta..."
          disabled={estado !== 'idle'}
        />
        {estado !== 'idle' && (
          <div className={`rounded-lg p-3 text-sm ${estado === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-pink-500/10 text-pink-400'}`}>
            <p className="font-semibold flex items-center gap-1">
              {estado === 'ok' ? <><Check className="w-4 h-4" /> ¡Correcto!</> : <><X className="w-4 h-4" /> Respuesta correcta:</>}
            </p>
            <p className="text-foreground mt-1 whitespace-pre-wrap">{t.reverso}</p>
          </div>
        )}
        <div className="flex gap-2">
          {t.pista && estado === 'idle' && <Button variant="outline" onClick={() => setPista(true)}>Pista</Button>}
          <Button className="flex-1" onClick={comprobar}>{estado === 'idle' ? 'Comprobar' : 'Siguiente'}</Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Modo Test (opción múltiple) ---------------- */
function ModoTest({ tarjetas, onCalificar, onFin }: {
  tarjetas: Tarjeta[]; onCalificar: (id: string, c: Calidad) => void; onFin: (v: number, a: number) => void;
}) {
  const preguntas = useMemo(() => {
    if (tarjetas.length < 2) return [];
    return barajar(tarjetas).map(t => {
      const distractores = barajar(tarjetas.filter(x => x.id !== t.id)).slice(0, 3).map(x => x.reverso);
      return { t, opciones: barajar([t.reverso, ...distractores]) };
    });
  }, [tarjetas]);

  const [i, setI] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [aciertos, setAciertos] = useState(0);

  if (!preguntas.length) return <Card className="p-8 text-center text-muted-foreground">Necesitas al menos 2 tarjetas para el modo Test.</Card>;
  const q = preguntas[i];

  const elegir = (op: string) => {
    if (sel) return;
    setSel(op);
    const ok = op === q.t.reverso;
    if (ok) setAciertos(a => a + 1);
    onCalificar(q.t.id, ok ? 5 : 0);
    setTimeout(() => {
      setSel(null);
      if (i + 1 >= preguntas.length) {
        onFin(preguntas.length, aciertos + (ok ? 1 : 0));
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
        toast.success(`Test terminado: ${aciertos + (ok ? 1 : 0)}/${preguntas.length}`);
        setI(0); setAciertos(0);
      } else setI(i + 1);
    }, 900);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">{i + 1} / {preguntas.length} · aciertos {aciertos}</p>
      <Card className="p-6 space-y-4">
        <p className="text-lg font-medium whitespace-pre-wrap">{q.t.frente}</p>
        <div className="grid gap-2">
          {q.opciones.map((op, k) => {
            const esCorrecta = op === q.t.reverso;
            const activo = sel !== null;
            return (
              <button
                key={k}
                onClick={() => elegir(op)}
                className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                  activo && esCorrecta ? 'border-emerald-500 bg-emerald-500/10'
                    : activo && sel === op ? 'border-pink-500 bg-pink-500/10'
                      : 'hover:border-primary/50'
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Modo Emparejar (match contrarreloj) ---------------- */
function ModoEmparejar({ tarjetas, onFin }: { tarjetas: Tarjeta[]; onFin: (v: number, a: number) => void }) {
  const [ronda, setRonda] = useState(0);
  const set = useMemo(() => barajar(tarjetas).slice(0, 6), [tarjetas, ronda]);
  const izq = useMemo(() => barajar(set), [set]);
  const der = useMemo(() => barajar(set), [set]);
  const [selIzq, setSelIzq] = useState<string | null>(null);
  const [hechos, setHechos] = useState<string[]>([]);
  const [errores, setErrores] = useState(0);
  const [seg, setSeg] = useState(0);
  const [fin, setFin] = useState(false);

  useEffect(() => {
    if (fin) return;
    const t = setInterval(() => setSeg(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [fin]);

  useEffect(() => {
    if (!fin && set.length > 0 && hechos.length === set.length) {
      setFin(true);
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 } });
      onFin(set.length, set.length - errores);
    }
  }, [hechos, set.length, fin, errores, onFin]);

  const clickDer = (t: Tarjeta) => {
    if (!selIzq || hechos.includes(t.id)) return;
    if (selIzq === t.id) setHechos(h => [...h, t.id]);
    else setErrores(e => e + 1);
    setSelIzq(null);
  };

  const reiniciar = () => { setHechos([]); setErrores(0); setSeg(0); setFin(false); setSelIzq(null); setRonda(r => r + 1); };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-muted-foreground"><Timer className="w-4 h-4" /> {seg}s</span>
        <span className="text-muted-foreground">{hechos.length}/{set.length} · {errores} errores</span>
        <Button size="sm" variant="outline" className="gap-1" onClick={reiniciar}><RotateCcw className="w-3.5 h-3.5" /> Reiniciar</Button>
      </div>

      <AnimatePresence>
        {fin && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-emerald-500/10 text-emerald-400 p-3 text-center text-sm font-medium flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" /> ¡Completado en {seg}s con {errores} errores!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {izq.map(t => (
            <button key={t.id} disabled={hechos.includes(t.id)} onClick={() => setSelIzq(t.id)}
              className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                hechos.includes(t.id) ? 'opacity-30 border-emerald-500/40'
                  : selIzq === t.id ? 'border-primary bg-primary/10' : 'hover:border-primary/50'}`}>
              {t.frente}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {der.map(t => (
            <button key={t.id} disabled={hechos.includes(t.id)} onClick={() => clickDer(t)}
              className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                hechos.includes(t.id) ? 'opacity-30 border-emerald-500/40' : 'hover:border-primary/50'}`}>
              {t.reverso}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
