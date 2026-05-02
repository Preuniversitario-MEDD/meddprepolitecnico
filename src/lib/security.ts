/*
 * Utilidades de seguridad — PreUniversitario MEDD
 * © 2020-2026 Víctor Cañizares González
 */

/** Sanitiza texto libre antes de enviarlo a la base de datos. */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 500);
}

/** Sanitiza permitiendo más longitud (para mensajes y descripciones). */
export function sanitizeLong(input: string, max = 5000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, max);
}

/** Codifica datos antes de guardarlos en localStorage. */
export function encodeStorage(data: string): string {
  try { return btoa(encodeURIComponent(data)); } catch { return ''; }
}

/** Decodifica datos guardados con encodeStorage. */
export function decodeStorage(data: string): string {
  try { return decodeURIComponent(atob(data)); } catch { return ''; }
}

/** Valida una cédula ecuatoriana (10 dígitos). */
export function validarCedulaEcuatoriana(cedula: string): boolean {
  if (!cedula || cedula.length !== 10 || !/^\d{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return false;
  const digitos = cedula.split('').map(Number);
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = digitos[i] * (i % 2 === 0 ? 2 : 1);
    if (val > 9) val -= 9;
    suma += val;
  }
  const verificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  return verificador === digitos[9];
}

/** Fortaleza de la contraseña: 'debil' | 'media' | 'fuerte'. */
export function passwordStrength(password: string): 'debil' | 'media' | 'fuerte' {
  if (!password) return 'debil';
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score++;
  if (score <= 2) return 'debil';
  if (score <= 4) return 'media';
  return 'fuerte';
}

/** Registra un acceso a una ruta protegida en access_logs (best-effort). */
export async function logAccess(
  supabase: any,
  userId: string | null,
  ruta: string,
  exitoso = true,
  detalle?: string,
) {
  try {
    await supabase.from('access_logs').insert({
      user_id: userId,
      ruta,
      accion: 'acceso',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 500) : null,
      exitoso,
      detalle: detalle ? detalle.substring(0, 500) : null,
    });
  } catch {
    // best-effort: no romper la navegación si el log falla
  }
}
