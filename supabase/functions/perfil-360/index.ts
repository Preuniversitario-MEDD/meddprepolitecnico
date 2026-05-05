// Edge function: Perfil 360 — análisis personalizado con IA (Lovable AI)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

interface AnalisisCarreraReq {
  tipo: "carrera";
  carrera: any;
  perfil: any;
  perfilHash: string;
  concentracion?: any;
  schulte?: any;
}
interface AnalisisCompReq {
  tipo: "comparacion";
  carreraA: any;
  carreraB: any;
  perfil: any;
  perfilHash: string;
}

async function callAI(messages: any[], schemaName: string, schema: any) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY no configurado");
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [{ type: "function", function: { name: schemaName, description: "Devuelve análisis estructurado", parameters: schema } }],
      tool_choice: { type: "function", function: { name: schemaName } },
    }),
  });
  if (r.status === 429) throw new Error("RATE_LIMIT");
  if (r.status === 402) throw new Error("PAYMENT_REQUIRED");
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Sin respuesta estructurada");
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "No user" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json() as AnalisisCarreraReq | AnalisisCompReq;

    // Cache lookup
    const cacheKey = body.tipo === "carrera"
      ? `c:${body.carrera.id}`
      : `cmp:${[body.carreraA.id, body.carreraB.id].sort().join("|")}`;

    const { data: cached } = await supa
      .from("perfil_360_cache")
      .select("payload, perfil_hash")
      .eq("user_id", user.id).eq("tipo", body.tipo).eq("cache_key", cacheKey)
      .maybeSingle();
    if (cached && cached.perfil_hash === body.perfilHash) {
      return new Response(JSON.stringify({ cached: true, ...cached.payload }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any;

    if (body.tipo === "carrera") {
      const sys = "Eres un orientador vocacional ecuatoriano experto. Analiza al estudiante con base en sus tests psicométricos, datos de concentración (Schulte) y la carrera. Responde en español, tono cálido y específico (NUNCA genérico). Cita números reales del perfil del estudiante para justificar.";
      const user_msg = `PERFIL DEL ESTUDIANTE:
- Empatía: ${body.perfil.empatia}/100
- Inteligencia emocional: ${body.perfil.inteligenciaEmocional}/100
- Conducta prosocial: ${body.perfil.prosocial}/100
- Habilidades sociales: ${body.perfil.habilidadesSociales}/100
- Estilos de aprendizaje dominantes: ${body.perfil.estilosDominantes?.join(", ")}
${body.concentracion ? `- Concentración (sesiones promedio): ${JSON.stringify(body.concentracion)}` : ""}
${body.schulte ? `- Schulte (mejor nivel/tiempo): ${JSON.stringify(body.schulte)}` : ""}

CARRERA EVALUADA: ${body.carrera.nombre} en ${body.carrera.universidad} (${body.carrera.siglaUniversidad})
- Facultad: ${body.carrera.facultad}
- Descripción: ${body.carrera.descripcion}
- Campo laboral: ${body.carrera.campoLaboral?.join(", ")}
- Materias clave: ${body.carrera.materiasClaveExamen?.join(", ")}
- Duración: ${body.carrera.duracion} semestres · Demanda: ${body.carrera.demandaLaboral} · Salario inicial: $${body.carrera.salarioPromedioEcuador}
- Perfil ideal: empatía ${body.carrera.perfilIdeal?.empatia}, IE ${body.carrera.perfilIdeal?.inteligenciaEmocional}, prosocial ${body.carrera.perfilIdeal?.prosocial}, social ${body.carrera.perfilIdeal?.habilidadesSociales}

Genera el análisis completo y personalizado.`;

      const schema = {
        type: "object",
        properties: {
          porqueEsParaTi: { type: "string", description: "150-220 palabras explicando por qué esta carrera encaja con ESTE estudiante (cita sus números). Sin frases genéricas." },
          fortalezasAlineadas: { type: "array", items: { type: "string" }, description: "3-5 fortalezas del estudiante que lo benefician en esta carrera, citando datos." },
          desafiosPersonales: { type: "array", items: { type: "string" }, description: "2-4 desafíos específicos para ESTE perfil." },
          encajeUniversidad: { type: "string", description: "60-100 palabras: por qué esta universidad concreta es buena opción para él/ella (modalidad, ciudad, costo)." },
          recomendacionesPracticas: { type: "array", items: { type: "string" }, description: "3-5 acciones concretas inmediatas." },
        },
        required: ["porqueEsParaTi", "fortalezasAlineadas", "desafiosPersonales", "encajeUniversidad", "recomendacionesPracticas"],
        additionalProperties: false,
      };
      result = await callAI([{ role: "system", content: sys }, { role: "user", content: user_msg }], "analisis_carrera", schema);
    } else {
      const sys = "Eres un orientador vocacional ecuatoriano. Compara DOS carreras para un estudiante específico. Responde en español, sé concreto, sin genericidades. Cita siempre datos del perfil para justificar.";
      const fmt = (c: any) => `${c.nombre} (${c.siglaUniversidad}) — ${c.facultad}. Duración ${c.duracion} sem · Demanda ${c.demandaLaboral} · Salario inicial $${c.salarioPromedioEcuador} · Modalidad ${c.modalidad?.join("/")} · Ciudad ${c.ciudad?.join("/")}. Campo: ${c.campoLaboral?.join(", ")}.`;
      const user_msg = `PERFIL: empatía ${body.perfil.empatia}, IE ${body.perfil.inteligenciaEmocional}, prosocial ${body.perfil.prosocial}, social ${body.perfil.habilidadesSociales}, estilos ${body.perfil.estilosDominantes?.join(",")}.

CARRERA A: ${fmt(body.carreraA)}
CARRERA B: ${fmt(body.carreraB)}

Compara para ESTE estudiante: pros y contras de cada una y de su universidad. Da un veredicto.`;

      const schema = {
        type: "object",
        properties: {
          resumen: { type: "string", description: "60-100 palabras de contexto." },
          carreraA: {
            type: "object",
            properties: {
              pros: { type: "array", items: { type: "string" }, description: "3-4 pros para ESTE estudiante." },
              contras: { type: "array", items: { type: "string" }, description: "2-3 contras." },
              universidad: { type: "string", description: "Pros/contras de su universidad para él/ella, 30-60 palabras." },
            }, required: ["pros", "contras", "universidad"], additionalProperties: false,
          },
          carreraB: {
            type: "object",
            properties: {
              pros: { type: "array", items: { type: "string" } },
              contras: { type: "array", items: { type: "string" } },
              universidad: { type: "string" },
            }, required: ["pros", "contras", "universidad"], additionalProperties: false,
          },
          veredicto: { type: "string", description: "80-130 palabras: cuál se inclina más a este perfil y por qué, con datos. Sin frases hechas." },
        },
        required: ["resumen", "carreraA", "carreraB", "veredicto"],
        additionalProperties: false,
      };
      result = await callAI([{ role: "system", content: sys }, { role: "user", content: user_msg }], "comparacion_carreras", schema);
    }

    // Guardar cache
    await supa.from("perfil_360_cache").upsert({
      user_id: user.id, tipo: body.tipo, cache_key: cacheKey,
      payload: result, perfil_hash: body.perfilHash,
    }, { onConflict: "user_id,tipo,cache_key" });

    return new Response(JSON.stringify({ cached: false, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e?.message || "Error";
    const status = msg === "RATE_LIMIT" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
    console.error("perfil-360 error:", e);
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
