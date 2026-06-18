import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sparkles, Send, Bot, User, Loader2, Trash2, Lightbulb,
  ImagePlus, X, Video, MessageSquare, Gauge, CheckCircle2, XCircle, Wifi, WifiOff,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
type Msg = { role: 'user' | 'assistant'; content: string | Part[] };

const STORAGE_KEY = 'medd_tutor_chat_v2';
const DRAFT_KEY = 'medd_tutor_draft_v1';
const SUGGESTIONS = [
  '¿Cómo balanceo H₂ + O₂ → H₂O?',
  'Explícame derivadas como si tuviera 15 años',
  'MRU vs MRUV: dame ejemplos',
  'Estequiometría: cuántos gramos de NaCl…',
];

function textOf(c: Msg['content']): string {
  if (typeof c === 'string') return c;
  return c.map((p) => (p.type === 'text' ? p.text : '🖼️')).join(' ');
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export default function StudentTutor() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'chat' | 'video'>('chat');

  // Chat state
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState<string>(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; }
  });
  const [images, setImages] = useState<string[]>([]); // dataURLs pending to send
  const [streaming, setStreaming] = useState(false);
  const [msgsLastMin, setMsgsLastMin] = useState(0);
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [retrying, setRetrying] = useState<number>(0); // attempt # currently retrying
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentTimes = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Persistir borrador (resiliente a recargas)
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, input); } catch {}
  }, [input]);

  // Detectar online/offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Métrica: mensajes en último minuto
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 60000;
      sentTimes.current = sentTimes.current.filter((t) => t > cutoff);
      setMsgsLastMin(sentTimes.current.length);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Pegar imagen
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (tab !== 'chat') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) {
            const url = await fileToDataUrl(f);
            setImages((p) => [...p, url]);
            toast({ title: 'Imagen pegada', description: 'Se enviará con tu próximo mensaje.' });
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [tab, toast]);

  async function pickFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 3 - images.length);
    for (const f of arr) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: 'Imagen muy grande', description: 'Máx 5MB', variant: 'destructive' });
        continue;
      }
      const url = await fileToDataUrl(f);
      setImages((p) => [...p, url]);
    }
  }

  async function send(textOverride?: string) {
    const content = (textOverride ?? input).trim();
    if ((!content && images.length === 0) || streaming) return;

    // rate limit cliente (suave)
    if (sentTimes.current.length >= 12) {
      toast({ title: 'Frena un poco 🚦', description: 'Máx 12 mensajes por minuto.', variant: 'destructive' });
      return;
    }

    setInput('');
    const pendingImages = images;
    setImages([]);

    const userContent: string | Part[] = pendingImages.length > 0
      ? [
          ...(content ? [{ type: 'text', text: content } as Part] : [{ type: 'text', text: 'Resuelve este ejercicio paso a paso usando LaTeX y mi nivel preuniversitario.' } as Part]),
          ...pendingImages.map((url) => ({ type: 'image_url', image_url: { url } } as Part)),
        ]
      : content;

    const next: Msg[] = [...messages, { role: 'user', content: userContent }, { role: 'assistant', content: '' }];
    setMessages(next);
    setStreaming(true);
    sentTimes.current.push(Date.now());

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `https://xoaondyfwefdnuknlaix.supabase.co/functions/v1/tutor-chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      if (!resp.body) throw new Error('Sin respuesta del servidor');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch { /* */ }
        }
      }
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${e.message || 'Error contactando a MR. VICTOR.'}` };
        return copy;
      });
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-2rem)] max-w-4xl mx-auto p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center glow-primary shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg leading-tight truncate">MR. VICTOR</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Tutor IA · Mate · Química · Física</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Gauge className="w-3 h-3" /> {msgsLastMin}/12 min
          </Badge>
          {tab === 'chat' && messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-destructive gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 mb-2">
          <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
          <TabsTrigger value="video" className="gap-2"><Video className="w-4 h-4" /> Video interactivo</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <div className="text-center py-6 space-y-4">
                <Bot className="w-12 h-12 mx-auto text-primary opacity-60" />
                <div>
                  <p className="font-semibold">¡Hola! Soy MR. VICTOR 🎓</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                    Sube una foto del ejercicio o pega el enunciado y lo resolvemos paso a paso (método Piaget).
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex gap-2"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}>
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <Card className={`max-w-[85%] ${m.role === 'user' ? 'bg-primary/10 border-primary/20' : ''}`}>
                  <CardContent className="p-3 text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
                    {Array.isArray(m.content) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {m.content.filter((p): p is Extract<Part, {type:'image_url'}> => p.type === 'image_url').map((p, k) => (
                          <img key={k} src={p.image_url.url} alt="adjunto" className="max-w-[180px] rounded border border-border" />
                        ))}
                      </div>
                    )}
                    {textOf(m.content) ? (
                      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                        {textOf(m.content)}
                      </ReactMarkdown>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} className="w-16 h-16 object-cover rounded border border-border" alt="" />
                  <button
                    onClick={() => setImages((p) => p.filter((_, k) => k !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-[52px] w-12 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming || images.length >= 3}
              title="Subir foto del ejercicio"
            >
              <ImagePlus className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escribe, pega una imagen o sube la foto del ejercicio…"
              disabled={streaming}
              rows={2}
              className="resize-none min-h-[52px]"
            />
            <Button onClick={() => send()} disabled={streaming || (!input.trim() && images.length === 0)} size="icon" className="h-[52px] w-12 shrink-0">
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            <Badge variant="outline" className="text-[9px] mr-1">Gratis</Badge>
            Moderado · sin datos sensibles · imágenes hasta 5MB
          </p>
        </TabsContent>

        <TabsContent value="video" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto">
          <VideoQuestionsMode />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// VIDEO + PREGUNTAS QUE PAUSAN
// ============================================================================
type VQ = { timestamp_seconds: number; question: string; options: string[]; correct_index: number; explanation: string };

declare global { interface Window { YT: any; onYouTubeIframeAPIReady: () => void } }

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const existing = document.getElementById('yt-iframe-api');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'yt-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const i = setInterval(() => { if (window.YT && window.YT.Player) { clearInterval(i); resolve(); } }, 100);
  });
}

