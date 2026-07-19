"use client";
import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import {
  todayStr, addDays, fmtDateShort, sessionLoad, acwr, acwrStatus, mean, monotony, trainingStress, variability,
  weightedWellnessScore,
} from "@/lib/utils";
import Avatar from "./Avatar";
import LoadControlPdfModal from "./LoadControlPdfModal";

/* ── Color helpers ─────────────────────────────────────────────────── */
const wsColor  = (v) => v === null ? COLORS.text : v >= 7.5 ? COLORS.lime : v >= 5 ? "#f2c63c" : COLORS.coral;
const rpeColor = (v) => v === null ? COLORS.text : v <= 6 ? COLORS.lime : v <= 7.5 ? "#f2c63c" : COLORS.coral;
const acWsColor = (v) => v === null ? COLORS.text : v > 1.3 ? COLORS.lime : v >= 0.8 ? "#f2c63c" : COLORS.coral;
const acRpeColor = (v) => v === null ? COLORS.text : v > 1.3 ? COLORS.coral : v >= 0.8 ? COLORS.lime : "#f2c63c";
const monoColor = (v) => v === null ? COLORS.text : v >= 3.5 ? COLORS.coral : v >= 2.5 ? "#f2c63c" : COLORS.lime;
const stressColor = (v) => v === null ? COLORS.text : (v < 2000 || v > 8000) ? COLORS.coral : v >= 5000 ? "#f2c63c" : COLORS.lime;
const varColor = (v, max) => {
  if (v === null || max === 0) return COLORS.text;
  const pct = Math.min(v / max, 1);
  const r = Math.round(163 * (1 - pct) + 30 * pct);
  const g = Math.round(230 * pct + 80 * (1 - pct));
  const b = Math.round(100 * pct + 80 * (1 - pct));
  return `rgb(${r},${g},${b})`;
};

/* ── Is "red" for alert counting ───────────────────────────────────── */
const isRed = {
  wsMedio: (v) => v !== null && v < 5,
  wsAC:    (v) => v !== null && v <= 0.8,
  wsMono:  (v) => v !== null && v >= 3.5,
  wsStr:   (v) => v !== null && (v < 2000 || v > 8000),
  rpeMedio:(v) => v !== null && v > 7.5,
  rpeAC:   (v) => v !== null && v > 1.3,
  rpeMono: (v) => v !== null && v >= 3.5,
  rpeStr:  (v) => v !== null && (v < 2000 || v > 8000),
};

/* ── Metric cell ────────────────────────────────────────────────────── */
function Cell({ value, color, fmt = (v) => v !== null ? (typeof v === "number" ? v.toFixed(1) : v) : "–" }) {
  return (
    <td style={{ textAlign: "center", padding: "6px 4px", borderBottom: `1px solid ${COLORS.line}` }}>
      <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13, color }}>{fmt(value)}</span>
    </td>
  );
}

