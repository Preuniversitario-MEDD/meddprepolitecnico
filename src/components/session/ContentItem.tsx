import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Play, FileText, Download, ExternalLink, Globe } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtu\.?be|youtube|vimeo|dailymotion/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\/|$|\?)/i.test(url);
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getLinkLabel(url: string): string {
  if (isVideoUrl(url)) return 'Ver video';
  if (isPdfUrl(url)) {
    try {
      const parts = new URL(url).pathname.split('/');
      const filename = parts.find(p => p.endsWith('.pdf')) || 'Documento PDF';
      return filename.length > 40 ? filename.substring(0, 37) + '...' : filename;
    } catch { return 'Documento PDF'; }
  }
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || url;
    return filename.length > 40 ? filename.substring(0, 37) + '...' : filename;
  } catch { return url.length > 40 ? url.substring(0, 37) + '...' : url; }
}

function ResourceLink({ url }: { url: string }) {
  const trimmed = url.trim();
  const [ytOpen, setYtOpen] = useState(false);

  // Inline images
  if (isImageUrl(trimmed)) {
    return (
      <div className="relative group overflow-hidden rounded-xl border border-border/60">
        <img
          src={trimmed}
          alt="Recurso"
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  // YouTube embed preview (in-app player via modal)
  const ytId = getYouTubeId(trimmed);
  if (ytId) {
    return (
      <>
        <div className="relative group overflow-hidden rounded-xl border border-neon-violet/30 bg-card">
          <button
            type="button"
            onClick={() => setYtOpen(true)}
            className="block w-full text-left"
            aria-label="Reproducir video de YouTube"
          >
            <div className="aspect-video relative">
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="Video preview"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30 transition-transform group-hover:scale-110">
                  <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          </button>
          <div className="px-3 py-2 flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-neon-violet shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">Video de YouTube</span>
            <button
              type="button"
              onClick={() => setYtOpen(true)}
              className="ml-auto text-[11px] text-neon-violet hover:underline shrink-0"
            >
              Reproducir aquí
            </button>
          </div>
        </div>
        <Dialog open={ytOpen} onOpenChange={setYtOpen}>
          <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-background border-neon-violet/30">
            <DialogTitle className="sr-only">Video de YouTube</DialogTitle>
            <div className="aspect-video w-full bg-black">
              {ytOpen && (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title="YouTube video player"
                  className="w-full h-full"
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Video link (non-YouTube)
  if (isVideoUrl(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-xl border border-neon-violet/30 bg-card hover:bg-accent/10 transition-all group"
      >
        <div className="w-10 h-10 rounded-lg bg-neon-violet/15 flex items-center justify-center shrink-0">
          <Play className="w-5 h-5 text-neon-violet" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">Ver video</p>
          <p className="text-[11px] text-muted-foreground truncate">{trimmed}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-neon-violet transition-colors shrink-0" />
      </a>
    );
  }

  // PDF preview
  if (isPdfUrl(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-xl border border-neon-orange/30 bg-card hover:bg-accent/10 transition-all group"
      >
        <div className="w-10 h-10 rounded-lg bg-neon-orange/15 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-neon-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{getLinkLabel(trimmed)}</p>
          <p className="text-[11px] text-muted-foreground">Documento PDF</p>
        </div>
        <Download className="w-4 h-4 text-muted-foreground group-hover:text-neon-orange transition-colors shrink-0" />
      </a>
    );
  }

  // Generic link
  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-neon-blue/30 bg-card hover:bg-accent/10 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-neon-blue/15 flex items-center justify-center shrink-0">
        <Globe className="w-5 h-5 text-neon-blue" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{getLinkLabel(trimmed)}</p>
        <p className="text-[11px] text-muted-foreground truncate">{(() => { try { return new URL(trimmed).hostname; } catch { return 'Enlace externo'; } })()}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-neon-blue transition-colors shrink-0" />
    </a>
  );
}

export default function ContentItem({ item, index, showSolutions, onToggleSolution }: {
  item: Contenido;
  index: number;
  showSolutions: Record<string, boolean>;
  onToggleSolution: (id: string) => void;
}) {
  const hasSolution = !!(item.solucion);
  const links = (item.imagen_url || '').split('\n').filter(l => l.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <Card className="card-elevated border-border/50 overflow-hidden hover:border-primary/20 transition-colors">
        <CardContent className="p-4 md:p-5 space-y-3">
          {/* Title */}
          <h3 className="font-display font-bold text-sm md:text-base text-foreground leading-snug">
            {item.titulo}
          </h3>

          {/* Body text */}
          {item.texto && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
              {item.texto}
            </p>
          )}

          {/* Resource links */}
          {links.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {links.map((link, i) => (
                <ResourceLink key={i} url={link.trim()} />
              ))}
            </div>
          )}

          {/* Legacy url field */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Ver recurso
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Solution toggle */}
          {hasSolution && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleSolution(item.id)}
                className="gap-2 border-neon-mint/30 hover:bg-neon-mint/10 hover:text-neon-mint transition-all"
              >
                {showSolutions[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showSolutions[item.id] ? 'Ocultar solución' : 'Ver solución'}
              </Button>
              <AnimatePresence>
                {showSolutions[item.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 rounded-xl bg-neon-mint/10 border border-neon-mint/20 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                      {item.solucion}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
