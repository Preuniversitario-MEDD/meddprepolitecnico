// MR. VICTOR — Asistente para administradores (sin rate limit, modos especializados).
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Send, Bot, User, Loader2, Trash2, FileText, BarChart3, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

type Msg = { role: 'user' | 'assistant'; content: string };
type AdminMode = 'contenido' | 'analisis' | 'comunicacion';

const STORAGE_KEY = 'medd_admin_tutor_v1';

const MODE_META: Record<AdminMode, { label: string; icon: any; hint: string; suggestions: string[] }> = {
  contenido: {
    label: 'Contenido pedagógico',
    icon: FileText,
    hint: 'Ejercicios, quizzes, explicaciones, rúbricas',
    suggestions: [
      'Genera 5 ejercicios de estequiometría nivel preuniversitario con solución',
      'Quiz de 10 preguntas de cinemática (MRU/MRUV) con distractores',
      'Explica derivadas de funciones compuestas con 3 ejemplos resueltos',
    ],
  },
  analisis: {
    label: 'Análisis de rendimiento',
    icon: BarChart3,
    hint: 'Detección de patrones, intervenciones sugeridas',
    suggestions: [
      'Tengo 12 estudiantes con promedio <60 en Química. Sugiere intervenciones.',
      'Patrón: 40% reprueba el primer intento de examen final. ¿Qué hago?',
      'Estudiante con alta asistencia pero bajo desempeño: posibles causas y plan.',
    ],
  },
  comunicacion: {
    label: 'Redacción de mensajes',
    icon: Mail,
    hint: 'Anuncios, correos, recordatorios',
    suggestions: [
      'Redacta un mensaje motivador para estudiantes con bloqueo de examen',
      'Anuncio de nueva sesión de Mr. Victor disponible — 3 variantes (corto, medio, formal)',
      'Recordatorio respetuoso a estudiantes con 7+ días inactivos',
    ],
  },
};

export default function AdminTutor() {
  const { toast } = useToast();
  const [mode, setMode] = useState<AdminMode>('contenido');
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { textareaRef.current?.focus(); }, [mode]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content }, { role: 'assistant', content: '' }];
    setMessages(next);
    setStreaming(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(`https://xoaondyfwefdnuknlaix.supabase.co/functions/v1/tutor-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode: 'admin',
          admin_mode: mode,
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      if (!resp.body) throw new Error('Sin respuesta');
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '', acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const p = t.slice(5).trim();
          if (p === '[DONE]') continue;
          try {
            const j = JSON.parse(p);
            const d = j.choices?.[0]?.delta?.content || '';
            if (d) {
              acc += d;
              setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: acc }; return c; });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: `⚠️ ${e.message}` }; return c; });
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function clearChat() { setMessages([]); localStorage.removeItem(STORAGE_KEY); }

  const meta = MODE_META[mode];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-2rem)] max-w-5xl mx-auto p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center glow-primary shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg leading-tight truncate">MR. VICTOR · Asistente Admin</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Sin rate limit · Modos especializados</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-destructive gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Limpiar
          </Button>
        )}
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as AdminMode)} className="mb-2">
        <TabsList className="grid grid-cols-3 w-full">
          {(Object.keys(MODE_META) as AdminMode[]).map((k) => {
            const M = MODE_META[k];
            const I = M.icon;
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5 text-xs">
                <I className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{M.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="gap-1 text-[10px]"><Icon className="w-3 h-3" /> {meta.label}</Badge>
        <span className="text-[11px] text-muted-foreground">{meta.hint}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <Bot className="w-12 h-12 mx-auto text-primary opacity-60" />
            <p className="font-semibold">¿En qué te asisto hoy?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-3xl mx-auto">
              {meta.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-xs p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}>
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <Card className={`max-w-[85%] ${m.role === 'user' ? 'bg-primary/10 border-primary/20' : ''}`}>
              <CardContent className="p-3 text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
                {m.content ? (
                  <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Pídele a MR. VICTOR (${meta.label.toLowerCase()})…`}
          disabled={streaming}
          rows={2}
          className="resize-none min-h-[52px]"
        />
        <Button onClick={() => send()} disabled={streaming || !input.trim()} size="icon" className="h-[52px] w-12 shrink-0">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
