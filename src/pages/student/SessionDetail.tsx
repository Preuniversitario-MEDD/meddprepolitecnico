import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Lightbulb, PenTool, Brain, Eye, EyeOff, Sparkles } from 'lucide-react';
import QuizComponent from '@/components/quiz/QuizComponent';
import type { Tables } from '@/integrations/supabase/types';

type Contenido = Tables<'contenido'>;
type Sesion = Tables<'sesiones'>;

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [contenido, setContenido] = useState<Contenido[]>([]);
  const [showSolutions, setShowSolutions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    const { data: s } = await supabase.from('sesiones').select('*').eq('id', id!).single();
    setSesion(s);
    const { data: c } = await supabase.from('contenido').select('*').eq('sesion_id', id!).order('orden');
    setContenido(c || []);
  }

  const teoria = contenido.filter(c => c.tipo === 'teoria');
  const trucos = contenido.filter(c => c.tipo === 'truco');
  const ejercicios = contenido.filter(c => c.tipo === 'ejercicio');

  const tabIcons = [BookOpen, Lightbulb, PenTool, Brain];

  if (!sesion) return <div className="p-6 text-center text-muted-foreground">Cargando sesión...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">
            Sesión {sesion.numero}: {sesion.titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{sesion.descripcion}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teoria">
        <TabsList className="w-full grid grid-cols-4">
          {['teoria', 'trucos', 'ejercicios', 'quiz'].map((tab, i) => {
            const Icon = tabIcons[i];
            return (
              <TabsTrigger key={tab} value={tab} className="gap-1 text-xs md:text-sm">
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Teoría */}
        <TabsContent value="teoria" className="space-y-3 mt-4">
          {teoria.length === 0 && <p className="text-center text-muted-foreground py-8">No hay contenido teórico aún</p>}
          {teoria.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <h3 className="font-display font-bold text-sm mb-2">{item.titulo}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.texto}</p>
                  {item.imagen_url && <img src={item.imagen_url} alt={item.titulo} className="mt-3 rounded-lg max-w-full h-auto" />}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-secondary underline">
                      Ver recurso →
                    </a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* Trucos */}
        <TabsContent value="trucos" className="space-y-3 mt-4">
          {trucos.length === 0 && <p className="text-center text-muted-foreground py-8">No hay trucos aún</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {trucos.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                <Card className="card-elevated neon-border h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-display font-bold text-sm">{item.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.texto}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Ejercicios */}
        <TabsContent value="ejercicios" className="space-y-3 mt-4">
          {ejercicios.length === 0 && <p className="text-center text-muted-foreground py-8">No hay ejercicios aún</p>}
          {ejercicios.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <h3 className="font-display font-bold text-sm mb-2">{item.titulo}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.texto}</p>
                  {item.imagen_url && <img src={item.imagen_url} alt={item.titulo} className="mt-3 rounded-lg max-w-full h-auto" />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSolutions({ ...showSolutions, [item.id]: !showSolutions[item.id] })}
                    className="mt-3 gap-2"
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
                        className="mt-2 p-3 rounded-lg bg-accent/10 text-sm overflow-hidden"
                      >
                        {item.url || 'Solución no disponible'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          <Button variant="outline" className="w-full gap-2 neon-border">
            <Sparkles className="w-4 h-4 text-neon-fuchsia" />
            Generar ejercicio con IA (Claude)
          </Button>
        </TabsContent>

        {/* Quiz */}
        <TabsContent value="quiz" className="mt-4">
          {id && user && <QuizComponent sesionId={id} userId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
