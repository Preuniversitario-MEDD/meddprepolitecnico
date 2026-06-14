import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await requireAdmin(req);
    if ("error" in authResult) return authResult.error;

    const { questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = questions.map((q: any, i: number) => {
      const opts = (q.opciones as string[]).map((o: string, j: number) => `${String.fromCharCode(65 + j)}) ${o}`).join(', ');
      return `${i + 1}. "${q.pregunta}" Opciones: ${opts}`;
    }).join('\n');

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
            content: "Eres un experto en Química para preparación universitaria ESPOL. Tu tarea es asignar un nivel de dificultad del 1 al 5 a cada pregunta de opción múltiple. 1=muy fácil (memorización directa), 2=fácil (comprensión básica), 3=media (aplicación de conceptos), 4=difícil (análisis/síntesis), 5=muy difícil (problemas complejos multi-paso). Responde SOLO un JSON array con los niveles en el mismo orden de las preguntas. Ejemplo: [2,3,1,5,4,2]"
          },
          {
            role: "user",
            content: `Asigna dificultad (1-5) a estas preguntas:\n\n${prompt}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract the JSON array from the response
    const match = content.match(/\[[\d,\s]+\]/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Could not parse AI response", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const levels: number[] = JSON.parse(match[0]).map((n: number) => Math.max(1, Math.min(5, n)));

    return new Response(JSON.stringify({ levels }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assign-difficulty error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
