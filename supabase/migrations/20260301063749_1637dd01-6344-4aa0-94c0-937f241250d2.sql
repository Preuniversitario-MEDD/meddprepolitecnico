
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'estudiante');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  apellidos TEXT NOT NULL DEFAULT '',
  fecha_nacimiento DATE,
  usuario TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  primera_vez BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'estudiante',
  UNIQUE(user_id, role)
);

-- Create sesiones table (14 sessions)
CREATE TABLE public.sesiones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'bloqueada' CHECK (estado IN ('abierta', 'bloqueada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contenido table
CREATE TABLE public.contenido (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('teoria', 'truco', 'ejercicio')),
  titulo TEXT NOT NULL DEFAULT '',
  texto TEXT DEFAULT '',
  url TEXT DEFAULT '',
  imagen_url TEXT DEFAULT '',
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quiz_preguntas table  
CREATE TABLE public.quiz_preguntas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL DEFAULT '[]',
  respuesta_correcta INTEGER NOT NULL DEFAULT 0,
  imagen_url TEXT DEFAULT '',
  grupo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create progreso_estudiante table
CREATE TABLE public.progreso_estudiante (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sesion_id UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  completada BOOLEAN NOT NULL DEFAULT false,
  puntaje_quiz NUMERIC DEFAULT 0,
  preguntas_respondidas JSONB DEFAULT '[]',
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sesion_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progreso_estudiante ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sesiones: everyone can read, admins can manage
CREATE POLICY "Everyone can view sesiones" ON public.sesiones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sesiones" ON public.sesiones FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Contenido: authenticated can read, admins manage
CREATE POLICY "Everyone can view contenido" ON public.contenido FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage contenido" ON public.contenido FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Quiz preguntas: authenticated can read, admins manage
CREATE POLICY "Everyone can view quiz" ON public.quiz_preguntas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage quiz" ON public.quiz_preguntas FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Progreso: users manage own, admins view all
CREATE POLICY "Users can manage own progress" ON public.progreso_estudiante FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON public.progreso_estudiante FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, cedula, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'cedula', ''), COALESCE(NEW.raw_user_meta_data->>'nombre', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'estudiante');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert 14 sessions
INSERT INTO public.sesiones (numero, titulo, descripcion, estado) VALUES
(1, 'Estructura Atómica', 'Modelos atómicos, números cuánticos y configuración electrónica', 'abierta'),
(2, 'Tabla Periódica', 'Propiedades periódicas y clasificación de elementos', 'bloqueada'),
(3, 'Enlaces Químicos', 'Enlace iónico, covalente y metálico', 'bloqueada'),
(4, 'Nomenclatura Inorgánica', 'Óxidos, ácidos, bases y sales', 'bloqueada'),
(5, 'Estequiometría', 'Balanceo de ecuaciones y cálculos mol', 'bloqueada'),
(6, 'Estados de la Materia', 'Gases, líquidos y sólidos', 'bloqueada'),
(7, 'Soluciones', 'Concentración, dilución y propiedades coligativas', 'bloqueada'),
(8, 'Cinética Química', 'Velocidad de reacción y factores', 'bloqueada'),
(9, 'Equilibrio Químico', 'Constante de equilibrio y Le Chatelier', 'bloqueada'),
(10, 'Ácidos y Bases', 'pH, pOH y neutralización', 'bloqueada'),
(11, 'Electroquímica', 'Celdas galvánicas y electrólisis', 'bloqueada'),
(12, 'Química Orgánica I', 'Hidrocarburos y grupos funcionales', 'bloqueada'),
(13, 'Química Orgánica II', 'Reacciones orgánicas y polímeros', 'bloqueada'),
(14, 'Repaso General', 'Simulacro final tipo ESPOL', 'bloqueada');

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
