import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, ExternalLink, ChevronDown, Image } from 'lucide-react';

interface BibliotecaItem {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: string;
  created_at: string;
}

export default function AdminLibrary() {
  const [items, setItems] = useState<BibliotecaItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BibliotecaItem | null>(null);
  const [form, setForm] = useState({ titulo: '', descripcion: '', url: '', categoria: '' });
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('biblioteca').select('*').order('created_at', { ascending: false });
    setItems((data as BibliotecaItem[]) || []);
  }

  async function save() {
    if (!form.titulo.trim() || !form.url.trim()) { toast({ title: 'Título y URL requeridos', variant: 'destructive' }); return; }
    if (editItem) {
      await supabase.from('biblioteca').update(form).eq('id', editItem.id);
      toast({ title: 'Actualizado' });
    } else {
      await supabase.from('biblioteca').insert(form);
      toast({ title: 'Recurso agregado' });
    }
    setDialogOpen(false);
    setEditItem(null);
    setForm({ titulo: '', descripcion: '', url: '', categoria: '' });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar?')) return;
    await supabase.from('biblioteca').delete().eq('id', id);
    load();
  }

  const toggleGroup = (cat: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Group by category
  const grouped = new Map<string, BibliotecaItem[]>();
  items.forEach(item => {
    const cat = item.categoria || 'Sin categoría';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  });

  const categories = [...new Set(items.map(i => i.categoria).filter(Boolean))];

  // Handle paste image
  async function handlePasteImage(e: React.ClipboardEvent) {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;
    for (const item of Array.from(clipboardItems)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const path = `biblioteca/${Date.now()}_pasted.png`;
        const { error } = await supabase.storage.from('quiz-images').upload(path, file);
        if (error) { toast({ title: 'Error al subir imagen', variant: 'destructive' }); return; }
        const { data: { publicUrl } } = supabase.storage.from('quiz-images').getPublicUrl(path);
        setForm(prev => ({ ...prev, url: publicUrl }));
        toast({ title: 'Imagen pegada como URL' });
      }
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4" onPaste={handlePasteImage}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Biblioteca Virtual</h1>
        <Button onClick={() => { setEditItem(null); setForm({ titulo: '', descripcion: '', url: '', categoria: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([cat, catItems]) => (
          <Collapsible key={cat} open={openGroups.has(cat)} onOpenChange={() => toggleGroup(cat)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform ${openGroups.has(cat) ? 'rotate-0' : '-rotate-90'}`} />
              <span className="font-display font-bold text-sm">{cat}</span>
              <span className="text-xs text-muted-foreground ml-auto">{catItems.length} recursos</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pl-4 border-l-2 border-primary/20 ml-2 mt-1">
              {catItems.map(item => (
                <Card key={item.id} className="card-elevated">
                  <CardContent className="p-3 flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.descripcion}</p>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> {item.url.slice(0, 50)}...
                      </a>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(item); setForm({ titulo: item.titulo, descripcion: item.descripcion, url: item.url, categoria: item.categoria }); setDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">No hay recursos aún</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar' : 'Agregar'} Recurso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://... (o pega una imagen)" /></div>
            <div>
              <Label>Categoría</Label>
              <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: Química Orgánica" list="cat-suggestions" />
              <datalist id="cat-suggestions">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <Button onClick={save} className="w-full gradient-primary text-primary-foreground">{editItem ? 'Guardar' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
