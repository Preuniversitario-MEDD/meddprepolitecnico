import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExternalLink, Search, BookOpen, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface BibliotecaItem {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: string;
}

export default function Library() {
  const [items, setItems] = useState<BibliotecaItem[]>([]);
  const [search, setSearch] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('biblioteca').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setItems((data as BibliotecaItem[]) || []));
  }, []);

  const filtered = items.filter(i =>
    !search || i.titulo.toLowerCase().includes(search.toLowerCase()) || i.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = new Map<string, BibliotecaItem[]>();
  filtered.forEach(item => {
    const cat = item.categoria || 'Sin categoría';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Biblioteca Virtual</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar recursos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([cat, catItems]) => {
          const isOpen = openGroup === cat;
          return (
            <Collapsible key={cat} open={isOpen} onOpenChange={(open) => setOpenGroup(open ? cat : null)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                <span className="font-display font-bold text-sm">{cat}</span>
                <span className="text-xs text-muted-foreground ml-auto">{catItems.length} recursos</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pl-4 border-l-2 border-primary/20 ml-2 mt-1">
                {catItems.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <Card className="card-elevated hover:glow-primary transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <h3 className="font-display font-bold text-sm">{item.titulo}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descripcion}</p>
                          <div className="flex items-center gap-1 text-xs text-secondary mt-2">
                            <ExternalLink className="w-3 h-3" /> Abrir recurso
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </motion.div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron recursos</p>}
    </div>
  );
}
