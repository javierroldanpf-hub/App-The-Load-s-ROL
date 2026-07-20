"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";

// Standard reference field: 105 × 68 m = 7140 m²
const STD_AREA = 7140;

// Default evidence-based field dimensions
const DEFAULT_CASA  = { ancho: 64, largo: 102 };
const DEFAULT_FUERA = { ancho: 54, largo: 94  };

// All reference m²/player values from scientific evidence
// Format per group: 9 values ordered [sgj_eg, sgj_em, sgj_ep, smj_eg, smj_em, smj_ep, srj_eg, srj_em, srj_ep]
const GROUPS = [
  {
    label: "SJ CON PORTEROS",
    multiSpace: false,
    cells: [
      { formation: "10x10+P", dims: "105×68m", ref: 357 },
      { formation: "10x10+P", dims: "80×60m",  ref: 240 },
      { formation: "10x10+P", dims: "60×50m",  ref: 150 },
      { formation: "7x7+P",   dims: "68×52m",  ref: 250 },
      { formation: "7x7+P",   dims: "52×45m",  ref: 167 },
      { formation: "7x7+P",   dims: "40×35m",  ref: 100 },
      { formation: "4x4+P",   dims: "45×40m",  ref: 225 },
      { formation: "4x4+P",   dims: "35×30m",  ref: 131 },
      { formation: "4x4+P",   dims: "30×22m",  ref: 82  },
    ],
  },
  {
    label: "SJ POSESIÓN 2 EQUIPOS / 1 ESPACIO",
    multiSpace: false,
    cells: [
      { formation: "10x10+?", dims: "70×50m",  ref: 175 },
      { formation: "10x10+?", dims: "50×40m",  ref: 100 },
      { formation: "10x10+?", dims: "40×30m",  ref: 60  },
      { formation: "7x7+?",   dims: "50×45m",  ref: 160 },
      { formation: "7x7+?",   dims: "40×35m",  ref: 100 },
      { formation: "7x7+?",   dims: "30×25m",  ref: 50  },
      { formation: "4x4+?",   dims: "40×25m",  ref: 125 },
      { formation: "4x4+?",   dims: "30×20m",  ref: 75  },
      { formation: "4x4+?",   dims: "20×15m",  ref: 37  },
    ],
  },
  {
    label: "SJ POSESIÓN 3 EQUIPOS / 1 ESPACIO",
    multiSpace: false,
    cells: [
      { formation: "8x8x8", dims: "60×50m",  ref: 125 },
      { formation: "8x8x8", dims: "45×40m",  ref: 75  },
      { formation: "8x8x8", dims: "35×30m",  ref: 45  },
      { formation: "6x6x6", dims: "45×40m",  ref: 100 },
      { formation: "6x6x6", dims: "35×30m",  ref: 58  },
      { formation: "6x6x6", dims: "25×20m",  ref: 30  },
      { formation: "4x4x4", dims: "35×20m",  ref: 58  },
      { formation: "4x4x4", dims: "30×18m",  ref: 45  },
      { formation: "4x4x4", dims: "25×15m",  ref: 30  },
    ],
  },
  {
    label: "SJ POSESIÓN 2-3 EQUIPOS / 2 ESPACIOS",
    multiSpace: true,
    cells: [
      { formation: "8+?×8", dims: "2×(45×35)m", ref: 98 },
      { formation: "8+?×8", dims: "2×(35×25)m", ref: 55 },
      { formation: "8+?×8", dims: "2×(25×20)m", ref: 31 },
      { formation: "6+?×6", dims: "2×(35×30)m", ref: 87 },
      { formation: "6+?×6", dims: "2×(25×20)m", ref: 42 },
      { formation: "6+?×6", dims: "2×(20×15)m", ref: 25 },
      { formation: "4+?×4", dims: "2×(25×20)m", ref: 62 },
      { formation: "4+?×4", dims: "2×(18×15)m", ref: 34 },
      { formation: "4+?×4", dims: "2×(15×10)m", ref: 19 },
    ],
  },
];