function extractId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      const i = parts.findIndex((p) => ['embed','shorts','v'].includes(p));
      if (i >= 0 && parts[i+1]) return parts[i+1];
    }
  } catch {}
  return null;
}

function VideoQuestionsMode() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(600);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<VQ[]>([]);
  const [answered, setAnswered] = useState<Record<number, number>>({}); // qIndex -> selected
  const [currentQ, setCurrentQ] = useState<number | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const containerId = useMemo(() => `yt-player-${Math.random().toString(36).slice(2)}`, []);
  const checkRef = useRef<number | null>(null);

  async function generate() {
    const id = extractId(url);
    if (!id) { toast({ title: 'URL inválida', description: 'Pega un link de YouTube', variant: 'destructive' }); return; }
    setLoading(true);
    setQuestions([]); setAnswered({}); setCurrentQ(null); setVideoId(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(`https://xoaondyfwefdnuknlaix.supabase.co/functions/v1/tutor-video-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ video_url: url, topic, duration_seconds: duration }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error generando preguntas');
      if (!data.questions?.length) throw new Error('No se pudieron generar preguntas');
      setQuestions(data.questions);
      setVideoId(data.video_id || id);
      toast({ title: `${data.questions.length} preguntas listas`, description: 'El video se pausará en cada una.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Inicializar player cuando videoId esté listo
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    (async () => {
      await loadYouTubeAPI();
      if (cancelled) return;
      playerRef.current?.destroy?.();
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: '100%', height: '360',
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            if (checkRef.current) clearInterval(checkRef.current);
            checkRef.current = window.setInterval(() => {
              const p = playerRef.current;
              if (!p?.getCurrentTime) return;
              const t = Math.floor(p.getCurrentTime());
              const nextIdx = questions.findIndex((q, i) =>
                answered[i] === undefined && t >= q.timestamp_seconds && t <= q.timestamp_seconds + 2
              );
              if (nextIdx >= 0 && currentQ === null) {
                try { p.pauseVideo(); } catch {}
                setCurrentQ(nextIdx);
              }
            }, 500);
          },
        },
      });
    })();
    return () => {
      cancelled = true;
      if (checkRef.current) { clearInterval(checkRef.current); checkRef.current = null; }
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Cuando cambia answered/currentQ, reanudar al cerrar
  function answer(qi: number, oi: number) {
    setAnswered((a) => ({ ...a, [qi]: oi }));
  }
  function continueVideo() {
    setCurrentQ(null);
    try { playerRef.current?.playVideo(); } catch {}
  }

  const progress = questions.length ? Math.round((Object.keys(answered).length / questions.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-2">
            <label className="text-xs font-medium">Link de YouTube</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="text-xs font-medium">Tema / objetivo (opcional)</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej: Leyes de Newton, mol y estequiometría…" />
            </div>
            <div>
              <label className="text-xs font-medium">Duración (seg)</label>
              <Input type="number" min={60} max={7200} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 600)} className="w-28" />
            </div>
          </div>
          <Button onClick={generate} disabled={loading || !url} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generar preguntas y empezar
          </Button>
          <p className="text-[11px] text-muted-foreground">
            MR. VICTOR genera 4–8 preguntas con timestamps. El video se pausa en cada una hasta que respondas.
          </p>
        </CardContent>
      </Card>

      {videoId && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="relative aspect-video bg-black rounded overflow-hidden">
              <div id={containerId} className="w-full h-full" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progreso: {Object.keys(answered).length}/{questions.length}</span>
              <Badge variant="outline">{progress}%</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {currentQ !== null && questions[currentQ] && (
        <Card className="border-primary glow-primary">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge>Pregunta {currentQ + 1}</Badge>
              <span className="text-[11px] text-muted-foreground">
                @ {Math.floor(questions[currentQ].timestamp_seconds/60)}:{String(questions[currentQ].timestamp_seconds%60).padStart(2,'0')}
              </span>
            </div>
            <p className="font-medium">{questions[currentQ].question}</p>
            <div className="grid gap-2">
              {questions[currentQ].options.map((opt, oi) => {
                const sel = answered[currentQ];
                const correct = questions[currentQ].correct_index;
                const isSel = sel === oi;
                const show = sel !== undefined;
                const ok = show && oi === correct;
                const bad = show && isSel && oi !== correct;
                return (
                  <button
                    key={oi}
                    disabled={show}
                    onClick={() => answer(currentQ, oi)}
                    className={`text-left text-sm p-2.5 rounded-lg border transition-colors flex items-center gap-2
                      ${ok ? 'border-emerald-500 bg-emerald-500/10' : bad ? 'border-rose-500 bg-rose-500/10' : isSel ? 'border-primary' : 'border-border hover:border-primary/40'}`}
                  >
                    {ok && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {bad && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {answered[currentQ] !== undefined && (
              <div className="text-xs bg-muted/50 p-2 rounded">
                <strong>Explicación:</strong> {questions[currentQ].explanation}
              </div>
            )}
            <Button onClick={continueVideo} disabled={answered[currentQ] === undefined} className="w-full">
              Continuar video ▶
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
