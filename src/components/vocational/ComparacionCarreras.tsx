import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart, X } from 'lucide-react';
import type { ResultadoCompatibilidad } from '@/lib/compatibilidadVocacional';

interface Props {
  carreras: ResultadoCompatibilidad[];
  onRemove: (id: string) => void;
}

export default function ComparacionCarreras({ carreras, onRemove }: Props) {
  if (carreras.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <Heart className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Sin favoritas aún</p>
          <p className="text-xs text-muted-foreground">Marca el corazón ❤️ en hasta 5 carreras para compararlas lado a lado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{carreras.length} carrera{carreras.length > 1 ? 's' : ''} en comparación</p>
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-3 min-w-min">
          {carreras.map(({ carrera, porcentaje, factoresPositivos }) => (
            <Card key={carrera.id} className="w-[260px] shrink-0 relative">
              <button
                onClick={() => onRemove(carrera.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 flex items-center justify-center z-10"
                aria-label="Quitar de comparación"
              >
                <X className="w-3 h-3" />
              </button>
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="text-3xl mb-1">{carrera.icono}</div>
                  <p className="font-semibold text-sm leading-tight">{carrera.nombre}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{carrera.facultad}</p>
                </div>

                <div>
                  <Badge variant="outline" className="text-[10px] border-primary/40">{carrera.siglaUniversidad}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{carrera.universidad}</p>
                </div>

                <div className="border-t pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Compatibilidad</p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-bold text-primary">{porcentaje}%</span>
                  </div>
                  <Progress value={porcentaje} className="h-1.5" />
                </div>

                <div className="border-t pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Modalidad</p>
                  <div className="flex flex-wrap gap-1">
                    {carrera.modalidad.map(m => (
                      <Badge key={m} variant="secondary" className="text-[10px] capitalize">{m}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ciudad</p>
                  <p className="text-xs">{carrera.ciudad.join(', ')}</p>
                </div>

                <div className="border-t pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Materias clave</p>
                  <div className="flex flex-wrap gap-1">
                    {carrera.materiasClaveExamen.map(m => (
                      <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>

                {factoresPositivos.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tus fortalezas</p>
                    <div className="flex flex-wrap gap-1">
                      {factoresPositivos.slice(0, 4).map(f => (
                        <Badge key={f} variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Campo laboral</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-3">{carrera.campoLaboral.join(' · ')}</p>
                </div>

                <Button size="sm" variant="outline" className="w-full text-xs gap-1" asChild>
                  <a href={carrera.urlUniversidad} target="_blank" rel="noopener noreferrer">
                    Ver carrera <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
