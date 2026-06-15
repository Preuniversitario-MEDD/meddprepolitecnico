import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { usePresenceTracker } from '@/hooks/usePresenceTracker';
import { useConnectionLogger } from '@/hooks/useConnectionLogger';
import { useSessionDuration } from '@/hooks/useSessionDuration';
import { ViewAsStudentContext } from '@/hooks/useViewAsStudent';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, Settings, LogOut,
  Moon, Sun, GraduationCap, Brain, Library, MessageSquare, Zap, Eye, ArrowLeft, ChevronDown, FileText, Compass, ClipboardCheck, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AvatarUpload from '@/components/AvatarUpload';
import GlobalSearch from '@/components/layout/GlobalSearch';
import NotificationBell from '@/components/layout/NotificationBell';
import { supabase } from '@/integrations/supabase/client';
import meddLogo from '@/assets/medd-logo.png';

const adminLinks = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/students', icon: Users, label: 'Estudiantes' },
  { path: '/admin/content', icon: BookOpen, label: 'Contenido' },
  { path: '/admin/quiz', icon: Brain, label: 'Quiz' },
  { path: '/admin/library', icon: Library, label: 'Biblioteca' },
  { path: '/admin/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { path: '/admin/exams', icon: FileText, label: 'Exámenes' },
  { path: '/admin/competencias', icon: Zap, label: 'Competencias' },
  { path: '/admin/psychometric', icon: ClipboardCheck, label: 'Psicometría' },
  { path: '/admin/concentracion', icon: Eye, label: 'Concentración' },
  { path: '/admin/settings', icon: Settings, label: 'Roles' },
  { path: '/admin/profile', icon: GraduationCap, label: 'Mi Perfil' },
];

