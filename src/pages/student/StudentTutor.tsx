import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Bot, User, Loader2, Trash2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

type Msg = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'medd_tutor_chat';
const SUGGESTIONS = [
  '¿Cómo balanceo esta ecuación: H₂ + O₂ → H₂O?',
  'Explícame derivadas como si tuviera 15 años',
  'Tengo dudas con MRU vs MRUV',
  'Ayúdame con estequiometría: cuántos gramos de NaCl…',
];

export default function StudentTutor() {
  const { toast } = useToast();
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

  useEffect(() => { textareaRef.current?.focus(); }, []);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content }, { role: 'assistant', content: '' }];
    setMessages(next);
    setStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `https://xoaondyfwefdnuknlaix.supabase.co/functions/v1/tutor-chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
          } catch { /* ignore parse errors mid-chunk */ }
        }
      }
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: `⚠️ ${e.message || 'Error contactando al tutor.'}` };
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center glow-primary">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">Tutor IA</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">Matemáticas · Química · Física · Gratis</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-destructive gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Limpiar
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <Bot className="w-12 h-12 mx-auto text-primary opacity-60" />
            <div>
              <p className="font-semibold">¡Hola! Soy tu tutor IA gratuito 🎓</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Te ayudo paso a paso con preguntas guiadas (método Piaget). Cuéntame qué necesitas resolver.
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
                {m.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                  >
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Pregúntame sobre química, física, matemáticas…"
          disabled={streaming}
          rows={2}
          className="resize-none min-h-[52px]"
        />
        <Button onClick={() => send()} disabled={streaming || !input.trim()} size="icon" className="h-[52px] w-12 shrink-0">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1.5">
        <Badge variant="outline" className="text-[9px] mr-1">Gratis</Badge>
        Powered by Lovable AI (Gemini) · sin tokens ni pagos para ti
      </p>
    </div>
  );
}
