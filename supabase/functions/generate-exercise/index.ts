import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionTitle, sessionNumber } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            content: `Eres un profesor experto en Química para preparación universitaria ESPOL. 
Genera UN ejercicio de química del tema indicado. El ejercicio debe ser de nivel universitario, claro y con datos numéricos concretos.

Responde SIEMPRE en este formato JSON exacto:
{
  "titulo": "Título corto del ejercicio",
  "enunciado": "El enunciado completo del ejercicio con datos y lo que se pide calcular",
  "solucion": "La solución paso a paso detallada con cálculos"
}

No incluyas nada más, solo el JSON.`
          },
          {
            role: "user",
            content: `Genera un ejercicio de química sobre el tema: Sesión ${sessionNumber} - ${sessionTitle}`
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
    
    // Parse JSON from the response
    let exercise;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      exercise = jsonMatch ? JSON.parse(jsonMatch[0]) : { titulo: "Ejercicio", enunciado: content, solucion: "Ver solución con tu profesor" };
    } catch {
      exercise = { titulo: "Ejercicio generado", enunciado: content, solucion: "Ver solución con tu profesor" };
    }

    return new Response(JSON.stringify(exercise), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exercise error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