/* ── Quadrant chart (X=WS, Y=RPE) ──────────────────────────────────── */
function QuadrantChart({ players, PersonLabel, isIndividual, isFem, isMixto }) {
  const [selected, setSelected] = useState(null);
  const svgW = 300, svgH = 260;
  const pad = { l: 28, r: 10, t: 10, b: 28 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;
  const xMid = 5, yMid = 5;
  const maxX = 10, maxY = 10;

  const px = (ws) => pad.l + (ws / maxX) * plotW;
  const py = (rpe) => svgH - pad.b - (rpe / maxY) * plotH;

  const adjSing = isFem ? "cargada" : "cargado";
  const adjPlural = isMixto ? "cargad@s" : isFem ? "cargadas" : "cargados";
  const malSing = isFem ? "adaptada" : "adaptado";
  const malPlural = isMixto ? "adaptad@s" : isFem ? "adaptadas" : "adaptados";
  const quadLabels = [
    { x: pad.l + 4,             y: pad.t + 14,         text: isIndividual ? `Atleta ${adjSing}`  : `${PersonLabel} ${adjPlural}`, color: "#ff9f40" },
    { x: pad.l + plotW / 2 + 4, y: pad.t + 14,         text: "Asimila bien la carga",                                            color: COLORS.lime },
    { x: pad.l + 4,             y: svgH - pad.b - 6,   text: isIndividual ? `Mal ${malSing}`     : `Mal ${malPlural}`,            color: COLORS.coral },
    { x: pad.l + plotW / 2 + 4, y: svgH - pad.b - 6,   text: isIndividual ? `Poco ${adjSing}`   : `Poco ${adjPlural}`,           color: COLORS.blue },
  ];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }}>
      {/* Fondo cuadrantes */}
      <rect x={pad.l} y={pad.t} width={px(xMid) - pad.l} height={py(yMid) - pad.t} fill="#ff9f40" opacity={0.07} />
      <rect x={px(xMid)} y={pad.t} width={svgW - pad.r - px(xMid)} height={py(yMid) - pad.t} fill={COLORS.lime} opacity={0.07} />
      <rect x={pad.l} y={py(yMid)} width={px(xMid) - pad.l} height={svgH - pad.b - py(yMid)} fill={COLORS.coral} opacity={0.07} />
      <rect x={px(xMid)} y={py(yMid)} width={svgW - pad.r - px(xMid)} height={svgH - pad.b - py(yMid)} fill={COLORS.blue} opacity={0.07} />

      {/* Ejes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={svgH - pad.b} stroke={COLORS.text} strokeWidth={1} />
      <line x1={pad.l} y1={svgH - pad.b} x2={svgW - pad.r} y2={svgH - pad.b} stroke={COLORS.text} strokeWidth={1} />
      {/* Líneas divisorias */}
      <line x1={px(xMid)} y1={pad.t} x2={px(xMid)} y2={svgH - pad.b} stroke={COLORS.text} strokeWidth={1} strokeDasharray="4 3" />
      <line x1={pad.l} y1={py(yMid)} x2={svgW - pad.r} y2={py(yMid)} stroke={COLORS.text} strokeWidth={1} strokeDasharray="4 3" />

      {/* Marcas eje X: 0, 2.5, 5, 7.5, 10 */}
      {[0, 2.5, 5, 7.5, 10].map((v) => (
        <g key={`x${v}`}>
          <line x1={px(v)} y1={svgH - pad.b} x2={px(v)} y2={svgH - pad.b + 3} stroke={COLORS.text} strokeWidth={0.5} />
          <text x={px(v)} y={svgH - pad.b + 10} textAnchor="middle" fill={COLORS.text} fontSize={7}>{v}</text>
        </g>
      ))}

      {/* Marcas eje Y: 0, 2.5, 5, 7.5, 10 */}
      {[0, 2.5, 5, 7.5, 10].map((v) => (
        <g key={`y${v}`}>
          <line x1={pad.l - 3} y1={py(v)} x2={pad.l} y2={py(v)} stroke={COLORS.text} strokeWidth={0.5} />
          <text x={pad.l - 5} y={py(v)} textAnchor="end" dominantBaseline="middle" fill={COLORS.text} fontSize={7}>{v}</text>
        </g>
      ))}

      {/* Etiquetas de cuadrante */}
      {quadLabels.map((q, i) => (
        <text key={i} x={q.x} y={q.y} fontSize={7} fill={q.color} fontWeight="600">{q.text}</text>
      ))}

      {/* Etiquetas eje */}
      <text x={pad.l + plotW / 2} y={svgH - 2} fontSize={7} fill={COLORS.text} textAnchor="middle">WS →</text>
      <text x={8} y={pad.t + plotH / 2} fontSize={7} fill={COLORS.text} textAnchor="middle" transform={`rotate(-90, 8, ${pad.t + plotH / 2})`}>RPE →</text>

      {/* Clips para fotos circulares */}
      <defs>
        {players.map((p) => p.avgWS !== null && p.avgRpe !== null && (
          <clipPath key={`clip-${p.username}`} id={`clip-${p.username}`}>
            <circle cx={px(p.avgWS)} cy={py(p.avgRpe)} r={8} />
          </clipPath>
        ))}
      </defs>

      {/* Puntos de jugadores */}
      {players.map((p) => {
        if (p.avgWS === null || p.avgRpe === null) return null;
        const cx = px(p.avgWS);
        const cy = py(p.avgRpe);
        const isSelected = selected === p.username;
        const initials = (p.displayName || p.username).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        return (
          <g key={p.username} style={{ cursor: "pointer" }} onClick={() => setSelected(isSelected ? null : p.username)}>
            {/* Fondo círculo */}
            <circle cx={cx} cy={cy} r={8} fill={COLORS.panelRaised} stroke={COLORS.text} strokeWidth={0.8} />
            {p.photoUrl ? (
              <image href={p.photoUrl} x={cx - 8} y={cy - 8} width={16} height={16} clipPath={`url(#clip-${p.username})`} preserveAspectRatio="xMidYMid slice" />
            ) : (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill={COLORS.text} fontSize={6} fontWeight="700">{initials}</text>
            )}
            {/* Nombre al seleccionar */}
            {isSelected && (
              <g>
                <rect x={cx - 44} y={cy - 26} width={88} height={14} rx={3} fill={COLORS.panelRaised} stroke={COLORS.line} strokeWidth={0.5} />
                <text x={cx} y={cy - 19} textAnchor="middle" dominantBaseline="central" fill={COLORS.text} fontSize={8} fontWeight="600">
                  {(p.displayName || p.username).slice(0, 22)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Player names by quadrant ───────────────────────────────────────── */
function QuadrantLists({ players, onPlayerClick, PersonLabel, isIndividual, isFem, isMixto }) {
  const xMid = 5, yMid = 5;
  const adjSing = isFem ? "cargada" : "cargado";
  const adjPlural = isMixto ? "cargad@s" : isFem ? "cargadas" : "cargados";
  const malSing = isFem ? "adaptada" : "adaptado";
  const malPlural = isMixto ? "adaptad@s" : isFem ? "adaptadas" : "adaptados";
  const quads = [
    { label: "Asimila bien la carga",                                                         color: COLORS.lime,  filter: (p) => p.avgWS >= xMid && p.avgRpe >= yMid },
    { label: isIndividual ? `Atleta ${adjSing}`        : `${PersonLabel} ${adjPlural}`,       color: "#ff9f40",    filter: (p) => p.avgWS < xMid  && p.avgRpe >= yMid },
    { label: isIndividual ? `Poco ${adjSing}`          : `Poco ${adjPlural}`,                 color: COLORS.blue,  filter: (p) => p.avgWS >= xMid && p.avgRpe < yMid  },
    { label: isIndividual ? `Mal ${malSing} a la carga` : `Mal ${malPlural} a la carga`,      color: COLORS.coral, filter: (p) => p.avgWS < xMid  && p.avgRpe < yMid  },
    { label: "Sin datos",               color: COLORS.text,  filter: (p) => p.avgWS === null || p.avgRpe === null },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {quads.filter((q) => q.label !== "Sin datos").map((q) => {
        const list = players.filter(q.filter);
        return (
          <div key={q.label} style={{ background: COLORS.panelRaised, border: `1px solid ${q.color}`, borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: q.color, marginBottom: 6 }}>{q.label} <span style={{ color: COLORS.text, fontWeight: 400 }}>({list.length})</span></div>
            {list.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.text }}>–</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {list.map((p) => (
                  <button key={p.username} onClick={() => onPlayerClick?.(p)} style={{
                    background: "none", border: "none", padding: "1px 0",
                    fontSize: 12, color: COLORS.text, cursor: "pointer", textAlign: "left",
                  }}>
                    {p.displayName || p.username}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────── */
export default function LoadControlPanel({ team, wellness, rpe, sessions, onPlayerClick, teamGender = "masculino" }) {
  const today = todayStr();
  const roster = team.roster || [];
  const kind = team.kind || "equipo";
  const isIndividual = kind === "individual";
  const isFem = teamGender === "femenino";
  const isMixto = teamGender === "mixto";
  const personLabel = kind === "equipo" ? (isFem ? "jugadoras" : "jugadores") : "atletas";
  const PersonLabel = kind === "equipo" ? (isFem ? "Jugadoras" : "Jugadores") : "Atletas";
  const personLabelSing = kind === "equipo" ? (isFem ? "jugadora" : "jugador") : "atleta";
  const adjPlural = isMixto ? "cargad@s" : isFem ? "cargadas" : "cargados";
  const adjSing = isFem ? "cargada" : "cargado";
  const adjMalPlural = isMixto ? "adaptad@s" : isFem ? "adaptadas" : "adaptados";
  const adjMalSing = isFem ? "adaptada" : "adaptado";
  const adjLowPlural = isMixto ? "cargad@s" : isFem ? "cargadas" : "cargados";
  const adjLowSing = isFem ? "cargada" : "cargado";
  const [showPdf, setShowPdf] = useState(false);

  const playerStats = useMemo(() => {
    const d7  = addDays(today, -6);
    const d28 = addDays(today, -27);
    const d7prior = addDays(today, -27); // 21 days prior start (day -7 to -27)
    const d7priorEnd = addDays(today, -7);

    return roster.map((player) => {
      const myW = wellness.filter((e) => e.username === player.username);
      const myR = rpe.filter((e) => e.username === player.username);
      const allLoads = myR.map((e) => ({ date: e.date, load: sessionLoad(e) }));

      /* WS metrics */
      const w7 = myW.filter((e) => e.date >= d7 && e.date <= today).map((e) => weightedWellnessScore(e));
      const wPrior = myW.filter((e) => e.date >= d7prior && e.date <= d7priorEnd).map((e) => weightedWellnessScore(e));
      const wsMedio = w7.length ? mean(w7) : null;
      const wsAC    = wsMedio !== null && wPrior.length ? wsMedio / mean(wPrior) : null;
      const wsMono  = w7.length >= 3 ? monotony(w7) : null;
      const wsStr   = wsMono !== null && wsMedio !== null ? trainingStress(w7) : null;
      const wsVar   = w7.length >= 3 ? variability(w7) : null;

      /* RPE metrics */
      const r7 = myR.filter((e) => e.date >= d7 && e.date <= today).map((e) => e.rpe);
      const rPrior = myR.filter((e) => e.date >= d7prior && e.date <= d7priorEnd).map((e) => e.rpe);
      const rpeMedio = r7.length ? mean(r7) : null;
      /* sRPE metrics (monotonía/stress/var sobre carga de sesión) */
      const sl7 = myR.filter((e) => e.date >= d7 && e.date <= today).map((e) => sessionLoad(e));
      const slPrior = myR.filter((e) => e.date >= d7prior && e.date <= d7priorEnd).map((e) => sessionLoad(e));
      const srpeMedio = sl7.length ? mean(sl7) : null;
      const rpeAC   = srpeMedio !== null && slPrior.length ? srpeMedio / mean(slPrior) : null;
      const rpeMono = sl7.length >= 3 ? monotony(sl7) : null;
      const rpeStr  = rpeMono !== null && srpeMedio !== null ? trainingStress(sl7) : null;
      const rpeVar  = sl7.length >= 3 ? variability(sl7) : null;

      /* For quadrant */
      const avgWS  = wsMedio;
      const avgRpe = rpeMedio;

      /* Alert count */
      const redCount = [
        isRed.wsMedio(wsMedio), isRed.wsAC(wsAC), isRed.wsMono(wsMono), isRed.wsStr(wsStr),
        isRed.rpeMedio(rpeMedio), isRed.rpeAC(rpeAC), isRed.rpeMono(rpeMono), isRed.rpeStr(rpeStr),
      ].filter(Boolean).length;

      /* ACWR sRPE */
      const acwrVal = acwr(allLoads, today);

      return { ...player, wsMedio, wsAC, wsMono, wsStr, wsVar, rpeMedio, srpeMedio, rpeAC, rpeMono, rpeStr, rpeVar, avgWS, avgRpe, redCount, acwrVal };
    });
  }, [roster, wellness, rpe, today]);

  const maxWsVar  = Math.max(...playerStats.map((p) => p.wsVar  ?? 0), 1);
  const maxRpeVar = Math.max(...playerStats.map((p) => p.rpeVar ?? 0), 1);

  const alertPlayers = playerStats.filter((p) => p.redCount >= 4);
  const acwrRisk = playerStats.filter((p) => p.acwrVal !== null && (p.acwrVal > 1.5 || p.acwrVal < 0.8));
  const totalWithData = playerStats.filter((p) => p.acwrVal !== null).length;

  const thStyle = { fontSize: 8, color: COLORS.text, padding: "4px 4px", textAlign: "center", fontWeight: 600, borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap" };
  const tdName = { fontSize: 11, color: COLORS.text, padding: "6px 6px", borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap", fontWeight: 600 };

  return (
    <div>
      {/* ── Botón PDF ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button onClick={() => setShowPdf(true)} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, color: COLORS.text, cursor: "pointer", fontWeight: 600 }}>
          Exportar PDF
        </button>
      </div>

      {/* ── Alertas ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${alertPlayers.length > 0 ? COLORS.coral : COLORS.line}`, borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 4 }}>{isIndividual ? (isFem ? "Atleta en alerta" : "Atleta en alerta") : `${PersonLabel} en alerta`}</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 26, color: alertPlayers.length > 0 ? COLORS.coral : COLORS.lime }}>
            {alertPlayers.length}<span style={{ fontSize: 14, color: COLORS.text, fontWeight: 400 }}>/{roster.length}</span>
          </div>
          <div style={{ fontSize: 9, color: COLORS.text, marginTop: 2 }}>≥4 parámetros en rojo</div>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${acwrRisk.length > 0 ? COLORS.amber : COLORS.line}`, borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 4 }}>Riesgo ACWR sRPE</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 26, color: acwrRisk.length > 0 ? COLORS.amber : COLORS.lime }}>
            {acwrRisk.length}<span style={{ fontSize: 14, color: COLORS.text, fontWeight: 400 }}>/{totalWithData}</span>
          </div>
          <div style={{ fontSize: 9, color: COLORS.text, marginTop: 2 }}>ACWR {">"} 1.5 o {"<"} 0.8</div>
        </div>
      </div>

      {/* ── Leyenda ─────────────────────────────────────────────────── */}
      <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>Rangos de color</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { label: "A/C WS", items: [{ c: COLORS.lime, t: ">1.3 Óptimo" }, { c: "#f2c63c", t: "0.8–1.3 Normal" }, { c: COLORS.coral, t: "≤0.8 Alerta" }] },
            { label: "A/C sRPE", items: [{ c: COLORS.lime, t: "0.8–1.3 Óptimo" }, { c: "#f2c63c", t: "≤0.8 Bajo" }, { c: COLORS.coral, t: ">1.3 Alto" }] },
            { label: "Monotonía", items: [{ c: COLORS.lime, t: "<2.5 Baja" }, { c: "#f2c63c", t: "2.5–3.5 Media" }, { c: COLORS.coral, t: "≥3.5 Alta" }] },
            { label: "Stress", items: [{ c: COLORS.lime, t: "2000–5000" }, { c: "#f2c63c", t: "5000–8000" }, { c: COLORS.coral, t: "<2000 o >8000" }] },
          ].map(({ label, items }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, color: COLORS.text, fontWeight: 600, minWidth: 46 }}>{label}:</span>
              {items.map(({ c, t }) => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: COLORS.text }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block", flexShrink: 0 }} />{t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabla WS ────────────────────────────────────────────────── */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.75rem", marginBottom: 14, overflowX: "auto" }}>
        <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>Wellness Score · últimos 7 días</div>
        <div style={{ fontSize: 8, color: COLORS.text, marginBottom: 8, lineHeight: 1.6 }}>
          <b>Medio</b> = media 7d &nbsp;·&nbsp;
          <b>A/C</b> = media7d / media21d previos &nbsp;·&nbsp;
          <b>Monotonía</b> = media/desv.típica &nbsp;·&nbsp;
          <b>Stress</b> = media × monotonía &nbsp;·&nbsp;
          <b>Variabilidad</b> = desviación típica
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>{isIndividual ? "Atleta" : personLabelSing.charAt(0).toUpperCase() + personLabelSing.slice(1)}</th>
              <th style={thStyle}>Medio</th>
              <th style={thStyle}>A/C</th>
              <th style={thStyle}>Monotonía</th>
              <th style={thStyle}>Stress</th>
              <th style={thStyle}>Variabilidad</th>
            </tr>
          </thead>
          <tbody>
            {playerStats.map((p) => (
              <tr key={p.username} onClick={() => onPlayerClick?.(p)} style={{ cursor: "pointer" }}>
                <td style={tdName}>{p.displayName || p.username}</td>
                <Cell value={p.wsMedio} color={wsColor(p.wsMedio)} />
                <Cell value={p.wsAC} color={acWsColor(p.wsAC)} />
                <Cell value={p.wsMono} color={monoColor(p.wsMono)} />
                <Cell value={p.wsStr} color={stressColor(p.wsStr)} fmt={(v) => v !== null ? Math.round(v).toString() : "–"} />
                <Cell value={p.wsVar} color={varColor(p.wsVar, maxWsVar)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Tabla RPE ───────────────────────────────────────────────── */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.75rem", marginBottom: 20, overflowX: "auto" }}>
        <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>RPE · últimos 7 días</div>
        <div style={{ fontSize: 8, color: COLORS.text, marginBottom: 8, lineHeight: 1.6 }}>
          <b>Medio</b> = media RPE 7d &nbsp;·&nbsp;
          <b>sRPE</b> = media carga sesión 7d &nbsp;·&nbsp;
          <b>A/C</b> = sRPE media7d / sRPE media21d previos &nbsp;·&nbsp;
          <b>Monotonía</b> = media/desv.típica sRPE &nbsp;·&nbsp;
          <b>Stress</b> = media × monotonía sRPE &nbsp;·&nbsp;
          <b>Variabilidad</b> = desviación típica sRPE
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>{isIndividual ? "Atleta" : personLabelSing.charAt(0).toUpperCase() + personLabelSing.slice(1)}</th>
              <th style={thStyle}>Medio</th>
              <th style={thStyle}>sRPE</th>
              <th style={thStyle}>A/C</th>
              <th style={thStyle}>Monotonía</th>
              <th style={thStyle}>Stress</th>
              <th style={thStyle}>Variabilidad</th>
            </tr>
          </thead>
          <tbody>
            {playerStats.map((p) => (
              <tr key={p.username} onClick={() => onPlayerClick?.(p)} style={{ cursor: "pointer" }}>
                <td style={tdName}>{p.displayName || p.username}</td>
                <Cell value={p.rpeMedio} color={rpeColor(p.rpeMedio)} />
                <Cell value={p.srpeMedio} color={COLORS.text} fmt={(v) => v !== null ? Math.round(v).toString() : "–"} />
                <Cell value={p.rpeAC} color={acRpeColor(p.rpeAC)} />
                <Cell value={p.rpeMono} color={monoColor(p.rpeMono)} />
                <Cell value={p.rpeStr} color={stressColor(p.rpeStr)} fmt={(v) => v !== null ? Math.round(v).toString() : "–"} />
                <Cell value={p.rpeVar} color={varColor(p.rpeVar, maxRpeVar)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cuadrante WS vs RPE ─────────────────────────────────────── */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.75rem", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 600, marginBottom: 8 }}>Cuadrante Wellness vs RPE · media semana</div>
        <QuadrantChart players={playerStats} PersonLabel={PersonLabel} isIndividual={isIndividual} isFem={isFem} isMixto={isMixto} />
        <div style={{ marginTop: 12 }}>
          <QuadrantLists players={playerStats} onPlayerClick={onPlayerClick} PersonLabel={PersonLabel} isIndividual={isIndividual} isFem={isFem} isMixto={isMixto} />
        </div>
      </div>

      {showPdf && (
        <LoadControlPdfModal
          team={team}
          wellness={wellness}
          rpe={rpe}
          sessions={sessions}
          onClose={() => setShowPdf(false)}
          teamGender={teamGender}
        />
      )}
    </div>
  );
}
