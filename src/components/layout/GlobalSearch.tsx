import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  id: string;
  titulo: string;
  tipo: string;
  sesion_id: string;
  sesion_titulo: string;
  sesion_numero: number;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('contenido')
        .select('id, titulo, tipo, sesion_id')
        .ilike('titulo', `%${query.trim()}%`)
        .limit(10);

      if (data && data.length > 0) {
        const sessionIds = [...new Set(data.map(d => d.sesion_id))];
        const { data: sessions } = await supabase
          .from('sesiones')
          .select('id, titulo, numero')
          .in('id', sessionIds);
        const sesMap = new Map((sessions || []).map(s => [s.id, s]));

        setResults(data.map(d => ({
          ...d,
          sesion_titulo: sesMap.get(d.sesion_id)?.titulo || '',
          sesion_numero: sesMap.get(d.sesion_id)?.numero || 0,
        })));
      } else {
        // Also search sessions by title
        const { data: ses } = await supabase
          .from('sesiones')
          .select('id, titulo, numero')
          .ilike('titulo', `%${query.trim()}%`)
          .limit(5);
        setResults((ses || []).map(s => ({
          id: s.id,
          titulo: s.titulo,
          tipo: 'sesion',
          sesion_id: s.id,
          sesion_titulo: s.titulo,
          sesion_numero: s.numero,
        })));
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(`/student/session/${r.sesion_id}`);
  };

  const tipoLabels: Record<string, string> = {
    teoria: 'Teoría', truco: 'Truco', ejercicio: 'Ejercicio', sesion: 'Sesión',
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar temas..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          className="pl-9 pr-8 h-9 text-sm bg-muted/50 border-border/50 focus:bg-background w-48 md:w-64 rounded-lg"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (query.trim().length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto"
          >
            {loading && (
              <div className="p-3 text-xs text-muted-foreground text-center">Buscando...</div>
            )}
            {!loading && results.length === 0 && (
              <div className="p-3 text-xs text-muted-foreground text-center">Sin resultados para "{query}"</div>
            )}
            {!loading && results.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/10 transition-colors text-left border-b border-border/30 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.titulo}</p>
                  <p className="text-[11px] text-muted-foreground">
                    S{r.sesion_numero} · {r.sesion_titulo} · <span className="text-primary/80">{tipoLabels[r.tipo] || r.tipo}</span>
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
