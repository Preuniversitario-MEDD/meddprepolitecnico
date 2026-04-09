// ============================================================
// Psicometria.tsx — Motor completo con estética neón/pastel
// ============================================================

import { useState, useCallback, useEffect } from "react";
import {
  allTests, testsByArea, Test, InterpretResult,
} from "@/data/testData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Tipos ────────────────────────────────────────────────────
type Phase = "home" | "test" | "results";
type SessionResult = { test: Test; results: InterpretResult[]; date: string };

// ── Paleta neón/pastel ──────────────────────────────────────
const AREA: Record<string, { label: string; color: string; glow: string; bg: string; border: string; icon: string }> = {
  personalidad:  { label:"Personalidad",          color:"#a78bfa", glow:"#a78bfa60", bg:"#1e1b4b",  border:"#7c3aed50", icon:"🧠" },
  vocacional:    { label:"Orientación vocacional", color:"#34d399", glow:"#34d39960", bg:"#064e3b",  border:"#10b98150", icon:"🎯" },
  emocional:     { label:"Inteligencia emocional", color:"#fbbf24", glow:"#fbbf2460", bg:"#451a03",  border:"#f59e0b50", icon:"💛" },
  actitudes:     { label:"Actitudes y valores",    color:"#fb923c", glow:"#fb923c60", bg:"#431407",  border:"#f9731650", icon:"💬" },
  aptitudes:     { label:"Aptitudes cognitivas",   color:"#38bdf8", glow:"#38bdf860", bg:"#0c4a6e",  border:"#0ea5e950", icon:"⚙️" },
  inteligencias: { label:"Inteligencias múltiples",color:"#818cf8", glow:"#818cf860", bg:"#1e1b4b",  border:"#6366f150", icon:"🌟" },
  aprendizaje:   { label:"Estilos de aprendizaje", color:"#4ade80", glow:"#4ade8060", bg:"#052e16",  border:"#22c55e50", icon:"📚" },
  bienestar:     { label:"Bienestar y estrés",     color:"#f472b6", glow:"#f472b660", bg:"#500724",  border:"#ec489950", icon:"🌿" },
};

const LEVEL: Record<string, { bar: string; glow: string; badge: string; text: string; label: string }> = {
  bajo:  { bar:"#f87171", glow:"#f8717140", badge:"rgba(248,113,113,0.15)", text:"#fca5a5", label:"Bajo" },
  medio: { bar:"#fbbf24", glow:"#fbbf2440", badge:"rgba(251,191,36,0.15)", text:"#fde68a", label:"Medio" },
  alto:  { bar:"#34d399", glow:"#34d39940", badge:"rgba(52,211,153,0.15)", text:"#6ee7b7", label:"Alto"  },
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

// ── Shared styles ───────────────────────────────────────────
const cardBase: React.CSSProperties = {
  borderRadius: 16, backdropFilter: "blur(12px)",
  background: "rgba(15,15,30,0.7)", border: "1px solid rgba(255,255,255,0.08)",
};

// ══════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ══════════════════════════════════════════════════════════════

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
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
          stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      <polygon points={polyStr(pts(r))}
        fill={color + "25"} stroke={color} strokeWidth="2"
        style={{ transition: "all 0.6s ease", filter: `drop-shadow(0 0 6px ${color}60)` }} />
      {results.map((_, i) => {
        const [x, y] = pts(r)[i];
        return <circle key={i} cx={x} cy={y} r={4} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />;
      })}
      {results.map((r2, i) => {
        const labelR = r + 18;
        const a = angles[i];
        const lx = cx + Math.cos(a) * labelR;
        const ly = cy + Math.sin(a) * labelR;
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9" fill="rgba(255,255,255,0.6)" fontFamily="inherit">
            {r2.label.split(" ")[0]}
          </text>
        );
      })}
    </svg>
  );
}

