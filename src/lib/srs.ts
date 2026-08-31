// Repaso espaciado (algoritmo tipo SM-2 simplificado)

export type Calidad = 0 | 3 | 4 | 5; // 0 = fallo, 3 = difícil, 4 = bien, 5 = fácil

export interface SrsState {
  facilidad: number;
  intervalo_dias: number;
  repeticiones: number;
}

export interface SrsResult extends SrsState {
  estado: 'nueva' | 'aprendiendo' | 'repasando' | 'dominada';
  proxima_revision: string;
}

export function calcularSrs(prev: SrsState, calidad: Calidad): SrsResult {
  let { facilidad, intervalo_dias, repeticiones } = prev;

  if (calidad === 0) {
    repeticiones = 0;
    intervalo_dias = 0.007; // ~10 minutos
  } else {
    repeticiones += 1;
    if (repeticiones === 1) intervalo_dias = 1;
    else if (repeticiones === 2) intervalo_dias = 3;
    else intervalo_dias = Math.round(intervalo_dias * facilidad * 10) / 10;
  }

  facilidad = facilidad + (0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02));
  if (facilidad < 1.3) facilidad = 1.3;
  if (facilidad > 3.0) facilidad = 3.0;

  const estado: SrsResult['estado'] =
    repeticiones === 0 ? 'aprendiendo'
      : intervalo_dias >= 21 ? 'dominada'
        : repeticiones >= 3 ? 'repasando'
          : 'aprendiendo';

  const proxima = new Date(Date.now() + intervalo_dias * 24 * 60 * 60 * 1000);

  return {
    facilidad: Math.round(facilidad * 100) / 100,
    intervalo_dias,
    repeticiones,
    estado,
    proxima_revision: proxima.toISOString(),
  };
}

export function esVencida(proxima_revision?: string | null) {
  if (!proxima_revision) return true;
  return new Date(proxima_revision).getTime() <= Date.now();
}

export function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Normaliza texto para comparar respuestas escritas. */
export function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
