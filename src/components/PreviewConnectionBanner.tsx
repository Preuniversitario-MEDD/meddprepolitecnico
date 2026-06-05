import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BannerState = { visible: boolean; message: string; offline: boolean };

export default function PreviewConnectionBanner() {
  const [state, setState] = useState<BannerState>({ visible: false, message: '', offline: false });

  useEffect(() => {
    const show = (message: string, offline = false) => {
      console.error('[PreviewConnection]', message);
      setState({ visible: true, message, offline });
    };

    const onOffline = () => show('Conexión perdida con la vista previa.', true);
    const onOnline = () => setState({ visible: false, message: '', offline: false });
    const onError = (event: ErrorEvent) => show(event.message || 'Error de carga en la vista previa.');
    const onUnhandledRejection = (event: PromiseRejectionEvent) => show(String(event.reason?.message || event.reason || 'Promesa rechazada en la vista previa.'));

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (!state.visible) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-[100] mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5 text-destructive">{state.offline ? <WifiOff className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Problema detectado en la vista previa</p>
          <p className="text-xs text-muted-foreground break-words">{state.message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="h-8 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </Button>
        <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setState({ visible: false, message: '', offline: false })} aria-label="Cerrar aviso">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}