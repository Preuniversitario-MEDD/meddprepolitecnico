import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ExternalLink, Search, BookOpen } from 'lucide-react';
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
  const [selectedCat, setSelectedCat] = useState('');

  useEffect(() => {
    supabase.from('biblioteca').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setItems((data as BibliotecaItem[]) || []));
  }, []);

  const categories = [...new Set(items.map(i => i.categoria).filter(Boolean))];
  const filtered = items.filter(i =>
    (!search || i.titulo.toLowerCase().includes(search.toLowerCase()) || i.descripcion.toLowerCase().includes(search.toLowerCase())) &&
    (!selectedCat || i.categoria === selectedCat)
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Biblioteca Virtual</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar recursos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setSelectedCat('')} className={`text-xs px-3 py-1.5 rounded-full transition-all ${!selectedCat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Todas</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCat(cat)} className={`text-xs px-3 py-1.5 rounded-full transition-all ${selectedCat === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <Card className="card-elevated hover:glow-primary transition-all cursor-pointer h-full">
                <CardContent className="p-4">
                  <h3 className="font-display font-bold text-sm">{item.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descripcion}</p>
                  {item.categoria && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary mt-2 inline-block">{item.categoria}</span>}
                  <div className="flex items-center gap-1 text-xs text-secondary mt-2">
                    <ExternalLink className="w-3 h-3" /> Abrir recurso
                  </div>
                </CardContent>
              </Card>
            </a>
          </motion.div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron recursos</p>}
    </div>
  );
}
