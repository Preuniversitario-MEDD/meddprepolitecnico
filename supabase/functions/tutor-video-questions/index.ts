// Genera preguntas con timestamps y segmento de respuesta a partir de un link de YouTube.
// El front pausa el video en cada timestamp. Si el estudiante responde correctamente,
// el video continúa automáticamente. Si responde mal, vuelve a "segment_start_seconds".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => ["embed", "shorts", "v"].includes(p));
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch { return null; }
}

const SYSTEM = `Eres MR. VICTOR, tutor académico. Generas preguntas de comprensión para un video educativo.
Devuelves SOLO JSON válido con esta forma:
{"questions":[{"timestamp_seconds":number,"segment_start_seconds":number,"question":"...","options":["a","b","c","d"],"correct_index":0,"explanation":"..."}]}
Reglas:
- Entre 4 y 8 preguntas distribuidas en el rango de duración indicado.
- timestamp_seconds: entero > 30 y < (duración - 10). Punto donde se pausa el video para preguntar.
- segment_start_seconds: entero >= 0 y < timestamp_seconds. Es el inicio del segmento del video donde se explica la respuesta (típicamente 15-45 segundos antes del timestamp). Se usa para re-reproducir si el estudiante falla.
- options: 4 opciones plausibles.
- correct_index: 0..3.
- explanation: 1-2 frases con la justificación.
- Idioma: español. Nivel preuniversitario. Sin contenido sensible.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;

    const { video_url, topic, duration_seconds } = await req.json();
    if (!video_url || typeof video_url !== "string") {
      return new Response(JSON.stringify({ error: "video_url requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const videoId = extractYouTubeId(video_url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "URL de YouTube inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dur = Math.max(60, Math.min(7200, Number(duration_seconds) || 600));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI no configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Video: ${video_url}\nTema/contexto: ${topic || "(no especificado)"}\nDuración: ${dur} segundos.\nGenera preguntas de comprensión distribuidas en el tiempo, con segment_start_seconds 15-45s antes de cada timestamp.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429 || resp.status === 402) {
      return new Response(JSON.stringify({ error: resp.status === 429 ? "Saturado, reintenta." : "Créditos IA agotados." }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI error: ${t.slice(0,200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { questions: [] }; }
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q: any) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4)
          .map((q: any) => {
            const ts = Math.max(10, Math.min(dur - 5, Math.floor(Number(q.timestamp_seconds) || 30)));
            const segRaw = Number(q.segment_start_seconds);
            const seg = Number.isFinite(segRaw)
              ? Math.max(0, Math.min(ts - 5, Math.floor(segRaw)))
              : Math.max(0, ts - 25);
            return {
              timestamp_seconds: ts,
              segment_start_seconds: seg,
              question: String(q.question).slice(0, 500),
              options: q.options.slice(0, 4).map((o: any) => String(o).slice(0, 200)),
              correct_index: Math.max(0, Math.min(3, Number(q.correct_index) || 0)),
              explanation: String(q.explanation || "").slice(0, 600),
            };
          })
          .sort((a: any, b: any) => a.timestamp_seconds - b.timestamp_seconds)
      : [];

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: saved } = await service.from("tutor_video_sessions").insert({
      user_id: auth.user.id,
      video_url, video_id: videoId,
      topic: topic || null,
      questions,
    }).select("id").single();

    return new Response(JSON.stringify({ id: saved?.id, video_id: videoId, questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
