// ============================================================
// testData.ts — Motor Universal de Tests Psicométricos
// Versión extendida: 50+ preguntas por test
// ============================================================

export type QuestionOption = { label: string; value: number };
export type Question = {
  id: string; text: string; category: string;
  reversed?: boolean; options: QuestionOption[];
};
export type Test = {
  id: string; name: string; shortName: string;
  description: string; icon: string;
  area: "personalidad" | "vocacional" | "emocional" | "actitudes" | "aptitudes" | "aprendizaje" | "bienestar" | "inteligencias";
  estimatedMinutes: number; questions: Question[];
  categories: Record<string, string>;
  interpret: (scores: Record<string, number>) => InterpretResult[];
};
export type InterpretResult = {
  category: string; label: string; score: number; max: number;
  percent: number; level: "bajo" | "medio" | "alto"; description: string;
};

// ─── Opciones reutilizables ───────────────────────────────────
const acuerdo5: QuestionOption[] = [
  { label: "Totalmente en desacuerdo", value: 1 },
  { label: "En desacuerdo", value: 2 },
  { label: "Neutral", value: 3 },
  { label: "De acuerdo", value: 4 },
  { label: "Totalmente de acuerdo", value: 5 },
];
const frecuencia5: QuestionOption[] = [
  { label: "Nunca", value: 1 },
  { label: "Pocas veces", value: 2 },
  { label: "A veces", value: 3 },
  { label: "Frecuentemente", value: 4 },
  { label: "Siempre", value: 5 },
];
const intensidad5: QuestionOption[] = [
  { label: "Nada", value: 1 },
  { label: "Poco", value: 2 },
  { label: "Moderadamente", value: 3 },
  { label: "Bastante", value: 4 },
  { label: "Mucho", value: 5 },
];

function lv(p: number): "bajo" | "medio" | "alto" {
  return p < 40 ? "bajo" : p < 70 ? "medio" : "alto";
}
function pct(raw: number, max: number) { return Math.min(100, Math.round((raw / max) * 100)); }

