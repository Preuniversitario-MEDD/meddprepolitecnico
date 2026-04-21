import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun, FlaskConical, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PasswordValidator, { validatePassword } from '@/components/PasswordValidator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const { signIn, changePassword } = useAuth();
  const { requestPermission, checkAndNotify } = usePushNotifications();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'change-password'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cedula.length !== 10 || !/^\d{10}$/.test(cedula)) {
      toast({ title: 'Error', description: 'La cédula debe tener 10 dígitos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await signIn(cedula, password);
    setLoading(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.firstTime) {
      setStep('change-password');
      toast({ title: 'Primera vez', description: 'Debes cambiar tu contraseña' });
    } else {
      // Pedir permiso de notificaciones y verificar tests
      try {
        const granted = await requestPermission();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (granted && authUser?.id) await checkAndNotify(authUser.id);
      } catch { /* silent */ }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(newPassword)) {
      toast({ title: 'Error', description: 'La contraseña no cumple los requisitos', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await changePassword(newPassword);
    setLoading(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: '¡Listo!', description: 'Contraseña actualizada correctamente' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-neon-pink/20 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-neon-mint/20 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-neon-orange/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2 rounded-full glass">
        {theme === 'dark' ? <Sun className="w-5 h-5 text-neon-orange" /> : <Moon className="w-5 h-5 text-primary-foreground" />}
      </button>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <Card className="glass border-0 card-elevated">
          <CardHeader className="text-center space-y-3 pb-2">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto w-16 h-16 rounded-2xl gradient-neon flex items-center justify-center glow-primary">
              <FlaskConical className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-3xl font-bold font-display text-gradient-primary bg-neon-pink text-primary-foreground">ESPOLMEDD</h1>
            <p className="text-sm font-medium text-muted-foreground">Preparación de Química para la ESPOL</p>
          </CardHeader>

          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              {step === 'login' ? (
                <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cedula">Cédula</Label>
                    <Input id="cedula" placeholder="Ingresa tu cédula (10 dígitos)" value={cedula}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Contraseña" value={password}
                        onChange={(e) => setPassword(e.target.value)} className="h-12 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar'}
                  </Button>
                </motion.form>
              ) : (
                <motion.form key="change" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleChangePassword} className="space-y-4">
                  <div className="p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
                    <p className="text-sm font-medium text-neon-orange">⚠️ Primera vez — Debes crear tu nueva contraseña</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva contraseña</Label>
                    <Input type="password" placeholder="Mínimo 8 caracteres" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} className="h-12" />
                    <PasswordValidator password={newPassword} />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar contraseña</Label>
                    <Input type="password" placeholder="Repite la contraseña" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} className="h-12" />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
                    disabled={loading || !validatePassword(newPassword) || newPassword !== confirmPassword}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar contraseña'}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