const studentLinks = [
  { path: '/student', icon: LayoutDashboard, label: 'Inicio', shortLabel: 'Inicio' },
  { path: '/student/sessions', icon: BookOpen, label: 'Sesiones', shortLabel: 'Sesion' },
  { path: '/student/concentracion', icon: Eye, label: 'Concentración Visual', shortLabel: 'Foco' },
  { path: '/student/library', icon: Library, label: 'Biblioteca', shortLabel: 'Biblio' },
  { path: '/student/competencia', icon: Zap, label: 'Competencia', shortLabel: 'Compet' },
  { path: '/student/psicometria', icon: ClipboardCheck, label: 'Psicometría', shortLabel: 'Psico' },
  { path: '/student/orientacion-vocacional', icon: Compass, label: 'Orientación Vocacional', shortLabel: 'Vocac' },
  { path: '/student/tutor', icon: Sparkles, label: 'Tutor IA', shortLabel: 'Tutor' },
  { path: '/student/mensajes', icon: MessageSquare, label: 'Mensajes', shortLabel: 'Msj' },
  { path: '/student/profile', icon: GraduationCap, label: 'Perfil', shortLabel: 'Perfil' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const unreadCount = useUnreadMessages();
  usePresenceTracker();
  useConnectionLogger();
  useSessionDuration();
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<{ user_id: string; nombre: string; apellidos: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  const isAdminOnStudentView = role === 'admin' && location.pathname.startsWith('/student');

  const handleExitStudentView = useCallback(() => {
    setSelectedStudent('');
    navigate('/admin', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (role === 'admin') {
      supabase.from('profiles').select('user_id, nombre, apellidos').then(({ data }) => {
        if (data) setStudents(data.filter(s => s.user_id !== profile?.user_id));
      });
    }
  }, [role, profile?.user_id]);
  const links = isAdminOnStudentView ? studentLinks : (role === 'admin' ? adminLinks : studentLinks);
  const initials = profile ? (profile.nombre?.[0] || '') + (profile.apellidos?.[0] || '') : '?';
  const getMensajesPath = role === 'admin' && !isAdminOnStudentView ? '/admin/mensajes' : '/student/mensajes';

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Admin-as-Student floating banner */}
      {isAdminOnStudentView && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-neon-orange text-primary-foreground px-3 py-2 sm:px-4 sm:py-1.5 text-xs font-medium shadow-lg">
          <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              <span className="font-display font-bold truncate">MODO VISTA ESTUDIANTE</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
            <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val)}>
              <SelectTrigger className="h-8 sm:h-6 text-xs bg-background/20 border-0 text-primary-foreground w-full sm:w-[160px]">
                <SelectValue placeholder="Ver como…" />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.user_id} value={s.user_id} className="text-xs">
                    {s.nombre} {s.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 sm:h-6 text-xs gap-1 bg-background/20 hover:bg-background/30 text-primary-foreground border-0 px-2"
              onClick={handleExitStudentView}
            >
              <ArrowLeft className="w-3 h-3" /> Volver
            </Button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
          <motion.aside initial={{ x: -80 }} animate={{ x: 0 }} className={`w-64 border-r border-border bg-sidebar flex flex-col ${isAdminOnStudentView ? 'pt-9' : ''}`}>
          <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-full ring-2 ring-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.3)] overflow-hidden bg-background">
              <img src={meddLogo} alt="MEDD Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-sidebar-foreground">MEDD</h2>
              <p className="text-[10px] text-muted-foreground leading-tight">Preparación de Química para la ESPOL</p>
            </div>
          </div>

          <div className="px-3 pb-2 flex items-center gap-2">
            <div className="flex-1"><GlobalSearch /></div>
            {role !== 'admin' && <NotificationBell />}
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {links.map(link => {
              const active = location.pathname === link.path;
              const showBadge = link.path === getMensajesPath && unreadCount > 0;
              return (
                <button key={link.path} onClick={() => navigate(link.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                    active ? 'gradient-primary text-primary-foreground glow-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                  <link.icon className="w-4 h-4" />
                  {link.label}
                  {showBadge && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin: link to student view */}
            {role === 'admin' && !isAdminOnStudentView && (
              <button
                onClick={() => navigate('/student')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-[hsl(var(--neon-orange))] hover:bg-[hsl(var(--neon-orange))]/10 border border-dashed border-[hsl(var(--neon-orange))]/30 mt-2"
              >
                <Eye className="w-4 h-4" />
                Vista Estudiante
              </button>
            )}
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-2">
            <div className="flex items-center gap-2 px-3 py-2">
              <AvatarUpload userId={profile?.user_id || ''} avatarUrl={profile?.avatar_url || null} initials={initials} size="sm" onUpload={() => refreshProfile()} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{profile?.nombre} {profile?.apellidos}</p>
                <p className="text-xs text-muted-foreground">{profile?.cedula}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.aside>
      )}

      <main className={`flex-1 overflow-auto pb-20 md:pb-0 ${isAdminOnStudentView ? 'pt-[74px] sm:pt-9 md:pt-0' : ''}`}>
        {isMobile && (
          <header className={`sticky ${isAdminOnStudentView ? 'top-[74px] sm:top-9' : 'top-0'} z-40 glass border-b border-border px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full ring-2 ring-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.2)] overflow-hidden bg-background">
                <img src={meddLogo} alt="MEDD Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-display font-bold text-sm">MEDD</span>
                <p className="text-[8px] text-muted-foreground leading-tight">Preparación de Química para la ESPOL</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <GlobalSearch />
              {role !== 'admin' && <NotificationBell />}
              <AvatarUpload userId={profile?.user_id || ''} avatarUrl={profile?.avatar_url || null} initials={initials} size="sm" editable={false} />
              <button onClick={toggleTheme} className="p-2">{theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
              <button onClick={signOut} className="p-2 text-destructive"><LogOut className="w-4 h-4" /></button>
            </div>
          </header>
        )}

        <ViewAsStudentContext.Provider value={{ viewAsStudentId: isAdminOnStudentView && selectedStudent ? selectedStudent : null }}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </ViewAsStudentContext.Provider>

        <footer className="px-4 py-3 mt-6 border-t border-border text-[10px] text-muted-foreground text-center leading-relaxed">
          © 2019-2026 PreUniversitario MEDD · Víctor Cañizares González
          <span className="hidden sm:inline"> · </span>
          <br className="sm:hidden" />
          Fundado el 9 de enero de 2019 · Todos los derechos reservados
        </footer>
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
          <div className="flex w-full justify-between py-1.5 px-1">
            {links.map(link => {
              const active = location.pathname === link.path;
              const showBadge = link.path === getMensajesPath && unreadCount > 0;
              const label = (link as any).shortLabel || link.label;
              return (
                <button key={link.path} onClick={() => navigate(link.path)}
                  className={`flex-1 flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-lg transition-all relative ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className="relative">
                    <link.icon className={`w-[18px] h-[18px] transition-all ${active ? 'text-primary drop-shadow-[0_0_6px_hsl(var(--primary))]' : ''}`} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium leading-none whitespace-nowrap">{label}</span>
                  {active && <motion.div layoutId="bottomnav" className="absolute -top-0.5 w-6 h-0.5 rounded-full gradient-primary" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
