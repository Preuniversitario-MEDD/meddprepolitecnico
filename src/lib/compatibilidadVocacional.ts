import { CarreraEspol } from '@/data/carrerasEspol';

export interface PerfilEstudiante {
  empatia: number;
  inteligenciaEmocional: number;
  prosocial: number;
  habilidadesSociales: number;
  estilosDominantes: ('V' | 'A' | 'R' | 'K')[];
}

export interface ResultadoCompatibilidad {
  carrera: CarreraEspol;
  porcentaje: number;
  factoresPositivos: string[];
  factoresNeutros: string[];
  factoresADesarrollar: string[];
}

const PESOS = {
  empatia: 22,
  inteligenciaEmocional: 22,
  prosocial: 20,
  habilidadesSociales: 22,
  estilo: 14,
};

export function calcularCompatibilidad(
  perfil: PerfilEstudiante,
  carreras: CarreraEspol[]
): ResultadoCompatibilidad[] {
  return carreras
    .map(carrera => {
      const { perfilIdeal } = carrera;
      const simEmpatia = 100 - Math.abs(perfil.empatia - perfilIdeal.empatia);
      const simIE = 100 - Math.abs(perfil.inteligenciaEmocional - perfilIdeal.inteligenciaEmocional);
      const simProsocial = 100 - Math.abs(perfil.prosocial - perfilIdeal.prosocial);
      const simSocial = 100 - Math.abs(perfil.habilidadesSociales - perfilIdeal.habilidadesSociales);

      const matchEstilo = perfil.estilosDominantes.some(e => perfilIdeal.estilos.includes(e));
      const simEstilo = matchEstilo ? 100 : 60;

      const porcentaje = Math.max(0, Math.min(100, Math.round(
        (simEmpatia * PESOS.empatia +
          simIE * PESOS.inteligenciaEmocional +
          simProsocial * PESOS.prosocial +
          simSocial * PESOS.habilidadesSociales +
          simEstilo * PESOS.estilo) / 100
      )));

      const factoresPositivos: string[] = [];
      const factoresNeutros: string[] = [];
      const factoresADesarrollar: string[] = [];

      const clasificar = (valor: number, label: string) => {
        if (valor >= 80) factoresPositivos.push(label);
        else if (valor >= 60) factoresNeutros.push(label);
        else factoresADesarrollar.push(label);
      };
      clasificar(simEmpatia, 'Empatía');
      clasificar(simIE, 'Inteligencia emocional');
      clasificar(simProsocial, 'Conducta prosocial');
      clasificar(simSocial, 'Habilidades sociales');
      if (matchEstilo) factoresPositivos.push('Estilo de aprendizaje compatible');
      else factoresNeutros.push('Estilo de aprendizaje adaptable');

      return { carrera, porcentaje, factoresPositivos, factoresNeutros, factoresADesarrollar };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

/**
 * Convierte los resultados de psychometric_results en un perfil 0-100.
 * Acepta cualquier estructura de scores que use claves comunes.
 *
 * Convenciones reconocidas (cualquier match cuenta):
 *  - empatia / empathy
 *  - inteligencia_emocional / emocional / iemocional
 *  - prosocial / prosocialidad
 *  - habilidades_sociales / social
 *  - aprendizaje / vark / estilos  -> dimensiones V, A, R, K (o visual/auditivo/lectura/kinestesico)
 */
export function normalizarPerfil(
  resultadosPorTest: Record<string, { scores?: Record<string, any>; answers?: any }>
): PerfilEstudiante {
  const findTest = (...candidatos: string[]) => {
    for (const key of Object.keys(resultadosPorTest)) {
      const k = key.toLowerCase();
      if (candidatos.some(c => k.includes(c))) return resultadosPorTest[key];
    }
    return undefined;
  };

  const promedioScore = (scores?: Record<string, any>): number | null => {
    if (!scores) return null;
    const vals = Object.values(scores)
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v));
    if (!vals.length) return null;
    const max = Math.max(...vals);
    // Si los valores parecen estar ya en 0-100, promediamos directamente.
    // Si no (ej. likert 1-5), normalizamos.
    if (max <= 5) return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 100);
    if (max <= 100) return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    // Fallback: reescalar al máximo observado
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / max) * 100);
  };

  const empatiaTest = findTest('empatia', 'empathy', 'iri');
  const ieTest = findTest('emocional', 'emotional');
  const prosocialTest = findTest('prosocial');
  const socialTest = findTest('habilidades_sociales', 'social');
  const varkTest = findTest('aprendizaje', 'vark', 'estilos');

  let estilosDominantes: ('V' | 'A' | 'R' | 'K')[] = ['V'];
  if (varkTest?.scores) {
    const map: Record<string, 'V' | 'A' | 'R' | 'K'> = {
      v: 'V', visual: 'V',
      a: 'A', auditivo: 'A', auditiva: 'A',
      r: 'R', lectura: 'R', lecto: 'R', lectoescritura: 'R',
      k: 'K', kinestesico: 'K', kinestésico: 'K', kinesthetic: 'K',
    };
    const arr = Object.entries(varkTest.scores)
      .map(([k, v]) => ({ key: map[k.toLowerCase()] || (k.toUpperCase()[0] as any), val: Number(v) }))
      .filter(x => ['V', 'A', 'R', 'K'].includes(x.key) && !Number.isNaN(x.val))
      .sort((a, b) => b.val - a.val);
    if (arr.length) estilosDominantes = [arr[0].key, ...(arr[1] ? [arr[1].key] : [])] as any;
  }

  return {
    empatia: promedioScore(empatiaTest?.scores) ?? 50,
    inteligenciaEmocional: promedioScore(ieTest?.scores) ?? 50,
    prosocial: promedioScore(prosocialTest?.scores) ?? 50,
    habilidadesSociales: promedioScore(socialTest?.scores) ?? 50,
    estilosDominantes,
  };
}

export function contarTestsRelevantes(
  resultadosPorTest: Record<string, any>
): number {
  const claves = ['empatia', 'emocional', 'prosocial', 'social', 'aprendizaje', 'vark', 'estilos'];
  const matched = new Set<string>();
  Object.keys(resultadosPorTest).forEach(key => {
    const k = key.toLowerCase();
    claves.forEach(c => { if (k.includes(c)) matched.add(c); });
  });
  // empatia, emocional, prosocial, social, aprendizaje cuentan como 5 distintos
  let n = 0;
  if (matched.has('empatia')) n++;
  if (matched.has('emocional')) n++;
  if (matched.has('prosocial')) n++;
  if (matched.has('social')) n++;
  if (matched.has('aprendizaje') || matched.has('vark') || matched.has('estilos')) n++;
  return n;
}
