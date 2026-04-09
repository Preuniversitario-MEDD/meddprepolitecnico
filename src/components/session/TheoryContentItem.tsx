import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Play, FileText, Download, ExternalLink, Globe, BookOpen, Beaker, Atom, Calculator, FlaskConical, Lightbulb, CheckCircle2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;

const CONCEPT_ICONS = [BookOpen, Atom, Beaker, Calculator, FlaskConical, Lightbulb];
const CONCEPT_COLORS = [
  { bg: 'bg-primary/10', border: 'border-primary/30', icon: 'text-primary', accent: 'primary' },
  { bg: 'bg-neon-violet/10', border: 'border-neon-violet/30', icon: 'text-neon-violet', accent: 'neon-violet' },
  { bg: 'bg-neon-blue/10', border: 'border-neon-blue/30', icon: 'text-neon-blue', accent: 'neon-blue' },
  { bg: 'bg-neon-mint/10', border: 'border-neon-mint/30', icon: 'text-neon-mint', accent: 'neon-mint' },
  { bg: 'bg-neon-orange/10', border: 'border-neon-orange/30', icon: 'text-neon-orange', accent: 'neon-orange' },
  { bg: 'bg-neon-fuchsia/10', border: 'border-neon-fuchsia/30', icon: 'text-neon-fuchsia', accent: 'neon-fuchsia' },
];

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

function ResourceLink({ url }: { url: string }) {
  const trimmed = url.trim();
  if (isImageUrl(trimmed)) {
    return (
      <div className="relative group overflow-hidden rounded-xl border border-border/60">
        <img src={trimmed} alt="Recurso" className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
      </div>
    );
  }
  const ytId = getYouTubeId(trimmed);
  if (ytId) {
    return (
      <div className="relative group overflow-hidden rounded-xl border border-neon-violet/30 bg-card">
        <div className="aspect-video relative">
          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="Video" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          <a href={trimmed} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/30 transition-transform group-hover:scale-110">
              <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </a>
        </div>
      </div>
    );
  }
  if (isPdfUrl(trimmed)) {
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-neon-orange/30 bg-card hover:bg-accent/10 transition-all group">
        <div className="w-10 h-10 rounded-lg bg-neon-orange/15 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-neon-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">Documento PDF</p>
        </div>
        <Download className="w-4 h-4 text-muted-foreground group-hover:text-neon-orange transition-colors shrink-0" />
      </a>
    );
  }
  return (
    <a href={trimmed} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-neon-blue/30 bg-card hover:bg-accent/10 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-neon-blue/15 flex items-center justify-center shrink-0">
        <Globe className="w-5 h-5 text-neon-blue" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{(() => { try { return new URL(trimmed).hostname; } catch { return 'Enlace'; } })()}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-neon-blue transition-colors shrink-0" />
    </a>
  );
}

/** Parse text into bullet points. Lines starting with - or • or numbered become bullets. */
function parseTextIntoBullets(text: string): { bullets: string[]; plain: string } {
  const lines = text.split('\n');
  const bullets: string[] = [];
  const plainLines: string[] = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    if (/^[-•●]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-•●]\s+/, ''));
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^\d+[.)]\s+/, ''));
    } else if (trimmed) {
      plainLines.push(trimmed);
    }
  });
  return { bullets, plain: plainLines.join('\n') };
}

export default function TheoryContentItem({ item, index, showSolutions, onToggleSolution }: {
  item: Contenido;
  index: number;
  showSolutions: Record<string, boolean>;
  onToggleSolution: (id: string) => void;
}) {
  const hasSolution = !!item.solucion;
  const links = (item.imagen_url || '').split('\n').filter(l => l.trim());
  const colorScheme = CONCEPT_COLORS[index % CONCEPT_COLORS.length];
  const IconComponent = CONCEPT_ICONS[index % CONCEPT_ICONS.length];
  const parsed = item.texto ? parseTextIntoBullets(item.texto) : { bullets: [], plain: '' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <Card className={`overflow-hidden border-l-4 ${colorScheme.border} hover:shadow-lg transition-all duration-300`}>
        <CardContent className="p-0">
          {/* Header with icon */}
          <div className={`${colorScheme.bg} px-4 py-3 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-lg ${colorScheme.bg} border ${colorScheme.border} flex items-center justify-center shrink-0`}>
              <IconComponent className={`w-5 h-5 ${colorScheme.icon}`} />
            </div>
            <h3 className="font-display font-bold text-sm md:text-base text-foreground leading-snug flex-1">
              {item.titulo}
            </h3>
          </div>

          <div className="p-4 space-y-3">
            {/* Plain text */}
            {parsed.plain && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                {parsed.plain}
              </p>
            )}

            {/* Bullet points */}
            {parsed.bullets.length > 0 && (
              <ul className="space-y-2">
                {parsed.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 ${colorScheme.icon} mt-0.5 shrink-0`} />
                    <span className="text-sm text-foreground leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* If no bullets were parsed but text exists, show as plain */}
            {parsed.bullets.length === 0 && !parsed.plain && item.texto && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                {item.texto}
              </p>
            )}

            {/* Resources */}
            {links.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {links.map((link, i) => <ResourceLink key={i} url={link.trim()} />)}
              </div>
            )}

            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                Ver recurso <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Solution */}
            {hasSolution && (
              <div className="pt-1">
                <Button variant="outline" size="sm" onClick={() => onToggleSolution(item.id)} className="gap-2 border-neon-mint/30 hover:bg-neon-mint/10 hover:text-neon-mint transition-all">
                  {showSolutions[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showSolutions[item.id] ? 'Ocultar solución' : 'Ver solución'}
                </Button>
                <AnimatePresence>
                  {showSolutions[item.id] && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="mt-3 p-4 rounded-xl bg-neon-mint/10 border border-neon-mint/20 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {item.solucion}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