const COL_GROUPS = [
  { label: "SGJ: 8×8 – 10×10", color: "#38bdf8", cols: [0, 1, 2], sub: ["EG", "EM", "EP"] },
  { label: "SMJ: 5×5 – 7×7",   color: "#a78bfa", cols: [3, 4, 5], sub: ["EG", "EM", "EP"] },
  { label: "SRJ: 3×3 – 4×4",   color: "#fb923c", cols: [6, 7, 8], sub: ["EG", "EM", "EP"] },
];

function calc(ref, userArea) {
  return Math.round(ref * userArea / STD_AREA);
}

function FieldInput({ label, value, onChange }) {
  const area = (Number(value.ancho) || 0) * (Number(value.largo) || 0);
  const inputSt = {
    width: "100%", padding: "7px 10px", borderRadius: 8,
    background: "#1c2128", border: `1px solid ${COLORS.line}`,
    color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ flex: 1, background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px", border: `1px solid ${COLORS.line}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 3 }}>Ancho (m)</div>
          <input type="number" min={1} value={value.ancho}
            onChange={(e) => onChange({ ...value, ancho: e.target.value })}
            className="no-arrows" style={inputSt} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 3 }}>Largo (m)</div>
          <input type="number" min={1} value={value.largo}
            onChange={(e) => onChange({ ...value, largo: e.target.value })}
            className="no-arrows" style={inputSt} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: COLORS.lime, fontWeight: 700 }}>
        Área: {area > 0 ? area.toLocaleString("es-ES") : "—"} m²
        {area > 0 && <span style={{ color: COLORS.text, fontWeight: 400 }}> · {Math.round(area / 20)} m²/jug</span>}
      </div>
    </div>
  );
}

