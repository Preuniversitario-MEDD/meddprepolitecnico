import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useViewAsStudent } from '@/hooks/useViewAsStudent';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Search, BookOpen, ChevronDown, Filter, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BibliotecaItem {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: string;
}

function getFileType(url: string): string {
  if (!url) return 'enlace';
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/)) return 'imagen';
  if (lower.match(/\.(pdf)(\?|$)/)) return 'pdf';
  if (lower.match(/\.(doc|docx)(\?|$)/)) return 'documento';
  if (lower.match(/\.(mp4|webm|mov)(\?|$)/)) return 'video';
  if (lower.match(/\.(mp3|wav|ogg)(\?|$)/)) return 'audio';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
  return 'enlace';
}

const FILE_TYPE_LABELS: Record<string, string> = {
  all: 'Todos',
  imagen: '🖼️ Imagen',
  pdf: '📄 PDF',
  documento: '📝 Documento',
  video: '🎬 Video',
  audio: '🎵 Audio',
  enlace: '🔗 Enlace',
};

export default function Library() {
  const [items, setItems] = useState<BibliotecaItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('biblioteca').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setItems((data as BibliotecaItem[]) || []));
  }, []);

  const categories = useMemo(() => [...new Set(items.map(i => i.categoria).filter(Boolean))], [items]);
  const fileTypes = useMemo(() => [...new Set(items.map(i => getFileType(i.url)))], [items]);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    const matchesText = !q || i.titulo.toLowerCase().includes(q) || (i.descripcion || '').toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'all' || (i.categoria || 'Sin categoría') === selectedCategory;
    const matchesType = selectedType === 'all' || getFileType(i.url) === selectedType;
    return matchesText && matchesCat && matchesType;
  }), [items, search, selectedCategory, selectedType]);

  const grouped = useMemo(() => {
    const map = new Map<string, BibliotecaItem[]>();
    filtered.forEach(item => {
      const cat = item.categoria || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return map;
  }, [filtered]);

  const hasFilters = selectedCategory !== 'all' || selectedType !== 'all';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Biblioteca Virtual</h1>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} recursos</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por título o descripción..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {fileTypes.map(t => <SelectItem key={t} value={t}>{FILE_TYPE_LABELS[t] || t}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setSelectedCategory('all'); setSelectedType('all'); }}>
            <X className="w-3 h-3" /> Limpiar
          </Button>
        )}
      </div>

      {/* Results */}
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-display font-bold text-sm">{item.titulo}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descripcion}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {FILE_TYPE_LABELS[getFileType(item.url)] || 'enlace'}
                            </Badge>
                          </div>
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
