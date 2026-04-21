import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notif {
  id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const cargar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notificaciones_push')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(10);
    setItems((data as Notif[]) || []);
  };

  useEffect(() => {
    if (!user) return;
    cargar();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones_push', filter: `user_id=eq.${user.id}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const noLeidas = items.filter(i => !i.leida).length;

  async function marcarTodas() {
    if (!user || noLeidas === 0) return;
    await supabase
      .from('notificaciones_push')
      .update({ leida: true })
      .eq('user_id', user.id)
      .eq('leida', false);
    cargar();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-accent/50 transition-colors" aria-label="Notificaciones">
          <Bell className="w-4 h-4" />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Notificaciones</p>
          {noLeidas > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={marcarTodas}>
              <Check className="w-3 h-3" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
              No tienes notificaciones
            </div>
          ) : (
            items.slice(0, 5).map(n => (
              <div key={n.id} className={`px-3 py-2.5 border-b border-border last:border-0 ${!n.leida ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start gap-2">
                  {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">{n.mensaje}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.fecha), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
