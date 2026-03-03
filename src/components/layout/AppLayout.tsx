import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, Settings, LogOut,
  Moon, Sun, GraduationCap, FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AvatarUpload from '@/components/AvatarUpload';

const adminLinks = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/students', icon: Users, label: 'Estudiantes' },
  { path: '/admin/content', icon: BookOpen, label: 'Contenido' },
  { path: '/admin/settings', icon: Settings, label: 'Roles' },
];

const studentLinks = [
  { path: '/student', icon: LayoutDashboard, label: 'Inicio' },
  { path: '/student/sessions', icon: BookOpen, label: 'Sesiones' },
  { path: '/student/profile', icon: GraduationCap, label: 'Perfil' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  const links = role === 'admin' ? adminLinks : studentLinks;
  const initials = profile ? (profile.nombre?.[0] || '') + (profile.apellidos?.[0] || '') : '?';

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={{ x: -80 }}
          animate={{ x: 0 }}
          className="w-64 border-r border-border bg-sidebar flex flex-col"
        >
          <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl gradient-neon flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-sidebar-foreground">ESPOLMEDD</h2>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {links.map(link => {
              const active = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'gradient-primary text-primary-foreground glow-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-2">
            <div className="flex items-center gap-2 px-3 py-2">
              <AvatarUpload
                userId={profile?.user_id || ''}
                avatarUrl={profile?.avatar_url || null}
                initials={initials}
                size="sm"
                onUpload={() => refreshProfile()}
              />
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

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {isMobile && (
          <header className="sticky top-0 z-40 glass border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-neon flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm">ESPOLMEDD</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={signOut} className="p-2 text-destructive">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
          <div className="flex justify-around py-2">
            {links.map(link => {
              const active = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
                  <span className="text-[10px] font-medium">{link.label}</span>
                  {active && (
                    <motion.div layoutId="bottomnav" className="absolute -top-0.5 w-8 h-1 rounded-full gradient-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
