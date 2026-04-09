/**
 * PSYCHOMETRIC TEST DATA BANK
 * ============================
 * Five standardized test structures for comprehensive student assessment.
 * Each test follows the same shape for the UniversalTestEngine:
 *   { key, title, description, icon, color, scaleType, scaleLabels, categories, questions }
 *
 * TO CUSTOMIZE: Replace questions with validated psychometric items.
 * Keep the same shape: { id, text, category }
 */

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface PsychometricQuestion {
  id: number;
  text: string;
  category: string;
}

export interface PsychometricCategory {
  key: string;
  label: string;
  description: string;
  color: string; // HSL CSS variable reference or hex
}

export interface PsychometricTest {
  key: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // CSS gradient class
  scaleType: "likert5";
  scaleLabels: readonly string[];
  categories: PsychometricCategory[];
  questions: PsychometricQuestion[];
  /** Chart type for results visualization */
  chartType: "radar" | "bar";
}

// ─── Common Likert Scale ─────────────────────────────────────────────────────

const LIKERT_5 = [
  "Muy en desacuerdo",
  "En desacuerdo",
  "Neutral",
  "De acuerdo",
  "Muy de acuerdo",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// A. MULTIPLE INTELLIGENCES (Gardner)
// ═══════════════════════════════════════════════════════════════════════════════

const multipleIntelligences: PsychometricTest = {
  key: "intelligences",
  title: "Inteligencias Múltiples",
  description: "Identifica tus fortalezas cognitivas según la teoría de Howard Gardner.",
  icon: "brain",
  color: "from-[hsl(270,80%,60%)] to-[hsl(210,90%,55%)]",
  scaleType: "likert5",
  scaleLabels: LIKERT_5,
  chartType: "radar",
  categories: [
    { key: "logico-matematica", label: "Lógico-Matemática", description: "Capacidad de razonamiento lógico y numérico.", color: "hsl(210, 90%, 55%)" },
    { key: "linguistica", label: "Lingüística", description: "Habilidad con el lenguaje y la comunicación.", color: "hsl(160, 60%, 50%)" },
    { key: "espacial", label: "Espacial", description: "Percepción visual y orientación espacial.", color: "hsl(270, 80%, 60%)" },
    { key: "musical", label: "Musical", description: "Sensibilidad al ritmo, tono y melodía.", color: "hsl(330, 85%, 60%)" },
    { key: "corporal-kinestesica", label: "Corporal-Kinestésica", description: "Coordinación corporal y destreza física.", color: "hsl(25, 95%, 55%)" },
    { key: "interpersonal", label: "Interpersonal", description: "Comprensión de los demás y habilidades sociales.", color: "hsl(180, 70%, 45%)" },
    { key: "intrapersonal", label: "Intrapersonal", description: "Autoconocimiento y reflexión interna.", color: "hsl(300, 70%, 50%)" },
    { key: "naturalista", label: "Naturalista", description: "Conexión y comprensión del mundo natural.", color: "hsl(120, 60%, 40%)" },
  ],
  questions: [
    // Lógico-Matemática
    { id: 1, text: "Disfruto resolver acertijos y problemas de lógica.", category: "logico-matematica" },
    { id: 2, text: "Me resulta fácil trabajar con números y estadísticas.", category: "logico-matematica" },
    // Lingüística
    { id: 3, text: "Me gusta leer y escribir con frecuencia.", category: "linguistica" },
    { id: 4, text: "Puedo expresar mis ideas con claridad al hablar o escribir.", category: "linguistica" },
    // Espacial
    { id: 5, text: "Tengo facilidad para orientarme en lugares nuevos.", category: "espacial" },
    { id: 6, text: "Prefiero usar mapas, diagramas o gráficos para entender información.", category: "espacial" },
    // Musical
    { id: 7, text: "Puedo reconocer melodías con facilidad y recordar canciones.", category: "musical" },
    { id: 8, text: "Me concentro mejor con música de fondo.", category: "musical" },
    // Corporal-Kinestésica
    { id: 9, text: "Aprendo mejor cuando puedo moverme o usar las manos.", category: "corporal-kinestesica" },
    { id: 10, text: "Se me dan bien los deportes o actividades físicas.", category: "corporal-kinestesica" },
    // Interpersonal
    { id: 11, text: "Disfruto trabajar en equipo y me resulta fácil entender a los demás.", category: "interpersonal" },
    { id: 12, text: "Mis amigos suelen pedirme consejo.", category: "interpersonal" },
    // Intrapersonal
    { id: 13, text: "Reflexiono con frecuencia sobre mis emociones y metas.", category: "intrapersonal" },
    { id: 14, text: "Prefiero trabajar solo/a en mis proyectos.", category: "intrapersonal" },
    // Naturalista
    { id: 15, text: "Me apasiona la naturaleza y el medio ambiente.", category: "naturalista" },
    { id: 16, text: "Noto detalles en plantas, animales y fenómenos naturales.", category: "naturalista" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// B. PERSONALITY TRAITS (Big Five / OCEAN)
// ═══════════════════════════════════════════════════════════════════════════════

const bigFive: PsychometricTest = {
  key: "personality",
  title: "Rasgos de Personalidad (Big Five)",
  description: "Evalúa tus cinco grandes dimensiones de personalidad: OCEAN.",
  icon: "user-circle",
  color: "from-[hsl(330,85%,60%)] to-[hsl(25,95%,55%)]",
  scaleType: "likert5",
  scaleLabels: LIKERT_5,
  chartType: "radar",
  categories: [
    { key: "openness", label: "Apertura", description: "Curiosidad intelectual y aprecio por el arte.", color: "hsl(270, 80%, 60%)" },
    { key: "conscientiousness", label: "Responsabilidad", description: "Organización, disciplina y orientación a metas.", color: "hsl(210, 90%, 55%)" },
    { key: "extraversion", label: "Extraversión", description: "Sociabilidad, energía y emociones positivas.", color: "hsl(25, 95%, 55%)" },
    { key: "agreeableness", label: "Amabilidad", description: "Cooperación, empatía y confianza.", color: "hsl(160, 60%, 50%)" },
    { key: "neuroticism", label: "Neuroticismo", description: "Tendencia a experimentar emociones negativas.", color: "hsl(330, 85%, 60%)" },
  ],
  questions: [
    // Openness
    { id: 1, text: "Me emociona explorar ideas nuevas y poco convencionales.", category: "openness" },
    { id: 2, text: "Disfruto el arte, la música y la literatura.", category: "openness" },
    // Conscientiousness
    { id: 3, text: "Soy organizado/a y me gusta planificar con anticipación.", category: "conscientiousness" },
    { id: 4, text: "Termino mis tareas antes de la fecha límite.", category: "conscientiousness" },
    // Extraversion
    { id: 5, text: "Me siento con energía cuando estoy rodeado/a de personas.", category: "extraversion" },
    { id: 6, text: "Soy el/la que inicia conversaciones en un grupo nuevo.", category: "extraversion" },
    // Agreeableness
    { id: 7, text: "Me preocupo genuinamente por el bienestar de los demás.", category: "agreeableness" },
    { id: 8, text: "Evito los conflictos y busco soluciones pacíficas.", category: "agreeableness" },
    // Neuroticism
    { id: 9, text: "Tiendo a preocuparme excesivamente por las cosas.", category: "neuroticism" },
    { id: 10, text: "Mis emociones cambian con frecuencia a lo largo del día.", category: "neuroticism" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// C. VOCATIONAL INTERESTS (Holland Codes / RIASEC)
// ═══════════════════════════════════════════════════════════════════════════════

const riasec: PsychometricTest = {
  key: "riasec",
  title: "Intereses Vocacionales (RIASEC)",
  description: "Descubre tu perfil vocacional según los códigos de Holland.",
  icon: "compass",
  color: "from-[hsl(160,60%,50%)] to-[hsl(210,90%,55%)]",
  scaleType: "likert5",
  scaleLabels: LIKERT_5,
  chartType: "radar",
  categories: [
    { key: "realistic", label: "Realista (R)", description: "Trabajo manual, mecánico o al aire libre.", color: "hsl(25, 95%, 55%)" },
    { key: "investigative", label: "Investigativo (I)", description: "Análisis, investigación y resolución de problemas.", color: "hsl(210, 90%, 55%)" },
    { key: "artistic", label: "Artístico (A)", description: "Creatividad, expresión y diseño.", color: "hsl(270, 80%, 60%)" },
    { key: "social", label: "Social (S)", description: "Ayuda, enseñanza y servicio comunitario.", color: "hsl(160, 60%, 50%)" },
    { key: "enterprising", label: "Emprendedor (E)", description: "Liderazgo, persuasión y toma de riesgos.", color: "hsl(330, 85%, 60%)" },
    { key: "conventional", label: "Convencional (C)", description: "Orden, datos y procedimientos estructurados.", color: "hsl(180, 70%, 45%)" },
  ],
  questions: [
    { id: 1, text: "Me gusta construir, reparar o trabajar con herramientas.", category: "realistic" },
    { id: 2, text: "Prefiero actividades al aire libre y trabajo físico.", category: "realistic" },
    { id: 3, text: "Disfruto investigar y buscar respuestas a preguntas complejas.", category: "investigative" },
    { id: 4, text: "Me interesan los experimentos científicos.", category: "investigative" },
    { id: 5, text: "Me expreso mejor a través del arte, la escritura o la música.", category: "artistic" },
    { id: 6, text: "Valoro la originalidad y la libertad creativa.", category: "artistic" },
    { id: 7, text: "Me gusta ayudar a las personas a resolver sus problemas.", category: "social" },
    { id: 8, text: "Disfruto enseñar o guiar a otros.", category: "social" },
    { id: 9, text: "Me motiva liderar proyectos y tomar decisiones importantes.", category: "enterprising" },
    { id: 10, text: "Me atrae el mundo de los negocios y las ventas.", category: "enterprising" },
    { id: 11, text: "Soy detallista y me gusta trabajar con datos organizados.", category: "conventional" },
    { id: 12, text: "Prefiero seguir instrucciones claras y procedimientos definidos.", category: "conventional" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// D. LEARNING STYLES (VARK)
// ═══════════════════════════════════════════════════════════════════════════════

const vark: PsychometricTest = {
  key: "vark",
  title: "Estilos de Aprendizaje (VARK)",
  description: "Identifica cómo aprendes mejor: Visual, Auditivo, Lectura o Kinestésico.",
  icon: "graduation-cap",
  color: "from-[hsl(210,90%,55%)] to-[hsl(270,80%,60%)]",
  scaleType: "likert5",
  scaleLabels: LIKERT_5,
  chartType: "bar",
  categories: [
    { key: "visual", label: "Visual (V)", description: "Aprendes mejor con imágenes, gráficos y diagramas.", color: "hsl(210, 90%, 55%)" },
    { key: "aural", label: "Auditivo (A)", description: "Aprendes mejor escuchando explicaciones y debates.", color: "hsl(270, 80%, 60%)" },
    { key: "readwrite", label: "Lectura/Escritura (R)", description: "Aprendes mejor leyendo y tomando notas.", color: "hsl(160, 60%, 50%)" },
    { key: "kinesthetic", label: "Kinestésico (K)", description: "Aprendes mejor practicando y haciendo.", color: "hsl(25, 95%, 55%)" },
  ],
  questions: [
    { id: 1, text: "Entiendo mejor un tema cuando veo diagramas o infografías.", category: "visual" },
    { id: 2, text: "Prefiero usar mapas conceptuales y colores al estudiar.", category: "visual" },
    { id: 3, text: "Aprendo más rápido cuando alguien me explica verbalmente.", category: "aural" },
    { id: 4, text: "Me resulta útil grabar las clases y escucharlas después.", category: "aural" },
    { id: 5, text: "Estudio mejor leyendo libros de texto y artículos.", category: "readwrite" },
    { id: 6, text: "Tomar notas detalladas me ayuda a recordar la información.", category: "readwrite" },
    { id: 7, text: "Aprendo haciendo ejercicios prácticos y experimentando.", category: "kinesthetic" },
    { id: 8, text: "Prefiero laboratorios y actividades prácticas a las clases teóricas.", category: "kinesthetic" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// E. ACADEMIC WELL-BEING & STRESS
// ═══════════════════════════════════════════════════════════════════════════════

const wellbeing: PsychometricTest = {
  key: "wellbeing",
  title: "Bienestar Académico y Estrés",
  description: "Evalúa tu nivel de estrés académico, motivación y salud emocional.",
  icon: "heart",
  color: "from-[hsl(330,85%,60%)] to-[hsl(300,70%,50%)]",
  scaleType: "likert5",
  scaleLabels: LIKERT_5,
  chartType: "bar",
  categories: [
    { key: "burnout", label: "Agotamiento (Burnout)", description: "Nivel de cansancio y desgaste académico.", color: "hsl(0, 72%, 50%)" },
    { key: "motivation", label: "Motivación", description: "Nivel de interés y compromiso con los estudios.", color: "hsl(160, 60%, 50%)" },
    { key: "anxiety", label: "Ansiedad Académica", description: "Nivel de preocupación relacionada con el rendimiento.", color: "hsl(25, 95%, 55%)" },
    { key: "social_support", label: "Apoyo Social", description: "Percepción de redes de apoyo emocional.", color: "hsl(210, 90%, 55%)" },
    { key: "self_efficacy", label: "Autoeficacia", description: "Confianza en la propia capacidad académica.", color: "hsl(270, 80%, 60%)" },
  ],
  questions: [
    // Burnout
    { id: 1, text: "Me siento emocionalmente agotado/a por los estudios.", category: "burnout" },
    { id: 2, text: "A veces siento que no puedo más con la carga académica.", category: "burnout" },
    // Motivation
    { id: 3, text: "Me siento motivado/a para alcanzar mis metas académicas.", category: "motivation" },
    { id: 4, text: "Disfruto aprender cosas nuevas en mis clases.", category: "motivation" },
    // Anxiety
    { id: 5, text: "Me preocupo mucho antes de un examen, incluso si he estudiado.", category: "anxiety" },
    { id: 6, text: "A menudo comparo mis notas con las de mis compañeros.", category: "anxiety" },
    // Social Support
    { id: 7, text: "Cuento con amigos o familiares que me apoyan emocionalmente.", category: "social_support" },
    { id: 8, text: "Siento que puedo pedir ayuda cuando la necesito.", category: "social_support" },
    // Self-Efficacy
    { id: 9, text: "Confío en mi capacidad para aprobar materias difíciles.", category: "self_efficacy" },
    { id: 10, text: "Cuando enfrento un reto académico, sé que puedo superarlo.", category: "self_efficacy" },
  ],
};

// ─── Export All Tests ────────────────────────────────────────────────────────

export const allTests: PsychometricTest[] = [
  multipleIntelligences,
  bigFive,
  riasec,
  vark,
  wellbeing,
];

export const testsByKey: Record<string, PsychometricTest> = Object.fromEntries(
  allTests.map((t) => [t.key, t])
);
