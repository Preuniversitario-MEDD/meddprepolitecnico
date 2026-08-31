import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, requireUser } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const tema = typeof body.tema === "string" ? body.tema.slice(0, 300) : "";
    const contexto = typeof body.contexto === "string" ? body.contexto.slice(0, 6000) : "";
    const cantidad = Math.min(Math.max(parseInt(body.cantidad ?? 12, 10) || 12, 4), 30);
    const nivel = ["basico", "medio", "avanzado"].includes(body.nivel) ? body.nivel : "medio";

    if (!tema.trim() && !contexto.trim()) {
      return jsonResponse({ error: "Indica un tema para generar las tarjetas." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI no configurada" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              `Eres MR. VICTOR, tutor experto en química, física, matemáticas y biología para estudiantes preuniversitarios en Ecuador. ` +
              `Creas tarjetas de estudio (flashcards) de altísima calidad pedagógica. Reglas: ` +
              `1) El FRENTE es una pregunta corta, concreta y evaluable (no "¿qué es X?" repetido). ` +
              `2) El REVERSO es la respuesta precisa en 1-3 líneas, con la fórmula o dato clave. ` +
              `3) La PISTA es una ayuda breve que no revela la respuesta. ` +
              `4) Usa LaTeX entre $...$ solo para fórmulas. 5) Español neutro. 6) Nivel: ${nivel}. ` +
              `Responde SOLO con la herramienta.`,
          },
          {
            role: "user",
            content: `Genera ${cantidad} tarjetas sobre: ${tema || "el material proporcionado"}.` +
              (contexto ? `\n\nMaterial base:\n---\n${contexto}\n---` : ""),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "crear_tarjetas",
              description: "Devuelve el set de tarjetas de estudio",
              parameters: {
                type: "object",
                properties: {
                  tarjetas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        frente: { type: "string" },
                        reverso: { type: "string" },
                        pista: { type: "string" },
                      },
                      required: ["frente", "reverso"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tarjetas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "crear_tarjetas" } },
      }),
    });

    if (res.status === 429) return jsonResponse({ error: "Demasiadas solicitudes, intenta en un momento." }, 429);
    if (res.status === 402) return jsonResponse({ error: "Créditos de IA agotados." }, 402);
    if (!res.ok) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      return jsonResponse({ error: "No se pudo generar las tarjetas." }, 500);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = call ? JSON.parse(call.function.arguments) : { tarjetas: [] };
    const tarjetas = (parsed.tarjetas || [])
      .filter((t: any) => t?.frente && t?.reverso)
      .slice(0, cantidad)
      .map((t: any) => ({
        frente: String(t.frente).slice(0, 500),
        reverso: String(t.reverso).slice(0, 800),
        pista: t.pista ? String(t.pista).slice(0, 300) : null,
      }));

    return jsonResponse({ tarjetas });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
