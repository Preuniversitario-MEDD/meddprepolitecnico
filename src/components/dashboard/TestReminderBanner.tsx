import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function TestReminderBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkAndNotify } = usePushNotifications();
  const [state, setState] = useState<{ pendientes: number; vencidos: number } | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissedKey = `tests-reminder-dismissed-${user.id}-${new Date().toDateString()}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setClosed(true);
      return;
    }
    (async () => {
      const r = await checkAndNotify(user.id);
      if (r.needsAction) {
        setState({ pendientes: r.pendientes.length, vencidos: r.vencidos.length });
      }
    })();
  }, [user, checkAndNotify]);

  function close() {
    if (user) {
      const dismissedKey = `tests-reminder-dismissed-${user.id}-${new Date().toDateString()}`;
      sessionStorage.setItem(dismissedKey, '1');
    }
    setClosed(true);
  }

  if (!state || closed) return null;

  const mensaje = state.pendientes > 0
    ? `Completa tu perfil — Te falta${state.pendientes > 1 ? 'n' : ''} ${state.pendientes} test${state.pendientes > 1 ? 's' : ''}`
    : `Han pasado 3 meses — ¿Ha evolucionado tu perfil? (${state.vencidos} test${state.vencidos > 1 ? 's' : ''} a renovar)`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <p className="flex-1 text-xs sm:text-sm font-medium text-foreground">{mensaje}</p>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/student/psicometria')}>
            Ver tests <ArrowRight className="w-3 h-3" />
          </Button>
          <button onClick={close} className="p-1 hover:bg-primary/20 rounded transition-colors" aria-label="Cerrar">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
