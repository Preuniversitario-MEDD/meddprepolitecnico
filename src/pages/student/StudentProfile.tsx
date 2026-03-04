import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import AvatarUpload from '@/components/AvatarUpload';
import PasswordValidator, { validatePassword } from '@/components/PasswordValidator';
import { KeyRound } from 'lucide-react';

export default function StudentProfile() {
  const { profile, refreshProfile, changePassword } = useAuth();
  const { toast } = useToast();
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function handleChangePassword() {
    if (!validatePassword(newPw)) { toast({ title: 'Error', description: 'La contraseña no cumple los requisitos', variant: 'destructive' }); return; }
    if (newPw !== confirmPw) { toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' }); return; }
    setLoading(true);
    const res = await changePassword(newPw);
    setLoading(false);
    if (res.error) { toast({ title: 'Error', description: res.error, variant: 'destructive' }); }
    else { toast({ title: '¡Listo!', description: 'Contraseña actualizada' }); setPwOpen(false); setNewPw(''); setConfirmPw(''); }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">Mi Perfil</h1>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <AvatarUpload userId={profile.user_id} avatarUrl={profile.avatar_url} initials={initials} size="lg" onUpload={() => refreshProfile()} />
              <div>
                <h2 className="text-xl font-display font-bold">{profile.nombre} {profile.apellidos}</h2>
                <p className="text-sm text-muted-foreground">@{profile.usuario}</p>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              {[
                ['Cédula', profile.cedula],
                ['Usuario', `${profile.cedula}-${profile.nombre} ${profile.apellidos}`],
                ['Fecha de Nacimiento', profile.fecha_nacimiento || 'N/A'],
                ['Edad', calcAge(profile.fecha_nacimiento)],
                ['Estado', profile.activo ? '✅ Activo' : '❌ Bloqueado'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => setPwOpen(true)} variant="outline" className="w-full mt-4 gap-2">
              <KeyRound className="w-4 h-4" /> Cambiar Contraseña
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nueva contraseña</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              <PasswordValidator password={newPw} />
            </div>
            <div>
              <Label>Confirmar contraseña</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              {confirmPw && newPw !== confirmPw && <p className="text-xs text-destructive mt-1">No coinciden</p>}
            </div>
            <Button onClick={handleChangePassword} className="w-full gradient-primary text-primary-foreground"
              disabled={loading || !validatePassword(newPw) || newPw !== confirmPw}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
