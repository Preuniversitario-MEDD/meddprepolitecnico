// ============================================================
// Psicometria.tsx — Motor completo con gráficas vistosas
// Pegar en: src/pages/Psicometria.tsx
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import {
  allTests, testsByArea, Test, InterpretResult,
} from "@/data/testData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Tipos ────────────────────────────────────────────────────
type Phase = "home" | "test" | "results";
type SessionResult = { test: Test; results: InterpretResult[]; date: string };

// ── Paleta ───────────────────────────────────────────────────
const AREA: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  personalidad:  { label:"Personalidad",          color:"#534AB7", bg:"#EEEDFE", border:"#AFA9EC", icon:"🧠" },
  vocacional:    { label:"Orientación vocacional", color:"#0F6E56", bg:"#E1F5EE", border:"#5DCAA5", icon:"🎯" },
  emocional:     { label:"Inteligencia emocional", color:"#854F0B", bg:"#FAEEDA", border:"#EF9F27", icon:"💛" },
  actitudes:     { label:"Actitudes y valores",    color:"#993C1D", bg:"#FAECE7", border:"#F0997B", icon:"💬" },
  aptitudes:     { label:"Aptitudes cognitivas",   color:"#185FA5", bg:"#E6F1FB", border:"#85B7EB", icon:"⚙️" },
  inteligencias: { label:"Inteligencias múltiples",color:"#3C3489", bg:"#EEEDFE", border:"#7F77DD", icon:"🌟" },
  aprendizaje:   { label:"Estilos de aprendizaje", color:"#27500A", bg:"#EAF3DE", border:"#97C459", icon:"📚" },
  bienestar:     { label:"Bienestar y estrés",     color:"#A32D2D", bg:"#FCEBEB", border:"#F09595", icon:"🌿" },
};

const LEVEL: Record<string, { bar: string; badge: string; text: string; label: string }> = {
  bajo:  { bar:"#E24B4A", badge:"#FCEBEB", text:"#A32D2D", label:"Bajo" },
  medio: { bar:"#EF9F27", badge:"#FAEEDA", text:"#854F0B", label:"Medio" },
  alto:  { bar:"#1D9E75", badge:"#E1F5EE", text:"#085041", label:"Alto"  },
};

// ── Scoring ──────────────────────────────────────────────────
function calcScores(test: Test, answers: Record<string,number>) {
  const s: Record<string,number> = {};
  for (const q of test.questions) {
    const raw = answers[q.id] ?? 0;
    const val = q.reversed ? 6 - raw : raw;
    s[q.category] = (s[q.category] ?? 0) + val;
  }
  return s;
}

// ══════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ══════════════════════════════════════════════════════════════

// Radar Chart (SVG)
function RadarChart({ results, color }: { results: InterpretResult[]; color: string }) {
  const n = results.length;
  if (n < 3) return null;
  const cx = 140, cy = 140, r = 100;
  const angles = results.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);
  const pts = (scale: number) =>
    angles.map((a, i) => {
      const val = (results[i].percent / 100) * scale;
      return [cx + Math.cos(a) * val, cy + Math.sin(a) * val];
    });
  const polyStr = (pts: number[][]) => pts.map(p => p.join(",")).join(" ");
  const gridLevels = [25, 50, 75, 100];

  return (
    <svg viewBox="0 0 280 280" style={{ width:"100%", maxWidth:280, display:"block", margin:"0 auto" }}>
      {gridLevels.map(g => (
        <polygon key={g} points={polyStr(pts(r * g / 100))}
          fill="none" stroke="var(--color-border-secondary)" strokeWidth="0.5" />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
          stroke="var(--color-border-secondary)" strokeWidth="0.5" />
      ))}
      <polygon points={polyStr(pts(r))}
        fill={color + "20"} stroke={color} strokeWidth="1.5"
        style={{ transition:"all 0.6s ease" }} />
      {results.map((r2, i) => {
        const [x, y] = pts(r)[i];
        return <circle key={i} cx={x} cy={y} r={4} fill={color} />;
      })}
      {results.map((r2, i) => {
        const labelR = r + 18;
        const a = angles[i];
        const lx = cx + Math.cos(a) * labelR;
        const ly = cy + Math.sin(a) * labelR;
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9" fill="var(--color-text-secondary)" fontFamily="inherit">
            {r2.label.split(" ")[0]}
          </text>
        );
      })}
    </svg>
  );
}

