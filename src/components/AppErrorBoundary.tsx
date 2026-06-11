import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
  message: string;
}

// Errores transitorios (extensiones, traducción, observers) que recuperamos automáticamente
const RECOVERABLE = [/removeChild/i, /insertBefore/i, /ResizeObserver/i, /NotFoundError: Failed to execute/i];

export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Error inesperado al cargar la aplicación.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Fallo de renderizado:', error, info.componentStack);
    // Auto-recuperar errores transitorios sin mostrar pantalla de error
    if (RECOVERABLE.some((p) => p.test(error.message || ''))) {
      setTimeout(() => this.setState({ hasError: false, message: '' }), 50);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

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
            <p className="text-sm text-muted-foreground">La vista previa encontró un error de renderizado.</p>
            {this.state.message && <p className="text-xs text-muted-foreground break-words">{this.state.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={this.handleRetry}>
              Continuar
            </Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" /> Recargar
            </Button>
          </div>
        </section>
      </main>
    );
  }
}
