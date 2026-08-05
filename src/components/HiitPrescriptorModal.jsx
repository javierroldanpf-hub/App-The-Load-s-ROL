"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";

const D = {
  bg: "#0d1117",
  panel: "#161b22",
  panelRaised: "#1c2128",
  line: "#30363d",
  text: COLORS.text,
  lime: COLORS.lime,
  green: "#238636",
  red: "#c0392b",
  blue: "#1e3a5f",
  navy: "#1a237e",
  orange: "#e67e22",
  yellow: "#f1c40f",
  salmon: "#e8a090",
  teal: "#2e7d6e",
  gray: "#6a737d",
};

const thStyle = (bg, color = "#fff", extra = {}) => ({
  background: bg, color, fontWeight: 700, padding: "6px 8px",
  border: `1px solid ${D.line}`, fontSize: 10, textAlign: "center",
  verticalAlign: "middle", lineHeight: 1.3, ...extra,
});
const tdStyle = (bg = D.panelRaised, color = D.text, extra = {}) => ({
  background: bg, color, padding: "5px 8px",
  border: `1px solid ${D.line}`, fontSize: 10, verticalAlign: "middle",
  lineHeight: 1.4, ...extra,
});

// ── Tabla 1: Clasificación de tipos ────────────────────────────────────────
function TablaClasificacion() {
  const tipos = [
    { tipo: "TIPO 1\n(SUBCICLO 1)", meta: "METABÓLICO", desc: "PREDOMINANTE AERÓBICO", ae: true, an: false, nm: false },
    { tipo: "TIPO 2\n(SUBCICLO 3)", meta: "METABÓLICO", desc: "AERÓBICO CON ESTRÉS NEUROMUSCULAR", ae: true, an: false, nm: true },
    { tipo: "TIPO 3\n(SUBCICLO 1)", meta: "METABÓLICO", desc: "AERÓBICO PERO CONTRIBUCIÓN ANAERÓBICA GLUCOLÍTICA", ae: true, an: true, nm: false },
    { tipo: "TIPO 4\n(SUBCICLO 3)", meta: "METABÓLICO", desc: "(OXIDATIVO/ANAERÓBICO) ESTRÉS NEUROMUSCULAR", ae: true, an: true, nm: true },
    { tipo: "TIPO 5\n(SUBCICLO 2)", meta: "ANAERÓBICO", desc: "ANAERÓBICO CON ESTRÉS NEUROMUSCULAR", ae: false, an: true, nm: true },
    { tipo: "TIPO 6\n(SUBCICLO 2)", meta: "NEUROMUSC ULAR", desc: "SIN CONTRIBUCIÓN METABÓLICA", ae: false, an: false, nm: true },
  ];
  const respuestas = [
    { label: "RESPUESTA METABÓLICA", val: "EL JUEGO (90')" },
    { label: "RESPUESTA LOCOMOTORA", val: "HIGH SPEED/SPRINT" },
    { label: "RESPUESTA NEUROMUSCULAR", val: "ACC/DECC/COD" },
  ];
  const extras = [
    { label: "MAYOR CARGA HSR", val: "SOBRECARGA CADENA POSTERIOR" },
    { label: "CODS 90-180°", val: "SOBRECARGA DE CUADRÍCEPS-GLÚTEOS" },
    { label: "CODS 45°", val: "MENOR CARGA NEUROMUSCULAR - INCLUIR CON HSR (TIPO 1)" },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: D.lime, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>1. Clasificación de tipos HIIT</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {/* Main table */}
        <div style={{ flex: "1 1 320px", overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 10 }}>
            <thead>
              <tr>
                <th colSpan={2} style={thStyle("#2d3748")}>CLASIFICACIÓN</th>
                <th style={thStyle(D.green)}>AERÓBICO</th>
                <th style={thStyle(D.red)}>ANAERÓBICO</th>
                <th style={thStyle(D.navy)}>NEUROMUSC ULAR</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t, i) => (
                <tr key={i}>
                  <td style={tdStyle("#2d3748", D.text, { fontWeight: 700, whiteSpace: "pre-line", fontSize: 9 })}>{t.tipo}</td>
                  <td style={tdStyle(D.panelRaised, D.text, { fontSize: 9 })}>{t.meta}</td>
                  <td style={tdStyle(D.panelRaised, D.text, { fontSize: 9 })}>{t.desc}</td>
                  <td style={tdStyle(t.ae ? D.green : D.panelRaised)}></td>
                  <td style={tdStyle(t.an ? D.red : D.panelRaised)}></td>
                  <td style={tdStyle(t.nm ? D.navy : D.panelRaised)}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Side tables */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 8 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", border: `2px solid ${D.lime}` }}>
            <tbody>
              {respuestas.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle(D.panelRaised, D.lime, { fontWeight: 700, fontSize: 9, width: "45%" })}>{r.label}</td>
                  <td style={tdStyle(D.panelRaised, D.text, { fontSize: 9 })}>{r.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table style={{ borderCollapse: "collapse", width: "100%", border: `2px solid ${D.lime}` }}>
            <tbody>
              {extras.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle(D.panelRaised, D.lime, { fontWeight: 700, fontSize: 9, width: "45%" })}>{r.label}</td>
                  <td style={tdStyle(D.panelRaised, D.text, { fontSize: 9 })}>{r.val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tabla 2: Elección del HIIT ──────────────────────────────────────────────
function TablaEleccion() {
  const filas = [
    { ae: "SÍ", an: "SÍ", nm: "NO", tipo: "TIPO 1", hiits: [{ label: "HIIT SHORT", bg: D.blue }] },
    { ae: "SÍ", an: "SÍ", nm: "SÍ", tipo: "TIPO 2", hiits: [{ label: "HIIT SHORT", bg: D.blue }, { label: "GAME BASED", bg: D.orange }] },
    { ae: "SÍ", an: "SÍ", nm: "NO", tipo: "TIPO 3", hiits: [{ label: "HIIT SHORT", bg: D.blue }, { label: "HIIT LONG", bg: D.green }, { label: "GAME BASED", bg: D.orange }] },
    { ae: "SÍ", an: "SÍ", nm: "SÍ", tipo: "TIPO 4", hiits: [{ label: "HIIT SHORT", bg: D.blue }, { label: "GAME BASED", bg: D.orange }, { label: "RST", bg: D.salmon }, { label: "HIIT LONG", bg: D.green }] },
    { ae: "NO", an: "SÍ", nm: "SÍ", tipo: "TIPO 5", hiits: [{ label: "SIT", bg: "#38bdf8" }, { label: "RST", bg: D.salmon }] },
    { ae: "NO", an: "NO", nm: "NO", tipo: "TIPO 6", hiits: [{ label: "ACC", bg: "#555" }, { label: "DCC", bg: "#555" }, { label: "COD", bg: "#555" }], extra: "STRENGHT Y SPEED" },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: D.lime, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>2. Elección del HIIT</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480, fontSize: 10 }}>
          <thead>
            <tr>
              <th style={thStyle("#2d3748", D.text, { width: "12%" })}>AERÓBICO¿?</th>
              <th style={thStyle("#2d3748", D.text, { width: "12%" })}>ANAERÓBICO¿?</th>
              <th style={thStyle("#2d3748", D.text, { width: "14%" })}>NEUROMUSCULAR¿?</th>
              <th style={thStyle("#2d3748", D.text, { width: "10%" })}>TIPO</th>
              <th style={thStyle("#2d3748", D.text)}>HIIT RECOMENDADO</th>
              <th style={thStyle("#2d3748", D.text, { width: "14%" })}>EXTRA</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${D.line}` }}>
                <td style={tdStyle(f.ae === "SÍ" ? "#1a3a1a" : "#3a1a1a", f.ae === "SÍ" ? D.lime : "#ff7070", { textAlign: "center", fontWeight: 700 })}>{f.ae}</td>
                <td style={tdStyle(f.an === "SÍ" ? "#3a1a1a" : "#1c2128", f.an === "SÍ" ? "#ff7070" : D.text, { textAlign: "center", fontWeight: 700 })}>{f.an}</td>
                <td style={tdStyle(f.nm === "SÍ" ? "#1a1a3a" : "#1c2128", f.nm === "SÍ" ? "#7090ff" : D.text, { textAlign: "center", fontWeight: 700 })}>{f.nm}</td>
                <td style={tdStyle("#2d3748", D.text, { textAlign: "center", fontWeight: 700 })}>{f.tipo}</td>
                <td style={tdStyle(D.panelRaised)}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {f.hiits.map((h, hi) => (
                      <span key={hi} style={{ background: h.bg, color: "#fff", borderRadius: 4, padding: "2px 7px", fontWeight: 700, fontSize: 9 }}>{h.label}</span>
                    ))}
                  </div>
                </td>
                <td style={tdStyle("#2d3748", D.text, { fontSize: 9, fontWeight: 600 })}>{f.extra || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tabla 3: Prescripción detallada ────────────────────────────────────────
function TablaPrescripcion() {
  const secciones = [
    {
      label: "HIIT LONG",
      color: D.green,
      rows: [
        ["2-5 MIN\n(80-85% VIFT)", "5%", "TIPO 3 Y 4", "R' 1-4 MIN (SHORT PASIVO) (LONG 45% VIFT)", "GRAN ESTRÉS CARDIOPULMONAR SIN ALCANZAR ALTAS VELOCIDADES"],
        ["PRETEMPORADA/OFF SEASON", "", "SESIONES AL FINAL DEL DÍA POR MAYOR VO2", "", ""],
      ],
    },
    {
      label: "HIIT SHORT",
      color: D.blue,
      rows: [
        ["10-60 SEG\n(90-105% VIFT)", "20%", "TIPO 1, 2, 3 Y 4", "R' 10-60 SEG (SHORT PASIVO) (LONG 45% VIFT)", "10-10, 15-15, 20-20 Y 10-20 DEBIDO A LA REDUCIDA FATIGA AGUDA NEUROMUSCULAR (ESTUDIOS DEMUESTRAN QUE MEJORAN EL CMJ DESPUÉS DE HACERLO)"],
        ["TIPO 1 --> 15-15 R ACTIVA CODS 45°", "TIPO 2 --> 10-20 R PASIVA CODS >90°", "TIPO 3 --> 20-20 R ACTIVA/PASIVA", "TIPO 4 --> 30-25-5, 30-20-10 (5 MIN DE INTERVALO)", "INDIVIDUALIZAR EN FUNCIÓN DE LA VIFT, DEMANDA NEUROMUSCULAR (HSR VS CODS) Y POSIBILIDAD DE INTEGRAR CON BALÓN"],
      ],
    },
    {
      label: "SPRINT CORTO REPETIDO RST",
      color: D.salmon,
      rows: [
        ["3-10 SEG\n(ALL OUT)", "5%", "TIPO 3 Y 4", "R' 15-60 SEG (SHORT PASIVO) (LONG 45% VIFT)", "TOP-UP SUPLENTES, ÚLTIMA FASE PRETEMPORADA, FASE FINAL RTP"],
        ["PREFERIBLEMENTE ORIENTADO A CARGA MECÁNICA (CODS) EN VEZ DE VMAX EN LÍNEA RECTA", "", "SPRINT LARGO REPETIDO (SIT)", "20-30 SEG (ALL OUT)  ·  TIPO 5", "R' 1-4 MIN PASIVO"],
      ],
    },
    {
      label: "GAME BASED",
      color: D.orange,
      rows: [
        ["2-5 MIN", "70%", "LSG (8x8-10x10) (300-150m2/jug)", "CAMPO GRANDE (VELOCIDAD), CAMPO MEDIANO (RES-VEL) CAMPO REDUCIDO (ACTIVACIÓN)", "MSG (5x5-7x7) (150-50m2/jug) · CAMPO GRANDE (VEL-RES), CAMPO MEDIANO (RESISTENCIA), CAMPO REDUCIDO (ACC-DCC-COD)"],
        ["", "", "SRJ (2x2-4x4) 100-40m2/jug", "CAMPO GRANDE (RESISTENCIA), CAMPO MEDIANO (ACC-DCC-COD), CAMPO REDUCIDO (ACC-DCC-COD)", "AERÓBICO (4-8') · ANAERÓBICO (1-3') · NEUROMUSCULAR (10'-1')"],
      ],
    },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: D.lime, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>3. Prescripción detallada</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {secciones.map((s, si) => (
          <div key={si} style={{ border: `1px solid ${D.line}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: s.color, padding: "5px 10px", fontWeight: 700, fontSize: 11, color: "#fff" }}>{s.label}</div>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 9 }}>
              <tbody>
                {s.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={tdStyle(D.panelRaised, D.text, { whiteSpace: "pre-line", verticalAlign: "top", width: `${100 / row.length}%` })}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal principal ─────────────────────────────────────────────────────────
export default function HiitPrescriptorModal({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 8px", overflowY: "auto" }}>
      <div style={{ background: D.panel, border: `1px solid ${D.line}`, borderRadius: 16, width: "100%", maxWidth: 780, padding: "20px 18px", position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: D.text, letterSpacing: 0.5 }}>PRESCRIPTOR DE HIIT</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: D.text, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>✕</button>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <TablaClasificacion />
          <div style={{ borderTop: `1px solid ${D.line}` }} />
          <TablaEleccion />
          <div style={{ borderTop: `1px solid ${D.line}` }} />
          <TablaPrescripcion />
        </div>
      </div>
    </div>
  );
}