// Bar Chart horizontal
function BarChart({ results, color }: { results: InterpretResult[]; color: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {results.map(r => {
        const lv = LEVEL[r.level];
        return (
          <div key={r.category}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{r.label}</span>
              <span style={{ fontSize:12, fontWeight:500, color:lv.text }}>{r.percent}%</span>
            </div>
            <div style={{ background:"var(--color-border-tertiary)", borderRadius:99, height:8, overflow:"hidden" }}>
              <div style={{
                width:`${r.percent}%`, background:lv.bar, height:"100%",
                borderRadius:99, transition:"width 0.8s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Donut mini
function DonutMini({ percent, color }: { percent: number; color: string }) {
  const r = 20, c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c * 0.25}
        strokeLinecap="round"
        style={{ transition:"stroke-dasharray 0.8s ease" }} />
      <text x="26" y="27" textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="500" fill={color} fontFamily="inherit">
        {percent}
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// RESULTS SCREEN
// ══════════════════════════════════════════════════════════════
function ResultsScreen({ test, results, onRestart, onHome }: {
  test: Test; results: InterpretResult[]; onRestart: () => void; onHome: () => void;
}) {
  const meta = AREA[test.area] ?? AREA.aptitudes;
  const sorted = [...results].sort((a, b) => b.percent - a.percent);
  const top = sorted[0];
  const avg = Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length);

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"0 16px 60px" }}>

      {/* Hero resultado */}
      <div style={{
        background:`linear-gradient(135deg, ${meta.bg} 0%, ${meta.border}40 100%)`,
        border:`1px solid ${meta.border}`, borderRadius:20, padding:"28px 24px",
        marginBottom:20, textAlign:"center",
      }}>
        <div style={{ fontSize:36, marginBottom:8 }}>{meta.icon}</div>
        <div style={{ fontSize:12, color:meta.color, textTransform:"uppercase", letterSpacing:1.5, marginBottom:6, fontWeight:500 }}>
          {meta.label}
        </div>
        <div style={{ fontSize:24, fontWeight:500, color:"var(--color-text-primary)", marginBottom:4 }}>
          {test.name}
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:16 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:500, color:meta.color }}>{avg}%</div>
            <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>Promedio general</div>
          </div>
          <div style={{ width:1, background:meta.border }} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:500, color:meta.color }}>{top.label}</div>
            <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>Área más destacada</div>
          </div>
        </div>
      </div>

      {/* Radar + Barras */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20,
      }}>
        <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:16, padding:"20px 16px", background:"var(--color-background-primary)" }}>
          <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:12 }}>Perfil radial</div>
          <RadarChart results={results} color={meta.color} />
        </div>
        <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:16, padding:"20px 16px", background:"var(--color-background-primary)" }}>
          <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:12 }}>Barras de nivel</div>
          <BarChart results={results} color={meta.color} />
        </div>
      </div>

      {/* Donuts resumen */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(90px,1fr))", gap:10, marginBottom:20,
      }}>
        {results.map(r => {
          const lv = LEVEL[r.level];
          return (
            <div key={r.category} style={{
              border:"0.5px solid var(--color-border-tertiary)", borderRadius:12,
              padding:"12px 8px", textAlign:"center", background:"var(--color-background-primary)",
            }}>
              <DonutMini percent={r.percent} color={lv.bar} />
              <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-primary)", marginTop:4, lineHeight:1.3 }}>
                {r.label}
              </div>
              <span style={{ display:"inline-block", fontSize:10, background:lv.badge, color:lv.text, borderRadius:99, padding:"1px 7px", marginTop:4 }}>
                {lv.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detalle por categoría */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)", marginBottom:12 }}>Análisis detallado</div>
        {sorted.map(r => {
          const lv = LEVEL[r.level];
          return (
            <div key={r.category} style={{
              border:"0.5px solid var(--color-border-tertiary)", borderRadius:12,
              padding:"16px 18px", marginBottom:10, background:"var(--color-background-primary)",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontWeight:500, fontSize:14, color:"var(--color-text-primary)" }}>{r.label}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:500, color:meta.color }}>{r.percent}%</span>
                  <span style={{ background:lv.badge, color:lv.text, borderRadius:99, padding:"2px 10px", fontSize:11, fontWeight:500 }}>
                    {lv.label}
                  </span>
                </div>
              </div>
              <div style={{ background:"var(--color-background-secondary)", borderRadius:99, height:6, marginBottom:8, overflow:"hidden" }}>
                <div style={{ width:`${r.percent}%`, background:lv.bar, height:"100%", borderRadius:99, transition:"width 1s ease" }} />
              </div>
              <p style={{ fontSize:13, color:"var(--color-text-secondary)", margin:0, lineHeight:1.6 }}>
                {r.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Acciones */}
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onRestart} style={{
          flex:1, padding:"13px", border:`1px solid ${meta.border}`, borderRadius:10,
          background:meta.bg, color:meta.color, fontWeight:500, cursor:"pointer", fontSize:14,
        }}>
          Repetir test
        </button>
        <button onClick={onHome} style={{
          flex:1, padding:"13px", border:"0.5px solid var(--color-border-secondary)",
          borderRadius:10, background:"var(--color-background-primary)",
          color:"var(--color-text-primary)", fontWeight:500, cursor:"pointer", fontSize:14,
        }}>
          Ver todos los tests
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TEST SCREEN
// ══════════════════════════════════════════════════════════════
function TestScreen({ test, onFinish, onBack }: {
  test: Test; onFinish: (r: InterpretResult[]) => void; onBack: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string,number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const q = test.questions[current];
  const progress = Math.round(((current) / test.questions.length) * 100);
  const meta = AREA[test.area] ?? AREA.aptitudes;

  useEffect(() => {
    setSelected(answers[q.id] ?? null);
  }, [current]);

  function next() {
    if (selected === null) return;
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    if (current + 1 < test.questions.length) {
      setCurrent(c => c + 1);
      setSelected(null);
    } else {
      const scores = calcScores(test, newAnswers);
      onFinish(test.interpret(scores));
    }
  }

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"0 16px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={onBack} style={{
          background:"none", border:"0.5px solid var(--color-border-secondary)",
          borderRadius:8, padding:"7px 12px", cursor:"pointer", fontSize:13,
          color:"var(--color-text-secondary)",
        }}>← Salir</button>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:12, color:meta.color, fontWeight:500 }}>{test.shortName}</span>
            <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>
              {current + 1} / {test.questions.length}
            </span>
          </div>
          <div style={{ background:"var(--color-border-tertiary)", borderRadius:99, height:5, overflow:"hidden" }}>
            <div style={{ width:`${progress}%`, background:meta.color, height:"100%", borderRadius:99, transition:"width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Tarjeta pregunta */}
      <div style={{
        border:"0.5px solid var(--color-border-tertiary)", borderRadius:16,
        padding:"28px 24px", background:"var(--color-background-primary)", marginBottom:16,
      }}>
        <div style={{ fontSize:11, color:meta.color, textTransform:"uppercase", letterSpacing:1, marginBottom:12, fontWeight:500 }}>
          Pregunta {current + 1}
        </div>
        <p style={{ fontSize:16, fontWeight:500, color:"var(--color-text-primary)", lineHeight:1.7, margin:"0 0 24px" }}>
          {q.text}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {q.options.map(opt => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                style={{
                  textAlign:"left", padding:"13px 16px", borderRadius:10,
                  border:isSelected ? `2px solid ${meta.color}` : `1px solid var(--color-border-tertiary)`,
                  background: isSelected ? meta.bg : "var(--color-background-primary)",
                  cursor:"pointer", fontSize:14,
                  color: isSelected ? meta.color : "var(--color-text-primary)",
                  fontWeight: isSelected ? 500 : 400,
                  transition:"all 0.15s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón siguiente */}
      <button
        onClick={next}
        disabled={selected === null}
        style={{
          width:"100%", padding:"14px", borderRadius:12, border:"none",
          background: selected !== null ? meta.color : "var(--color-border-secondary)",
          color: selected !== null ? "#fff" : "var(--color-text-secondary)",
          fontWeight:500, fontSize:15, cursor: selected !== null ? "pointer" : "not-allowed",
          transition:"all 0.2s",
        }}
      >
        {current + 1 === test.questions.length ? "Ver resultados →" : "Siguiente →"}
      </button>

      {current > 0 && (
        <button onClick={() => { setCurrent(c => c - 1); }} style={{
          display:"block", margin:"12px auto 0", background:"none", border:"none",
          fontSize:13, color:"var(--color-text-secondary)", cursor:"pointer",
        }}>
          ← Pregunta anterior
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TEST CARD
// ══════════════════════════════════════════════════════════════
function TestCard({ test, onStart, completed }: { test: Test; onStart: () => void; completed?: boolean }) {
  const meta = AREA[test.area] ?? AREA.aptitudes;
  return (
    <div
      onClick={onStart}
      style={{
        border:`1px solid ${meta.border}`, borderRadius:16, padding:"20px",
        background:meta.bg, cursor:"pointer",
        transition:"transform 0.15s, box-shadow 0.15s",
        position:"relative", overflow:"hidden",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${meta.border}80`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {completed && (
        <div style={{
          position:"absolute", top:12, right:12,
          background:meta.color, color:"#fff",
          fontSize:10, fontWeight:500, borderRadius:99, padding:"2px 8px",
        }}>Completado</div>
      )}
      <div style={{ fontSize:28, marginBottom:10 }}>{meta.icon}</div>
      <div style={{ fontSize:11, color:meta.color, textTransform:"uppercase", letterSpacing:1, marginBottom:4, fontWeight:500 }}>
        {meta.label}
      </div>
      <div style={{ fontSize:16, fontWeight:500, color:"var(--color-text-primary)", marginBottom:6, lineHeight:1.3 }}>
        {test.name}
      </div>
      <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.5, marginBottom:14 }}>
        {test.description.slice(0,90)}…
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:11, color:meta.color, background:"#fff", border:`1px solid ${meta.border}`, borderRadius:99, padding:"3px 10px" }}>
          {test.questions.length} preguntas
        </span>
        <span style={{ fontSize:11, color:meta.color, background:"#fff", border:`1px solid ${meta.border}`, borderRadius:99, padding:"3px 10px" }}>
          ~{test.estimatedMinutes} min
        </span>
        <span style={{ marginLeft:"auto", fontSize:13, color:meta.color, fontWeight:500 }}>Iniciar →</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW (para admin/estudiante)
// ══════════════════════════════════════════════════════════════
function Dashboard({ sessions, onViewResult }: {
  sessions: SessionResult[]; onViewResult: (s: SessionResult) => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)", marginBottom:14 }}>
        Historial de resultados
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:10 }}>
        {sessions.map((s, i) => {
          const meta = AREA[s.test.area] ?? AREA.aptitudes;
          const avg = Math.round(s.results.reduce((a,r) => a+r.percent,0) / s.results.length);
          const top = [...s.results].sort((a,b) => b.percent-a.percent)[0];
          return (
            <div
              key={i}
              onClick={() => onViewResult(s)}
              style={{
                border:`1px solid ${meta.border}`, borderRadius:12, padding:"14px 16px",
                background:meta.bg, cursor:"pointer", transition:"transform 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "none"}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontSize:20 }}>{meta.icon}</div>
                <span style={{ fontSize:20, fontWeight:500, color:meta.color }}>{avg}%</span>
              </div>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", margin:"8px 0 2px" }}>
                {s.test.shortName}
              </div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>
                Mejor: {top.label}
              </div>
              <div style={{ background:"var(--color-border-tertiary)", borderRadius:99, height:4, marginTop:8, overflow:"hidden" }}>
                <div style={{ width:`${avg}%`, background:meta.color, height:"100%", borderRadius:99 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function Psicometria() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("home");
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [results, setResults] = useState<InterpretResult[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [activeArea, setActiveArea] = useState("all");
  const [viewingSession, setViewingSession] = useState<SessionResult | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);

  // Load saved sessions from DB
  useEffect(() => {
    if (!user) { setLoadingDb(false); return; }
    (async () => {
      const { data } = await supabase
        .from("psychometric_results")
        .select("test_key, scores, answers")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        const loaded: SessionResult[] = [];
        const testsMap = Object.fromEntries(allTests.map(t => [t.id, t]));
        for (const row of data) {
          const test = testsMap[row.test_key];
          if (!test) continue;
          const scores = row.scores as Record<string, number>;
          const interpretedResults = test.interpret(scores);
          loaded.push({ test, results: interpretedResults, date: "" });
        }
        setSessions(loaded);
      }
      setLoadingDb(false);
    })();
  }, [user]);

  const startTest = useCallback((test: Test) => {
    setActiveTest(test); setPhase("test"); setViewingSession(null);
  }, []);

  const finishTest = useCallback((r: InterpretResult[]) => {
    setResults(r); setPhase("results");
    if (activeTest) {
      const session: SessionResult = { test: activeTest, results: r, date: new Date().toLocaleDateString("es") };
      setSessions(prev => {
        const filtered = prev.filter(s => s.test.id !== activeTest.id);
        return [session, ...filtered];
      });
      // Save to DB
      if (user) {
        const scores: Record<string, number> = {};
        r.forEach(res => { scores[res.category] = res.score; });
        supabase.from("psychometric_results").upsert({
          user_id: user.id,
          test_key: activeTest.id,
          scores,
          answers: {},
        }, { onConflict: "user_id,test_key" }).then(() => {});
      }
    }
  }, [activeTest, user]);

  const goHome = useCallback(() => {
    setPhase("home"); setActiveTest(null); setResults([]); setViewingSession(null);
  }, []);

  // Ver sesión guardada
  if (viewingSession) {
    return (
      <div style={{ minHeight:"100vh", padding:"32px 16px 60px" }}>
        <button onClick={() => setViewingSession(null)} style={{
          display:"block", margin:"0 auto 24px", background:"none",
          border:"0.5px solid var(--color-border-secondary)", borderRadius:8,
          padding:"7px 14px", cursor:"pointer", fontSize:13, color:"var(--color-text-secondary)",
        }}>← Volver al inicio</button>
        <ResultsScreen
          test={viewingSession.test} results={viewingSession.results}
          onRestart={() => startTest(viewingSession.test)}
          onHome={() => setViewingSession(null)}
        />
      </div>
    );
  }

  if (phase === "test" && activeTest) {
    return (
      <div style={{ minHeight:"100vh", padding:"32px 16px 60px" }}>
        <TestScreen test={activeTest} onFinish={finishTest} onBack={goHome} />
      </div>
    );
  }

  if (phase === "results" && activeTest) {
    return (
      <div style={{ minHeight:"100vh", padding:"32px 16px 60px" }}>
        <ResultsScreen
          test={activeTest} results={results}
          onRestart={() => startTest(activeTest)} onHome={goHome}
        />
      </div>
    );
  }

  // HOME
  const areas = ["all", ...Object.keys(AREA)];
  const filtered = activeArea === "all" ? allTests : allTests.filter(t => t.area === activeArea);
  const completedIds = new Set(sessions.map(s => s.test.id));
  const totalQ = allTests.reduce((a,t) => a+t.questions.length, 0);

  return (
    <div style={{ minHeight:"100vh", padding:"32px 16px 80px" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:30, fontWeight:500, margin:"0 0 8px", color:"var(--color-text-primary)" }}>
            Psicometría
          </h1>
          <p style={{ fontSize:15, color:"var(--color-text-secondary)", margin:0, lineHeight:1.7, maxWidth:560 }}>
            Descubre tu perfil completo: personalidad, inteligencias, aptitudes, valores, estilo de aprendizaje y bienestar académico.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:28 }}>
          {[
            { label:"Tests", value:allTests.length },
            { label:"Preguntas", value:totalQ },
            { label:"Áreas", value:Object.keys(AREA).length },
            { label:"Completados", value:sessions.length },
          ].map(s => (
            <div key={s.label} style={{
              background:"var(--color-background-secondary)", borderRadius:12,
              padding:"14px 16px", border:"0.5px solid var(--color-border-tertiary)",
              textAlign:"center",
            }}>
              <div style={{ fontSize:24, fontWeight:500, color:"var(--color-text-primary)" }}>{s.value}</div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard historial */}
        <Dashboard sessions={sessions} onViewResult={(s) => setViewingSession(s)} />

        {/* Filtros */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {areas.map(area => {
            const meta = area === "all" ? null : AREA[area];
            const isActive = activeArea === area;
            return (
              <button key={area} onClick={() => setActiveArea(area)} style={{
                padding:"7px 14px", borderRadius:99, fontSize:13, cursor:"pointer",
                fontWeight: isActive ? 500 : 400,
                background: isActive ? (meta?.color ?? "var(--color-text-primary)") : "var(--color-background-secondary)",
                color: isActive ? "#fff" : "var(--color-text-secondary)",
                border:"none", transition:"all 0.15s",
              }}>
                {area === "all" ? `Todos (${allTests.length})` : `${meta?.icon} ${meta?.label}`}
              </button>
            );
          })}
        </div>

        {/* Grid de tests */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px,1fr))", gap:14 }}>
          {filtered.map(test => (
            <TestCard
              key={test.id} test={test}
              onStart={() => startTest(test)}
              completed={completedIds.has(test.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