function BarChartComp({ results }: { results: InterpretResult[] }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {results.map(r => {
        const lv = LEVEL[r.level];
        return (
          <div key={r.category}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>{r.label}</span>
              <span style={{ fontSize:12, fontWeight:600, color:lv.text }}>{r.percent}%</span>
            </div>
            <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:99, height:8, overflow:"hidden" }}>
              <div style={{
                width:`${r.percent}%`, background:`linear-gradient(90deg, ${lv.bar}, ${lv.bar}cc)`,
                height:"100%", borderRadius:99, transition:"width 0.8s ease",
                boxShadow:`0 0 10px ${lv.glow}`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutMini({ percent, color }: { percent: number; color: string }) {
  const r = 20, c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c * 0.25}
        strokeLinecap="round"
        style={{ transition:"stroke-dasharray 0.8s ease", filter:`drop-shadow(0 0 4px ${color}80)` }} />
      <text x="26" y="27" textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="600" fill={color} fontFamily="inherit">
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
    <div style={{ maxWidth:680, margin:"0 auto", padding:"0 12px 60px" }}>
      {/* Hero resultado */}
      <div style={{
        background: `linear-gradient(135deg, ${meta.bg} 0%, rgba(15,15,30,0.9) 100%)`,
        border:`1px solid ${meta.border}`, borderRadius:20, padding:"24px 20px",
        marginBottom:20, textAlign:"center",
        boxShadow:`0 0 40px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
        <div style={{ fontSize:36, marginBottom:8 }}>{meta.icon}</div>
        <div style={{ fontSize:11, color:meta.color, textTransform:"uppercase", letterSpacing:2, marginBottom:6, fontWeight:600 }}>
          {meta.label}
        </div>
        <div style={{ fontSize:22, fontWeight:600, color:"#fff", marginBottom:4 }}>
          {test.name}
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:16, flexWrap:"wrap" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:700, color:meta.color, textShadow:`0 0 20px ${meta.glow}` }}>{avg}%</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Promedio general</div>
          </div>
          <div style={{ width:1, background:"rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:600, color:meta.color }}>{top.label}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Área más destacada</div>
          </div>
        </div>
      </div>

      {/* Radar + Barras — stack on mobile */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:14, marginBottom:20,
      }}>
        <div style={{ ...cardBase, padding:"18px 14px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:12 }}>Perfil radial</div>
          <RadarChart results={results} color={meta.color} />
        </div>
        <div style={{ ...cardBase, padding:"18px 14px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:12 }}>Barras de nivel</div>
          <BarChartComp results={results} />
        </div>
      </div>

      {/* Donuts resumen */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(80px,1fr))", gap:8, marginBottom:20,
      }}>
        {results.map(r => {
          const lv = LEVEL[r.level];
          return (
            <div key={r.category} style={{
              ...cardBase, padding:"10px 6px", textAlign:"center",
            }}>
              <DonutMini percent={r.percent} color={lv.bar} />
              <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.8)", marginTop:4, lineHeight:1.2 }}>
                {r.label}
              </div>
              <span style={{ display:"inline-block", fontSize:9, background:lv.badge, color:lv.text, borderRadius:99, padding:"2px 7px", marginTop:3, fontWeight:600 }}>
                {lv.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Detalle por categoría */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:600, color:"#fff", marginBottom:12 }}>Análisis detallado</div>
        {sorted.map(r => {
          const lv = LEVEL[r.level];
          return (
            <div key={r.category} style={{
              ...cardBase, padding:"14px 16px", marginBottom:10,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
                <span style={{ fontWeight:600, fontSize:14, color:"#fff" }}>{r.label}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:meta.color, textShadow:`0 0 8px ${meta.glow}` }}>{r.percent}%</span>
                  <span style={{ background:lv.badge, color:lv.text, borderRadius:99, padding:"2px 10px", fontSize:10, fontWeight:600 }}>
                    {lv.label}
                  </span>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:99, height:6, marginBottom:8, overflow:"hidden" }}>
                <div style={{ width:`${r.percent}%`, background:`linear-gradient(90deg, ${lv.bar}, ${lv.bar}aa)`, height:"100%", borderRadius:99, transition:"width 1s ease", boxShadow:`0 0 8px ${lv.glow}` }} />
              </div>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", margin:0, lineHeight:1.6 }}>
                {r.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Acciones */}
      <div style={{ display:"flex", gap:10, flexDirection:"row", flexWrap:"wrap" }}>
        <button onClick={onRestart} style={{
          flex:1, minWidth:140, padding:"13px", border:`1px solid ${meta.color}40`, borderRadius:12,
          background:`${meta.color}15`, color:meta.color, fontWeight:600, cursor:"pointer", fontSize:14,
          boxShadow:`0 0 20px ${meta.glow}`,
        }}>
          Repetir test
        </button>
        <button onClick={onHome} style={{
          flex:1, minWidth:140, padding:"13px", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:12, background:"rgba(255,255,255,0.05)",
          color:"rgba(255,255,255,0.7)", fontWeight:600, cursor:"pointer", fontSize:14,
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
    <div style={{ maxWidth:600, margin:"0 auto", padding:"0 12px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={onBack} style={{
          background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:10, padding:"8px 14px", cursor:"pointer", fontSize:13,
          color:"rgba(255,255,255,0.6)",
        }}>← Salir</button>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:12, color:meta.color, fontWeight:600 }}>{test.shortName}</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>
              {current + 1} / {test.questions.length}
            </span>
          </div>
          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:6, overflow:"hidden" }}>
            <div style={{
              width:`${progress}%`, background:`linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`,
              height:"100%", borderRadius:99, transition:"width 0.3s",
              boxShadow:`0 0 12px ${meta.glow}`,
            }} />
          </div>
        </div>
      </div>

      {/* Tarjeta pregunta */}
      <div style={{
        ...cardBase, padding:"24px 20px", marginBottom:16,
        boxShadow:`0 0 30px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        borderColor: `${meta.color}30`,
      }}>
        <div style={{ fontSize:11, color:meta.color, textTransform:"uppercase", letterSpacing:1.5, marginBottom:12, fontWeight:600 }}>
          Pregunta {current + 1}
        </div>
        <p style={{ fontSize:16, fontWeight:500, color:"#fff", lineHeight:1.7, margin:"0 0 20px" }}>
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
                  textAlign:"left", padding:"14px 16px", borderRadius:12,
                  border: isSelected ? `2px solid ${meta.color}` : `1px solid rgba(255,255,255,0.08)`,
                  background: isSelected ? `${meta.color}18` : "rgba(255,255,255,0.03)",
                  cursor:"pointer", fontSize:14,
                  color: isSelected ? meta.color : "rgba(255,255,255,0.75)",
                  fontWeight: isSelected ? 600 : 400,
                  transition:"all 0.2s",
                  boxShadow: isSelected ? `0 0 16px ${meta.glow}` : "none",
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
          background: selected !== null
            ? `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)`
            : "rgba(255,255,255,0.08)",
          color: selected !== null ? "#fff" : "rgba(255,255,255,0.3)",
          fontWeight:600, fontSize:15,
          cursor: selected !== null ? "pointer" : "not-allowed",
          transition:"all 0.2s",
          boxShadow: selected !== null ? `0 0 20px ${meta.glow}` : "none",
          textShadow: selected !== null ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {current + 1 === test.questions.length ? "Ver resultados →" : "Siguiente →"}
      </button>

      {current > 0 && (
        <button onClick={() => { setCurrent(c => c - 1); }} style={{
          display:"block", margin:"12px auto 0", background:"none", border:"none",
          fontSize:13, color:"rgba(255,255,255,0.4)", cursor:"pointer",
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
        ...cardBase, padding:"20px", cursor:"pointer",
        transition:"transform 0.2s, box-shadow 0.2s",
        position:"relative", overflow:"hidden",
        borderColor: `${meta.color}25`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${meta.glow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Glow accent */}
      <div style={{
        position:"absolute", top:-30, right:-30, width:80, height:80,
        borderRadius:"50%", background:meta.glow, filter:"blur(40px)", opacity:0.4,
      }} />
      {completed && (
        <div style={{
          position:"absolute", top:12, right:12,
          background:`${meta.color}30`, color:meta.color,
          fontSize:10, fontWeight:600, borderRadius:99, padding:"3px 10px",
          border:`1px solid ${meta.color}40`,
          boxShadow:`0 0 10px ${meta.glow}`,
        }}>✓ Completado</div>
      )}
      <div style={{ fontSize:28, marginBottom:10 }}>{meta.icon}</div>
      <div style={{ fontSize:11, color:meta.color, textTransform:"uppercase", letterSpacing:1.5, marginBottom:4, fontWeight:600 }}>
        {meta.label}
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:"#fff", marginBottom:6, lineHeight:1.3 }}>
        {test.name}
      </div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.5, marginBottom:14 }}>
        {test.description.slice(0,90)}…
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:meta.color, background:`${meta.color}15`, border:`1px solid ${meta.color}30`, borderRadius:99, padding:"3px 10px", fontWeight:500 }}>
          {test.questions.length} preguntas
        </span>
        <span style={{ fontSize:11, color:meta.color, background:`${meta.color}15`, border:`1px solid ${meta.color}30`, borderRadius:99, padding:"3px 10px", fontWeight:500 }}>
          ~{test.estimatedMinutes} min
        </span>
        <span style={{ marginLeft:"auto", fontSize:13, color:meta.color, fontWeight:600, textShadow:`0 0 8px ${meta.glow}` }}>Iniciar →</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW
// ══════════════════════════════════════════════════════════════
function Dashboard({ sessions, onViewResult }: {
  sessions: SessionResult[]; onViewResult: (s: SessionResult) => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:15, fontWeight:600, color:"#fff", marginBottom:14 }}>
        📊 Historial de resultados
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:10 }}>
        {sessions.map((s, i) => {
          const meta = AREA[s.test.area] ?? AREA.aptitudes;
          const avg = Math.round(s.results.reduce((a,r) => a+r.percent,0) / s.results.length);
          const top = [...s.results].sort((a,b) => b.percent-a.percent)[0];
          return (
            <div
              key={i}
              onClick={() => onViewResult(s)}
              style={{
                ...cardBase, padding:"14px 14px", cursor:"pointer",
                transition:"transform 0.15s", borderColor:`${meta.color}25`,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "none"}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontSize:20 }}>{meta.icon}</div>
                <span style={{ fontSize:20, fontWeight:700, color:meta.color, textShadow:`0 0 12px ${meta.glow}` }}>{avg}%</span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:"#fff", margin:"8px 0 2px" }}>
                {s.test.shortName}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>
                Mejor: {top.label}
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:99, height:4, marginTop:8, overflow:"hidden" }}>
                <div style={{ width:`${avg}%`, background:`linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`, height:"100%", borderRadius:99, boxShadow:`0 0 6px ${meta.glow}` }} />
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

  // Viewing saved session
  if (viewingSession) {
    return (
      <div style={{ minHeight:"100vh", padding:"24px 8px 60px", background:"linear-gradient(180deg, #0a0a1a 0%, #0f0f2e 100%)" }}>
        <button onClick={() => setViewingSession(null)} style={{
          display:"block", margin:"0 auto 20px", background:"rgba(255,255,255,0.05)",
          border:"1px solid rgba(255,255,255,0.1)", borderRadius:10,
          padding:"8px 16px", cursor:"pointer", fontSize:13, color:"rgba(255,255,255,0.6)",
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
      <div style={{ minHeight:"100vh", padding:"24px 8px 60px", background:"linear-gradient(180deg, #0a0a1a 0%, #0f0f2e 100%)" }}>
        <TestScreen test={activeTest} onFinish={finishTest} onBack={goHome} />
      </div>
    );
  }

  if (phase === "results" && activeTest) {
    return (
      <div style={{ minHeight:"100vh", padding:"24px 8px 60px", background:"linear-gradient(180deg, #0a0a1a 0%, #0f0f2e 100%)" }}>
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
    <div style={{ minHeight:"100vh", padding:"24px 12px 80px", background:"linear-gradient(180deg, #0a0a1a 0%, #0f0f2e 100%)" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:28, fontWeight:700, margin:"0 0 8px", color:"#fff" }}>
            🧪 Psicometría
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:0, lineHeight:1.7, maxWidth:560 }}>
            Descubre tu perfil completo: personalidad, inteligencias, aptitudes, valores, estilo de aprendizaje y bienestar académico.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10, marginBottom:28 }}>
          {[
            { label:"Tests", value:allTests.length, color:"#a78bfa" },
            { label:"Preguntas", value:totalQ, color:"#38bdf8" },
            { label:"Áreas", value:Object.keys(AREA).length, color:"#34d399" },
            { label:"Completados", value:sessions.length, color:"#f472b6" },
          ].map(s => (
            <div key={s.label} style={{
              ...cardBase, padding:"14px 16px", textAlign:"center",
            }}>
              <div style={{ fontSize:24, fontWeight:700, color:s.color, textShadow:`0 0 16px ${s.color}50` }}>{s.value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:2, fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard historial */}
        <Dashboard sessions={sessions} onViewResult={(s) => setViewingSession(s)} />

        {/* Filtros */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
          {areas.map(area => {
            const meta = area === "all" ? null : AREA[area];
            const isActive = activeArea === area;
            const activeColor = meta?.color ?? "#a78bfa";
            return (
              <button key={area} onClick={() => setActiveArea(area)} style={{
                padding:"7px 14px", borderRadius:99, fontSize:12, cursor:"pointer",
                fontWeight: isActive ? 600 : 400, whiteSpace:"nowrap", flexShrink:0,
                background: isActive ? `${activeColor}25` : "rgba(255,255,255,0.05)",
                color: isActive ? activeColor : "rgba(255,255,255,0.5)",
                border: isActive ? `1px solid ${activeColor}40` : "1px solid rgba(255,255,255,0.08)",
                transition:"all 0.15s",
                boxShadow: isActive ? `0 0 12px ${activeColor}30` : "none",
              }}>
                {area === "all" ? `Todos (${allTests.length})` : `${meta?.icon} ${meta?.label}`}
              </button>
            );
          })}
        </div>

        {/* Grid de tests */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px,1fr))", gap:14 }}>
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