export default function SpacesCalculatorModal({ onClose }) {
  const [casa,  setCasa]  = useState(DEFAULT_CASA);
  const [fuera, setFuera] = useState(DEFAULT_FUERA);

  // ── Per-space calculator ──────────────────────────────────────────────
  const [calcM2,      setCalcM2]      = useState("");
  const [calcPlayers, setCalcPlayers] = useState("");
  const [calcSide,    setCalcSide]    = useState("");
  const [calcAxis,    setCalcAxis]    = useState("largo"); // which side user provides

  const casaArea  = (Number(casa.ancho)  || 0) * (Number(casa.largo)  || 0);
  const fueraArea = (Number(fuera.ancho) || 0) * (Number(fuera.largo) || 0);

  const calcArea   = (Number(calcM2) || 0) * (Number(calcPlayers) || 0);
  const calcResult = calcArea > 0 && Number(calcSide) > 0
    ? (calcArea / Number(calcSide)).toFixed(1)
    : null;
  const calcResultLabel = calcAxis === "largo" ? "Ancho" : "Largo";

  const thSt  = (color) => ({ fontSize: 9, fontWeight: 700, color, textAlign: "center", padding: "4px 3px", whiteSpace: "nowrap", borderBottom: `2px solid ${color}44` });
  const subSt = { fontSize: 9, color: COLORS.text, textAlign: "center", padding: "3px 2px", fontWeight: 600, borderBottom: `1px solid ${COLORS.line}` };
  const tdSt  = { fontSize: 9, color: COLORS.text, textAlign: "center", padding: "2px 3px", lineHeight: 1.4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", zIndex: 80, overflowY: "auto" }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.25rem", width: "100%", maxWidth: 700, marginBottom: "2rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.text }}>
            📐 Calculadora de espacios
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>

        {/* Field inputs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <FieldInput label="🏟 Campo CASA" value={casa} onChange={setCasa} />
          <FieldInput label="🚌 Campo VISITANTE" value={fuera} onChange={setFuera} />
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 700 }}>Unidades: m²/jug</div>
          {[
            { color: "#38bdf8", label: "Evidencia científica (campo ref. 105×68m)" },
            { color: "#ff5a5f", label: "Campo casa" },
            { color: "#4ade80", label: "Campo visitante" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 9, color: COLORS.text }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Main table */}
        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table style={{ borderCollapse: "collapse", minWidth: 560, width: "100%", fontSize: 9 }}>
            <thead>
              <tr>
                <th style={{ ...thSt(COLORS.text), textAlign: "left", padding: "4px 6px", minWidth: 80 }}></th>
                {COL_GROUPS.map((cg) => (
                  <th key={cg.label} colSpan={3} style={thSt(cg.color)}>{cg.label}</th>
                ))}
                <th style={{ ...thSt(COLORS.text), minWidth: 90 }}>TIPOS DE SJ</th>
              </tr>
              <tr>
                <th style={{ ...subSt, textAlign: "left", padding: "3px 6px" }}></th>
                {COL_GROUPS.flatMap((cg) => cg.sub.map((s) => (
                  <th key={`${cg.label}-${s}`} style={subSt}>{s}</th>
                )))}
                <th style={subSt}></th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((grp, gi) => (
                <>
                  {/* Formation row */}
                  <tr key={`${gi}-form`} style={{ background: `${COLORS.panelRaised}` }}>
                    <td style={{ ...tdSt, textAlign: "left", padding: "3px 6px", color: COLORS.text, borderTop: `1px solid ${COLORS.line}` }}></td>
                    {grp.cells.map((c, ci) => {
                      const cg = COL_GROUPS.find((g) => g.cols.includes(ci));
                      return (
                        <td key={ci} style={{ ...tdSt, color: cg?.color || COLORS.text, fontWeight: 700, borderTop: `1px solid ${COLORS.line}` }}>
                          {c.formation}
                        </td>
                      );
                    })}
                    <td rowSpan={4} style={{ ...tdSt, verticalAlign: "middle", padding: "6px 8px", fontWeight: 700, color: COLORS.text, borderTop: `1px solid ${COLORS.line}`, borderLeft: `1px solid ${COLORS.line}`, lineHeight: 1.5, textAlign: "center", fontSize: 9 }}>
                      {grp.label}
                      {grp.multiSpace && (
                        <div style={{ color: "#ff5a5f", fontWeight: 700, fontSize: 8, marginTop: 4 }}>MULTIPLICAR ÁREA RELATIVA ×2</div>
                      )}
                    </td>
                  </tr>
                  {/* Dims row */}
                  <tr key={`${gi}-dims`}>
                    <td style={{ ...tdSt, textAlign: "left", padding: "2px 6px", color: COLORS.text }}></td>
                    {grp.cells.map((c, ci) => {
                      const cg = COL_GROUPS.find((g) => g.cols.includes(ci));
                      return (
                        <td key={ci} style={{ ...tdSt, color: `${cg?.color || COLORS.text}99` }}>{c.dims}</td>
                      );
                    })}
                  </tr>
                  {/* Reference (evidence) row */}
                  <tr key={`${gi}-ref`}>
                    <td style={{ ...tdSt, textAlign: "left", padding: "2px 6px", color: "#38bdf8", fontWeight: 700 }}>Ref.</td>
                    {grp.cells.map((c, ci) => (
                      <td key={ci} style={{ ...tdSt, color: "#38bdf8", fontWeight: 700 }}>{c.ref}</td>
                    ))}
                  </tr>
                  {/* Casa row */}
                  <tr key={`${gi}-casa`}>
                    <td style={{ ...tdSt, textAlign: "left", padding: "2px 6px", color: "#ff5a5f", fontWeight: 700 }}>Casa</td>
                    {grp.cells.map((c, ci) => (
                      <td key={ci} style={{ ...tdSt, color: "#ff5a5f", fontWeight: 600 }}>
                        {casaArea > 0 ? calc(c.ref, casaArea) : "—"}
                      </td>
                    ))}
                  </tr>
                  {/* Fuera row */}
                  <tr key={`${gi}-fuera`} style={{ borderBottom: `2px solid ${COLORS.line}` }}>
                    <td style={{ ...tdSt, textAlign: "left", padding: "2px 6px", color: "#4ade80", fontWeight: 700, paddingBottom: 6 }}>Visita</td>
                    {grp.cells.map((c, ci) => (
                      <td key={ci} style={{ ...tdSt, color: "#4ade80", fontWeight: 600, paddingBottom: 6 }}>
                        {fueraArea > 0 ? calc(c.ref, fueraArea) : "—"}
                      </td>
                    ))}
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Evidencia científica summary */}
        <div style={{ background: "#0c1520", border: "1px solid #38bdf844", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", marginBottom: 8 }}>EVIDENCIA CIENTÍFICA</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "4px 14px", color: COLORS.text, textAlign: "left", borderBottom: `1px solid ${COLORS.line}` }}></th>
                  <th style={{ padding: "4px 14px", color: COLORS.text, textAlign: "center", borderBottom: `1px solid ${COLORS.line}` }}>ANCHO</th>
                  <th style={{ padding: "4px 14px", color: COLORS.text, textAlign: "center", borderBottom: `1px solid ${COLORS.line}` }}>LARGO</th>
                  <th style={{ padding: "4px 14px", color: COLORS.text, textAlign: "center", borderBottom: `1px solid ${COLORS.line}` }}>ÁREA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 14px", color: "#ff5a5f", fontWeight: 700 }}>CASA</td>
                  <td style={{ padding: "4px 14px", color: "#38bdf8", fontWeight: 700, textAlign: "center" }}>{DEFAULT_CASA.ancho}</td>
                  <td style={{ padding: "4px 14px", color: "#38bdf8", fontWeight: 700, textAlign: "center" }}>{DEFAULT_CASA.largo}</td>
                  <td style={{ padding: "4px 14px", color: "#4ade80", fontWeight: 700, textAlign: "center" }}>{DEFAULT_CASA.ancho * DEFAULT_CASA.largo}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 14px", color: "#4ade80", fontWeight: 700 }}>FUERA</td>
                  <td style={{ padding: "4px 14px", color: "#38bdf8", fontWeight: 700, textAlign: "center" }}>{DEFAULT_FUERA.ancho}</td>
                  <td style={{ padding: "4px 14px", color: "#38bdf8", fontWeight: 700, textAlign: "center" }}>{DEFAULT_FUERA.largo}</td>
                  <td style={{ padding: "4px 14px", color: "#4ade80", fontWeight: 700, textAlign: "center" }}>{DEFAULT_FUERA.ancho * DEFAULT_FUERA.largo}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Space calculator */}
        <div style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 12 }}>
            Calculadora de dimensiones
          </div>
          <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 10, opacity: 0.8 }}>
            Introduce los m²/jug, el nº de jugadores y uno de los lados para obtener el otro.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>m²/jug</div>
              <input type="number" min={1} value={calcM2} onChange={(e) => setCalcM2(e.target.value)} placeholder="Ej: 125"
                className="no-arrows"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Nº jugadores</div>
              <input type="number" min={1} value={calcPlayers} onChange={(e) => setCalcPlayers(e.target.value)} placeholder="Ej: 20"
                className="no-arrows"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>
                <select value={calcAxis} onChange={(e) => setCalcAxis(e.target.value)}
                  style={{ background: "transparent", border: "none", color: COLORS.lime, fontSize: 10, fontWeight: 700, cursor: "pointer", outline: "none" }}>
                  <option value="largo">Largo conocido (m)</option>
                  <option value="ancho">Ancho conocido (m)</option>
                </select>
              </div>
              <input type="number" min={1} value={calcSide} onChange={(e) => setCalcSide(e.target.value)} placeholder="Ej: 50"
                className="no-arrows"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          {calcArea > 0 && (
            <div style={{ background: "#0c1520", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 2 }}>Área total</div>
                <div style={{ fontSize: 16, color: "#38bdf8", fontWeight: 700 }}>{calcArea.toLocaleString("es-ES")} m²</div>
              </div>
              {calcResult && (
                <div>
                  <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 2 }}>{calcResultLabel} resultante</div>
                  <div style={{ fontSize: 16, color: COLORS.lime, fontWeight: 700 }}>{calcResult} m</div>
                </div>
              )}
              {calcResult && Number(calcSide) > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 2 }}>Dimensiones</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>
                    {calcAxis === "largo"
                      ? `${calcResult} × ${calcSide} m`
                      : `${calcSide} × ${calcResult} m`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
