/**
 * VOCATIONAL & PERSONALITY TEST – Question Bank
 * ================================================
 * Each question maps to an aptitude category. Scores accumulate per category
 * based on a 5-point Likert scale (1 = Strongly Disagree … 5 = Strongly Agree).
 *
 * TO CUSTOMIZE: Replace the `questions` array with validated psychometric items.
 * Keep the same shape: { id, text, category }
 *
 * Categories drive the results radar chart and career matching.
 */

export type AptitudeCategory =
  | "Ciencias Exactas"
  | "Humanidades"
  | "Artes"
  | "Liderazgo"
  | "Tecnología"
  | "Ciencias de la Salud";

export interface VocationalQuestion {
  /** Unique question identifier */
  id: number;
  /** Question text displayed to the student */
  text: string;
  /** Aptitude category this question measures */
  category: AptitudeCategory;
}

/**
 * Mock question bank – 12 questions, 2 per category.
 * Swap these with real psychometric items when ready.
 */
export const questions: VocationalQuestion[] = [
  // ── Ciencias Exactas ──────────────────────────────────────
  {
    id: 1,
    text: "Disfruto resolver problemas matemáticos complejos y encontrar patrones numéricos.",
    category: "Ciencias Exactas",
  },
  {
    id: 2,
    text: "Me resulta satisfactorio analizar datos y llegar a conclusiones lógicas.",
    category: "Ciencias Exactas",
  },

  // ── Humanidades ───────────────────────────────────────────
  {
    id: 3,
    text: "Me apasiona leer sobre historia, filosofía y culturas diferentes.",
    category: "Humanidades",
  },
  {
    id: 4,
    text: "Disfruto debatir ideas y analizar textos desde múltiples perspectivas.",
    category: "Humanidades",
  },

  // ── Artes ─────────────────────────────────────────────────
  {
    id: 5,
    text: "Me siento atraído/a por actividades creativas como dibujar, pintar o diseñar.",
    category: "Artes",
  },
  {
    id: 6,
    text: "La música, el cine o la escritura creativa son formas en las que me expreso mejor.",
    category: "Artes",
  },

  // ── Liderazgo ─────────────────────────────────────────────
  {
    id: 7,
    text: "Me siento cómodo/a tomando decisiones y guiando a un grupo hacia una meta.",
    category: "Liderazgo",
  },
  {
    id: 8,
    text: "Prefiero organizar proyectos y delegar tareas entre un equipo.",
    category: "Liderazgo",
  },

  // ── Tecnología ────────────────────────────────────────────
  {
    id: 9,
    text: "Me fascina entender cómo funcionan los dispositivos electrónicos y el software.",
    category: "Tecnología",
  },
  {
    id: 10,
    text: "Disfruto programar, automatizar tareas o experimentar con nuevas tecnologías.",
    category: "Tecnología",
  },

  // ── Ciencias de la Salud ──────────────────────────────────
  {
    id: 11,
    text: "Me interesa la biología humana, la anatomía y el funcionamiento del cuerpo.",
    category: "Ciencias de la Salud",
  },
  {
    id: 12,
    text: "Siento vocación por ayudar a otros a mejorar su salud y bienestar.",
    category: "Ciencias de la Salud",
  },
];

/**
 * Likert scale labels – used by the UI to render answer buttons.
 */
export const likertLabels = [
  "Muy en desacuerdo",
  "En desacuerdo",
  "Neutral",
  "De acuerdo",
  "Muy de acuerdo",
] as const;

/**
 * Career matches per category.
 * Each entry maps a category to a list of recommended careers with icons and descriptions.
 */
export interface CareerMatch {
  name: string;
  description: string;
  icon: string; // Lucide icon name
}

export const careerMatches: Record<AptitudeCategory, CareerMatch[]> = {
  "Ciencias Exactas": [
    { name: "Ingeniería Química", description: "Diseña procesos industriales y materiales avanzados.", icon: "flask-conical" },
    { name: "Matemáticas Aplicadas", description: "Modela y resuelve problemas del mundo real con herramientas cuantitativas.", icon: "calculator" },
    { name: "Física", description: "Investiga las leyes fundamentales del universo.", icon: "atom" },
  ],
  "Humanidades": [
    { name: "Derecho", description: "Defiende la justicia y construye marcos legales.", icon: "scale" },
    { name: "Ciencias Políticas", description: "Analiza sistemas de gobierno y políticas públicas.", icon: "landmark" },
    { name: "Filosofía", description: "Explora preguntas fundamentales sobre la existencia y la ética.", icon: "book-open" },
  ],
  "Artes": [
    { name: "Diseño Gráfico", description: "Crea comunicación visual impactante.", icon: "palette" },
    { name: "Arquitectura", description: "Diseña espacios que transforman la vida de las personas.", icon: "building" },
    { name: "Comunicación Audiovisual", description: "Produce contenido para cine, TV y medios digitales.", icon: "film" },
  ],
  "Liderazgo": [
    { name: "Administración de Empresas", description: "Lidera organizaciones hacia el éxito.", icon: "briefcase" },
    { name: "Relaciones Internacionales", description: "Negocia y gestiona relaciones entre naciones.", icon: "globe" },
    { name: "Emprendimiento", description: "Crea soluciones innovadoras y nuevos negocios.", icon: "rocket" },
  ],
  "Tecnología": [
    { name: "Ingeniería en Computación", description: "Desarrolla software y sistemas inteligentes.", icon: "monitor" },
    { name: "Ciencia de Datos", description: "Extrae conocimiento de grandes volúmenes de información.", icon: "bar-chart-3" },
    { name: "Ciberseguridad", description: "Protege sistemas y datos contra amenazas digitales.", icon: "shield" },
  ],
  "Ciencias de la Salud": [
    { name: "Medicina", description: "Diagnostica y trata enfermedades para salvar vidas.", icon: "heart-pulse" },
    { name: "Bioquímica", description: "Investiga los procesos químicos de los organismos vivos.", icon: "microscope" },
    { name: "Nutrición", description: "Diseña planes alimenticios para mejorar la salud.", icon: "apple" },
  ],
};
