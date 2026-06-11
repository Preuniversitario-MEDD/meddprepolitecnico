import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Errores benignos que NO deben mostrar el banner intrusivo
// (provienen de extensiones del navegador, traducción, ResizeObserver, etc.)
const IGNORED_PATTERNS = [
  /removeChild/i,
  /insertBefore/i,
  /ResizeObserver/i,
  /Non-Error promise rejection/i,
  /Script error/i,
  /Loading chunk \d+ failed/i,
  /NotFoundError: Failed to execute/i,
];

function shouldIgnore(message: string) {
  return IGNORED_PATTERNS.some((p) => p.test(message || ''));
}

type BannerState = { visible: boolean; message: string; offline: boolean };

export default function PreviewConnectionBanner() {
  const [state, setState] = useState<BannerState>({ visible: false, message: '', offline: false });

  useEffect(() => {
    const onOffline = () => setState({ visible: true, message: 'Conexión perdida.', offline: true });
    const onOnline = () => setState({ visible: false, message: '', offline: false });

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    // Solo loggeamos errores (no mostramos banner) — el ErrorBoundary maneja fallos reales
    const onError = (event: ErrorEvent) => {
      if (shouldIgnore(event.message)) return;
      console.warn('[PreviewConnection] error:', event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || '');
      if (shouldIgnore(msg)) return;
      console.warn('[PreviewConnection] unhandledrejection:', msg);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!state.visible) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-[100] mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5 text-destructive"><WifiOff className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Sin conexión</p>
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
