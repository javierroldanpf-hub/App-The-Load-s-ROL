"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";

/* ── design tokens ───────────────────────────────────────────────────────── */
const T = {
  bg:    "#080d1a",
  panel: "#0f1623",
  card:  "#141d2e",
  line:  "#1e2d44",
  text:  "#e2e8f0",
  muted: "#64748b",
  // semantic
  ae:   "#22c55e",   // aeróbico
  an:   "#f43f5e",   // anaeróbico
  nm:   "#818cf8",   // neuromuscular
  // hiit types
  short:  "#38bdf8",
  long:   "#4ade80",
  gb:     "#fb923c",
  rst:    "#fca5a5",
  sit:    "#a78bfa",
  acc:    "#94a3b8",
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
const Dot = ({ active, color }) => (
  <span style={{
    display: "inline-block", width: 9, height: 9, borderRadius: "50%",
    background: active ? color : "transparent",
    border: `1.5px solid ${active ? color : "#2a3a50"}`,
    flexShrink: 0,
  }} />
);

const Chip = ({ label, color = T.text, bg = "transparent", border = T.line }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 20,
    background: bg, border: `1px solid ${border}`,
    fontSize: 9, fontWeight: 700, color, letterSpacing: 0.4,
    whiteSpace: "nowrap",
  }}>{label}</span>
);

const HiitChip = ({ type }) => {
  const map = {
    "HIIT SHORT": { bg: T.short + "22", border: T.short, color: T.short },
    "HIIT LONG":  { bg: T.long  + "22", border: T.long,  color: T.long  },
    "GAME BASED": { bg: T.gb   + "22", border: T.gb,   color: T.gb   },
    "RST":        { bg: T.rst  + "22", border: T.rst,  color: T.rst  },
    "SIT":        { bg: T.sit  + "22", border: T.sit,  color: T.sit  },
    "ACC":        { bg: T.acc  + "22", border: T.acc,  color: T.acc  },
    "DCC":        { bg: T.acc  + "22", border: T.acc,  color: T.acc  },
    "COD":        { bg: T.acc  + "22", border: T.acc,  color: T.acc  },
  };
  const s = map[type] || { bg: T.line, border: T.muted, color: T.muted };
  return <Chip label={type} {...s} />;
};

const Section = ({ n, title, children }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: T.muted,
        background: T.card, border: `1px solid ${T.line}`, borderRadius: 4,
        padding: "2px 7px", letterSpacing: 1,
      }}>0{n}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: 0.8, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: T.line }} />
    </div>
    {children}
  </div>
);

/* ── Section 1: clasificación ────────────────────────────────────────────── */
const SUBCICLOS = {
  1: "Subciclo 1 · Foco Extensivo SGJ EM",
  2: "Subciclo 2 · Foco Velocidad SMJ EG",
  3: "Subciclo 3 · Foco Intensivo SRJ EP",
};

const TIPOS = [
  { n:1, sub:SUBCICLOS[1], meta:"METABÓLICO",    desc:"Predominante aeróbico",                           ae:true,  an:false, nm:false },
  { n:2, sub:SUBCICLOS[3], meta:"METABÓLICO",    desc:"Aeróbico con estrés neuromuscular",               ae:true,  an:false, nm:true  },
  { n:3, sub:SUBCICLOS[1], meta:"METABÓLICO",    desc:"Aeróbico con contribución anaeróbica glucolítica", ae:true,  an:true,  nm:false },
  { n:4, sub:SUBCICLOS[3], meta:"METABÓLICO",    desc:"Oxidativo/anaeróbico + estrés NM",                ae:true,  an:true,  nm:true  },
  { n:5, sub:SUBCICLOS[2], meta:"ANAERÓBICO",    desc:"Anaeróbico con estrés neuromuscular",             ae:false, an:true,  nm:true  },
  { n:6, sub:SUBCICLOS[2], meta:"NEUROMUSCULAR", desc:"Sin contribución metabólica",                     ae:false, an:false, nm:true  },
];

