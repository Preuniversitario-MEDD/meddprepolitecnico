import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Lock, Unlock, Target, Trophy, AlertTriangle, Timer, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Tables } from '@/integrations/supabase/types';

type Sesion = Tables<'sesiones'>;

interface SessionProgress {
  completada: boolean;
  puntaje: number;
  correctasTotal: number;
  erroresTotal: number;
  intentos: number;
  tiempo: number;
}

interface Props {
  sesion: Sesion;
  progress?: SessionProgress;
  isUnlocked: boolean | null; // null = no override, uses global
  onToggleUnlock: (sesionId: string, currentlyUnlocked: boolean | null) => void;
  onResetProgress: (sesionId: string, sesionNumero: number) => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function SessionManagementCard({ sesion, progress: p, isUnlocked, onToggleUnlock, onResetProgress }: Props) {
  const totalAnswered = p ? p.correctasTotal + p.erroresTotal : 0;
  const accuracy = totalAnswered > 0 ? Math.round((p!.correctasTotal / totalAnswered) * 100) : 0;

  // Determine effective unlock state
  const effectivelyUnlocked = isUnlocked !== null ? isUnlocked : sesion.estado !== 'bloqueada';
  const hasOverride = isUnlocked !== null;

  return (
    <Card className={`card-elevated ${p?.completada ? 'border-l-4 border-accent' : !effectivelyUnlocked ? 'opacity-60' : ''}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-sm">S{sesion.numero}: {sesion.titulo}</p>
          <div className="flex items-center gap-1">
            {p?.completada ? <CheckCircle className="w-4 h-4 text-accent" /> : !effectivelyUnlocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Clock className="w-4 h-4 text-neon-orange" />}
          </div>
        </div>

        {p ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 text-primary" />
                <span>{p.intentos} intentos</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-accent" />
                <span>{p.correctasTotal}/150 correctas</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span>{p.erroresTotal} errores</span>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-neon-orange" />
                <span>{formatTime(p.tiempo)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Aciertos: {accuracy}%</span>
                <span className={accuracy >= 80 ? 'text-accent font-bold' : 'text-destructive'}>{accuracy >= 80 ? '✅ Desbloquea examen' : '❌ < 80%'}</span>
              </div>
              <Progress value={accuracy} className="h-1.5" />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Sin progreso</p>
        )}

        {/* Admin controls */}
        <div className="flex gap-1 pt-1 border-t border-border">
          <Button
            variant={effectivelyUnlocked ? 'outline' : 'default'}
            size="sm"
            className="flex-1 h-7 text-xs gap-1"
            onClick={() => onToggleUnlock(sesion.id, isUnlocked)}
          >
            {effectivelyUnlocked ? <><Lock className="w-3 h-3" /> Bloquear</> : <><Unlock className="w-3 h-3" /> Desbloquear</>}
          </Button>
          {p && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => onResetProgress(sesion.id, sesion.numero)}
            >
              <RotateCcw className="w-3 h-3" /> Reiniciar
            </Button>
          )}
          {hasOverride && (
            <span className="flex items-center text-[10px] text-primary font-medium px-1">⚡ Individual</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
