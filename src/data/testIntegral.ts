export const DIMENSIONES = [
  "Concentración", "Constancia", "Mérito/Esfuerzo", "Habilidad verbal", "Habilidad no verbal",
  "Extroversión", "Actitud", "Aptitud", "Resiliencia", "Manejo de problemas",
] as const;
export type Dimension = typeof DIMENSIONES[number];

export interface PreguntaIntegral { id: number; texto: string; dim: Dimension; inversa?: boolean }

const p = (dim: Dimension, items: [string, boolean?][], start: number): PreguntaIntegral[] =>
  items.map(([texto, inversa], i) => ({ id: start + i, texto, dim, inversa }));

export const PREGUNTAS_INTEGRAL: PreguntaIntegral[] = [
  ...p("Concentración", [["Puedo estudiar 30 minutos seguidos sin revisar el celular."], ["Me distraigo fácilmente con ruidos o notificaciones.", true], ["Cuando leo un texto largo, recuerdo bien lo que leí."], ["Pierdo el hilo en clases o videos largos.", true]], 1),
  ...p("Constancia", [["Estudio casi todos los días aunque no tenga examen cerca."], ["Empiezo planes de estudio pero los abandono pronto.", true], ["Cumplo las metas que me propongo cada semana."], ["Dejo todo para el último momento.", true]], 5),
  ...p("Mérito/Esfuerzo", [["Prefiero ganarme una nota con esfuerzo antes que con suerte."], ["Repito un ejercicio difícil hasta que me sale."], ["Si algo me cuesta, prefiero dejarlo.", true], ["Me siento orgulloso cuando supero un reto por mi cuenta."]], 9),
  ...p("Habilidad verbal", [["Me resulta fácil explicar mis ideas por escrito."], ["Entiendo rápido lo que leo, incluso textos técnicos."], ["Me cuesta encontrar las palabras correctas al hablar.", true], ["Disfruto debatir o exponer ante otros."]], 13),
  ...p("Habilidad no verbal", [["Resuelvo mejor problemas con gráficos, figuras o patrones."], ["Puedo imaginar cómo se ve un objeto si lo giro mentalmente."], ["Me cuesta leer mapas o diagramas.", true], ["Noto detalles visuales que otros pasan por alto."]], 17),
  ...p("Extroversión", [["Me recargo de energía estando con otras personas."], ["Prefiero estudiar solo y en silencio.", true], ["Me resulta fácil hablar con gente nueva."], ["Después de mucha interacción social necesito estar a solas.", true]], 21),
  ...p("Actitud", [["Creo que puedo mejorar en cualquier materia si me esfuerzo."], ["Cuando algo sale mal, busco qué puedo aprender."], ["Siento que estudiar es una pérdida de tiempo.", true], ["Me motiva imaginarme en la universidad."]], 25),
  ...p("Aptitud", [["Aprendo conceptos nuevos más rápido que la mayoría."], ["Las matemáticas y la lógica se me dan bien."], ["Necesito muchas explicaciones para entender algo nuevo.", true], ["Conecto ideas de distintas materias con facilidad."]], 29),
  ...p("Resiliencia", [["Después de una mala nota, me recupero y sigo adelante."], ["Los fracasos me desaniman por varios días.", true], ["Bajo presión mantengo la calma."], ["Veo los errores como parte normal de aprender."]], 33),
  ...p("Manejo de problemas", [["Ante un problema, primero lo divido en partes pequeñas."], ["Si no sé resolver algo, busco otra estrategia antes de rendirme."], ["Me bloqueo cuando un problema no tiene solución obvia.", true], ["Pido ayuda cuando la necesito sin sentir vergüenza."]], 37),
];

export const LIKERT = ["Nada", "Poco", "A veces", "Bastante", "Totalmente"];

export function calcularDimensiones(resp: Record<number, number>): Record<string, number> {
  const out: Record<string, number> = {};
  DIMENSIONES.forEach((d) => {
    const items = PREGUNTAS_INTEGRAL.filter((q) => q.dim === d && resp[q.id]);
    if (!items.length) return;
    const avg = items.reduce((s, q) => s + (q.inversa ? 6 - resp[q.id] : resp[q.id]), 0) / items.length;
    out[d] = Math.round(((avg - 1) / 4) * 100);
  });
  return out;
}