function TablaClasificacion() {
  return (
    <Section n={1} title="Clasificación de tipos HIIT">
      {/* leyenda */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {[["AE","Aeróbico",T.ae],["AN","Anaeróbico",T.an],["NM","Neuromuscular",T.nm]].map(([k,l,c])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Dot active color={c} />
            <span style={{ fontSize:9, color:T.muted, fontWeight:600 }}>{l}</span>
          </div>
        ))}
        <div style={{ flex:1 }} />
        {/* respuestas del juego */}
        {[["🫀 Metabólica","EL JUEGO (90')"],["🏃 Locomotora","HIGH SPEED / SPRINT"],["💥 Neuromuscular","ACC / DECC / COD"]].map(([k,v])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", gap:6, background:T.card, border:`1px solid ${T.line}`, borderRadius:6, padding:"3px 8px" }}>
            <span style={{ fontSize:9, color:T.muted }}>{k}</span>
            <span style={{ fontSize:9, fontWeight:700, color:T.text }}>{v}</span>
          </div>
        ))}
      </div>

      {/* cards de tipo */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6 }}>
        {TIPOS.map((t)=>{
          const primary = t.an && t.nm ? T.an : t.nm ? T.nm : T.ae;
          return (
            <div key={t.n} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ background:`${primary}18`, borderBottom:`1px solid ${primary}44`, padding:"6px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:13, color:primary }}>TIPO {t.n}</span>
                <span style={{ fontSize:8, color:T.muted, fontWeight:600, background:T.panel, borderRadius:4, padding:"1px 5px" }}>{t.sub}</span>
              </div>
              <div style={{ padding:"8px 10px" }}>
                <div style={{ fontSize:8, color:T.muted, fontWeight:700, marginBottom:3, letterSpacing:0.5 }}>{t.meta}</div>
                <div style={{ fontSize:9, color:T.text, lineHeight:1.4, marginBottom:8 }}>{t.desc}</div>
                <div style={{ display:"flex", gap:8 }}>
                  {[["AE",t.ae,T.ae],["AN",t.an,T.an],["NM",t.nm,T.nm]].map(([k,v,c])=>(
                    <div key={k} style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <Dot active={v} color={c} />
                      <span style={{ fontSize:8, color: v ? c : T.muted, fontWeight:600 }}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* HSR extra */}
      <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
        {[
          ["↑ Carga HSR","Sobrecarga cadena posterior"],
          ["CODS 90-180°","Sobrecarga cuadríceps-glúteos"],
          ["CODS 45°","Menor carga NM · incluir con HSR (Tipo 1)"],
        ].map(([k,v])=>(
          <div key={k} style={{ display:"flex", gap:6, alignItems:"baseline", background:T.card, border:`1px solid ${T.line}`, borderRadius:6, padding:"4px 9px", flex:"1 1 200px" }}>
            <span style={{ fontSize:8, color:T.muted, fontWeight:700, whiteSpace:"nowrap" }}>{k}</span>
            <span style={{ fontSize:9, color:T.text }}>{v}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Section 2: árbol de decisión ────────────────────────────────────────── */
const DECISION = [
  { ae:"SÍ", an:"SÍ", nm:"NO", tipo:1, hiits:["HIIT SHORT"]                          },
  { ae:"SÍ", an:"SÍ", nm:"SÍ", tipo:2, hiits:["HIIT SHORT","GAME BASED"]             },
  { ae:"SÍ", an:"SÍ", nm:"NO", tipo:3, hiits:["HIIT SHORT","HIIT LONG","GAME BASED"] },
  { ae:"SÍ", an:"SÍ", nm:"SÍ", tipo:4, hiits:["HIIT SHORT","GAME BASED","RST","HIIT LONG"] },
  { ae:"NO", an:"SÍ", nm:"SÍ", tipo:5, hiits:["SIT","RST"]                           },
  { ae:"NO", an:"NO", nm:"NO", tipo:6, hiits:["ACC","DCC","COD"], extra:"STRENGTH & SPEED" },
];

const YN = ({ v }) => (
  <span style={{
    fontFamily:"monospace", fontWeight:700, fontSize:10,
    color: v === "SÍ" ? T.ae : T.an,
    background: v === "SÍ" ? T.ae + "18" : T.an + "18",
    border: `1px solid ${v === "SÍ" ? T.ae + "44" : T.an + "44"}`,
    borderRadius:4, padding:"1px 6px",
  }}>{v}</span>
);

function TablaEleccion() {
  return (
    <Section n={2} title="Elección del HIIT">
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%", minWidth:480 }}>
          <thead>
            <tr>
              {[
                ["AE ¿?", T.ae],
                ["AN ¿?", T.an],
                ["NM ¿?", T.nm],
                ["TIPO", T.muted],
                ["HIIT RECOMENDADO", T.text],
                ["NOTA", T.muted],
              ].map(([h, c]) => (
                <th key={h} style={{
                  padding:"6px 8px", borderBottom:`2px solid ${T.line}`,
                  fontSize:8, fontWeight:700, color:c, textAlign:"left",
                  letterSpacing:0.6, whiteSpace:"nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DECISION.map((d, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${T.line}22` }}>
                <td style={{ padding:"7px 8px" }}><YN v={d.ae} /></td>
                <td style={{ padding:"7px 8px" }}><YN v={d.an} /></td>
                <td style={{ padding:"7px 8px" }}><YN v={d.nm} /></td>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:T.text }}>T{d.tipo}</span>
                </td>
                <td style={{ padding:"7px 8px" }}>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {d.hiits.map((h) => <HiitChip key={h} type={h} />)}
                  </div>
                </td>
                <td style={{ padding:"7px 8px", fontSize:9, color:T.muted }}>{d.extra || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ── Section 3: prescripción ─────────────────────────────────────────────── */
const PRESC = [
  {
    label:"HIIT LONG", color:T.long,
    stats:["2–5 min","80–85% VIFT","R' 1–4 min pasivo / 45% VIFT","5% SJ","Tipos 3 y 4"],
    notas:[
      "Gran estrés cardiopulmonar sin alcanzar altas velocidades.",
      "Sesiones al final del día para mayor VO₂.",
      "Pretemporada / Off-season.",
    ],
  },
  {
    label:"HIIT SHORT", color:T.short,
    stats:["10–60 seg","90–105% VIFT","R' 10–60 seg pasivo / 45% VIFT","20% SJ","Tipos 1, 2, 3 y 4"],
    subrows:[
      { tipo:"T1", val:"15-15 · R activa · CODS 45°" },
      { tipo:"T2", val:"10-20 · R pasiva · CODS >90°" },
      { tipo:"T3", val:"20-20 · R activa/pasiva" },
      { tipo:"T4", val:"30-25-5 / 30-20-10 (5 min intervalo)" },
    ],
    notas:[
      "10-10, 15-15, 20-20 y 10-20: reducida fatiga aguda NM (mejoran CMJ post-sesión).",
      "Individualizar según VIFT, demanda NM (HSR vs CODS) y posibilidad de integrar balón.",
    ],
  },
  {
    label:"SPRINT CORTO REPETIDO (RST)", color:T.rst,
    stats:["3–10 seg","ALL OUT","R' 15–60 seg pasivo / 45% VIFT","5% SJ","Tipos 3 y 4"],
    subrows:[
      { tipo:"SIT", val:"Sprint largo repetido · 20-30 seg ALL OUT · R' 1-4 min pasivo · Tipo 5" },
    ],
    notas:[
      "Preferible orientado a carga mecánica (CODS) en vez de Vmax en línea recta.",
      "Top-up suplentes · Última fase pretemporada · Fase final RTP.",
    ],
  },
  {
    label:"GAME BASED", color:T.gb,
    stats:["2–5 min","70% SJ","Tipos 1–4"],
    subrows:[
      { tipo:"LSG", val:"8×8 – 10×10 (300–150 m²/jug) · Grande: velocidad · Mediano: RES-VEL · Reducido: activación" },
      { tipo:"MSG", val:"5×5 – 7×7 (150–50 m²/jug) · Grande: VEL-RES · Mediano: resistencia · Reducido: ACC-DCC-COD" },
      { tipo:"SRJ", val:"2×2 – 4×4 (100–40 m²/jug) · Grande: resistencia · Mediano/Reducido: ACC-DCC-COD" },
    ],
    notas:[
      "Aeróbico: 4-8 min · Anaeróbico: 1-3 min · Neuromuscular: 10'-1'.",
    ],
  },
];

function TablaPrescripcion() {
  return (
    <Section n={3} title="Prescripción detallada">
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {PRESC.map((p) => (
          <div key={p.label} style={{ background:T.card, border:`1px solid ${p.color}33`, borderRadius:10, overflow:"hidden" }}>
            {/* header */}
            <div style={{ background:`${p.color}20`, borderBottom:`1px solid ${p.color}33`, padding:"7px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:14, borderRadius:2, background:p.color, flexShrink:0 }} />
              <span style={{ fontWeight:700, fontSize:11, color:p.color, letterSpacing:0.5 }}>{p.label}</span>
            </div>
            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              {/* stat chips */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {p.stats.map((s) => (
                  <div key={s} style={{ background:T.panel, border:`1px solid ${T.line}`, borderRadius:6, padding:"3px 9px", fontSize:9, color:T.text, fontFamily:"monospace", fontWeight:600 }}>{s}</div>
                ))}
              </div>
              {/* variantes por tipo */}
              {p.subrows && (
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {p.subrows.map((r) => (
                    <div key={r.tipo} style={{ display:"flex", gap:8, alignItems:"baseline" }}>
                      <span style={{ fontFamily:"monospace", fontSize:9, color:p.color, fontWeight:700, minWidth:30, flexShrink:0 }}>{r.tipo}</span>
                      <span style={{ fontSize:9, color:T.muted, lineHeight:1.4 }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* notas */}
              <div style={{ display:"flex", flexDirection:"column", gap:3, borderTop:`1px solid ${T.line}`, paddingTop:7 }}>
                {p.notas.map((n, i) => (
                  <div key={i} style={{ display:"flex", gap:6, alignItems:"baseline" }}>
                    <span style={{ color:p.color, fontSize:8, flexShrink:0 }}>›</span>
                    <span style={{ fontSize:9, color:T.muted, lineHeight:1.5 }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export default function HiitPrescriptorModal({ onClose }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:9000,
        display:"flex", alignItems:"flex-start", justifyContent:"center",
        padding:"16px 8px", overflowY:"auto",
      }}
    >
      <div style={{
        background:T.bg, border:`1px solid ${T.line}`,
        borderRadius:16, width:"100%", maxWidth:760,
        padding:"20px 18px 24px",
      }}>
        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", gap:3 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.ae }} />
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.an }} />
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.nm }} />
            </div>
            <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:14, color:T.text, letterSpacing:1 }}>PRESCRIPTOR DE HIIT</span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          <TablaClasificacion />
          <TablaEleccion />
          <TablaPrescripcion />
        </div>
      </div>
    </div>
  );
}
