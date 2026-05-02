import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';
import { encodeStorage, decodeStorage } from '@/lib/security';
import { toast } from 'sonner';

type Profile = Tables<'profiles'>;
type AppRole = 'admin' | 'estudiante';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (cedula: string, password: string) => Promise<{ error?: string; firstTime?: boolean }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// === Rate limiting (client-side, ad-hoc) ===
const MAX_INTENTOS = 10;
const BLOQUEO_MINUTOS = 5;
// === Inactividad ===
const INACTIVIDAD_MS = 120 * 60 * 1000; // 120 min

function intentosKey(c: string) { return `medd_intentos_${c}`; }
function bloqueoKey(c: string) { return `medd_bloqueado_${c}`; }

function getIntentos(cedula: string): number {
  try { return parseInt(decodeStorage(localStorage.getItem(intentosKey(cedula)) || '') || '0', 10) || 0; }
  catch { return 0; }
}
function setIntentos(cedula: string, n: number) {
  localStorage.setItem(intentosKey(cedula), encodeStorage(String(n)));
}
function getBloqueoTs(cedula: string): number {
  try { return parseInt(decodeStorage(localStorage.getItem(bloqueoKey(cedula)) || '') || '0', 10) || 0; }
  catch { return 0; }
}
function setBloqueoTs(cedula: string, ts: number) {
  localStorage.setItem(bloqueoKey(cedula), encodeStorage(String(ts)));
}
function limpiarRateLimit(cedula: string) {
  localStorage.removeItem(intentosKey(cedula));
  localStorage.removeItem(bloqueoKey(cedula));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    setProfile(profileData);
    if (rolesData && rolesData.length > 0) {
      const hasAdmin = rolesData.some(r => r.role === 'admin');
      setRole(hasAdmin ? 'admin' : 'estudiante');
    } else {
      setRole('estudiante');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    await supabase.auth.signOut();
  }, []);

  // === Auto-logout por inactividad ===
  const resetearInactividad = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      await signOut();
      toast.info('Sesión cerrada por inactividad', {
        description: 'Vuelve a iniciar sesión para continuar.',
      });
    }, INACTIVIDAD_MS);
  }, [signOut]);

  useEffect(() => {
    if (!user) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }
    resetearInactividad();
    const handler = () => resetearInactividad();
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'keypress', 'click', 'scroll'];
    events.forEach(ev => document.addEventListener(ev, handler, { passive: true }));
    return () => {
      events.forEach(ev => document.removeEventListener(ev, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetearInactividad]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfile(session.user.id), 100);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (cedula: string, password: string) => {
    // ── Rate limit
    const ahora = Date.now();
    const bloqueoTs = getBloqueoTs(cedula);
    if (bloqueoTs > 0) {
      const expira = bloqueoTs + BLOQUEO_MINUTOS * 60 * 1000;
      if (ahora < expira) {
        const min = Math.ceil((expira - ahora) / 60000);
        return { error: `Cuenta bloqueada por demasiados intentos. Espera ${min} minuto(s).` };
      }
      limpiarRateLimit(cedula);
    }

    const email = `${cedula}@espolmedd.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const intentos = getIntentos(cedula) + 1;
      setIntentos(cedula, intentos);
      if (intentos >= MAX_INTENTOS) {
        setBloqueoTs(cedula, Date.now());
        return { error: `Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos tras ${MAX_INTENTOS} intentos fallidos.` };
      }
      if (error.message.includes('Invalid login credentials')) {
        const restantes = MAX_INTENTOS - intentos;
        return { error: `Cédula o contraseña incorrecta (${restantes} intento(s) restantes)` };
      }
      return { error: error.message };
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('primera_vez, activo')
      .eq('cedula', cedula)
      .single();

    if (prof && !prof.activo) {
      await supabase.auth.signOut();
      return { error: 'Tu cuenta está desactivada. Contacta al administrador.' };
    }

    limpiarRateLimit(cedula);
    return { firstTime: prof?.primera_vez ?? false };
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    if (user) {
      await supabase.from('profiles').update({ primera_vez: false }).eq('user_id', user.id);
      await fetchProfile(user.id);
    }
    return {};
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signOut, changePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
