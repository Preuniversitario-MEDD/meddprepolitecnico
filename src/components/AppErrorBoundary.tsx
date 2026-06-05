import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
  message: string;
}

export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error inesperado al cargar la aplicación.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Fallo de renderizado:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen gradient-primary flex items-center justify-center p-4">
        <section className="w-full max-w-md rounded-2xl bg-card text-card-foreground shadow-2xl border border-border p-6 space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold">No se pudo cargar la aplicación</h1>
            <p className="text-sm text-muted-foreground">La vista previa encontró un error de conexión o renderizado.</p>
            {this.state.message && <p className="text-xs text-muted-foreground break-words">{this.state.message}</p>}
          </div>
          <Button className="w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </section>
      </main>
    );
  }
}