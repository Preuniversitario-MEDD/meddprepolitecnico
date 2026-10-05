// Test Integral: cruza cuestionario + psicometría + concentración + uso de la plataforma (actual y archivado)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AI_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const pct = { type: "integer", description: "0-100" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumen", "precisionEstimada", "dimensiones", "visible", "invisible", "estiloPensamiento", "manejoProblemas", "carreras", "comparacionHistorica", "planMejora"],
  properties: {
    resumen: { type: "string" },
    precisionEstimada: { ...pct, description: "Confianza del análisis 0-100 según cantidad de datos" },
    dimensiones: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["nombre", "visible", "invisible", "final", "evidencia"],
        properties: {
          nombre: { type: "string" },
          visible: { ...pct, description: "Lo que el estudiante declara (cuestionario)" },
          invisible: { ...pct, description: "Lo que revela su comportamiento en la plataforma" },
          final: pct,
          evidencia: { type: "string" },
        },
      },
    },
    visible: { type: "object", additionalProperties: false, required: ["fortalezas", "debilidades"], properties: { fortalezas: { type: "array", items: { type: "string" } }, debilidades: { type: "array", items: { type: "string" } } } },
    invisible: { type: "object", additionalProperties: false, required: ["fortalezasOcultas", "areasDeMejora", "contradicciones"], properties: { fortalezasOcultas: { type: "array", items: { type: "string" } }, areasDeMejora: { type: "array", items: { type: "string" } }, contradicciones: { type: "array", items: { type: "string" } } } },
    estiloPensamiento: { type: "string" },
    manejoProblemas: { type: "string" },
    carreras: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "nombre", "universidad", "porcentaje", "porque"],
        properties: { id: { type: "string" }, nombre: { type: "string" }, universidad: { type: "string" }, porcentaje: pct, porque: { type: "string" } },
      },
    },
    comparacionHistorica: { type: "string" },
    planMejora: { type: "array", items: { type: "string" } },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "No autorizado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);

    const body = await req.json().catch(() => null);
    const respuestas = body?.respuestas;
    const dimensiones = body?.dimensiones;
    const carreras = Array.isArray(body?.carreras) ? body.carreras.slice(0, 40) : [];
    if (!respuestas || typeof respuestas !== "object" || !dimensiones || typeof dimensiones !== "object") return json({ error: "Datos inválidos" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const uid = user.id;
    const q = (t: string, cols = "*", lim = 60) => admin.from(t).select(cols).eq("user_id", uid).limit(lim);
    const [psico, conc, schulte, archivo, racha, xp, progreso, examenes, estudio, focus, tareas, tutor, conex] = await Promise.all([
      q("psychometric_results", "test_key, scores, updated_at"),
      q("concentracion_sesiones", "ejercicio, duracion_segundos, precision_porcentaje, completado, fecha"),
      q("schulte_resultados", "nivel, tiempo_segundos, errores, calificacion, fecha"),
      q("tests_archivo", "origen, test_key, datos, fecha_original", 150),
      q("estudiante_rachas", "racha_actual, racha_maxima, puntos_totales, puntos_semana_actual", 1),
      q("xp_eventos", "tipo, puntos, created_at", 200),
      q("progreso_estudiante", "completada, puntaje_quiz, ejercicios_correctos, ejercicios_completados, intentos_quiz, errores_quiz, tiempo_invertido"),
      q("examenes", "tipo, puntaje, aprobado, fecha"),
      q("estudio_sesiones", "modo, tarjetas_vistas, aciertos, duracion_segundos"),
      q("productividad_focus", "minutos_planificados, minutos_completados, completada"),
      q("productividad_tareas", "prioridad, estado, fecha_limite, completada_en"),
      q("tutor_usage", "kind, created_at", 100),
      q("connection_sessions", "active_seconds, idle_seconds, background_seconds, started_at", 60),
    ]);

    // Compactar comportamiento
    const sum = (a: any[] | null, k: string) => (a || []).reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const xpPorTipo: Record<string, number> = {};
    (xp.data || []).forEach((e: any) => { xpPorTipo[e.tipo] = (xpPorTipo[e.tipo] || 0) + 1; });
    const archivoResumen = (archivo.data || []).filter((a: any) => a.origen !== "psicometrico_intento").map((a: any) => ({
      o: a.origen, t: a.test_key, f: a.fecha_original?.slice(0, 10),
      d: a.origen === "psicometrico" ? a.datos?.scores : a.datos,
    }));
    const comportamiento = {
      racha: racha.data?.[0] ?? null,
      actividadPorTipo: xpPorTipo,
      progresoSesiones: progreso.data,
      examenes: examenes.data,
      flashcards: { sesiones: estudio.data?.length || 0, vistas: sum(estudio.data, "tarjetas_vistas"), aciertos: sum(estudio.data, "aciertos") },
      pomodoro: { sesiones: focus.data?.length || 0, minPlan: sum(focus.data, "minutos_planificados"), minHechos: sum(focus.data, "minutos_completados"), completadas: (focus.data || []).filter((f: any) => f.completada).length },
      tareas: { total: tareas.data?.length || 0, hechas: (tareas.data || []).filter((t: any) => t.estado === "hecha" || t.completada_en).length },
      tutorConsultas: tutor.data?.length || 0,
      conexion: { sesiones: conex.data?.length || 0, activoMin: Math.round(sum(conex.data, "active_seconds") / 60), inactivoMin: Math.round(sum(conex.data, "idle_seconds") / 60), segundoPlanoMin: Math.round(sum(conex.data, "background_seconds") / 60) },
    };

    const sys = `Eres un psicólogo orientador vocacional ecuatoriano experto en psicometría. Analizas minuciosamente a un aspirante universitario cruzando:
1) Lo VISIBLE: lo que declara en el cuestionario integral (dimensiones 0-100).
2) Lo INVISIBLE: lo que revela su comportamiento real en la plataforma (constancia, rachas, pomodoro, errores, concentración, Schulte, uso del tutor, tiempo activo vs inactivo) y sus tests psicométricos actuales y anteriores (archivo).
Detecta contradicciones entre lo que dice y lo que hace. Sé específico, cita datos reales. Si faltan datos, baja la precisionEstimada. Responde en español con calidez.
Dimensiones obligatorias: Concentración, Constancia, Mérito/Esfuerzo, Habilidad verbal, Habilidad no verbal, Extroversión (0=introvertido,100=extrovertido), Actitud, Aptitud, Resiliencia, Manejo de problemas.
Elige 6 carreras SOLO de la lista proporcionada (usa su id exacto), ordenadas por porcentaje de ajuste. planMejora: 4-6 acciones concretas dentro de la plataforma.`;
    const userMsg = JSON.stringify({ cuestionario: dimensiones, testsActuales: psico.data, concentracion: conc.data, schulte: schulte.data, testsAnteriores: archivoResumen, comportamiento, carrerasDisponibles: carreras });

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "IA no configurada" }, 500);
    const r = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: MODEL, stream: true, store: false,
        reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
        input: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        text: { format: { type: "json_schema", name: "perfil_integral", strict: true, schema: SCHEMA } },
      }),
    });
    if (!r.ok || !r.body) {
      const t = await r.text();
      console.error("AI error", r.status, t);
      const msg = r.status === 429 ? "Demasiadas solicitudes, intenta en un momento." : r.status === 402 ? "Sin créditos de IA disponibles." : "Error del análisis IA";
      return json({ error: msg }, r.status === 429 || r.status === 402 || r.status === 403 ? r.status : 500);
    }
    // Leer SSE
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", failed = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          else if (ev.type === "response.failed" || ev.type === "error") failed = ev.response?.error?.message || ev.message || "fallo";
        } catch { /* ignore */ }
      }
    }
    if (failed || !text) { console.error("AI stream", failed); return json({ error: "El análisis no pudo completarse" }, 502); }
    const analisis = JSON.parse(text);

    const { data: saved, error } = await admin.from("perfil_integral").insert({
      user_id: uid, respuestas, dimensiones, analisis, precision_estimada: analisis.precisionEstimada,
    }).select().single();
    if (error) console.error(error);
    return json({ ok: true, registro: saved, analisis });
  } catch (e: any) {
    console.error("perfil-integral", e);
    return json({ error: e?.message || "Error" }, 500);
  }
});
