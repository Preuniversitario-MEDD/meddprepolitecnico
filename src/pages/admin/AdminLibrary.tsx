import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, ExternalLink } from 'lucide-react';

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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Biblioteca Virtual</h1>
        <Button onClick={() => { setEditItem(null); setForm({ titulo: '', descripcion: '', url: '', categoria: '' }); setDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="card-elevated">
            <CardContent className="p-3 flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.titulo}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.descripcion}</p>
                {item.categoria && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary mt-1 inline-block">{item.categoria}</span>}
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
        {items.length === 0 && <p className="text-center text-muted-foreground py-8">No hay recursos aún</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar' : 'Agregar'} Recurso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Categoría</Label><Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: Química Orgánica" /></div>
            <Button onClick={save} className="w-full gradient-primary text-primary-foreground">{editItem ? 'Guardar' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
