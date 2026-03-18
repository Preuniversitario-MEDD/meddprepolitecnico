import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionTitle, sessionNumber, quantity, difficulty, existingQuestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = quantity || 10;
    const diffLevel = difficulty || 'mixto';
    
    const difficultyInstructions: Record<string, string> = {
      basico: `TODAS las preguntas deben ser de nivel BÁSICO: directas, de memorización, definiciones claras, identificación simple. No requieren cálculos complejos ni análisis profundo.`,
      medio: `TODAS las preguntas deben ser de nivel MEDIO: requieren comprensión de conceptos, aplicación de fórmulas sencillas, relaciones entre conceptos. El estudiante necesita cierto grado de conocimiento previo.`,
      dificil: `TODAS las preguntas deben ser de nivel DIFÍCIL/UNIVERSITARIO: problemas multi-paso, análisis y síntesis, cálculos complejos, comparación avanzada de conceptos, casos de estudio. Nivel de complejidad de examen universitario ESPOL.`,
      mixto: `Distribuye las preguntas así: 30% nivel BÁSICO (directas, memorización), 30% nivel MEDIO (comprensión, aplicación), 40% nivel DIFÍCIL (análisis, síntesis, problemas complejos universitarios). Esta distribución busca un desarrollo cognitivo progresivo.`,
    };
    
    const diffInstruction = difficultyInstructions[diffLevel] || difficultyInstructions.mixto;
    const existingContext = existingQuestions?.length
      ? `\n\nYa existen estas preguntas en el banco, NO las repitas:\n${existingQuestions.map((q: string) => `- ${q}`).join('\n')}`
      : '';

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
            content: `Eres un profesor experto en Química para preparación universitaria ESPOL (Ecuador).
Genera preguntas de opción múltiple de nivel universitario sobre el tema indicado.

${diffInstruction}

Cada pregunta DEBE tener exactamente 4 opciones (A, B, C, D) y una sola respuesta correcta.
Las preguntas deben ser variadas: conceptuales, cálculos, identificación, aplicación.
Los distractores deben ser plausibles pero claramente incorrectos.

Responde SIEMPRE con un JSON array exacto:
[
  {
    "pregunta": "Texto de la pregunta",
    "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "respuesta_correcta": 0
  }
]

Donde respuesta_correcta es el índice (0-3) de la opción correcta.
No incluyas nada más fuera del JSON array.${existingContext}`
          },
          {
            role: "user",
            content: `Genera ${count} preguntas de química sobre: Sesión ${sessionNumber} - ${sessionTitle}`
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
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos en Configuración > Workspace > Uso." }), {
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

    let questions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      questions = [];
    }

    // Validate structure
    const valid = questions.filter((q: any) =>
      q.pregunta && Array.isArray(q.opciones) && q.opciones.length >= 2 &&
      typeof q.respuesta_correcta === 'number' && q.respuesta_correcta >= 0 && q.respuesta_correcta < q.opciones.length
    );

    return new Response(JSON.stringify({ questions: valid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