// ══════════════════════════════════════════════════════════════
// 1. BIG FIVE — 60 preguntas (12 por rasgo)
// ══════════════════════════════════════════════════════════════
export const bigFiveTest: Test = {
  id: "big-five", name: "Big Five — Rasgos de Personalidad", shortName: "Big Five",
  icon: "🧠", area: "personalidad", estimatedMinutes: 18,
  description: "Evalúa los 5 grandes rasgos de personalidad respaldados científicamente con 60 ítems balanceados.",
  categories: { O: "Apertura", C: "Responsabilidad", E: "Extraversión", A: "Amabilidad", N: "Neuroticismo" },
  questions: [
    // APERTURA (O) — 12 ítems
    { id:"bf_o1",  text:"Tengo una imaginación vívida y me encanta fantasear.", category:"O", options:acuerdo5 },
    { id:"bf_o2",  text:"Me interesan las ideas filosóficas y abstractas.", category:"O", options:acuerdo5 },
    { id:"bf_o3",  text:"Disfruto explorar el arte, la música o la literatura.", category:"O", options:acuerdo5 },
    { id:"bf_o4",  text:"Me gusta aprender sobre temas que no conozco.", category:"O", options:acuerdo5 },
    { id:"bf_o5",  text:"Busco experiencias nuevas aunque sean incómodas.", category:"O", options:acuerdo5 },
    { id:"bf_o6",  text:"Me cuestiono constantemente mis propias creencias.", category:"O", options:acuerdo5 },
    { id:"bf_o7",  text:"Prefiero rutinas establecidas a nuevas experiencias.", category:"O", reversed:true, options:acuerdo5 },
    { id:"bf_o8",  text:"Las ideas abstractas me aburren.", category:"O", reversed:true, options:acuerdo5 },
    { id:"bf_o9",  text:"Me emociona visitar lugares o culturas desconocidas.", category:"O", options:acuerdo5 },
    { id:"bf_o10", text:"Disfruto los debates intelectuales profundos.", category:"O", options:acuerdo5 },
    { id:"bf_o11", text:"La creatividad es una de mis fortalezas.", category:"O", options:acuerdo5 },
    { id:"bf_o12", text:"Prefiero lo concreto y práctico antes que lo teórico.", category:"O", reversed:true, options:acuerdo5 },
    // RESPONSABILIDAD (C) — 12 ítems
    { id:"bf_c1",  text:"Soy una persona muy organizada y meticulosa.", category:"C", options:acuerdo5 },
    { id:"bf_c2",  text:"Cumplo siempre con mis compromisos y plazos.", category:"C", options:acuerdo5 },
    { id:"bf_c3",  text:"Planifico cuidadosamente antes de actuar.", category:"C", options:acuerdo5 },
    { id:"bf_c4",  text:"Me esfuerzo por alcanzar la excelencia en lo que hago.", category:"C", options:acuerdo5 },
    { id:"bf_c5",  text:"Mantengo mis pertenencias ordenadas y en su lugar.", category:"C", options:acuerdo5 },
    { id:"bf_c6",  text:"Rara vez pierdo el tiempo en actividades improductivas.", category:"C", options:acuerdo5 },
    { id:"bf_c7",  text:"Suelo dejar las cosas para después.", category:"C", reversed:true, options:acuerdo5 },
    { id:"bf_c8",  text:"Tengo dificultad para mantener el enfoque en tareas largas.", category:"C", reversed:true, options:acuerdo5 },
    { id:"bf_c9",  text:"Mis metas a largo plazo guían mis decisiones diarias.", category:"C", options:acuerdo5 },
    { id:"bf_c10", text:"Soy puntual y respeto los horarios.", category:"C", options:acuerdo5 },
    { id:"bf_c11", text:"Actúo por impulso sin pensar las consecuencias.", category:"C", reversed:true, options:acuerdo5 },
    { id:"bf_c12", text:"Me considero una persona disciplinada y persistente.", category:"C", options:acuerdo5 },
    // EXTRAVERSIÓN (E) — 12 ítems
    { id:"bf_e1",  text:"Disfruto estar rodeado de mucha gente.", category:"E", options:acuerdo5 },
    { id:"bf_e2",  text:"Me siento con energía en reuniones sociales.", category:"E", options:acuerdo5 },
    { id:"bf_e3",  text:"Tomo la iniciativa en conversaciones con desconocidos.", category:"E", options:acuerdo5 },
    { id:"bf_e4",  text:"Me gusta ser el centro de atención.", category:"E", options:acuerdo5 },
    { id:"bf_e5",  text:"Hablo con entusiasmo sobre mis experiencias.", category:"E", options:acuerdo5 },
    { id:"bf_e6",  text:"Me aburro cuando estoy solo/a por mucho tiempo.", category:"E", options:acuerdo5 },
    { id:"bf_e7",  text:"Prefiero la compañía de pocas personas a grandes grupos.", category:"E", reversed:true, options:acuerdo5 },
    { id:"bf_e8",  text:"Me siento agotado/a después de socializar mucho.", category:"E", reversed:true, options:acuerdo5 },
    { id:"bf_e9",  text:"Me resulta fácil presentarme ante nuevas personas.", category:"E", options:acuerdo5 },
    { id:"bf_e10", text:"Soy animado/a y expresivo/a en mis emociones.", category:"E", options:acuerdo5 },
    { id:"bf_e11", text:"Busco activamente situaciones de entretenimiento social.", category:"E", options:acuerdo5 },
    { id:"bf_e12", text:"Prefiero actividades tranquilas a actividades movidas.", category:"E", reversed:true, options:acuerdo5 },
    // AMABILIDAD (A) — 12 ítems
    { id:"bf_a1",  text:"Me preocupa el bienestar de los demás.", category:"A", options:acuerdo5 },
    { id:"bf_a2",  text:"Trato de ver lo mejor en cada persona.", category:"A", options:acuerdo5 },
    { id:"bf_a3",  text:"Evito los conflictos y busco la armonía.", category:"A", options:acuerdo5 },
    { id:"bf_a4",  text:"Soy empático/a con quienes están en dificultades.", category:"A", options:acuerdo5 },
    { id:"bf_a5",  text:"Me cuesta negarme cuando alguien me pide ayuda.", category:"A", options:acuerdo5 },
    { id:"bf_a6",  text:"Tengo en cuenta los sentimientos ajenos antes de hablar.", category:"A", options:acuerdo5 },
    { id:"bf_a7",  text:"Puedo ser crítico/a o descortés si lo considero necesario.", category:"A", reversed:true, options:acuerdo5 },
    { id:"bf_a8",  text:"Compito antes que colaborar cuando es posible.", category:"A", reversed:true, options:acuerdo5 },
    { id:"bf_a9",  text:"Soy generoso/a con mi tiempo y recursos.", category:"A", options:acuerdo5 },
    { id:"bf_a10", text:"Disfruto hacer favores aunque no reciba nada a cambio.", category:"A", options:acuerdo5 },
    { id:"bf_a11", text:"Confío fácilmente en las buenas intenciones de otros.", category:"A", options:acuerdo5 },
    { id:"bf_a12", text:"A veces manipulo a otros para obtener lo que quiero.", category:"A", reversed:true, options:acuerdo5 },
    // NEUROTICISMO (N) — 12 ítems
    { id:"bf_n1",  text:"Me preocupo mucho por cosas que pueden salir mal.", category:"N", options:acuerdo5 },
    { id:"bf_n2",  text:"Me altero con facilidad ante el estrés.", category:"N", options:acuerdo5 },
    { id:"bf_n3",  text:"Cambio de humor frecuentemente.", category:"N", options:acuerdo5 },
    { id:"bf_n4",  text:"Me siento inseguro/a en situaciones nuevas.", category:"N", options:acuerdo5 },
    { id:"bf_n5",  text:"Me cuesta recuperarme de experiencias negativas.", category:"N", options:acuerdo5 },
    { id:"bf_n6",  text:"Siento ansiedad ante situaciones de evaluación o presión.", category:"N", options:acuerdo5 },
    { id:"bf_n7",  text:"Me mantengo calmado/a bajo presión.", category:"N", reversed:true, options:acuerdo5 },
    { id:"bf_n8",  text:"Rara vez me siento triste o abatido/a sin razón.", category:"N", reversed:true, options:acuerdo5 },
    { id:"bf_n9",  text:"Me siento fácilmente herido/a por comentarios negativos.", category:"N", options:acuerdo5 },
    { id:"bf_n10", text:"Soy propenso/a a sentirme culpable.", category:"N", options:acuerdo5 },
    { id:"bf_n11", text:"Experimento miedo o pánico con más frecuencia que otros.", category:"N", options:acuerdo5 },
    { id:"bf_n12", text:"Soy emocionalmente estable y resistente.", category:"N", reversed:true, options:acuerdo5 },
  ],
  interpret(scores) {
    const descs: Record<string, Record<string,string>> = {
      O:{ bajo:"Prefieres lo conocido, concreto y práctico. Eres realista y convencional.", medio:"Equilibrio entre tradición y apertura. Curioso/a en temas de interés.", alto:"Muy curioso/a, creativo/a e imaginativo/a. Amas las ideas nuevas y el arte." },
      C:{ bajo:"Tendencia a la espontaneidad. Puede costar mantener compromisos a largo plazo.", medio:"Organizado/a cuando la situación lo requiere. Capacidad de planificación moderada.", alto:"Muy disciplinado/a, confiable y orientado/a a metas. Alto autocontrol." },
      E:{ bajo:"Introvertido/a. Recarga energía en soledad. Prefiere vínculos profundos y pocos.", medio:"Ambivierte. Cómodo/a tanto en soledad como en grupos moderados.", alto:"Muy sociable, enérgico/a y comunicativo/a. Florece en entornos sociales." },
      A:{ bajo:"Directo/a, competitivo/a y escéptico/a. Puede parecer frío/a ante otros.", medio:"Cooperativo/a cuando la situación lo requiere. Balance entre empatía y asertividad.", alto:"Muy empático/a, altruista y colaborador/a. Propenso/a a sacrificarse por otros." },
      N:{ bajo:"Emocionalmente muy estable. Tranquilo/a bajo presión. Resiliencia alta.", medio:"Reacciones emocionales moderadas. Ocasionalmente ansioso/a en situaciones difíciles.", alto:"Alta sensibilidad emocional. Propenso/a a ansiedad, cambios de humor y preocupación." },
    };
    return Object.entries(this.categories as Record<string,string>).map(([k, label]) => {
      const raw = scores[k]??0; const max=60; const p=pct(raw,max); const l=lv(p);
      return { category:k, label, score:raw, max, percent:p, level:l, description:descs[k][l] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 2. MBTI — 64 preguntas (16 por dimensión)
// ══════════════════════════════════════════════════════════════
export const mbtiTest: Test = {
  id:"mbti", name:"MBTI — Tipos de Personalidad", shortName:"MBTI",
  icon:"🔮", area:"personalidad", estimatedMinutes:20,
  description:"Basado en la teoría de Jung. 64 ítems para identificar tu tipo en 4 dimensiones: E/I, S/N, T/F, J/P.",
  categories:{ EI:"Extraversión vs Introversión", SN:"Sensación vs Intuición", TF:"Pensamiento vs Sentimiento", JP:"Juicio vs Percepción" },
  questions:[
    // EI — 16 ítems
    { id:"mb_ei1",  text:"Prefiero pasar el tiempo libre con otras personas.", category:"EI", options:acuerdo5 },
    { id:"mb_ei2",  text:"Me siento agotado/a después de socializar mucho.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei3",  text:"Disfruto las fiestas y reuniones grandes.", category:"EI", options:acuerdo5 },
    { id:"mb_ei4",  text:"Prefiero reflexionar solo/a antes de hablar.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei5",  text:"Me resulta fácil conocer gente nueva.", category:"EI", options:acuerdo5 },
    { id:"mb_ei6",  text:"Disfruto actividades solitarias como leer o caminar solo/a.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei7",  text:"Hablo sin filtro cuando estoy con otros.", category:"EI", options:acuerdo5 },
    { id:"mb_ei8",  text:"Me cuesta trabajo hablar en público o con desconocidos.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei9",  text:"Tengo muchos amigos y contactos sociales.", category:"EI", options:acuerdo5 },
    { id:"mb_ei10", text:"Prefiero un círculo pequeño de amigos íntimos.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei11", text:"Me gusta llamar la atención con mis ideas o acciones.", category:"EI", options:acuerdo5 },
    { id:"mb_ei12", text:"Las conversaciones profundas uno a uno me resultan más satisfactorias.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei13", text:"La energía del grupo me recarga y motiva.", category:"EI", options:acuerdo5 },
    { id:"mb_ei14", text:"Necesito tiempo a solas para procesar mis pensamientos.", category:"EI", reversed:true, options:acuerdo5 },
    { id:"mb_ei15", text:"Comienzo conversaciones espontáneamente con desconocidos.", category:"EI", options:acuerdo5 },
    { id:"mb_ei16", text:"Me siento más yo mismo/a cuando estoy en soledad.", category:"EI", reversed:true, options:acuerdo5 },
    // SN — 16 ítems
    { id:"mb_sn1",  text:"Me fijo más en los hechos concretos que en las posibilidades.", category:"SN", options:acuerdo5 },
    { id:"mb_sn2",  text:"Prefiero la intuición y las corazonadas sobre los datos duros.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn3",  text:"Soy práctico/a y me centro en lo que funciona hoy.", category:"SN", options:acuerdo5 },
    { id:"mb_sn4",  text:"Me atrae más el futuro posible que el presente real.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn5",  text:"Confío más en la experiencia pasada que en la imaginación.", category:"SN", options:acuerdo5 },
    { id:"mb_sn6",  text:"Me encanta especular sobre lo que podría ser.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn7",  text:"Prefiero instrucciones claras y paso a paso.", category:"SN", options:acuerdo5 },
    { id:"mb_sn8",  text:"Disfruto conectar ideas aparentemente no relacionadas.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn9",  text:"Me baso en lo que puedo ver, tocar y verificar.", category:"SN", options:acuerdo5 },
    { id:"mb_sn10", text:"Me guío por presentimientos o corazonadas.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn11", text:"Prefiero lo concreto antes que lo metafórico.", category:"SN", options:acuerdo5 },
    { id:"mb_sn12", text:"Me pierdo fácilmente en ideas abstractas y teorías.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn13", text:"Me incomoda la ambigüedad y prefiero claridad.", category:"SN", options:acuerdo5 },
    { id:"mb_sn14", text:"El potencial futuro me importa más que la situación actual.", category:"SN", reversed:true, options:acuerdo5 },
    { id:"mb_sn15", text:"Recuerdo mejor los detalles específicos que los conceptos generales.", category:"SN", options:acuerdo5 },
    { id:"mb_sn16", text:"Me interesan más los patrones y significados que los hechos.", category:"SN", reversed:true, options:acuerdo5 },
    // TF — 16 ítems
    { id:"mb_tf1",  text:"Al tomar decisiones, la lógica importa más que los sentimientos.", category:"TF", options:acuerdo5 },
    { id:"mb_tf2",  text:"Me preocupa mucho cómo afectarán mis decisiones a los demás.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf3",  text:"Prefiero ser directo/a aunque a veces lastime.", category:"TF", options:acuerdo5 },
    { id:"mb_tf4",  text:"La armonía del grupo es más importante que tener razón.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf5",  text:"Analizo situaciones con objetividad antes de decidir.", category:"TF", options:acuerdo5 },
    { id:"mb_tf6",  text:"Las emociones son información válida para tomar decisiones.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf7",  text:"Prefiero la crítica honesta a la diplomacia vacía.", category:"TF", options:acuerdo5 },
    { id:"mb_tf8",  text:"Tengo en cuenta los valores personales al decidir.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf9",  text:"Un buen argumento lógico me convence más que un relato emocional.", category:"TF", options:acuerdo5 },
    { id:"mb_tf10", text:"Me resulta difícil ignorar el sufrimiento ajeno al decidir.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf11", text:"Priorizo la justicia sobre la misericordia.", category:"TF", options:acuerdo5 },
    { id:"mb_tf12", text:"La empatía es mi principal guía en relaciones.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf13", text:"Corrijo errores aunque el proceso hiera sentimientos.", category:"TF", options:acuerdo5 },
    { id:"mb_tf14", text:"Me importa más que la gente se sienta bien que acertar.", category:"TF", reversed:true, options:acuerdo5 },
    { id:"mb_tf15", text:"Separo fácilmente mis emociones de mis razonamientos.", category:"TF", options:acuerdo5 },
    { id:"mb_tf16", text:"Mis valores personales guían mis decisiones más que la lógica.", category:"TF", reversed:true, options:acuerdo5 },
    // JP — 16 ítems
    { id:"mb_jp1",  text:"Me gusta tener mi agenda y horarios bien planificados.", category:"JP", options:acuerdo5 },
    { id:"mb_jp2",  text:"Prefiero mantener mis opciones abiertas en lugar de decidir pronto.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp3",  text:"Me incomoda dejar cosas inconclusas.", category:"JP", options:acuerdo5 },
    { id:"mb_jp4",  text:"Disfruto adaptarme sobre la marcha.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp5",  text:"Hago listas y las sigo fielmente.", category:"JP", options:acuerdo5 },
    { id:"mb_jp6",  text:"Me gusta explorar sin itinerario fijo.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp7",  text:"Me estresa no saber lo que viene.", category:"JP", options:acuerdo5 },
    { id:"mb_jp8",  text:"Prefiero improvisar a seguir un plan.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp9",  text:"Tomo decisiones con rapidez y seguridad.", category:"JP", options:acuerdo5 },
    { id:"mb_jp10", text:"Me resulta difícil comprometerse con una opción definitiva.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp11", text:"Me gusta terminar proyectos antes de comenzar otros.", category:"JP", options:acuerdo5 },
    { id:"mb_jp12", text:"El orden me agobia; prefiero la flexibilidad.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp13", text:"Sigo rutinas establecidas con disciplina.", category:"JP", options:acuerdo5 },
    { id:"mb_jp14", text:"Los cambios de último minuto no me molestan.", category:"JP", reversed:true, options:acuerdo5 },
    { id:"mb_jp15", text:"Prefiero saber con anticipación qué ocurrirá.", category:"JP", options:acuerdo5 },
    { id:"mb_jp16", text:"Disfruto el caos creativo y la espontaneidad.", category:"JP", reversed:true, options:acuerdo5 },
  ],
  interpret(scores) {
    return Object.entries(this.categories as Record<string,string>).map(([k, label]) => {
      const raw=scores[k]??0; const max=80; const p=pct(raw,max); const l=lv(p);
      const descs: Record<string, Record<string,string>> = {
        EI:{ bajo:"Introvertido/a (I): recarga en soledad, vínculos profundos, reflexivo/a.", medio:"Ambivierte: flexible entre soledad y grupos según el contexto.", alto:"Extravertido/a (E): sociable, expresivo/a, energizado/a por las personas." },
        SN:{ bajo:"Intuitivo/a (N): visionario/a, teórico/a, orientado/a al futuro.", medio:"Equilibrio S/N: pragmático/a con apertura a ideas abstractas.", alto:"Sensorial (S): práctico/a, concreto/a, basado/a en hechos y experiencia." },
        TF:{ bajo:"Sentimental (F): empático/a, guiado/a por valores y bienestar ajeno.", medio:"Equilibrio T/F: analítico/a con sensibilidad hacia los demás.", alto:"Racional (T): objetivo/a, lógico/a, orientado/a a la verdad antes que a la armonía." },
        JP:{ bajo:"Perceptivo/a (P): flexible, espontáneo/a, adapta­ble a los cambios.", medio:"Equilibrio J/P: planificado/a pero abierto/a a improvisar.", alto:"Juicioso/a (J): ordenado/a, planificador/a, necesita estructura y cierre." },
      };
      return { category:k, label, score:raw, max, percent:p, level:l, description:descs[k][l] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 3. HOLLAND RIASEC — 54 preguntas (9 por tipo)
// ══════════════════════════════════════════════════════════════
export const hollandTest: Test = {
  id:"holland", name:"Holland RIASEC — Orientación Vocacional", shortName:"RIASEC",
  icon:"🎯", area:"vocacional", estimatedMinutes:16,
  description:"54 ítems para identificar tus intereses ocupacionales en 6 tipos y recibir recomendaciones de carrera.",
  categories:{ R:"Realista", I:"Investigador", A:"Artístico", S:"Social", E:"Emprendedor", C:"Convencional" },
  questions:[
    // REALISTA
    { id:"hl_r1", text:"Me gusta trabajar con herramientas, máquinas o equipos.", category:"R", options:frecuencia5 },
    { id:"hl_r2", text:"Disfruto actividades al aire libre o trabajos manuales.", category:"R", options:frecuencia5 },
    { id:"hl_r3", text:"Prefiero tareas concretas y físicas sobre las abstractas.", category:"R", options:frecuencia5 },
    { id:"hl_r4", text:"Me interesa la mecánica, la electrónica o la carpintería.", category:"R", options:frecuencia5 },
    { id:"hl_r5", text:"Disfruto construir, reparar o armar cosas con mis manos.", category:"R", options:frecuencia5 },
    { id:"hl_r6", text:"Me atrae trabajar con plantas, animales o en la naturaleza.", category:"R", options:frecuencia5 },
    { id:"hl_r7", text:"Prefiero ver resultados tangibles de mi trabajo.", category:"R", options:frecuencia5 },
    { id:"hl_r8", text:"Me gustan los deportes o actividades físicas intensas.", category:"R", options:frecuencia5 },
    { id:"hl_r9", text:"Me interesa la ingeniería, la construcción o la tecnología aplicada.", category:"R", options:frecuencia5 },
    // INVESTIGADOR
    { id:"hl_i1", text:"Me interesan los experimentos y la investigación científica.", category:"I", options:frecuencia5 },
    { id:"hl_i2", text:"Disfruto resolver problemas complejos de matemáticas o ciencias.", category:"I", options:frecuencia5 },
    { id:"hl_i3", text:"Me gusta analizar datos para encontrar patrones.", category:"I", options:frecuencia5 },
    { id:"hl_i4", text:"Leo libros o artículos sobre ciencia, tecnología o filosofía.", category:"I", options:frecuencia5 },
    { id:"hl_i5", text:"Me fascina entender cómo funciona el mundo a nivel profundo.", category:"I", options:frecuencia5 },
    { id:"hl_i6", text:"Disfruto formular hipótesis y verificarlas con evidencia.", category:"I", options:frecuencia5 },
    { id:"hl_i7", text:"Me atrae la medicina, la biología o las ciencias exactas.", category:"I", options:frecuencia5 },
    { id:"hl_i8", text:"Prefiero trabajar de forma independiente con problemas intelectuales.", category:"I", options:frecuencia5 },
    { id:"hl_i9", text:"Me interesa la programación, la inteligencia artificial o la estadística.", category:"I", options:frecuencia5 },
    // ARTÍSTICO
    { id:"hl_a1", text:"Me expreso a través del arte, la música o la escritura.", category:"A", options:frecuencia5 },
    { id:"hl_a2", text:"Disfruto crear cosas originales y únicas.", category:"A", options:frecuencia5 },
    { id:"hl_a3", text:"Me atrae el mundo del diseño, teatro, fotografía o cine.", category:"A", options:frecuencia5 },
    { id:"hl_a4", text:"Me gusta improvisar y no seguir estructuras rígidas.", category:"A", options:frecuencia5 },
    { id:"hl_a5", text:"La estética y la belleza son importantes para mí.", category:"A", options:frecuencia5 },
    { id:"hl_a6", text:"Me interesa la moda, la arquitectura o las artes visuales.", category:"A", options:frecuencia5 },
    { id:"hl_a7", text:"Disfruto escribir poesía, relatos o guiones.", category:"A", options:frecuencia5 },
    { id:"hl_a8", text:"Me motiva la autoexpresión y la creatividad sin límites.", category:"A", options:frecuencia5 },
    { id:"hl_a9", text:"Prefiero ambientes de trabajo no estructurados y creativos.", category:"A", options:frecuencia5 },
    // SOCIAL
    { id:"hl_s1", text:"Me gusta enseñar, orientar o ayudar a otras personas.", category:"S", options:frecuencia5 },
    { id:"hl_s2", text:"Disfruto trabajar en equipos y colaborar con otros.", category:"S", options:frecuencia5 },
    { id:"hl_s3", text:"Me importa el bienestar y desarrollo de la comunidad.", category:"S", options:frecuencia5 },
    { id:"hl_s4", text:"Soy bueno/a escuchando y dando consejo.", category:"S", options:frecuencia5 },
    { id:"hl_s5", text:"Me interesa la psicología, la educación o el trabajo social.", category:"S", options:frecuencia5 },
    { id:"hl_s6", text:"Encuentro satisfacción en el progreso de quienes acompaño.", category:"S", options:frecuencia5 },
    { id:"hl_s7", text:"Me atrae trabajar en hospitales, escuelas o ONGs.", category:"S", options:frecuencia5 },
    { id:"hl_s8", text:"Disfruto facilitar grupos, talleres o reuniones.", category:"S", options:frecuencia5 },
    { id:"hl_s9", text:"Me preocupa la justicia social y los derechos humanos.", category:"S", options:frecuencia5 },
    // EMPRENDEDOR
    { id:"hl_e1", text:"Me gusta liderar proyectos y persuadir a otros.", category:"E", options:frecuencia5 },
    { id:"hl_e2", text:"Disfruto vender, negociar o competir.", category:"E", options:frecuencia5 },
    { id:"hl_e3", text:"Me motiva asumir riesgos para lograr metas ambiciosas.", category:"E", options:frecuencia5 },
    { id:"hl_e4", text:"Me interesa iniciar negocios o proyectos propios.", category:"E", options:frecuencia5 },
    { id:"hl_e5", text:"Me siento cómodo/a tomando decisiones bajo presión.", category:"E", options:frecuencia5 },
    { id:"hl_e6", text:"Disfruto hablar en público o presentar ideas.", category:"E", options:frecuencia5 },
    { id:"hl_e7", text:"Me atrae el mundo de las finanzas, el derecho o la política.", category:"E", options:frecuencia5 },
    { id:"hl_e8", text:"Busco posiciones de liderazgo en grupos.", category:"E", options:frecuencia5 },
    { id:"hl_e9", text:"Me motiva la influencia, el poder y el reconocimiento.", category:"E", options:frecuencia5 },
    // CONVENCIONAL
    { id:"hl_c1", text:"Prefiero tareas con procedimientos claros y bien definidos.", category:"C", options:frecuencia5 },
    { id:"hl_c2", text:"Disfruto organizar información, archivar y llevar registros.", category:"C", options:frecuencia5 },
    { id:"hl_c3", text:"Me siento cómodo/a siguiendo instrucciones precisas.", category:"C", options:frecuencia5 },
    { id:"hl_c4", text:"Me atrae la contabilidad, la administración o la gestión.", category:"C", options:frecuencia5 },
    { id:"hl_c5", text:"Trabajo mejor cuando hay reglas y estructuras claras.", category:"C", options:frecuencia5 },
    { id:"hl_c6", text:"Me gusta revisar y verificar la exactitud de documentos.", category:"C", options:frecuencia5 },
    { id:"hl_c7", text:"Prefiero la estabilidad laboral a asumir grandes riesgos.", category:"C", options:frecuencia5 },
    { id:"hl_c8", text:"Disfruto tareas repetitivas si están bien organizadas.", category:"C", options:frecuencia5 },
    { id:"hl_c9", text:"Me interesa la logística, los sistemas o la gestión de datos.", category:"C", options:frecuencia5 },
  ],
  interpret(scores) {
    const descs: Record<string,string> = {
      R:"Práctico/a y físico/a. Carreras afines: Ingeniería, Agronomía, Mecánica, Arquitectura, Tecnología.",
      I:"Analítico/a e intelectual. Carreras: Ciencias, Medicina, Investigación, Tecnología, Matemáticas.",
      A:"Creativo/a y expresivo/a. Carreras: Artes, Diseño, Comunicación, Publicidad, Escritura.",
      E:"Líder y persuasivo/a. Carreras: Negocios, Derecho, Política, Marketing, Emprendimiento.",
      S:"Empático/a y colaborador/a. Carreras: Educación, Psicología, Trabajo Social, Enfermería.",
      C:"Ordenado/a y preciso/a. Carreras: Contabilidad, Administración, Finanzas, Sistemas, Logística.",
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=45; const p=pct(raw,max);
      return { category:k, label, score:raw, max, percent:p, level:lv(p), description:descs[k] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 4. INTELIGENCIA EMOCIONAL — TMMS extendido + EQ-i: 60 ítems
// ══════════════════════════════════════════════════════════════
export const emocionalTest: Test = {
  id:"emocional", name:"Inteligencia Emocional — EQ Completo", shortName:"IE",
  icon:"💛", area:"emocional", estimatedMinutes:18,
  description:"60 ítems que evalúan 5 dimensiones: Autoconciencia, Autorregulación, Motivación, Empatía y Habilidades Sociales.",
  categories:{ AC:"Autoconciencia", AR:"Autorregulación", MO:"Motivación intrínseca", EM:"Empatía", HS:"Habilidades sociales" },
  questions:[
    // AUTOCONCIENCIA — 12
    { id:"ie_ac1",  text:"Soy consciente de mis emociones en el momento en que surgen.", category:"AC", options:acuerdo5 },
    { id:"ie_ac2",  text:"Puedo identificar con precisión qué siento en cada momento.", category:"AC", options:acuerdo5 },
    { id:"ie_ac3",  text:"Entiendo cómo mis emociones afectan mi comportamiento.", category:"AC", options:acuerdo5 },
    { id:"ie_ac4",  text:"Reconozco cuándo el estrés empieza a afectar mi desempeño.", category:"AC", options:acuerdo5 },
    { id:"ie_ac5",  text:"Soy capaz de nombrar exactamente qué emoción estoy sintiendo.", category:"AC", options:acuerdo5 },
    { id:"ie_ac6",  text:"Entiendo mis propias fortalezas y debilidades emocionales.", category:"AC", options:acuerdo5 },
    { id:"ie_ac7",  text:"Noto cuándo mis emociones influyen negativamente en mis decisiones.", category:"AC", options:acuerdo5 },
    { id:"ie_ac8",  text:"A veces no entiendo por qué me siento de cierta manera.", category:"AC", reversed:true, options:acuerdo5 },
    { id:"ie_ac9",  text:"Reflexiono sobre mis reacciones emocionales después de situaciones intensas.", category:"AC", options:acuerdo5 },
    { id:"ie_ac10", text:"Soy consciente de cómo mi estado de ánimo afecta a quienes me rodean.", category:"AC", options:acuerdo5 },
    { id:"ie_ac11", text:"Tengo claridad sobre mis valores y cómo guían mis emociones.", category:"AC", options:acuerdo5 },
    { id:"ie_ac12", text:"Mis emociones me sorprenden y me pillan desprevenido/a.", category:"AC", reversed:true, options:acuerdo5 },
    // AUTORREGULACIÓN — 12
    { id:"ie_ar1",  text:"Manejo bien mis emociones en situaciones de conflicto.", category:"AR", options:acuerdo5 },
    { id:"ie_ar2",  text:"Me recupero rápidamente de estados emocionales negativos.", category:"AR", options:acuerdo5 },
    { id:"ie_ar3",  text:"Puedo calmarse cuando me siento muy enojado/a o ansioso/a.", category:"AR", options:acuerdo5 },
    { id:"ie_ar4",  text:"Controlo mis impulsos antes de actuar.", category:"AR", options:acuerdo5 },
    { id:"ie_ar5",  text:"Mantengo la calma bajo presión o ante críticas.", category:"AR", options:acuerdo5 },
    { id:"ie_ar6",  text:"Puedo posponer la gratificación para lograr metas a largo plazo.", category:"AR", options:acuerdo5 },
    { id:"ie_ar7",  text:"Me resulta fácil no dejar que el mal humor arruine mi día.", category:"AR", options:acuerdo5 },
    { id:"ie_ar8",  text:"Cuando estoy estresado/a, suelo actuar de forma impulsiva.", category:"AR", reversed:true, options:acuerdo5 },
    { id:"ie_ar9",  text:"Adapto mis emociones a lo que exige la situación.", category:"AR", options:acuerdo5 },
    { id:"ie_ar10", text:"Mantengo mi desempeño estable incluso cuando me siento mal.", category:"AR", options:acuerdo5 },
    { id:"ie_ar11", text:"Soy capaz de expresar desacuerdo sin perder el control.", category:"AR", options:acuerdo5 },
    { id:"ie_ar12", text:"Me cuesta manejar la frustración cuando las cosas no salen bien.", category:"AR", reversed:true, options:acuerdo5 },
    // MOTIVACIÓN — 12
    { id:"ie_mo1",  text:"Persisto ante los obstáculos en lugar de rendirme.", category:"MO", options:acuerdo5 },
    { id:"ie_mo2",  text:"Me motivo solo/a sin necesitar validación externa.", category:"MO", options:acuerdo5 },
    { id:"ie_mo3",  text:"Busco mejorar constantemente en lo que hago.", category:"MO", options:acuerdo5 },
    { id:"ie_mo4",  text:"Tengo metas claras que me impulsan a actuar.", category:"MO", options:acuerdo5 },
    { id:"ie_mo5",  text:"El fracaso me impulsa a intentarlo con más determinación.", category:"MO", options:acuerdo5 },
    { id:"ie_mo6",  text:"Me entusiasma enfrentar desafíos nuevos y difíciles.", category:"MO", options:acuerdo5 },
    { id:"ie_mo7",  text:"Mantengo el optimismo incluso en momentos difíciles.", category:"MO", options:acuerdo5 },
    { id:"ie_mo8",  text:"Me desmotivo fácilmente cuando las cosas no avanzan.", category:"MO", reversed:true, options:acuerdo5 },
    { id:"ie_mo9",  text:"Encuentro significado y propósito en mis actividades cotidianas.", category:"MO", options:acuerdo5 },
    { id:"ie_mo10", text:"Tomo iniciativa en lugar de esperar que otros decidan.", category:"MO", options:acuerdo5 },
    { id:"ie_mo11", text:"Celebro mis pequeños logros como parte del camino.", category:"MO", options:acuerdo5 },
    { id:"ie_mo12", text:"Pierdo el entusiasmo cuando no veo resultados inmediatos.", category:"MO", reversed:true, options:acuerdo5 },
    // EMPATÍA — 12
    { id:"ie_em1",  text:"Noto cuando alguien está molesto/a aunque no lo diga.", category:"EM", options:acuerdo5 },
    { id:"ie_em2",  text:"Me afectan profundamente las emociones de los demás.", category:"EM", options:acuerdo5 },
    { id:"ie_em3",  text:"Escucho con atención y sin interrumpir a quien me habla.", category:"EM", options:acuerdo5 },
    { id:"ie_em4",  text:"Puedo ponerme en el lugar de personas muy distintas a mí.", category:"EM", options:acuerdo5 },
    { id:"ie_em5",  text:"Identifico bien el tono emocional de una conversación.", category:"EM", options:acuerdo5 },
    { id:"ie_em6",  text:"Me preocupo genuinamente por el bienestar de quienes conozco.", category:"EM", options:acuerdo5 },
    { id:"ie_em7",  text:"Reconozco las necesidades no expresadas de otros.", category:"EM", options:acuerdo5 },
    { id:"ie_em8",  text:"Me resulta difícil entender por qué otros se sienten así.", category:"EM", reversed:true, options:acuerdo5 },
    { id:"ie_em9",  text:"Soy sensible al lenguaje corporal y las expresiones faciales.", category:"EM", options:acuerdo5 },
    { id:"ie_em10", text:"Adapto mi comunicación según el estado emocional de la otra persona.", category:"EM", options:acuerdo5 },
    { id:"ie_em11", text:"Valido los sentimientos de otros aunque no comparta su perspectiva.", category:"EM", options:acuerdo5 },
    { id:"ie_em12", text:"Me cuesta entender que otros se afecten por cosas que a mí no me importan.", category:"EM", reversed:true, options:acuerdo5 },
    // HABILIDADES SOCIALES — 12
    { id:"ie_hs1",  text:"Me resulta fácil establecer rapport con personas nuevas.", category:"HS", options:acuerdo5 },
    { id:"ie_hs2",  text:"Manejo bien los conflictos interpersonales.", category:"HS", options:acuerdo5 },
    { id:"ie_hs3",  text:"Soy capaz de influir positivamente en el ambiente de un grupo.", category:"HS", options:acuerdo5 },
    { id:"ie_hs4",  text:"Comunico mis ideas con claridad y asertividad.", category:"HS", options:acuerdo5 },
    { id:"ie_hs5",  text:"Construyo relaciones de confianza con facilidad.", category:"HS", options:acuerdo5 },
    { id:"ie_hs6",  text:"Colaboro efectivamente en equipos diversos.", category:"HS", options:acuerdo5 },
    { id:"ie_hs7",  text:"Inspiro a otros con mi actitud y energía.", category:"HS", options:acuerdo5 },
    { id:"ie_hs8",  text:"Me cuesta mantener relaciones sanas a largo plazo.", category:"HS", reversed:true, options:acuerdo5 },
    { id:"ie_hs9",  text:"Sé cuándo hablar y cuándo escuchar en una conversación.", category:"HS", options:acuerdo5 },
    { id:"ie_hs10", text:"Negocio y llego a acuerdos de manera efectiva.", category:"HS", options:acuerdo5 },
    { id:"ie_hs11", text:"Manejo bien las críticas sin volverme defensivo/a.", category:"HS", options:acuerdo5 },
    { id:"ie_hs12", text:"Me resulta difícil expresar mis emociones de forma apropiada.", category:"HS", reversed:true, options:acuerdo5 },
  ],
  interpret(scores) {
    const descs: Record<string, Record<string,string>> = {
      AC:{ bajo:"Baja autoconciencia emocional. Dificultad para identificar y comprender tus propias emociones.", medio:"Autoconciencia moderada. Reconoces tus emociones en situaciones intensas pero no siempre en el día a día.", alto:"Alta autoconciencia. Excelente comprensión de tu mundo emocional interno." },
      AR:{ bajo:"Dificultad para regular emociones. Tendencia a reacciones impulsivas o estados prolongados.", medio:"Regulación aceptable. Puedes manejar emociones en contextos conocidos.", alto:"Excelente autorregulación. Calma ante el estrés, recuperación rápida." },
      MO:{ bajo:"Motivación intrínseca baja. Dependes de factores externos para mantenerte activo/a.", medio:"Motivación moderada. Persistes en metas importantes pero te afectan los obstáculos.", alto:"Alta motivación intrínseca. Perseverante, optimista y orientado/a a metas propias." },
      EM:{ bajo:"Empatía limitada. Dificultad para leer emociones ajenas y ponerte en el lugar del otro.", medio:"Empatía funcional. Reconoces emociones evidentes pero puedes profundizar más.", alto:"Alta empatía. Percibes y validas con facilidad el mundo emocional de los demás." },
      HS:{ bajo:"Habilidades sociales a desarrollar. Relaciones interpersonales pueden ser fuente de tensión.", medio:"Habilidades sociales adecuadas. Funcionas bien en contextos conocidos.", alto:"Excelentes habilidades sociales. Construyes relaciones sanas e influyes positivamente." },
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=60; const p=pct(raw,max); const l=lv(p);
      return { category:k, label, score:raw, max, percent:p, level:l, description:descs[k][l] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 5. VALORES DE SCHWARTZ — 54 preguntas (9 por valor)
// ══════════════════════════════════════════════════════════════
export const schwartzTest: Test = {
  id:"schwartz", name:"Valores Humanos de Schwartz", shortName:"Valores",
  icon:"💬", area:"actitudes", estimatedMinutes:16,
  description:"54 ítems que miden 6 valores universales: Poder, Logro, Hedonismo, Benevolencia, Universalismo y Seguridad.",
  categories:{ PO:"Poder social", LO:"Logro personal", HE:"Hedonismo", BE:"Benevolencia", UN:"Universalismo", SE:"Seguridad" },
  questions:[
    // PODER
    { id:"sw_po1", text:"Es importante para mí tener poder y que la gente haga lo que digo.", category:"PO", options:intensidad5 },
    { id:"sw_po2", text:"Para mí es importante ser rico/a y tener muchas posesiones.", category:"PO", options:intensidad5 },
    { id:"sw_po3", text:"Es importante para mí ser reconocido/a públicamente.", category:"PO", options:intensidad5 },
    { id:"sw_po4", text:"Quiero que la gente me admire y reconozca mis logros.", category:"PO", options:intensidad5 },
    { id:"sw_po5", text:"Busco posiciones de autoridad y liderazgo.", category:"PO", options:intensidad5 },
    { id:"sw_po6", text:"Me importa tener control sobre las decisiones importantes.", category:"PO", options:intensidad5 },
    { id:"sw_po7", text:"El estatus social es algo que valoro profundamente.", category:"PO", options:intensidad5 },
    { id:"sw_po8", text:"Me motiva la posibilidad de dirigir a otros.", category:"PO", options:intensidad5 },
    { id:"sw_po9", text:"Busco acumular riqueza como símbolo de éxito.", category:"PO", options:intensidad5 },
    // LOGRO
    { id:"sw_lo1", text:"Demostrar mis capacidades es muy importante para mí.", category:"LO", options:intensidad5 },
    { id:"sw_lo2", text:"Es importante para mí ser muy exitoso/a en la vida.", category:"LO", options:intensidad5 },
    { id:"sw_lo3", text:"Para mí es importante que la gente admire lo que hago.", category:"LO", options:intensidad5 },
    { id:"sw_lo4", text:"Me esfuerzo por ser el/la mejor en lo que hago.", category:"LO", options:intensidad5 },
    { id:"sw_lo5", text:"Superar mis propios límites me genera una profunda satisfacción.", category:"LO", options:intensidad5 },
    { id:"sw_lo6", text:"Me importa mucho alcanzar mis metas y objetivos.", category:"LO", options:intensidad5 },
    { id:"sw_lo7", text:"La competencia me motiva a dar lo mejor de mí.", category:"LO", options:intensidad5 },
    { id:"sw_lo8", text:"Quiero tener un impacto significativo en mi campo profesional.", category:"LO", options:intensidad5 },
    { id:"sw_lo9", text:"Me enorgullece mucho ser reconocido/a por mis logros.", category:"LO", options:intensidad5 },
    // HEDONISMO
    { id:"sw_he1", text:"Disfrutar de la vida y los placeres es muy importante para mí.", category:"HE", options:intensidad5 },
    { id:"sw_he2", text:"Es importante para mí pasarla bien y darme lujos.", category:"HE", options:intensidad5 },
    { id:"sw_he3", text:"Busco divertirme y hacer cosas que me den placer.", category:"HE", options:intensidad5 },
    { id:"sw_he4", text:"El disfrute del presente es más importante que sacrificarse por el futuro.", category:"HE", options:intensidad5 },
    { id:"sw_he5", text:"Valoro profundamente las experiencias que generan alegría y satisfacción.", category:"HE", options:intensidad5 },
    { id:"sw_he6", text:"Para mí es importante tener tiempo libre para disfrutar.", category:"HE", options:intensidad5 },
    { id:"sw_he7", text:"Me preocupo por vivir bien y de forma confortable.", category:"HE", options:intensidad5 },
    { id:"sw_he8", text:"Disfruto de las artes, la gastronomía o experiencias sensoriales.", category:"HE", options:intensidad5 },
    { id:"sw_he9", text:"La diversión y el entretenimiento son parte esencial de mi vida.", category:"HE", options:intensidad5 },
    // BENEVOLENCIA
    { id:"sw_be1", text:"Ayudar a las personas que me rodean es muy importante para mí.", category:"BE", options:intensidad5 },
    { id:"sw_be2", text:"Es importante para mí ser leal a mis amigos y familia.", category:"BE", options:intensidad5 },
    { id:"sw_be3", text:"Me preocupo genuinamente por el bienestar de los demás.", category:"BE", options:intensidad5 },
    { id:"sw_be4", text:"Haría grandes sacrificios por las personas que quiero.", category:"BE", options:intensidad5 },
    { id:"sw_be5", text:"Es importante perdonar a quienes me han hecho daño.", category:"BE", options:intensidad5 },
    { id:"sw_be6", text:"La honestidad y la confianza son pilares en mis relaciones.", category:"BE", options:intensidad5 },
    { id:"sw_be7", text:"Me importa más el bienestar colectivo que el individual.", category:"BE", options:intensidad5 },
    { id:"sw_be8", text:"Dedico tiempo y recursos a apoyar a quienes lo necesitan.", category:"BE", options:intensidad5 },
    { id:"sw_be9", text:"La bondad y la compasión son valores que practico activamente.", category:"BE", options:intensidad5 },
    // UNIVERSALISMO
    { id:"sw_un1", text:"Es importante para mí que todas las personas tengan igualdad.", category:"UN", options:intensidad5 },
    { id:"sw_un2", text:"Me importa cuidar el medioambiente y la naturaleza.", category:"UN", options:intensidad5 },
    { id:"sw_un3", text:"Escuchar a personas con ideas diferentes a las mías es valioso.", category:"UN", options:intensidad5 },
    { id:"sw_un4", text:"Me indignan la injusticia y la discriminación.", category:"UN", options:intensidad5 },
    { id:"sw_un5", text:"Creo en la paz mundial y el diálogo entre culturas.", category:"UN", options:intensidad5 },
    { id:"sw_un6", text:"Defiendo los derechos de grupos marginados o vulnerables.", category:"UN", options:intensidad5 },
    { id:"sw_un7", text:"Me preocupa el cambio climático y la sostenibilidad del planeta.", category:"UN", options:intensidad5 },
    { id:"sw_un8", text:"Valoro la diversidad cultural, étnica y de pensamiento.", category:"UN", options:intensidad5 },
    { id:"sw_un9", text:"Trabajar por un mundo más justo es una prioridad para mí.", category:"UN", options:intensidad5 },
    // SEGURIDAD
    { id:"sw_se1", text:"Para mí es muy importante vivir en un entorno seguro.", category:"SE", options:intensidad5 },
    { id:"sw_se2", text:"Evito situaciones que pongan en riesgo mi estabilidad.", category:"SE", options:intensidad5 },
    { id:"sw_se3", text:"Es importante para mí que mi país sea estable y ordenado.", category:"SE", options:intensidad5 },
    { id:"sw_se4", text:"Me genera ansiedad la incertidumbre sobre el futuro.", category:"SE", options:intensidad5 },
    { id:"sw_se5", text:"Valoro la estabilidad económica y laboral por encima de todo.", category:"SE", options:intensidad5 },
    { id:"sw_se6", text:"El orden social y el respeto a las normas son esenciales.", category:"SE", options:intensidad5 },
    { id:"sw_se7", text:"Me esfuerzo por tener un plan de vida claro y seguro.", category:"SE", options:intensidad5 },
    { id:"sw_se8", text:"La salud y la seguridad personal son mis prioridades máximas.", category:"SE", options:intensidad5 },
    { id:"sw_se9", text:"Prefiero lo conocido y predecible a lo incierto y arriesgado.", category:"SE", options:intensidad5 },
  ],
  interpret(scores) {
    const descs: Record<string,string> = {
      PO:"Orientado/a hacia el poder, el liderazgo y el reconocimiento social. Valoras la influencia y el estatus.",
      LO:"Altamente motivado/a por el logro, la competencia y el éxito personal. El rendimiento es tu motor.",
      HE:"Valoras intensamente el placer, el disfrute y la calidad de vida. El presente importa tanto como el futuro.",
      BE:"Tu prioridad es el bienestar de quienes te rodean. Alta empatía, lealtad y disposición al sacrificio.",
      UN:"Valoras profundamente la justicia, la igualdad y el cuidado del planeta. Te preocupa el bien común.",
      SE:"Tu valor central es la estabilidad, el orden y la seguridad personal y social. Buscas certeza.",
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=45; const p=pct(raw,max);
      return { category:k, label, score:raw, max, percent:p, level:lv(p), description:descs[k] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 6. DAT — 60 preguntas aptitudes (15 por área)
// ══════════════════════════════════════════════════════════════
const mc = (correct: number): QuestionOption[] =>
  [1,2,3,4].map(v => ({ label: v === correct ? `Opción ${v} ✓` : `Opción ${v}`, value: v === correct ? 4 : 1 }));

export const datTest: Test = {
  id:"dat", name:"DAT — Aptitudes Diferenciales", shortName:"DAT",
  icon:"⚙️", area:"aptitudes", estimatedMinutes:25,
  description:"60 ítems que evalúan Razonamiento Verbal, Numérico, Espacial y Mecánico con reactivos graduados en dificultad.",
  categories:{ VE:"Razonamiento verbal", NU:"Razonamiento numérico", ES:"Razonamiento espacial", ME:"Razonamiento mecánico" },
  questions:[
    // VERBAL — 15
    { id:"dt_v1",  text:"Elige la palabra que NO pertenece: Roble, Pino, Margarita, Cedro", category:"VE", options:[{label:"Roble",value:1},{label:"Pino",value:1},{label:"Margarita ✓",value:4},{label:"Cedro",value:1}] },
    { id:"dt_v2",  text:"Médico es a Paciente como Maestro es a: A) Escuela  B) Alumno  C) Libro  D) Clase", category:"VE", options:[{label:"A) Escuela",value:1},{label:"B) Alumno ✓",value:4},{label:"C) Libro",value:1},{label:"D) Clase",value:1}] },
    { id:"dt_v3",  text:"Antónimo de EFÍMERO: A) Breve  B) Eterno  C) Rápido  D) Pasajero", category:"VE", options:[{label:"A) Breve",value:1},{label:"B) Eterno ✓",value:4},{label:"C) Rápido",value:1},{label:"D) Pasajero",value:1}] },
    { id:"dt_v4",  text:"Completa: Libro es a Biblioteca como Cuadro es a: A) Pintura  B) Museo  C) Arte  D) Pared", category:"VE", options:[{label:"A) Pintura",value:1},{label:"B) Museo ✓",value:4},{label:"C) Arte",value:1},{label:"D) Pared",value:1}] },
    { id:"dt_v5",  text:"Sinónimo de PERSPICAZ: A) Torpe  B) Agudo  C) Lento  D) Vago", category:"VE", options:[{label:"A) Torpe",value:1},{label:"B) Agudo ✓",value:4},{label:"C) Lento",value:1},{label:"D) Vago",value:1}] },
    { id:"dt_v6",  text:"Noche es a Luna como Día es a: A) Estrella  B) Sombra  C) Sol  D) Nubes", category:"VE", options:[{label:"A) Estrella",value:1},{label:"B) Sombra",value:1},{label:"C) Sol ✓",value:4},{label:"D) Nubes",value:1}] },
    { id:"dt_v7",  text:"¿Cuál NO es un sinónimo de VALIENTE? A) Osado  B) Audaz  C) Cobarde  D) Intrépido", category:"VE", options:[{label:"A) Osado",value:1},{label:"B) Audaz",value:1},{label:"C) Cobarde ✓",value:4},{label:"D) Intrépido",value:1}] },
    { id:"dt_v8",  text:"Agua es a Sed como Comida es a: A) Cocina  B) Hambre  C) Nutrición  D) Sabor", category:"VE", options:[{label:"A) Cocina",value:1},{label:"B) Hambre ✓",value:4},{label:"C) Nutrición",value:1},{label:"D) Sabor",value:1}] },
    { id:"dt_v9",  text:"Antónimo de PROLÍFICO: A) Abundante  B) Creativo  C) Estéril  D) Fecundo", category:"VE", options:[{label:"A) Abundante",value:1},{label:"B) Creativo",value:1},{label:"C) Estéril ✓",value:4},{label:"D) Fecundo",value:1}] },
    { id:"dt_v10", text:"¿Cuál es la oración gramaticalmente correcta? A) 'Hubieron muchas personas'  B) 'Hubo muchas personas'  C) 'Habían muchas personas'  D) 'Havian muchas personas'", category:"VE", options:[{label:"A) Hubieron",value:1},{label:"B) Hubo ✓",value:4},{label:"C) Habían",value:1},{label:"D) Havian",value:1}] },
    { id:"dt_v11", text:"Pez es a Cardumen como Lobo es a: A) Jauría  B) Manada  C) Piara  D) Horda", category:"VE", options:[{label:"A) Jauría ✓",value:4},{label:"B) Manada",value:1},{label:"C) Piara",value:1},{label:"D) Horda",value:1}] },
    { id:"dt_v12", text:"Reloj es a Tiempo como Termómetro es a: A) Calor  B) Temperatura  C) Fiebre  D) Mercurio", category:"VE", options:[{label:"A) Calor",value:1},{label:"B) Temperatura ✓",value:4},{label:"C) Fiebre",value:1},{label:"D) Mercurio",value:1}] },
    { id:"dt_v13", text:"Significado de UBICUO: A) Raro  B) Presente en todas partes  C) Invisible  D) Único", category:"VE", options:[{label:"A) Raro",value:1},{label:"B) Presente en todas partes ✓",value:4},{label:"C) Invisible",value:1},{label:"D) Único",value:1}] },
    { id:"dt_v14", text:"Árbol es a Bosque como Estrella es a: A) Cielo  B) Galaxia  C) Constelación  D) Universo", category:"VE", options:[{label:"A) Cielo",value:1},{label:"B) Galaxia ✓",value:4},{label:"C) Constelación",value:1},{label:"D) Universo",value:1}] },
    { id:"dt_v15", text:"Significado de EFEMÉRIDE: A) Enfermedad rara  B) Acontecimiento que se recuerda  C) Planta medicinal  D) Figura retórica", category:"VE", options:[{label:"A) Enfermedad",value:1},{label:"B) Acontecimiento ✓",value:4},{label:"C) Planta",value:1},{label:"D) Figura",value:1}] },
    // NUMÉRICO — 15
    { id:"dt_n1",  text:"¿Cuánto es 15% de 200? A) 25  B) 30  C) 35  D) 40", category:"NU", options:[{label:"A) 25",value:1},{label:"B) 30 ✓",value:4},{label:"C) 35",value:1},{label:"D) 40",value:1}] },
    { id:"dt_n2",  text:"Serie: 2, 4, 8, 16, __ A) 24  B) 28  C) 32  D) 36", category:"NU", options:[{label:"A) 24",value:1},{label:"B) 28",value:1},{label:"C) 32 ✓",value:4},{label:"D) 36",value:1}] },
    { id:"dt_n3",  text:"Si 3 productos cuestan $45, ¿cuánto cuestan 7? A) $95  B) $100  C) $105  D) $115", category:"NU", options:[{label:"A) $95",value:1},{label:"B) $100",value:1},{label:"C) $105 ✓",value:4},{label:"D) $115",value:1}] },
    { id:"dt_n4",  text:"¿Cuál es la raíz cuadrada de 144? A) 10  B) 11  C) 12  D) 13", category:"NU", options:[{label:"A) 10",value:1},{label:"B) 11",value:1},{label:"C) 12 ✓",value:4},{label:"D) 13",value:1}] },
    { id:"dt_n5",  text:"Serie: 1, 4, 9, 16, 25, __ A) 34  B) 36  C) 38  D) 40", category:"NU", options:[{label:"A) 34",value:1},{label:"B) 36 ✓",value:4},{label:"C) 38",value:1},{label:"D) 40",value:1}] },
    { id:"dt_n6",  text:"Un tren viaja a 80 km/h. ¿Cuánto tarda en recorrer 200 km? A) 2h  B) 2.5h  C) 3h  D) 3.5h", category:"NU", options:[{label:"A) 2h",value:1},{label:"B) 2.5h ✓",value:4},{label:"C) 3h",value:1},{label:"D) 3.5h",value:1}] },
    { id:"dt_n7",  text:"¿Cuánto es 2/3 de 90? A) 50  B) 55  C) 60  D) 65", category:"NU", options:[{label:"A) 50",value:1},{label:"B) 55",value:1},{label:"C) 60 ✓",value:4},{label:"D) 65",value:1}] },
    { id:"dt_n8",  text:"Si el IVA es 12%, ¿cuánto pago por un artículo de $250? A) $275  B) $280  C) $285  D) $290", category:"NU", options:[{label:"A) $275",value:1},{label:"B) $280 ✓",value:4},{label:"C) $285",value:1},{label:"D) $290",value:1}] },
    { id:"dt_n9",  text:"Serie: 3, 6, 12, 24, __ A) 36  B) 42  C) 48  D) 54", category:"NU", options:[{label:"A) 36",value:1},{label:"B) 42",value:1},{label:"C) 48 ✓",value:4},{label:"D) 54",value:1}] },
    { id:"dt_n10", text:"¿Cuánto es 7² + 3²? A) 48  B) 56  C) 58  D) 60", category:"NU", options:[{label:"A) 48",value:1},{label:"B) 56",value:1},{label:"C) 58 ✓",value:4},{label:"D) 60",value:1}] },
    { id:"dt_n11", text:"Si una camisa cuesta $80 con 20% de descuento, ¿cuál era el precio original? A) $96  B) $98  C) $100  D) $102", category:"NU", options:[{label:"A) $96",value:1},{label:"B) $98",value:1},{label:"C) $100 ✓",value:4},{label:"D) $102",value:1}] },
    { id:"dt_n12", text:"¿Cuánto es (15 × 4) − (3 × 8)? A) 30  B) 36  C) 38  D) 42", category:"NU", options:[{label:"A) 30",value:1},{label:"B) 36 ✓",value:4},{label:"C) 38",value:1},{label:"D) 42",value:1}] },
    { id:"dt_n13", text:"Un depósito tiene 500 L. Se usa el 40% el lunes y el 25% del resto el martes. ¿Cuánto queda? A) 210  B) 220  C) 225  D) 230", category:"NU", options:[{label:"A) 210",value:1},{label:"B) 220",value:1},{label:"C) 225 ✓",value:4},{label:"D) 230",value:1}] },
    { id:"dt_n14", text:"Serie: 1, 3, 6, 10, 15, __ A) 20  B) 21  C) 22  D) 23", category:"NU", options:[{label:"A) 20",value:1},{label:"B) 21 ✓",value:4},{label:"C) 22",value:1},{label:"D) 23",value:1}] },
    { id:"dt_n15", text:"¿Qué porcentaje es 45 de 180? A) 20%  B) 22%  C) 25%  D) 28%", category:"NU", options:[{label:"A) 20%",value:1},{label:"B) 22%",value:1},{label:"C) 25% ✓",value:4},{label:"D) 28%",value:1}] },
    // ESPACIAL — 15
    { id:"dt_e1",  text:"Un cubo tiene 6 caras. ¿Cuántas aristas tiene? A) 8  B) 10  C) 12  D) 14", category:"ES", options:[{label:"A) 8",value:1},{label:"B) 10",value:1},{label:"C) 12 ✓",value:4},{label:"D) 14",value:1}] },
    { id:"dt_e2",  text:"Si doblas un papel cuadrado por la mitad dos veces, ¿cuántas capas hay? A) 2  B) 3  C) 4  D) 5", category:"ES", options:[{label:"A) 2",value:1},{label:"B) 3",value:1},{label:"C) 4 ✓",value:4},{label:"D) 5",value:1}] },
    { id:"dt_e3",  text:"Un reloj marca las 3:00. ¿Cuántos grados entre manecillas? A) 60°  B) 75°  C) 90°  D) 120°", category:"ES", options:[{label:"A) 60°",value:1},{label:"B) 75°",value:1},{label:"C) 90° ✓",value:4},{label:"D) 120°",value:1}] },
    { id:"dt_e4",  text:"¿Cuántas caras tiene una pirámide de base cuadrada? A) 4  B) 5  C) 6  D) 8", category:"ES", options:[{label:"A) 4",value:1},{label:"B) 5 ✓",value:4},{label:"C) 6",value:1},{label:"D) 8",value:1}] },
    { id:"dt_e5",  text:"Si rotas la letra 'd' 180° horizontalmente, obtienes: A) b  B) p  C) q  D) d", category:"ES", options:[{label:"A) b ✓",value:4},{label:"B) p",value:1},{label:"C) q",value:1},{label:"D) d",value:1}] },
    { id:"dt_e6",  text:"¿Cuántos cubos pequeños se necesitan para formar un cubo de 3×3×3? A) 18  B) 24  C) 27  D) 30", category:"ES", options:[{label:"A) 18",value:1},{label:"B) 24",value:1},{label:"C) 27 ✓",value:4},{label:"D) 30",value:1}] },
    { id:"dt_e7",  text:"Un cuadrado de 4 cm de lado se divide en cuadrados de 1 cm. ¿Cuántos hay? A) 8  B) 12  C) 16  D) 20", category:"ES", options:[{label:"A) 8",value:1},{label:"B) 12",value:1},{label:"C) 16 ✓",value:4},{label:"D) 20",value:1}] },
    { id:"dt_e8",  text:"Si un triángulo equilátero tiene un lado de 6 cm, ¿cuál es su perímetro? A) 12  B) 15  C) 18  D) 21", category:"ES", options:[{label:"A) 12",value:1},{label:"B) 15",value:1},{label:"C) 18 ✓",value:4},{label:"D) 21",value:1}] },
    { id:"dt_e9",  text:"¿Cuántas líneas de simetría tiene un cuadrado? A) 2  B) 3  C) 4  D) 6", category:"ES", options:[{label:"A) 2",value:1},{label:"B) 3",value:1},{label:"C) 4 ✓",value:4},{label:"D) 6",value:1}] },
    { id:"dt_e10", text:"Una figura de 5 lados es un: A) Cuadrilátero  B) Pentágono  C) Hexágono  D) Octágono", category:"ES", options:[{label:"A) Cuadrilátero",value:1},{label:"B) Pentágono ✓",value:4},{label:"C) Hexágono",value:1},{label:"D) Octágono",value:1}] },
    { id:"dt_e11", text:"Si el área de un cuadrado es 49 cm², ¿cuánto mide su lado? A) 6  B) 7  C) 8  D) 9", category:"ES", options:[{label:"A) 6",value:1},{label:"B) 7 ✓",value:4},{label:"C) 8",value:1},{label:"D) 9",value:1}] },
    { id:"dt_e12", text:"¿Qué figura tiene exactamente 3 vértices? A) Cuadrado  B) Rombo  C) Triángulo  D) Pentágono", category:"ES", options:[{label:"A) Cuadrado",value:1},{label:"B) Rombo",value:1},{label:"C) Triángulo ✓",value:4},{label:"D) Pentágono",value:1}] },
    { id:"dt_e13", text:"El volumen de un cubo de 3 cm de arista es: A) 9  B) 18  C) 27  D) 36", category:"ES", options:[{label:"A) 9",value:1},{label:"B) 18",value:1},{label:"C) 27 ✓",value:4},{label:"D) 36",value:1}] },
    { id:"dt_e14", text:"¿Cuántos ángulos rectos tiene un rectángulo? A) 2  B) 3  C) 4  D) 5", category:"ES", options:[{label:"A) 2",value:1},{label:"B) 3",value:1},{label:"C) 4 ✓",value:4},{label:"D) 5",value:1}] },
    { id:"dt_e15", text:"Si giras un cuadrado 90°, ¿qué obtienes? A) Rombo  B) Rectángulo  C) El mismo cuadrado  D) Trapecio", category:"ES", options:[{label:"A) Rombo",value:1},{label:"B) Rectángulo",value:1},{label:"C) El mismo cuadrado ✓",value:4},{label:"D) Trapecio",value:1}] },
    // MECÁNICO — 15
    { id:"dt_m1",  text:"Una palanca de primer grado tiene el fulcro: A) En un extremo  B) En el medio  C) Fuera  D) En la resistencia", category:"ME", options:[{label:"A) Extremo",value:1},{label:"B) En el medio ✓",value:4},{label:"C) Fuera",value:1},{label:"D) Resistencia",value:1}] },
    { id:"dt_m2",  text:"Engranaje de 10 dientes con uno de 20: el grande gira A) igual  B) el doble  C) a la mitad  D) el triple", category:"ME", options:[{label:"A) Igual",value:1},{label:"B) Doble",value:1},{label:"C) Mitad ✓",value:4},{label:"D) Triple",value:1}] },
    { id:"dt_m3",  text:"Una polea simple cambia: A) Fuerza y dirección  B) Solo dirección  C) Solo fuerza  D) Nada", category:"ME", options:[{label:"A) Fuerza y dirección",value:1},{label:"B) Solo dirección ✓",value:4},{label:"C) Solo fuerza",value:1},{label:"D) Nada",value:1}] },
    { id:"dt_m4",  text:"El tornillo es una máquina simple basada en: A) La cuña  B) El plano inclinado  C) La palanca  D) La polea", category:"ME", options:[{label:"A) La cuña",value:1},{label:"B) Plano inclinado ✓",value:4},{label:"C) Palanca",value:1},{label:"D) Polea",value:1}] },
    { id:"dt_m5",  text:"¿Cuál de estas máquinas NO es una máquina simple? A) Palanca  B) Bicicleta  C) Plano inclinado  D) Polea", category:"ME", options:[{label:"A) Palanca",value:1},{label:"B) Bicicleta ✓",value:4},{label:"C) Plano inclinado",value:1},{label:"D) Polea",value:1}] },
    { id:"dt_m6",  text:"Si aumentas el área de un pistón hidráulico, la presión: A) Aumenta  B) Disminuye  C) Se mantiene  D) Se duplica", category:"ME", options:[{label:"A) Aumenta",value:1},{label:"B) Disminuye ✓",value:4},{label:"C) Se mantiene",value:1},{label:"D) Se duplica",value:1}] },
    { id:"dt_m7",  text:"Un circuito en serie con 2 bombillas: si una falla, la otra: A) Sigue  B) Se apaga  C) Brilla más  D) Explota", category:"ME", options:[{label:"A) Sigue",value:1},{label:"B) Se apaga ✓",value:4},{label:"C) Brilla más",value:1},{label:"D) Explota",value:1}] },
    { id:"dt_m8",  text:"La ley de Ohm relaciona: A) Masa y aceleración  B) Voltaje, corriente y resistencia  C) Presión y volumen  D) Fuerza y distancia", category:"ME", options:[{label:"A) Masa",value:1},{label:"B) V, I, R ✓",value:4},{label:"C) Presión",value:1},{label:"D) Fuerza",value:1}] },
    { id:"dt_m9",  text:"¿Qué sucede con el gas cuando lo comprimes a temperatura constante? A) Enfría  B) Su volumen disminuye  C) Su masa aumenta  D) Su presión baja", category:"ME", options:[{label:"A) Enfría",value:1},{label:"B) Volumen disminuye ✓",value:4},{label:"C) Masa aumenta",value:1},{label:"D) Presión baja",value:1}] },
    { id:"dt_m10", text:"Un cuerpo en caída libre en ausencia de aire: A) Cae a velocidad constante  B) Acelera constantemente  C) Desacelera  D) Flota", category:"ME", options:[{label:"A) Velocidad constante",value:1},{label:"B) Acelera ✓",value:4},{label:"C) Desacelera",value:1},{label:"D) Flota",value:1}] },
    { id:"dt_m11", text:"¿Cuál es la función principal de un fusible eléctrico? A) Aumentar voltaje  B) Proteger de sobrecorriente  C) Almacenar energía  D) Reducir resistencia", category:"ME", options:[{label:"A) Voltaje",value:1},{label:"B) Proteger ✓",value:4},{label:"C) Almacenar",value:1},{label:"D) Resistencia",value:1}] },
    { id:"dt_m12", text:"En una palanca de segunda clase, la carga está: A) Entre fulcro y potencia  B) En el fulcro  C) En un extremo  D) Fuera de la palanca", category:"ME", options:[{label:"A) Entre fulcro y potencia ✓",value:4},{label:"B) En el fulcro",value:1},{label:"C) Extremo",value:1},{label:"D) Fuera",value:1}] },
    { id:"dt_m13", text:"¿Qué tipo de corriente produce una batería? A) Alterna  B) Continua  C) Pulsada  D) Trifásica", category:"ME", options:[{label:"A) Alterna",value:1},{label:"B) Continua ✓",value:4},{label:"C) Pulsada",value:1},{label:"D) Trifásica",value:1}] },
    { id:"dt_m14", text:"Un plano inclinado facilita el trabajo porque: A) Elimina la gravedad  B) Reduce la fuerza necesaria  C) Aumenta la velocidad  D) Duplica la energía", category:"ME", options:[{label:"A) Elimina gravedad",value:1},{label:"B) Reduce fuerza ✓",value:4},{label:"C) Aumenta velocidad",value:1},{label:"D) Duplica energía",value:1}] },
    { id:"dt_m15", text:"La presión se mide en: A) Newton  B) Joule  C) Pascal  D) Watt", category:"ME", options:[{label:"A) Newton",value:1},{label:"B) Joule",value:1},{label:"C) Pascal ✓",value:4},{label:"D) Watt",value:1}] },
  ],
  interpret(scores) {
    const descs: Record<string, Record<string,string>> = {
      VE:{ bajo:"Dificultad con vocabulario, analogías y comprensión lectora. Se recomienda reforzar hábitos de lectura.", medio:"Competencia verbal adecuada para la mayoría de tareas académicas.", alto:"Excelente razonamiento verbal. Aptitud para Derecho, Comunicación, Literatura, Ciencias Sociales." },
      NU:{ bajo:"Dificultad con operaciones y series numéricas. Reforzar fundamentos matemáticos.", medio:"Manejo numérico suficiente para contextos cotidianos y académicos básicos.", alto:"Fuerte razonamiento cuantitativo. Aptitud para Ingeniería, Economía, Estadística, Finanzas." },
      ES:{ bajo:"Dificultad para visualizar figuras, rotaciones y transformaciones espaciales.", medio:"Visualización espacial aceptable. Puede mejorar con práctica.", alto:"Excelente pensamiento espacial. Aptitud para Arquitectura, Diseño, Cirugía, Ingeniería Civil." },
      ME:{ bajo:"Dificultad con principios físicos y mecánicos. Revisar conceptos básicos de física.", medio:"Comprensión mecánica básica funcional.", alto:"Alto razonamiento mecánico. Aptitud para Ingeniería Mecánica, Electricidad, Robótica, Automotriz." },
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=60; const p=pct(raw,max); const l=lv(p);
      return { category:k, label, score:raw, max, percent:p, level:l, description:descs[k][l] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 7. INTELIGENCIAS MÚLTIPLES — 56 ítems (8 por inteligencia)
// ══════════════════════════════════════════════════════════════
export const inteligenciasTest: Test = {
  id:"inteligencias", name:"Inteligencias Múltiples de Gardner", shortName:"IM",
  icon:"🌟", area:"inteligencias", estimatedMinutes:16,
  description:"56 ítems basados en la teoría de Gardner para identificar tus 8 inteligencias dominantes.",
  categories:{ LI:"Lingüística", LM:"Lógico-matemática", ES:"Espacial", MU:"Musical", CN:"Corporal-cinestésica", IN:"Interpersonal", IA:"Intrapersonal", NA:"Naturalista" },
  questions:[
    // LINGÜÍSTICA
    { id:"im_li1", text:"Disfruto leer y escribir como actividad recreativa.", category:"LI", options:acuerdo5 },
    { id:"im_li2", text:"Me resulta fácil expresar ideas complejas con palabras.", category:"LI", options:acuerdo5 },
    { id:"im_li3", text:"Aprendo mejor leyendo o escuchando explicaciones.", category:"LI", options:acuerdo5 },
    { id:"im_li4", text:"Me gusta jugar con palabras, adivinanzas o crucigramas.", category:"LI", options:acuerdo5 },
    { id:"im_li5", text:"Tengo buen vocabulario y me expreso con precisión.", category:"LI", options:acuerdo5 },
    { id:"im_li6", text:"Recuerdo fácilmente citas, poemas o fragmentos literarios.", category:"LI", options:acuerdo5 },
    { id:"im_li7", text:"Disfruto debates, discursos o escribir ensayos.", category:"LI", options:acuerdo5 },
    { id:"im_li8", text:"Aprendo fácilmente idiomas nuevos.", category:"LI", options:acuerdo5 },
    // LÓGICO-MATEMÁTICA
    { id:"im_lm1", text:"Disfruto resolver acertijos matemáticos o lógicos.", category:"LM", options:acuerdo5 },
    { id:"im_lm2", text:"Pienso de forma secuencial y estructurada.", category:"LM", options:acuerdo5 },
    { id:"im_lm3", text:"Me gustan las ciencias exactas y la programación.", category:"LM", options:acuerdo5 },
    { id:"im_lm4", text:"Busco patrones y relaciones en la información.", category:"LM", options:acuerdo5 },
    { id:"im_lm5", text:"Hago cálculos mentales con facilidad.", category:"LM", options:acuerdo5 },
    { id:"im_lm6", text:"Me gusta clasificar y categorizar información.", category:"LM", options:acuerdo5 },
    { id:"im_lm7", text:"Resuelvo problemas con un enfoque sistemático.", category:"LM", options:acuerdo5 },
    { id:"im_lm8", text:"Pregunto constantemente '¿por qué?' y busco razonar causas.", category:"LM", options:acuerdo5 },
    // ESPACIAL
    { id:"im_es1", text:"Visualizo fácilmente objetos en tres dimensiones.", category:"ES", options:acuerdo5 },
    { id:"im_es2", text:"Disfruto el arte visual, el diseño o la fotografía.", category:"ES", options:acuerdo5 },
    { id:"im_es3", text:"Me oriento bien en espacios nuevos sin perderme.", category:"ES", options:acuerdo5 },
    { id:"im_es4", text:"Pienso en imágenes cuando proceso información.", category:"ES", options:acuerdo5 },
    { id:"im_es5", text:"Me gusta dibujar, hacer mapas o planos.", category:"ES", options:acuerdo5 },
    { id:"im_es6", text:"Aprendo mejor con diagramas, mapas y gráficos.", category:"ES", options:acuerdo5 },
    { id:"im_es7", text:"Tengo buen sentido estético de los colores y formas.", category:"ES", options:acuerdo5 },
    { id:"im_es8", text:"Me resulta fácil armar rompecabezas o piezas en 3D.", category:"ES", options:acuerdo5 },
    // MUSICAL
    { id:"im_mu1", text:"Tengo buen sentido del ritmo y puedo seguir el compás.", category:"MU", options:acuerdo5 },
    { id:"im_mu2", text:"Disfruto escuchar música con atención a los detalles.", category:"MU", options:acuerdo5 },
    { id:"im_mu3", text:"Toco o me gustaría tocar un instrumento musical.", category:"MU", options:acuerdo5 },
    { id:"im_mu4", text:"Identifico instrumentos y ritmos en piezas musicales.", category:"MU", options:acuerdo5 },
    { id:"im_mu5", text:"Aprendo mejor cuando hay música de fondo.", category:"MU", options:acuerdo5 },
    { id:"im_mu6", text:"Compongo o improviso melodías con facilidad.", category:"MU", options:acuerdo5 },
    { id:"im_mu7", text:"Los sonidos del entorno me afectan emocionalmente.", category:"MU", options:acuerdo5 },
    { id:"im_mu8", text:"Recuerdo con facilidad letras de canciones.", category:"MU", options:acuerdo5 },
    // CORPORAL-CINESTÉSICA
    { id:"im_cn1", text:"Aprendo mejor haciendo las cosas que escuchando.", category:"CN", options:acuerdo5 },
    { id:"im_cn2", text:"Soy bueno/a en deportes, danza o actividades físicas.", category:"CN", options:acuerdo5 },
    { id:"im_cn3", text:"Disfruto trabajar con las manos: cerámica, cocina, mecánica.", category:"CN", options:acuerdo5 },
    { id:"im_cn4", text:"Necesito moverme para pensar o concentrarme mejor.", category:"CN", options:acuerdo5 },
    { id:"im_cn5", text:"Tengo buena coordinación y equilibrio.", category:"CN", options:acuerdo5 },
    { id:"im_cn6", text:"Me expreso bien a través del movimiento corporal.", category:"CN", options:acuerdo5 },
    { id:"im_cn7", text:"Recuerdo experiencias físicas mejor que conceptos abstractos.", category:"CN", options:acuerdo5 },
    { id:"im_cn8", text:"Disfruto el teatro, el mimo o la danza.", category:"CN", options:acuerdo5 },
    // INTERPERSONAL
    { id:"im_in1", text:"Me resulta fácil entender los sentimientos de los demás.", category:"IN", options:acuerdo5 },
    { id:"im_in2", text:"Soy bueno/a mediando conflictos entre personas.", category:"IN", options:acuerdo5 },
    { id:"im_in3", text:"Disfruto trabajar en equipo más que solo/a.", category:"IN", options:acuerdo5 },
    { id:"im_in4", text:"Los amigos me piden consejo frecuentemente.", category:"IN", options:acuerdo5 },
    { id:"im_in5", text:"Me adapto bien a diferentes tipos de personalidades.", category:"IN", options:acuerdo5 },
    { id:"im_in6", text:"Percibo el ambiente emocional de un grupo con facilidad.", category:"IN", options:acuerdo5 },
    { id:"im_in7", text:"Disfruto enseñar o guiar a otras personas.", category:"IN", options:acuerdo5 },
    { id:"im_in8", text:"Tengo muchas relaciones significativas y diversas.", category:"IN", options:acuerdo5 },
    // INTRAPERSONAL
    { id:"im_ia1", text:"Me conozco bien: sé cuáles son mis fortalezas y debilidades.", category:"IA", options:acuerdo5 },
    { id:"im_ia2", text:"Prefiero trabajar solo/a cuando necesito concentrarme.", category:"IA", options:acuerdo5 },
    { id:"im_ia3", text:"Reflexiono mucho sobre mis pensamientos y emociones.", category:"IA", options:acuerdo5 },
    { id:"im_ia4", text:"Tengo metas personales claras y automotivación.", category:"IA", options:acuerdo5 },
    { id:"im_ia5", text:"Me siento cómodo/a con la soledad y la introspección.", category:"IA", options:acuerdo5 },
    { id:"im_ia6", text:"Tengo una visión clara de mis valores y propósito de vida.", category:"IA", options:acuerdo5 },
    { id:"im_ia7", text:"Disfruto llevar un diario personal o reflexionar por escrito.", category:"IA", options:acuerdo5 },
    { id:"im_ia8", text:"Aprendo mejor cuando conecto el contenido con mi vida personal.", category:"IA", options:acuerdo5 },
    // NATURALISTA
    { id:"im_na1", text:"Disfruto estar en la naturaleza: montañas, bosques, playas.", category:"NA", options:acuerdo5 },
    { id:"im_na2", text:"Me interesa la biología, la ecología o las ciencias naturales.", category:"NA", options:acuerdo5 },
    { id:"im_na3", text:"Noto fácilmente cambios en el ambiente o el ecosistema.", category:"NA", options:acuerdo5 },
    { id:"im_na4", text:"Me preocupa profundamente el cuidado del medioambiente.", category:"NA", options:acuerdo5 },
    { id:"im_na5", text:"Identifico fácilmente plantas, animales o fenómenos naturales.", category:"NA", options:acuerdo5 },
    { id:"im_na6", text:"Aprendo mejor cuando estoy en contacto con la naturaleza.", category:"NA", options:acuerdo5 },
    { id:"im_na7", text:"Clasifico y organizo mi entorno natural con facilidad.", category:"NA", options:acuerdo5 },
    { id:"im_na8", text:"Tengo mascotas o me gusta el cuidado de animales y plantas.", category:"NA", options:acuerdo5 },
  ],
  interpret(scores) {
    const descs: Record<string,string> = {
      LI:"Inteligencia Lingüística desarrollada. Excelente con palabras, idiomas y comunicación. Carreras: Escritura, Derecho, Periodismo, Educación.",
      LM:"Inteligencia Lógico-Matemática alta. Analítico/a, sistemático/a. Carreras: Ingeniería, Matemáticas, Informática, Ciencias.",
      ES:"Inteligencia Espacial destacada. Pensador/a visual, creativo/a con formas. Carreras: Arquitectura, Diseño, Fotografía, Arte.",
      MU:"Inteligencia Musical sobresaliente. Sensible al ritmo y la armonía. Carreras: Música, Producción sonora, Terapia musical.",
      CN:"Inteligencia Corporal-Cinestésica alta. Aprende haciendo. Carreras: Educación Física, Danza, Cirugía, Artesanía.",
      IN:"Inteligencia Interpersonal desarrollada. Hábil con las personas. Carreras: Psicología, Docencia, RRHH, Trabajo Social.",
      IA:"Inteligencia Intrapersonal alta. Gran autoconocimiento. Carreras: Filosofía, Psicología, Escritura, Investigación.",
      NA:"Inteligencia Naturalista destacada. Conexión profunda con el entorno. Carreras: Biología, Ecología, Veterinaria, Agronomía.",
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=40; const p=pct(raw,max);
      return { category:k, label, score:raw, max, percent:p, level:lv(p), description:descs[k] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 8. ESTILOS DE APRENDIZAJE — VARK + Kolb: 56 ítems
// ══════════════════════════════════════════════════════════════
export const aprendizajeTest: Test = {
  id:"aprendizaje", name:"Estilos de Aprendizaje VARK", shortName:"VARK",
  icon:"📚", area:"aprendizaje", estimatedMinutes:14,
  description:"56 ítems para identificar tus estilos de aprendizaje dominantes: Visual, Auditivo, Lectura/Escritura y Kinestésico.",
  categories:{ VI:"Visual", AU:"Auditivo", LE:"Lectura-escritura", KI:"Kinestésico" },
  questions:[
    // VISUAL — 14
    { id:"va_vi1",  text:"Aprendo mejor cuando veo diagramas, gráficos o mapas conceptuales.", category:"VI", options:acuerdo5 },
    { id:"va_vi2",  text:"Recuerdo mejor las caras que los nombres.", category:"VI", options:acuerdo5 },
    { id:"va_vi3",  text:"Prefiero ver una demostración antes de intentar algo nuevo.", category:"VI", options:acuerdo5 },
    { id:"va_vi4",  text:"Me ayuda subrayar con colores diferentes al estudiar.", category:"VI", options:acuerdo5 },
    { id:"va_vi5",  text:"Visualizo imágenes cuando proceso información nueva.", category:"VI", options:acuerdo5 },
    { id:"va_vi6",  text:"Me distraigo fácilmente si hay desorden visual en el entorno.", category:"VI", options:acuerdo5 },
    { id:"va_vi7",  text:"Prefiero ver videos o presentaciones antes que leer textos.", category:"VI", options:acuerdo5 },
    { id:"va_vi8",  text:"Aprendo mejor con tablas, infografías y organizadores gráficos.", category:"VI", options:acuerdo5 },
    { id:"va_vi9",  text:"Recuerdo dónde estaba la información en la página.", category:"VI", options:acuerdo5 },
    { id:"va_vi10", text:"Dibujar o esquematizar me ayuda a entender conceptos.", category:"VI", options:acuerdo5 },
    { id:"va_vi11", text:"El lenguaje corporal de las personas me dice mucho.", category:"VI", options:acuerdo5 },
    { id:"va_vi12", text:"Prefiero mapas antes que instrucciones verbales.", category:"VI", options:acuerdo5 },
    { id:"va_vi13", text:"Me resulta más fácil seguir instrucciones escritas con diagramas.", category:"VI", options:acuerdo5 },
    { id:"va_vi14", text:"Organizo mis ideas mejor con esquemas visuales que con listas.", category:"VI", options:acuerdo5 },
    // AUDITIVO — 14
    { id:"va_au1",  text:"Aprendo mejor escuchando explicaciones que leyendo.", category:"AU", options:acuerdo5 },
    { id:"va_au2",  text:"Recuerdo mejor lo que escucho que lo que leo.", category:"AU", options:acuerdo5 },
    { id:"va_au3",  text:"Me gusta estudiar escuchando música o podcasts educativos.", category:"AU", options:acuerdo5 },
    { id:"va_au4",  text:"Aprendo bien en debates o discusiones orales.", category:"AU", options:acuerdo5 },
    { id:"va_au5",  text:"Prefiero que alguien me explique las cosas verbalmente.", category:"AU", options:acuerdo5 },
    { id:"va_au6",  text:"Me resulta útil leer en voz alta o explicar en voz alta.", category:"AU", options:acuerdo5 },
    { id:"va_au7",  text:"Recuerdo melodías y canciones con facilidad.", category:"AU", options:acuerdo5 },
    { id:"va_au8",  text:"Las clases donde el profesor habla bien me resultan más efectivas.", category:"AU", options:acuerdo5 },
    { id:"va_au9",  text:"Me distrae fácilmente el ruido de fondo.", category:"AU", options:acuerdo5 },
    { id:"va_au10", text:"Prefiero llamar a alguien antes que enviar un mensaje de texto.", category:"AU", options:acuerdo5 },
    { id:"va_au11", text:"Aprendo pronunciación de idiomas más fácilmente escuchando.", category:"AU", options:acuerdo5 },
    { id:"va_au12", text:"Recuerdo bien las instrucciones dadas verbalmente.", category:"AU", options:acuerdo5 },
    { id:"va_au13", text:"Me gusta repetir información en voz alta para memorizarla.", category:"AU", options:acuerdo5 },
    { id:"va_au14", text:"El tono de voz de quien me habla influye en mi comprensión.", category:"AU", options:acuerdo5 },
    // LECTURA-ESCRITURA — 14
    { id:"va_le1",  text:"Aprendo mejor leyendo textos y tomando notas.", category:"LE", options:acuerdo5 },
    { id:"va_le2",  text:"Me gusta leer manuales, glosarios y definiciones.", category:"LE", options:acuerdo5 },
    { id:"va_le3",  text:"Escribir resúmenes me ayuda a retener información.", category:"LE", options:acuerdo5 },
    { id:"va_le4",  text:"Prefiero leer instrucciones antes de hacer algo.", category:"LE", options:acuerdo5 },
    { id:"va_le5",  text:"Tengo buena ortografía y me resulta natural escribir.", category:"LE", options:acuerdo5 },
    { id:"va_le6",  text:"Hago listas para organizar mis actividades y tareas.", category:"LE", options:acuerdo5 },
    { id:"va_le7",  text:"Prefiero recibir información escrita en lugar de oral.", category:"LE", options:acuerdo5 },
    { id:"va_le8",  text:"Disfruto tomar apuntes detallados durante las clases.", category:"LE", options:acuerdo5 },
    { id:"va_le9",  text:"Aprendo mejor cuando convierte información en texto.", category:"LE", options:acuerdo5 },
    { id:"va_le10", text:"Me gusta releer mis propios apuntes para repasar.", category:"LE", options:acuerdo5 },
    { id:"va_le11", text:"Prefiero textos con mucho contenido escrito y detallado.", category:"LE", options:acuerdo5 },
    { id:"va_le12", text:"La escritura me ayuda a clarificar mis propios pensamientos.", category:"LE", options:acuerdo5 },
    { id:"va_le13", text:"Recuerdo mejor lo que leo que lo que escucho.", category:"LE", options:acuerdo5 },
    { id:"va_le14", text:"Me gustan los ensayos, los informes y los análisis escritos.", category:"LE", options:acuerdo5 },
    // KINESTÉSICO — 14
    { id:"va_ki1",  text:"Aprendo mejor cuando puedo tocar, manipular o experimentar.", category:"KI", options:acuerdo5 },
    { id:"va_ki2",  text:"Necesito moverme o hacer algo con las manos para aprender.", category:"KI", options:acuerdo5 },
    { id:"va_ki3",  text:"Aprendo mejor en laboratorios, talleres o salidas de campo.", category:"KI", options:acuerdo5 },
    { id:"va_ki4",  text:"Recuerdo mejor lo que hago que lo que leo o escucho.", category:"KI", options:acuerdo5 },
    { id:"va_ki5",  text:"Prefiero el aprendizaje basado en proyectos y práctica real.", category:"KI", options:acuerdo5 },
    { id:"va_ki6",  text:"Me cuesta concentrarme si debo estar quieto/a mucho tiempo.", category:"KI", options:acuerdo5 },
    { id:"va_ki7",  text:"Aprendo de los errores que cometo haciendo cosas.", category:"KI", options:acuerdo5 },
    { id:"va_ki8",  text:"Me resulta fácil aprender habilidades físicas o deportivas.", category:"KI", options:acuerdo5 },
    { id:"va_ki9",  text:"Prefiero probar algo directamente antes de ver cómo se hace.", category:"KI", options:acuerdo5 },
    { id:"va_ki10", text:"Las simulaciones, los juegos de roles y las dramatizaciones me ayudan.", category:"KI", options:acuerdo5 },
    { id:"va_ki11", text:"Me gusta aprender mediante ejemplos concretos y casos reales.", category:"KI", options:acuerdo5 },
    { id:"va_ki12", text:"Disfruto cuando el aprendizaje incluye actividades físicas o trabajo de campo.", category:"KI", options:acuerdo5 },
    { id:"va_ki13", text:"Aprendo haciendo demostraciones o siendo voluntario/a en clase.", category:"KI", options:acuerdo5 },
    { id:"va_ki14", text:"La experiencia práctica vale más que la teoría para mí.", category:"KI", options:acuerdo5 },
  ],
  interpret(scores) {
    const descs: Record<string, Record<string,string>> = {
      VI:{ bajo:"Tu estilo visual está poco desarrollado. Usa más diagramas y esquemas.", medio:"Aprendes razonablemente bien con recursos visuales.", alto:"Estilo visual dominante. Aprovecha mapas conceptuales, videos e infografías." },
      AU:{ bajo:"Poco estilo auditivo. Evita depender solo de conferencias.", medio:"Aprendes bien con explicaciones orales moderadas.", alto:"Estilo auditivo dominante. Podcasts, debates y explicaciones orales son tus mejores herramientas." },
      LE:{ bajo:"Poco orientado/a a la lectura y escritura. Busca alternativas.", medio:"Buena capacidad para aprender mediante texto escrito.", alto:"Estilo lecto-escritor dominante. La lectura profunda y los resúmenes escritos son tu fuerte." },
      KI:{ bajo:"Bajo estilo kinestésico. Puede costar el aprendizaje puramente práctico.", medio:"Buena respuesta al aprendizaje experiencial.", alto:"Estilo kinestésico dominante. El aprendizaje basado en proyectos y la práctica directa son ideales." },
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=70; const p=pct(raw,max); const l=lv(p);
      return { category:k, label, score:raw, max, percent:p, level:l, description:descs[k][l] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// 9. BIENESTAR ACADÉMICO Y ESTRÉS — 50 ítems
// ══════════════════════════════════════════════════════════════
export const bienestrarTest: Test = {
  id:"bienestar", name:"Bienestar Académico y Estrés", shortName:"Bienestar",
  icon:"🌿", area:"bienestar", estimatedMinutes:14,
  description:"50 ítems que evalúan Bienestar Emocional, Carga Académica, Relaciones Sociales, Autoeficacia y Estrés Percibido.",
  categories:{ BE:"Bienestar emocional", CA:"Carga académica", RS:"Relaciones de apoyo", AE:"Autoeficacia académica", EP:"Estrés percibido" },
  questions:[
    // BIENESTAR EMOCIONAL — 10
    { id:"bw_be1",  text:"Me siento satisfecho/a con mi vida en general.", category:"BE", options:acuerdo5 },
    { id:"bw_be2",  text:"Tengo momentos frecuentes de alegría o entusiasmo.", category:"BE", options:acuerdo5 },
    { id:"bw_be3",  text:"Me siento en paz con quien soy.", category:"BE", options:acuerdo5 },
    { id:"bw_be4",  text:"Me recupero con relativa facilidad de experiencias difíciles.", category:"BE", options:acuerdo5 },
    { id:"bw_be5",  text:"Siento que mi vida tiene sentido y propósito.", category:"BE", options:acuerdo5 },
    { id:"bw_be6",  text:"Me siento capaz de manejar los desafíos cotidianos.", category:"BE", options:acuerdo5 },
    { id:"bw_be7",  text:"Experimento emociones positivas con más frecuencia que negativas.", category:"BE", options:acuerdo5 },
    { id:"bw_be8",  text:"Me siento triste o vacío/a sin razón aparente.", category:"BE", reversed:true, options:acuerdo5 },
    { id:"bw_be9",  text:"Disfruto de actividades cotidianas como comer, dormir o descansar.", category:"BE", options:acuerdo5 },
    { id:"bw_be10", text:"Me siento abrumado/a emocionalmente con frecuencia.", category:"BE", reversed:true, options:acuerdo5 },
    // CARGA ACADÉMICA — 10
    { id:"bw_ca1",  text:"La cantidad de trabajo académico que tengo es manejable.", category:"CA", options:acuerdo5 },
    { id:"bw_ca2",  text:"Cuento con tiempo suficiente para estudiar y descansar.", category:"CA", options:acuerdo5 },
    { id:"bw_ca3",  text:"Las exigencias del programa se ajustan a mis capacidades.", category:"CA", options:acuerdo5 },
    { id:"bw_ca4",  text:"Me siento presionado/a por las fechas de entrega.", category:"CA", reversed:true, options:acuerdo5 },
    { id:"bw_ca5",  text:"El ritmo académico me permite aprender de forma efectiva.", category:"CA", options:acuerdo5 },
    { id:"bw_ca6",  text:"Siento que me piden demasiado en muy poco tiempo.", category:"CA", reversed:true, options:acuerdo5 },
    { id:"bw_ca7",  text:"Puedo equilibrar mis estudios con otras actividades importantes.", category:"CA", options:acuerdo5 },
    { id:"bw_ca8",  text:"Me falta tiempo para profundizar en los temas que me interesan.", category:"CA", reversed:true, options:acuerdo5 },
    { id:"bw_ca9",  text:"El nivel de dificultad académica es apropiado para mí.", category:"CA", options:acuerdo5 },
    { id:"bw_ca10", text:"La acumulación de tareas interfiere con mi bienestar.", category:"CA", reversed:true, options:acuerdo5 },
    // RELACIONES DE APOYO — 10
    { id:"bw_rs1",  text:"Tengo amigos/as o compañeros/as con quienes puedo contar.", category:"RS", options:acuerdo5 },
    { id:"bw_rs2",  text:"Mi familia me apoya en mi proceso académico.", category:"RS", options:acuerdo5 },
    { id:"bw_rs3",  text:"Cuento con al menos una persona de confianza para hablar.", category:"RS", options:acuerdo5 },
    { id:"bw_rs4",  text:"Siento que mis profesores se preocupan por mi aprendizaje.", category:"RS", options:acuerdo5 },
    { id:"bw_rs5",  text:"Mis compañeros/as son una fuente de apoyo y motivación.", category:"RS", options:acuerdo5 },
    { id:"bw_rs6",  text:"Me siento solo/a o sin apoyo en mi entorno académico.", category:"RS", reversed:true, options:acuerdo5 },
    { id:"bw_rs7",  text:"Puedo pedir ayuda cuando la necesito sin vergüenza.", category:"RS", options:acuerdo5 },
    { id:"bw_rs8",  text:"Tengo relaciones significativas fuera del ámbito académico.", category:"RS", options:acuerdo5 },
    { id:"bw_rs9",  text:"Me siento parte de una comunidad de aprendizaje.", category:"RS", options:acuerdo5 },
    { id:"bw_rs10", text:"Las relaciones en mi entorno académico son fuente de estrés.", category:"RS", reversed:true, options:acuerdo5 },
    // AUTOEFICACIA — 10
    { id:"bw_ae1",  text:"Confío en mi capacidad para superar los desafíos académicos.", category:"AE", options:acuerdo5 },
    { id:"bw_ae2",  text:"Cuando fracaso, busco qué mejorar en lugar de rendirme.", category:"AE", options:acuerdo5 },
    { id:"bw_ae3",  text:"Me siento preparado/a para enfrentar los exámenes.", category:"AE", options:acuerdo5 },
    { id:"bw_ae4",  text:"Creo que con esfuerzo puedo mejorar mis habilidades.", category:"AE", options:acuerdo5 },
    { id:"bw_ae5",  text:"Sé cómo estudiar de forma efectiva para mis materias.", category:"AE", options:acuerdo5 },
    { id:"bw_ae6",  text:"Me siento capaz de organizar mi tiempo de estudio.", category:"AE", options:acuerdo5 },
    { id:"bw_ae7",  text:"Dudo mucho de mis capacidades académicas.", category:"AE", reversed:true, options:acuerdo5 },
    { id:"bw_ae8",  text:"Creo que puedo alcanzar las metas que me propongo en los estudios.", category:"AE", options:acuerdo5 },
    { id:"bw_ae9",  text:"Me recupero bien de las malas calificaciones.", category:"AE", options:acuerdo5 },
    { id:"bw_ae10", text:"Me siento inferior a mis compañeros/as en habilidades académicas.", category:"AE", reversed:true, options:acuerdo5 },
    // ESTRÉS PERCIBIDO — 10
    { id:"bw_ep1",  text:"Me siento tensionado/a la mayor parte del tiempo.", category:"EP", options:acuerdo5 },
    { id:"bw_ep2",  text:"Tengo dificultades para dormir por preocupaciones académicas.", category:"EP", options:acuerdo5 },
    { id:"bw_ep3",  text:"Siento que las demandas del estudio superan mis recursos.", category:"EP", options:acuerdo5 },
    { id:"bw_ep4",  text:"Tengo síntomas físicos de estrés: dolores de cabeza, tensión muscular.", category:"EP", options:acuerdo5 },
    { id:"bw_ep5",  text:"Me cuesta concentrarme por la ansiedad o la preocupación.", category:"EP", options:acuerdo5 },
    { id:"bw_ep6",  text:"Siento que pierdo el control cuando tengo muchas cosas pendientes.", category:"EP", options:acuerdo5 },
    { id:"bw_ep7",  text:"Los exámenes me generan una ansiedad difícil de manejar.", category:"EP", options:acuerdo5 },
    { id:"bw_ep8",  text:"Me siento agotado/a mental o físicamente con frecuencia.", category:"EP", options:acuerdo5 },
    { id:"bw_ep9",  text:"El estrés interfiere con mi rendimiento académico.", category:"EP", options:acuerdo5 },
    { id:"bw_ep10", text:"Me siento al borde del agotamiento (burnout) por los estudios.", category:"EP", options:acuerdo5 },
  ],
  interpret(scores) {
    const descs: Record<string, Record<string,string>> = {
      BE:{ bajo:"Bajo bienestar emocional. Se recomienda apoyo psicológico y estrategias de autocuidado.", medio:"Bienestar emocional moderado. Hay espacio para mejorar el equilibrio emocional.", alto:"Alto bienestar emocional. Emocionalmente estable y satisfecho/a con la vida." },
      CA:{ bajo:"Alta carga académica percibida. La cantidad de trabajo supera los recursos disponibles.", medio:"Carga académica moderada. Algunas dificultades manejables de organización del tiempo.", alto:"Carga académica bien manejada. Buen equilibrio entre exigencias y capacidad." },
      RS:{ bajo:"Red de apoyo social débil. Sensación de aislamiento o falta de soporte.", medio:"Red de apoyo moderada. Vínculos presentes pero que pueden fortalecerse.", alto:"Sólida red de apoyo social y emocional. Buenos vínculos familiares, sociales y académicos." },
      AE:{ bajo:"Baja autoeficacia académica. Alta duda sobre las propias capacidades.", medio:"Autoeficacia moderada. Confianza variable según la situación.", alto:"Alta autoeficacia. Confía en sus capacidades y persiste ante los retos." },
      EP:{ bajo:"Estrés percibido bajo. Buena gestión de las demandas académicas.", medio:"Estrés percibido moderado. Algunas situaciones generan tensión significativa.", alto:"Estrés percibido alto. Se recomienda intervención para manejo del estrés y posible agotamiento." },
    };
    return Object.entries(this.categories as Record<string,string>).map(([k,label]) => {
      const raw=scores[k]??0; const max=50;
      const rawAdj = k==="EP" ? 50-raw+10 : raw;
      const p=pct(rawAdj,max); const l=lv(p);
      return { category:k, label, score:raw, max, percent:p, level:l, description:descs[k][l] };
    });
  }
};

// ══════════════════════════════════════════════════════════════
// REGISTRO CENTRAL
// ══════════════════════════════════════════════════════════════
export const allTests: Test[] = [
  bigFiveTest, mbtiTest, hollandTest, emocionalTest,
  schwartzTest, datTest, inteligenciasTest, aprendizajeTest, bienestrarTest,
];

export const testsByArea = {
  personalidad: allTests.filter(t => t.area === "personalidad"),
  vocacional:   allTests.filter(t => t.area === "vocacional"),
  emocional:    allTests.filter(t => t.area === "emocional"),
  actitudes:    allTests.filter(t => t.area === "actitudes"),
  aptitudes:    allTests.filter(t => t.area === "aptitudes"),
  inteligencias:allTests.filter(t => t.area === "inteligencias"),
  aprendizaje:  allTests.filter(t => t.area === "aprendizaje"),
  bienestar:    allTests.filter(t => t.area === "bienestar"),
};
