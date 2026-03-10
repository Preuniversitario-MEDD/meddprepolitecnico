import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No se enviaron preguntas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionsText = questions.map((q: any, i: number) => {
      const opts = q.opciones.map((o: string, j: number) => `  ${String.fromCharCode(65 + j)}) ${o}`).join('\n');
      const correct = String.fromCharCode(65 + q.respuesta_correcta);
      return `${i + 1}. ${q.pregunta}\n${opts}\n  Respuesta correcta: ${correct}`;
    }).join('\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Eres un experto en diseño de exámenes de Química para preparación universitaria ESPOL (Ecuador).
Evalúa cada pregunta en estas dimensiones usando una escala: "excelente", "buena", "mejorable", "problematica".

Para cada pregunta evalúa:
1. **claridad**: ¿La pregunta es clara, sin ambigüedades?
2. **correccion**: ¿La respuesta marcada como correcta es realmente correcta?
3. **distractores**: ¿Los distractores son plausibles pero distinguibles de la correcta?
4. **nivel**: ¿Es apropiada para nivel pre-universitario ESPOL?

Si la respuesta correcta está MAL, indica cuál debería ser la correcta (índice 0-based).
Si la pregunta tiene problemas de claridad, distractores o nivel, sugiere una versión mejorada completa de la pregunta con sus opciones.

Responde SIEMPRE con un JSON array exacto:
[
  {
    "index": 0,
    "claridad": "excelente|buena|mejorable|problematica",
    "correccion": "excelente|buena|mejorable|problematica",
    "distractores": "excelente|buena|mejorable|problematica",
    "nivel": "excelente|buena|mejorable|problematica",
    "comentario": "Breve explicación de problemas encontrados o confirmación de calidad",
    "correccion_sugerida": null,
    "respuesta_correcta_sugerida": null,
    "pregunta_mejorada": null,
    "opciones_mejoradas": null
  }
]

Reglas:
- Si correccion es "problematica", incluye respuesta_correcta_sugerida (índice 0-based) y correccion_sugerida (texto explicativo).
- Si claridad, distractores o nivel es "mejorable" o "problematica", incluye pregunta_mejorada (string con la pregunta mejorada) y opciones_mejoradas (array de strings con las opciones mejoradas, manteniendo la misma cantidad de opciones). También incluye respuesta_correcta_sugerida con el índice 0-based de la respuesta correcta en las opciones mejoradas.
- No incluyas nada más fuera del JSON array.`
          },
          {
            role: "user",
            content: `Evalúa estas ${questions.length} preguntas de quiz:\n\n${questionsText}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta más tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let reviews;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      reviews = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      reviews = [];
    }

    return new Response(JSON.stringify({ reviews }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review-quiz-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
