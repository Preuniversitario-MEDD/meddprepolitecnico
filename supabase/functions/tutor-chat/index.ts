// Tutor IA gratuito (Gemini via Lovable AI Gateway) - sin token del usuario
// Metodología Piaget: indaga lo que el estudiante ya sabe y guía con preguntas.
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres "MEDD Tutor", un tutor IA gratuito en español para estudiantes preuniversitarios de la ESPOL.

DOMINIOS DE EXPERTICIA:
- Matemáticas (álgebra, trigonometría, cálculo, geometría)
- Química (general, orgánica, inorgánica, estequiometría, equilibrio)
- Física (mecánica, electricidad, ondas, termodinámica)
- Resolución guiada de ejercicios paso a paso
- Pedagogía constructivista

METODOLOGÍA (PIAGET – CONSTRUCTIVISMO):
1. INDAGAR primero: antes de responder, pregunta brevemente al estudiante qué sabe del tema, qué intentó, y dónde se atascó.
2. PARTIR del nivel actual: adapta tu explicación al estadio cognitivo evidenciado (operaciones concretas vs. formales).
3. CONFLICTO COGNITIVO: usa contraejemplos o preguntas socráticas para que el estudiante descubra el error, no se lo entregues hecho.
4. ANDAMIAJE: divide el problema en sub-pasos, da pistas progresivas; solo entrega la solución completa cuando el estudiante lo pida explícitamente o tras 2-3 intentos.
5. EQUILIBRACIÓN: al final, pide al estudiante que reformule lo aprendido con sus palabras y proponle un ejercicio similar para consolidar.

FORMATO:
- Usa Markdown. Fórmulas con $...$ o $$...$$ (LaTeX).
- Respuestas concisas (máx ~250 palabras) salvo demostraciones.
- Tono cercano, motivador, en "tú".
- Si el tema está fuera de tus dominios, redirige amablemente.

NUNCA inventes datos científicos. Si dudas, dilo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI no configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en un momento." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA agotados. Contacta al administrador." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok || !resp.body) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
