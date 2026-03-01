import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

export default function StudentProfile() {
  const { profile } = useAuth();
  if (!profile) return null;

  const initials = (profile.nombre?.[0] || '') + (profile.apellidos?.[0] || '');

  function calcAge(birth: string | null) {
    if (!birth) return 'N/A';
    const b = new Date(birth);
    const now = new Date();
    let y = now.getFullYear() - b.getFullYear();
    let m = now.getMonth() - b.getMonth();
    let d = now.getDate() - b.getDate();
    if (d < 0) { m--; d += 30; }
    if (m < 0) { y--; m += 12; }
    return `${y} años, ${m} meses, ${d} días`;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">Mi Perfil</h1>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="gradient-neon text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-display font-bold">{profile.nombre} {profile.apellidos}</h2>
                <p className="text-sm text-muted-foreground">@{profile.usuario}</p>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              {[
                ['Cédula', profile.cedula],
                ['Usuario', profile.usuario],
                ['Fecha de Nacimiento', profile.fecha_nacimiento || 'N/A'],
                ['Edad', calcAge(profile.fecha_nacimiento)],
                ['Estado', profile.activo ? '✅ Activo' : '❌ Bloqueado'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
