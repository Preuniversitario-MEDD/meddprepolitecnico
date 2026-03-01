import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid race conditions with trigger
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
    const email = `${cedula}@espolmedd.app`;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Cédula o contraseña incorrecta' };
      }
      return { error: error.message };
    }

    // Check if first time
    const { data: prof } = await supabase
      .from('profiles')
      .select('primera_vez, activo')
      .eq('cedula', cedula)
      .single();

    if (prof && !prof.activo) {
      await supabase.auth.signOut();
      return { error: 'Tu cuenta está desactivada. Contacta al administrador.' };
    }

    return { firstTime: prof?.primera_vez ?? false };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
