import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PreviewConnectionBanner from "@/components/PreviewConnectionBanner";
import Login from "./pages/Login";
import AppLayout from "./components/layout/AppLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminContent from "./pages/admin/AdminContent";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminQuiz from "./pages/admin/AdminQuiz";
import AdminLibrary from "./pages/admin/AdminLibrary";
import AdminStudentView from "./pages/admin/AdminStudentView";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentSessions from "./pages/student/StudentSessions";
import StudentProfile from "./pages/student/StudentProfile";
import SessionDetail from "./pages/student/SessionDetail";
import SectionExam from "./pages/student/SectionExam";
import Library from "./pages/student/Library";
import Mensajes from "./pages/student/Mensajes";
import AdminMensajes from "./pages/admin/AdminMensajes";
import AdminCompetencias from "./pages/admin/AdminCompetencias";
import AdminCompetenciaLive from "./pages/admin/AdminCompetenciaLive";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminExams from "./pages/admin/AdminExams";
import StudentCompetencia from "./pages/student/StudentCompetencia";
import VocationalTestPage from "./pages/student/VocationalTestPage";
import AssessmentPage from "./pages/student/AssessmentPage";
import AdminPsychometric from "./pages/admin/AdminPsychometric";
import Psicometria from "./pages/Psicometria";
import ConcentracionVisual from "./pages/student/ConcentracionVisual";
import SchulteTest from "./pages/student/SchulteTest";
import SchulteRecords from "./pages/student/SchulteRecords";
import AdminConcentracion from "./pages/admin/AdminConcentracion";
import OrientacionVocacional from "./pages/student/OrientacionVocacional";
import StudentTutor from "./pages/student/StudentTutor";
import AdminTutorAnalytics from "./pages/admin/AdminTutorAnalytics";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logAccess } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'estudiante' }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Verificar expiración de sesión y registrar acceso
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        // Sesión expirada
        return;
      }
      logAccess(supabase, user.id, location.pathname, true);
    })();
    return () => { cancelled = true; };
  }, [user, location.pathname]);

  if (loading || (user && role === null)) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ msg: 'Sesión expirada. Por favor inicia sesión nuevamente.' }} />;
  if (requiredRole && role !== requiredRole) return <Navigate to={role === 'admin' ? '/admin' : '/student'} replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, role, loading } = useAuth();
  if (loading || (user && role === null)) return <div className="min-h-screen flex items-center justify-center gradient-primary"><div className="w-12 h-12 rounded-full border-4 border-primary-foreground border-t-transparent animate-spin" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={role === 'admin' ? '/admin' : '/student'} replace /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? (role === 'admin' ? '/admin' : '/student') : '/login'} replace />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute requiredRole="admin"><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/content" element={<ProtectedRoute requiredRole="admin"><AdminContent /></ProtectedRoute>} />
      <Route path="/admin/quiz" element={<ProtectedRoute requiredRole="admin"><AdminQuiz /></ProtectedRoute>} />
      <Route path="/admin/library" element={<ProtectedRoute requiredRole="admin"><AdminLibrary /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/student-view/:userId" element={<ProtectedRoute requiredRole="admin"><AdminStudentView /></ProtectedRoute>} />
      <Route path="/admin/mensajes" element={<ProtectedRoute requiredRole="admin"><AdminMensajes /></ProtectedRoute>} />
      <Route path="/admin/competencias" element={<ProtectedRoute requiredRole="admin"><AdminCompetencias /></ProtectedRoute>} />
      <Route path="/admin/competencia/:id" element={<ProtectedRoute requiredRole="admin"><AdminCompetenciaLive /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><AdminProfile /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute requiredRole="admin"><AdminExams /></ProtectedRoute>} />
      <Route path="/admin/exam-preview/:tipo" element={<ProtectedRoute requiredRole="admin"><SectionExam /></ProtectedRoute>} />
      <Route path="/admin/psychometric" element={<ProtectedRoute requiredRole="admin"><AdminPsychometric /></ProtectedRoute>} />
      <Route path="/admin/concentracion" element={<ProtectedRoute requiredRole="admin"><AdminConcentracion /></ProtectedRoute>} />
      <Route path="/admin/tutor-analytics" element={<ProtectedRoute requiredRole="admin"><AdminTutorAnalytics /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/sessions" element={<ProtectedRoute><StudentSessions /></ProtectedRoute>} />
      <Route path="/student/session/:id" element={<ProtectedRoute><SessionDetail /></ProtectedRoute>} />
      <Route path="/student/exam/:tipo" element={<ProtectedRoute><SectionExam /></ProtectedRoute>} />
      <Route path="/student/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
      <Route path="/student/mensajes" element={<ProtectedRoute><Mensajes /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/competencia" element={<ProtectedRoute><StudentCompetencia /></ProtectedRoute>} />
      <Route path="/student/vocacional" element={<ProtectedRoute><VocationalTestPage /></ProtectedRoute>} />
      <Route path="/student/assessment" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />
      <Route path="/student/psicometria" element={<ProtectedRoute><Psicometria /></ProtectedRoute>} />
      <Route path="/student/concentracion" element={<ProtectedRoute><ConcentracionVisual /></ProtectedRoute>} />
      <Route path="/student/schulte" element={<ProtectedRoute><SchulteTest /></ProtectedRoute>} />
      <Route path="/student/schulte-records" element={<ProtectedRoute><SchulteRecords /></ProtectedRoute>} />
      <Route path="/student/orientacion-vocacional" element={<ProtectedRoute><OrientacionVocacional /></ProtectedRoute>} />
      <Route path="/student/tutor" element={<ProtectedRoute><StudentTutor /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PreviewConnectionBanner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
