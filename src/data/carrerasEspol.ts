/**
 * Catálogo de carreras de la ESPOL para el motor de Orientación Vocacional.
 * Cada carrera define un perfil ideal contra el cual se calcula la
 * compatibilidad del estudiante a partir de sus tests psicológicos.
 */
export interface CarreraEspol {
  id: string;
  nombre: string;
  facultad: string;
  siglaFacultad: string;
  descripcion: string;
  campoLaboral: string[];
  perfilIdeal: {
    empatia: number;
    inteligenciaEmocional: number;
    prosocial: number;
    habilidadesSociales: number;
    estilos: ('V' | 'A' | 'R' | 'K')[];
  };
  materiasClaveESPOL: string[];
  color: string;
  icono: string;
}

export const CARRERAS_ESPOL: CarreraEspol[] = [
  {
    id: 'medicina',
    nombre: 'Medicina',
    facultad: 'Facultad de Ciencias Médicas',
    siglaFacultad: 'FCM',
    descripcion: 'Formación integral en ciencias de la salud humana, diagnóstico y tratamiento de enfermedades.',
    campoLaboral: ['Hospitales públicos y privados', 'Investigación médica', 'Salud pública', 'Docencia universitaria'],
    perfilIdeal: { empatia: 95, inteligenciaEmocional: 90, prosocial: 88, habilidadesSociales: 85, estilos: ['V', 'K'] },
    materiasClaveESPOL: ['Biología', 'Química Orgánica', 'Matemáticas'],
    color: '#EAF3DE', icono: '🩺',
  },
  {
    id: 'psicologia',
    nombre: 'Psicología',
    facultad: 'Facultad de Ciencias Sociales y Humanísticas',
    siglaFacultad: 'FCSH',
    descripcion: 'Estudio del comportamiento humano, salud mental y procesos cognitivos y emocionales.',
    campoLaboral: ['Clínicas y hospitales', 'Empresas (RRHH)', 'Educación', 'Investigación'],
    perfilIdeal: { empatia: 92, inteligenciaEmocional: 95, prosocial: 85, habilidadesSociales: 88, estilos: ['R', 'A'] },
    materiasClaveESPOL: ['Biología', 'Estadística', 'Comunicación'],
    color: '#EEEDFE', icono: '🧠',
  },
  {
    id: 'arquitectura',
    nombre: 'Arquitectura',
    facultad: 'Facultad de Ingeniería en Ciencias de la Tierra',
    siglaFacultad: 'FICT',
    descripcion: 'Diseño de espacios, edificaciones y ciudades combinando creatividad técnica y estética.',
    campoLaboral: ['Estudios de arquitectura', 'Constructoras', 'Gobierno', 'Docencia'],
    perfilIdeal: { empatia: 65, inteligenciaEmocional: 70, prosocial: 60, habilidadesSociales: 72, estilos: ['V', 'K'] },
    materiasClaveESPOL: ['Matemáticas', 'Física', 'Dibujo técnico'],
    color: '#FAEEDA', icono: '🏛️',
  },
  {
    id: 'biotecnologia',
    nombre: 'Ingeniería en Biotecnología',
    facultad: 'Facultad de Ingeniería en Mecánica y Ciencias de la Producción',
    siglaFacultad: 'FIMCP',
    descripcion: 'Aplicación de organismos vivos y tecnología para desarrollar productos y procesos.',
    campoLaboral: ['Industria farmacéutica', 'Agroindustria', 'Investigación', 'Medio ambiente'],
    perfilIdeal: { empatia: 60, inteligenciaEmocional: 65, prosocial: 75, habilidadesSociales: 58, estilos: ['R', 'K'] },
    materiasClaveESPOL: ['Química', 'Biología', 'Matemáticas'],
    color: '#E1F5EE', icono: '🔬',
  },
  {
    id: 'educacion',
    nombre: 'Licenciatura en Educación',
    facultad: 'Facultad de Ciencias Sociales y Humanísticas',
    siglaFacultad: 'FCSH',
    descripcion: 'Formación de docentes con sólida base pedagógica para educación básica y bachillerato.',
    campoLaboral: ['Instituciones educativas', 'Ministerio de Educación', 'ONGs', 'Docencia universitaria'],
    perfilIdeal: { empatia: 88, inteligenciaEmocional: 85, prosocial: 90, habilidadesSociales: 92, estilos: ['A', 'V'] },
    materiasClaveESPOL: ['Matemáticas', 'Lengua', 'Ciencias'],
    color: '#FAECE7', icono: '📚',
  },
  {
    id: 'industrial',
    nombre: 'Ingeniería Industrial',
    facultad: 'Facultad de Ingeniería en Mecánica y Ciencias de la Producción',
    siglaFacultad: 'FIMCP',
    descripcion: 'Optimización de sistemas productivos, logística y gestión de operaciones.',
    campoLaboral: ['Manufactura', 'Logística', 'Consultoría', 'Banca'],
    perfilIdeal: { empatia: 55, inteligenciaEmocional: 65, prosocial: 58, habilidadesSociales: 70, estilos: ['R', 'K'] },
    materiasClaveESPOL: ['Matemáticas', 'Física', 'Química'],
    color: '#E6F1FB', icono: '⚙️',
  },
  {
    id: 'sistemas',
    nombre: 'Ingeniería en Sistemas de Información',
    facultad: 'Facultad de Ingeniería en Electricidad y Computación',
    siglaFacultad: 'FIEC',
    descripcion: 'Desarrollo de software, bases de datos y soluciones tecnológicas para organizaciones.',
    campoLaboral: ['Empresas tech', 'Banca', 'Gobierno', 'Startups', 'Freelance'],
    perfilIdeal: { empatia: 45, inteligenciaEmocional: 60, prosocial: 50, habilidadesSociales: 55, estilos: ['R', 'V'] },
    materiasClaveESPOL: ['Matemáticas', 'Física', 'Lógica'],
    color: '#E6F1FB', icono: '💻',
  },
  {
    id: 'civil',
    nombre: 'Ingeniería Civil',
    facultad: 'Facultad de Ingeniería en Ciencias de la Tierra',
    siglaFacultad: 'FICT',
    descripcion: 'Diseño y construcción de infraestructura: puentes, edificios, carreteras y sistemas hidráulicos.',
    campoLaboral: ['Constructoras', 'Gobierno', 'Consultoras', 'Organismos internacionales'],
    perfilIdeal: { empatia: 50, inteligenciaEmocional: 60, prosocial: 55, habilidadesSociales: 65, estilos: ['V', 'K'] },
    materiasClaveESPOL: ['Matemáticas', 'Física', 'Química'],
    color: '#F1EFE8', icono: '🏗️',
  },
  {
    id: 'ambiental',
    nombre: 'Ingeniería Ambiental',
    facultad: 'Facultad de Ingeniería en Ciencias de la Tierra',
    siglaFacultad: 'FICT',
    descripcion: 'Protección y gestión del medio ambiente, manejo de residuos y evaluación de impacto ambiental.',
    campoLaboral: ['Empresas petroleras', 'Gobierno', 'ONGs', 'Consultoría ambiental'],
    perfilIdeal: { empatia: 70, inteligenciaEmocional: 65, prosocial: 82, habilidadesSociales: 68, estilos: ['K', 'R'] },
    materiasClaveESPOL: ['Química', 'Biología', 'Matemáticas'],
    color: '#E1F5EE', icono: '🌿',
  },
  {
    id: 'administracion',
    nombre: 'Administración de Empresas',
    facultad: 'Facultad de Ciencias Sociales y Humanísticas',
    siglaFacultad: 'FCSH',
    descripcion: 'Gestión organizacional, liderazgo empresarial, finanzas y estrategia de negocios.',
    campoLaboral: ['Empresas privadas', 'Emprendimiento', 'Banca', 'Organismos internacionales'],
    perfilIdeal: { empatia: 62, inteligenciaEmocional: 78, prosocial: 60, habilidadesSociales: 85, estilos: ['A', 'R'] },
    materiasClaveESPOL: ['Matemáticas', 'Estadística', 'Economía'],
    color: '#FAEEDA', icono: '📊',
  },
  {
    id: 'electronica',
    nombre: 'Ingeniería en Electrónica y Telecomunicaciones',
    facultad: 'Facultad de Ingeniería en Electricidad y Computación',
    siglaFacultad: 'FIEC',
    descripcion: 'Diseño y desarrollo de sistemas electrónicos, redes y comunicaciones.',
    campoLaboral: ['Telecomunicaciones', 'Industria', 'Investigación', 'Defensa'],
    perfilIdeal: { empatia: 40, inteligenciaEmocional: 55, prosocial: 45, habilidadesSociales: 50, estilos: ['R', 'V'] },
    materiasClaveESPOL: ['Matemáticas', 'Física', 'Química'],
    color: '#E6F1FB', icono: '📡',
  },
  {
    id: 'nutricion',
    nombre: 'Nutrición y Dietética',
    facultad: 'Facultad de Ciencias Médicas',
    siglaFacultad: 'FCM',
    descripcion: 'Ciencia de la alimentación aplicada a la salud individual y colectiva.',
    campoLaboral: ['Hospitales', 'Clínicas', 'Industria alimentaria', 'Deporte', 'Docencia'],
    perfilIdeal: { empatia: 82, inteligenciaEmocional: 78, prosocial: 85, habilidadesSociales: 80, estilos: ['K', 'V'] },
    materiasClaveESPOL: ['Biología', 'Química', 'Matemáticas'],
    color: '#EAF3DE', icono: '🥗',
  },
];

export function getCarreraById(id: string): CarreraEspol | undefined {
  return CARRERAS_ESPOL.find(c => c.id === id);
}
