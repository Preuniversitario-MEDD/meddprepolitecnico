import { supabase } from '@/integrations/supabase/client';

/**
 * Deep-clones a course into a new one:
 * - Creates a new curso with copied título, descripción and módulos
 * - For every session linked to the source curso via curso_sesiones,
 *   duplicates the sesion (row + contenido + pestanas_sesion + quiz_preguntas)
 *   scoped to the new curso, and links it via curso_sesiones.
 * - Duplicates exam_configuracion rows attached to the source curso.
 * Returns the new curso row.
 */
export async function deepCloneCurso(sourceCursoId: string, override?: { titulo?: string; descripcion?: string }) {
  const { data: source, error: srcErr } = await supabase.from('cursos').select('*').eq('id', sourceCursoId).single();
  if (srcErr || !source) throw new Error(srcErr?.message || 'Curso origen no encontrado');

  const { data: newCurso, error: cErr } = await supabase.from('cursos').insert({
    titulo: override?.titulo || `${source.titulo} (copia)`,
    descripcion: override?.descripcion ?? source.descripcion,
    modulos: (source as any).modulos ?? null,
  } as any).select().single();
  if (cErr || !newCurso) throw new Error(cErr?.message || 'No se pudo crear la copia del curso');

  // Sessions linked to source via curso_sesiones
  const { data: links } = await supabase.from('curso_sesiones').select('sesion_id, orden').eq('curso_id', sourceCursoId).order('orden');
  const linkList = links || [];
  if (linkList.length > 0) {
    const sesIds = linkList.map(l => l.sesion_id);
    const { data: sesRows } = await supabase.from('sesiones').select('*').in('id', sesIds);
    const sesById = new Map((sesRows || []).map((s: any) => [s.id, s]));

    for (const link of linkList) {
      const src: any = sesById.get(link.sesion_id);
      if (!src) continue;

      const { data: newSes, error: nsErr } = await supabase.from('sesiones').insert({
        numero: src.numero,
        titulo: src.titulo,
        descripcion: src.descripcion,
        estado: src.estado || 'bloqueada',
        curso_id: newCurso.id,
      } as any).select().single();
      if (nsErr || !newSes) continue;

      // curso_sesiones link
      await supabase.from('curso_sesiones').insert({ curso_id: newCurso.id, sesion_id: newSes.id, orden: link.orden });

      // Copy pestanas
      const { data: tabs } = await supabase.from('pestanas_sesion').select('*').eq('sesion_id', src.id);
      if (tabs && tabs.length > 0) {
        await supabase.from('pestanas_sesion').insert(
          tabs.map((t: any) => ({ sesion_id: newSes.id, nombre: t.nombre, clave: t.clave, orden: t.orden }))
        );
      }

      // Copy contenido
      const { data: content } = await supabase.from('contenido').select('*').eq('sesion_id', src.id);
      if (content && content.length > 0) {
        await supabase.from('contenido').insert(
          content.map((c: any) => ({
            sesion_id: newSes.id,
            tipo: c.tipo,
            titulo: c.titulo,
            texto: c.texto,
            url: c.url,
            imagen_url: c.imagen_url,
            orden: c.orden,
            grupo_nombre: c.grupo_nombre,
            solucion: c.solucion,
          }))
        );
      }

      // Copy quiz preguntas
      const { data: quiz } = await supabase.from('quiz_preguntas').select('*').eq('sesion_id', src.id);
      if (quiz && quiz.length > 0) {
        await supabase.from('quiz_preguntas').insert(
          quiz.map((q: any) => ({
            sesion_id: newSes.id,
            pregunta: q.pregunta,
            opciones: q.opciones,
            respuesta_correcta: q.respuesta_correcta,
            imagen_url: q.imagen_url,
            grupo: q.grupo,
            dificultad: q.dificultad,
          }))
        );
      }
    }
  }

  // Copy exam configurations tied to source curso
  const { data: examConfigs } = await supabase.from('exam_configuracion').select('*').eq('curso_id', sourceCursoId);
  if (examConfigs && examConfigs.length > 0) {
    await supabase.from('exam_configuracion').insert(
      examConfigs.map((e: any) => ({
        tipo: `${e.tipo}_${newCurso.id.slice(0, 6)}`, // tipo must be unique-ish per course
        label: e.label,
        sessions: e.sessions,
        tiempo_minutos: e.tiempo_minutos,
        cantidad_preguntas: e.cantidad_preguntas,
        puntaje_aprobacion: e.puntaje_aprobacion,
        activo: e.activo,
        modo: e.modo,
        curso_id: newCurso.id,
      }))
    );
  }

  return newCurso;
}
