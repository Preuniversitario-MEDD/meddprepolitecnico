import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useAuth } from '@/hooks/useAuth';

export default function ElegirCurso() {
  const { cursos, setActiveCursoId, loading } = useActiveCourse();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const pick = (id: string) => {
    setActiveCursoId(id);
    navigate('/student', { replace: true });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gradient-primary">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
            Hola{profile?.nombre ? `, ${profile.nombre.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-primary-foreground/80">Elige el curso con el que quieres continuar</p>
        </div>

        {loading && <p className="text-center text-primary-foreground/70">Cargando cursos…</p>}

        <div className="grid gap-3">
          {cursos.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="cursor-pointer hover:scale-[1.01] transition-transform card-elevated" onClick={() => pick(c.id)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-violet)/0.25)] to-[hsl(var(--neon-blue)/0.25)] flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-[hsl(var(--neon-violet))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-base truncate">{c.titulo}</p>
                    {c.descripcion && <p className="text-xs text-muted-foreground truncate">{c.descripcion}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0">
                    Entrar <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {!loading && cursos.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Aún no tienes cursos asignados. Contacta a tu administrador.</CardContent></Card>
        )}
      </motion.div>
    </div>
  );
}
