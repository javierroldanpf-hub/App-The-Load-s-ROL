"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { COLORS, RM_EXERCISES, PERFORMANCE_METRICS, EXTERNAL_LOAD_METRICS } from "@/lib/constants";
import { todayStr, fmtDateLong, extractPhysicalMetricValue, physicalQuadrantMetricOptions } from "@/lib/utils";
import { loadPlayerPhysicalHistory, savePhysicalEntry, saveTeam, getLatestWeight, loadPlayerWeightHistory } from "@/lib/db";
import Avatar from "./Avatar";
import PhysicalDataView from "./PhysicalDataView";

const PDF_COLORS = { tr: "#a3e635", tl: "#60a5fa", br: "#fbbf24", bl: "#f87171" };

function PdfQuadrantChart({ cfg, allPhysical, player, team }) {
  const metricOptions = physicalQuadrantMetricOptions(team?.customTestDefs || [], team?.customGpsDefs || []);
  const xLabel = metricOptions.find((m) => m.key === cfg.xKey)?.label || cfg.xKey;
  const yLabel = metricOptions.find((m) => m.key === cfg.yKey)?.label || cfg.yKey;
  const svgSize = 260;
  const pad = 44;
  const plotW = svgSize - pad * 2;
  const plotH = svgSize - pad * 2;

  const latestByPlayer = {};
  allPhysical.forEach((e) => { if (!latestByPlayer[e.username] || e.date > latestByPlayer[e.username].date) latestByPlayer[e.username] = e; });

  const allPoints = Object.entries(latestByPlayer).map(([username, e]) => ({
    username,
    x: extractPhysicalMetricValue(e, cfg.xKey),
    y: extractPhysicalMetricValue(e, cfg.yKey),
    isPlayer: username === player.username,
  })).filter((p) => p.x != null && p.y != null);

  if (!allPoints.length) return null;
  const allX = allPoints.map((p) => p.x);
  const allY = allPoints.map((p) => p.y);
  const rawMinX = Math.min(...allX), rawMaxX = Math.max(...allX);
  const rawMinY = Math.min(...allY), rawMaxY = Math.max(...allY);
  const pX = (rawMaxX - rawMinX) * 0.15 || 1;
  const pY = (rawMaxY - rawMinY) * 0.15 || 1;
  const minX = rawMinX - pX, maxX = rawMaxX + pX;
  const minY = rawMinY - pY, maxY = rawMaxY + pY;
  const toSX = (v) => pad + ((v - minX) / (maxX - minX || 1)) * plotW;
  const toSY = (v) => svgSize - pad - ((v - minY) / (maxY - minY || 1)) * plotH;
  const midX = cfg.xMid != null ? cfg.xMid : rawMinX + (rawMaxX - rawMinX) / 2;
  const midY = cfg.yMid != null ? cfg.yMid : rawMinY + (rawMaxY - rawMinY) / 2;
  const msx = toSX(midX), msy = toSY(midY);

  const col = {
    tr: cfg.quadrantColors?.tr || PDF_COLORS.tr,
    tl: cfg.quadrantColors?.tl || PDF_COLORS.tl,
    br: cfg.quadrantColors?.br || PDF_COLORS.br,
    bl: cfg.quadrantColors?.bl || PDF_COLORS.bl,
  };

  const playerPt = allPoints.find((p) => p.isPlayer);
  let playerQuadrant = null;
  let playerQuadrantColor = "#aaa";
  if (playerPt) {
    if (playerPt.x >= midX && playerPt.y >= midY) { playerQuadrant = cfg.quadrantNames?.tr || "Superior derecho"; playerQuadrantColor = col.tr; }
    else if (playerPt.x < midX && playerPt.y >= midY) { playerQuadrant = cfg.quadrantNames?.tl || "Superior izquierdo"; playerQuadrantColor = col.tl; }
    else if (playerPt.x >= midX && playerPt.y < midY) { playerQuadrant = cfg.quadrantNames?.br || "Inferior derecho"; playerQuadrantColor = col.br; }
    else { playerQuadrant = cfg.quadrantNames?.bl || "Inferior izquierdo"; playerQuadrantColor = col.bl; }
  }

  const fmt = (v) => Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const nTicks = 3;
  const xTicks = Array.from({ length: nTicks + 1 }, (_, i) => rawMinX + (i / nTicks) * (rawMaxX - rawMinX));
  const yTicks = Array.from({ length: nTicks + 1 }, (_, i) => rawMinY + (i / nTicks) * (rawMaxY - rawMinY));

  return (
    <div>
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ display: "block" }}>
        {/* Quad backgrounds */}
        <rect x={msx} y={pad}  width={svgSize-pad-msx} height={msy-pad}         fill={col.tr} fillOpacity={0.12} />
        <rect x={pad} y={pad}  width={msx-pad}          height={msy-pad}         fill={col.tl} fillOpacity={0.12} />
        <rect x={msx} y={msy} width={svgSize-pad-msx} height={svgSize-pad-msy} fill={col.br} fillOpacity={0.12} />
        <rect x={pad} y={msy} width={msx-pad}          height={svgSize-pad-msy} fill={col.bl} fillOpacity={0.12} />
        {/* Axes */}
        <line x1={pad} y1={pad} x2={pad} y2={svgSize-pad} stroke="#4a5568" strokeWidth={1.5} />
        <line x1={pad} y1={svgSize-pad} x2={svgSize-pad} y2={svgSize-pad} stroke="#4a5568" strokeWidth={1.5} />
        {xTicks.map((v, i) => <g key={i}><line x1={toSX(v)} y1={svgSize-pad} x2={toSX(v)} y2={svgSize-pad+3} stroke="#4a5568" strokeWidth={0.8} /><text x={toSX(v)} y={svgSize-pad+11} textAnchor="middle" fontSize={7} fontFamily="Oswald,sans-serif" fill="#eef1f4">{fmt(v)}</text></g>)}
        {yTicks.map((v, i) => <g key={i}><line x1={pad-3} y1={toSY(v)} x2={pad} y2={toSY(v)} stroke="#4a5568" strokeWidth={0.8} /><text x={pad-5} y={toSY(v)+3} textAnchor="end" fontSize={7} fontFamily="Oswald,sans-serif" fill="#eef1f4">{fmt(v)}</text></g>)}
        {/* Dividers */}
        <line x1={msx} y1={pad} x2={msx} y2={svgSize-pad} stroke="#5a6a7a" strokeWidth={1} strokeDasharray="4,3" />
        <line x1={pad} y1={msy} x2={svgSize-pad} y2={msy} stroke="#5a6a7a" strokeWidth={1} strokeDasharray="4,3" />
        {/* Other players — small gray dots */}
        {allPoints.filter((p) => !p.isPlayer).map((p, i) => (
          <circle key={i} cx={toSX(p.x)} cy={toSY(p.y)} r={5} fill="#4a5568" fillOpacity={0.7} />
        ))}
        {/* Player */}
        {playerPt && (() => {
          const cx = toSX(playerPt.x), cy = toSY(playerPt.y);
          const initials = (player.displayName || player.username || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          return (
            <>
              <circle cx={cx} cy={cy} r={14} fill={playerQuadrantColor} fillOpacity={0.9} />
              {player.photoUrl ? (
                <>
                  <defs><clipPath id="pdfclip"><circle cx={cx} cy={cy} r={12} /></clipPath></defs>
                  <image href={player.photoUrl} x={cx-12} y={cy-12} width={24} height={24} clipPath="url(#pdfclip)" preserveAspectRatio="xMidYMid slice" />
                </>
              ) : (
                <text x={cx} y={cy+4} textAnchor="middle" fontSize={9} fontFamily="Oswald,sans-serif" fontWeight="700" fill="#14171c">{initials}</text>
              )}
              <circle cx={cx} cy={cy} r={14} fill="none" stroke="#eef1f4" strokeWidth={1.5} />
            </>
          );
        })()}
        {/* Axis labels */}
        <text x={svgSize/2} y={svgSize-2} textAnchor="middle" fontSize={8} fontFamily="Oswald,sans-serif" fill="#eef1f4">{xLabel}</text>
        <text x={10} y={svgSize/2} textAnchor="middle" fontSize={8} fontFamily="Oswald,sans-serif" fill="#eef1f4" transform={`rotate(-90,10,${svgSize/2})`}>{yLabel}</text>
      </svg>
      {playerQuadrant && (
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <span style={{ display: "inline-block", background: playerQuadrantColor + "22", border: `1.5px solid ${playerQuadrantColor}`, borderRadius: 8, padding: "4px 14px", fontSize: 11, fontFamily: "'Oswald', sans-serif", fontWeight: 700, color: playerQuadrantColor }}>
            {playerQuadrant}
          </span>
        </div>
      )}
    </div>
  );
}

function PdfTable({ title, headers, rows, accent }) {
  const thStyle = { padding: "6px 10px", fontSize: 10, fontWeight: 700, color: accent || COLORS.lime, textAlign: "left", borderBottom: `1px solid #2e3640`, fontFamily: "'Oswald', sans-serif" };
  const tdStyle = { padding: "5px 10px", fontSize: 11, color: COLORS.text, borderBottom: `1px solid #1c2128` };
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: accent || COLORS.lime, marginBottom: 6 }}>{title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", background: COLORS.panelRaised, borderRadius: 10, overflow: "hidden" }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={{ ...thStyle, textAlign: i > 0 ? "center" : "left" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 1 ? "#1c2128" : "transparent" }}>
              {row.map((cell, ci) => <td key={ci} style={{ ...tdStyle, textAlign: ci > 0 ? "center" : "left", fontFamily: ci > 0 ? "'Oswald', sans-serif" : "inherit", fontWeight: ci > 0 ? 600 : 400 }}>{cell ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhysicalPdfModal({ player, team, entry, bodyWeight, profile, allPhysical, onClose }) {
  const reportRef = useRef();
  const [downloading, setDownloading] = useState(false);

  const fmtDate = (d) => { if (!d) return null; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
  const age = profile?.birthDate ? Math.floor((Date.now() - new Date(profile.birthDate)) / (1000 * 60 * 60 * 24 * 365.25)) : null;
  const physPdf = team.pdfSettings?.physical || {};
  const show = (key) => physPdf[key] !== false;
  const quadConfigs = team.quadrantConfigs || [];
  const BASE_PHYS_ORDER = ["personalData", "injuries", "forceTests", "performance", "customSections"];
  const DEFAULT_PHYS_ORDER = [...BASE_PHYS_ORDER, ...quadConfigs.map((_, i) => `quadrant_${i}`)];
  const storedOrder = physPdf.order || DEFAULT_PHYS_ORDER;
  // Merge: keep stored order for known keys, append new quadrant keys at end
  const allPhysKeys = [...BASE_PHYS_ORDER, ...quadConfigs.map((_, i) => `quadrant_${i}`)];
  const physSectionOrder = [
    ...storedOrder.filter((k) => allPhysKeys.includes(k)),
    ...allPhysKeys.filter((k) => !storedOrder.includes(k)),
  ];

  // ── Fuerza ──────────────────────────────────────────────────────────────
  const fuerzaBuiltIn = RM_EXERCISES.map((ex) => {
    const peso80 = entry[ex.key];
    const rm1 = peso80 != null ? Math.round((peso80 / 0.8) * 10) / 10 : null;
    const bwIdx = rm1 != null && bodyWeight ? Math.round((rm1 / bodyWeight) * 100) / 100 : null;
    return [ex.label, peso80 != null ? `${peso80} kg` : null, rm1 != null ? `${rm1} kg` : null, bwIdx];
  }).filter((r) => r[1] || r[2]);
  const fuerzaCustom = (team.customTestDefs || []).filter((d) => d.category === "Fuerza" && !d.formula).map((d) => {
    const v = entry.customTestValues?.[d.id];
    return [`${d.name}${d.unit ? ` (${d.unit})` : ""}`, v != null ? `${v} ${d.unit || ""}`.trim() : null, null, null];
  }).filter((r) => r[1]);
  const fuerzaRows = [...fuerzaBuiltIn, ...fuerzaCustom];

  // ── Rendimiento ─────────────────────────────────────────────────────────
  const reserve = entry.vam != null && entry.vmax != null ? Math.round((entry.vmax - entry.vam) * 10) / 10 : null;
  const rendRows = [
    ...PERFORMANCE_METRICS.map((m) => [m.label, entry[m.key] != null ? `${entry[m.key]} ${m.unit}` : null]),
    ["COD 5-0-5 Dcha.", entry.cod505Right != null ? `${entry.cod505Right} s` : null],
    ["COD 5-0-5 Izq.", entry.cod505Left != null ? `${entry.cod505Left} s` : null],
    ["Déficit Asimetría 5-0-5", entry.cod505Right != null && entry.cod505Left != null ? `${Math.round(Math.abs(entry.cod505Right - entry.cod505Left) * 100) / 100} s` : null],
    ["Reserva anaeróbica", reserve != null ? `${reserve} km/h` : null],
  ].filter((r) => r[1]);
  const rendCustom = (team.customTestDefs || []).filter((d) => d.category === "Rendimiento").map((d) => {
    const v = d.formula ? computeFormula(d.formula, (k) => entry.customTestValues?.[k] ?? entry[k] ?? null) : entry.customTestValues?.[d.id];
    return [`${d.name}${d.unit ? ` (${d.unit})` : ""}`, v != null ? `${v}` : null];
  }).filter((r) => r[1]);

  // ── Secciones custom ────────────────────────────────────────────────────
  const BUILT_IN_CATS = ["Fuerza", "Rendimiento", "Carga externa", "Carga externa/GPS"];
  const extraCats = [...new Set((team.customTestDefs || []).filter((d) => !BUILT_IN_CATS.includes(d.category) && d.category).map((d) => d.category))];
  const extraSections = extraCats.map((cat) => {
    const defs = (team.customTestDefs || []).filter((d) => d.category === cat);
    const rows = defs.map((d) => {
      const v = d.formula ? computeFormula(d.formula, (k) => entry.customTestValues?.[k] ?? entry[k] ?? null) : entry.customTestValues?.[d.id];
      return [`${d.name}${d.unit ? ` (${d.unit})` : ""}`, v != null ? `${v}` : null];
    }).filter((r) => r[1]);
    return { cat, rows };
  }).filter((s) => s.rows.length > 0);

  // ── Cuadrante ───────────────────────────────────────────────────────────

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#14171c", useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`datos-fisicos-${player.username}-${entry.date}.pdf`);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", zIndex: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1.5rem", background: COLORS.panel, borderBottom: `1px solid ${COLORS.line}`, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17, color: COLORS.text }}>Informe físico · {player.displayName || player.username}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleDownload} disabled={downloading} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: downloading ? "#5a8a1a" : COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: downloading ? "default" : "pointer" }}>
            {downloading ? "Generando..." : "Descargar PDF"}
          </button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        <div ref={reportRef} style={{ background: "#14171c", borderRadius: 16, padding: "1.5rem", maxWidth: 600, margin: "0 auto" }}>

          {/* Header jugador */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${COLORS.line}` }}>
            <Avatar name={player.displayName || player.username} photoUrl={player.photoUrl} size={60} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: COLORS.text }}>{player.displayName || player.username}</div>
              {team.isTrainingGroup
                ? (team.playerSpecificTests || {})[player.username] && <div style={{ fontSize: 12, color: COLORS.text, marginTop: 2 }}>{(team.playerSpecificTests || {})[player.username]}</div>
                : (player.position || profile?.position) && <div style={{ fontSize: 12, color: COLORS.text, marginTop: 2 }}>{player.position || profile?.position}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: COLORS.text }}>Medición</div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: COLORS.lime }}>{fmtDate(entry.date)}</div>
              <div style={{ fontSize: 10, color: COLORS.text, marginTop: 4 }}>{team.name}</div>
            </div>
          </div>

          {physSectionOrder.map((key) => {
            if (!show(key)) return null;
            if (key === "personalData") {
              if (!profile || (!profile.birthDate && !profile.height && !profile.dominantLeg && !profile.dominantArm && !bodyWeight)) return null;
              return (
                <div key={key} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                  {profile.birthDate && <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: COLORS.text }}><b>Nac.</b> {fmtDate(profile.birthDate)}{age != null ? ` (${age}a)` : ""}</div>}
                  {profile.height && <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: COLORS.text }}><b>Altura</b> {profile.height} cm</div>}
                  {bodyWeight && <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: COLORS.text }}><b>Peso</b> {bodyWeight} kg</div>}
                  {profile.dominantLeg && <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: COLORS.text }}><b>Pierna</b> {profile.dominantLeg}</div>}
                  {profile.dominantArm && <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: COLORS.text }}><b>Brazo</b> {profile.dominantArm}</div>}
                </div>
              );
            }
            if (key === "injuries") {
              const injuries = (team.playerInjuries || {})[player.username] || [];
              const active = injuries.filter((i) => !i.endDate);
              const closed = injuries.filter((i) => i.endDate);
              const freeText = (team.playerInjuryHistories || {})[player.username] || "";
              if (!injuries.length && !freeText) return null;
              return (
                <div key={key} style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.coral, marginBottom: 8, letterSpacing: 0.5 }}>Lesiones</div>
                  {active.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: COLORS.coral, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 }}>En curso</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {active.map((inj) => (
                          <div key={inj.id} style={{ background: COLORS.coralDark, border: `1px solid ${COLORS.coral}`, borderRadius: 8, padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: COLORS.coral }}>🤕 {inj.type} · {inj.zone}</span>
                            <span style={{ fontSize: 11, color: COLORS.text }}>{inj.laterality} · desde {fmtDate(inj.startDate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {closed.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.6 }}>Anteriores</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {closed.map((inj) => (
                          <div key={inj.id} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{inj.type} · {inj.zone}</span>
                            <span style={{ fontSize: 11, color: COLORS.text }}>{inj.laterality} · {fmtDate(inj.startDate)} → {fmtDate(inj.endDate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {freeText && (
                    <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, marginBottom: 4, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.4 }}>Historial lesivo</div>
                      <div style={{ fontSize: 12, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{freeText}</div>
                    </div>
                  )}
                </div>
              );
            }
            if (key === "forceTests") {
              if (!fuerzaRows.length) return null;
              return <PdfTable key={key} title="Test de Fuerza" accent={COLORS.lime} headers={["Ejercicio", "Peso al 80%", "1RM estimado", "Índice BW"]} rows={fuerzaRows} />;
            }
            if (key === "performance") {
              if (!rendRows.length && !rendCustom.length) return null;
              return <PdfTable key={key} title="Métricas de Rendimiento" accent={COLORS.blue} headers={["Test", "Resultado"]} rows={[...rendRows, ...rendCustom]} />;
            }
            if (key === "customSections") {
              return extraSections.map(({ cat, rows }) => (
                <PdfTable key={cat} title={cat} accent={COLORS.amber} headers={["Métrica", "Resultado"]} rows={rows} />
              ));
            }
            if (key.startsWith("quadrant_")) {
              const qIdx = parseInt(key.split("_")[1], 10);
              const cfg = quadConfigs[qIdx];
              if (!cfg || !allPhysical.length) return null;
              return (
                <div key={key} style={{ marginTop: 8 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.amber, marginBottom: 8 }}>{cfg.name || `Cuadrante ${qIdx + 1}`}</div>
                  <PdfQuadrantChart cfg={cfg} allPhysical={allPhysical} player={player} team={team} />
                </div>
              );
            }
            return null;
          })}

        </div>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4", fontSize: 14, outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: 11, color: COLORS.text, marginBottom: 5, display: "block" };

const FORMULA_OPS = [
  { id: "asymmetry", label: "Asimetría % (|a−b| / media × 100)" },
  { id: "-", label: "Diferencia (a − b)" },
  { id: "%diff", label: "Dif. % ((a−b) / b × 100)" },
  { id: "/", label: "Cociente (a ÷ b)" },
  { id: "+", label: "Suma (a + b)" },
  { id: "*", label: "Producto (a × b)" },
];

export function computeFormula(formula, getVal) {
  if (!formula) return null;
  const a = getVal(formula.a);
  const b = getVal(formula.b);
  if (a == null || b == null) return null;
  switch (formula.op) {
    case "+": return Math.round((a + b) * 100) / 100;
    case "-": return Math.round((a - b) * 100) / 100;
    case "*": return Math.round((a * b) * 100) / 100;
    case "/": return b !== 0 ? Math.round((a / b) * 1000) / 1000 : null;
    case "asymmetry": return (a + b) !== 0 ? Math.round(Math.abs((a - b) / ((a + b) / 2)) * 1000) / 10 : null;
    case "%diff": return b !== 0 ? Math.round((a - b) / b * 1000) / 10 : null;
    default: return null;
  }
}

function Section({ title, children, onAddMetric, onAddFormula, availableMetrics, hasCustom, isDeleting, onToggleDelete, addUnitField = true }) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState("simple"); // "simple" | "formula"
  const [n, setN] = useState("");
  const [u, setU] = useState("");
  const [fA, setFA] = useState("");
  const [fB, setFB] = useState("");
  const [fOp, setFOp] = useState("asymmetry");

  const reset = () => { setN(""); setU(""); setFA(""); setFB(""); setAdding(false); setMode("simple"); };

  const confirm = () => {
    if (!n.trim()) return;
    if (mode === "formula") {
      if (!fA || !fB) return;
      const isPct = fOp === "asymmetry" || fOp === "%diff";
      onAddFormula(n.trim(), isPct ? "%" : u.trim(), { op: fOp, a: fA, b: fB });
    } else {
      onAddMetric(n.trim(), u.trim());
    }
    reset();
  };

  const selStyle = { ...inputStyle, appearance: "none", WebkitAppearance: "none", backgroundImage: "none" };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${COLORS.line}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{title}</span>
        <div style={{ display: "flex", gap: 10 }}>
          {hasCustom && onToggleDelete && (
            <button onClick={onToggleDelete} style={{ background: "none", border: "none", color: isDeleting ? COLORS.lime : COLORS.coral, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {isDeleting ? "Listo" : "Eliminar"}
            </button>
          )}
          {onAddMetric && (
            <button onClick={() => { if (adding) reset(); else setAdding(true); }} style={{ background: "none", border: "none", color: adding ? COLORS.coral : COLORS.lime, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {adding ? "✕ Cancelar" : "+ Añadir"}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {children}
      </div>
      {adding && (
        <div style={{ marginTop: 10, background: COLORS.panelRaised, borderRadius: 10, padding: "10px" }}>
          {onAddFormula && availableMetrics && availableMetrics.length >= 2 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[{ id: "simple", label: "Métrica simple" }, { id: "formula", label: "Operación" }].map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  flex: 1, padding: "6px 0", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: mode === m.id ? COLORS.lime : COLORS.panel, color: mode === m.id ? "#14171c" : COLORS.text,
                }}>{m.label}</button>
              ))}
            </div>
          )}
          {(() => {
            const isPct = mode === "formula" && (fOp === "asymmetry" || fOp === "%diff");
            return (
              <div style={{ display: "flex", gap: 6, marginBottom: mode === "formula" ? 8 : 0 }}>
                <input placeholder="Nombre de la métrica" value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mode === "simple" && confirm()} style={{ ...inputStyle, flex: 2 }} autoFocus />
                {addUnitField && !isPct && mode === "simple" && <input placeholder="Unidad" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirm()} style={{ ...inputStyle, flex: 1 }} />}
                {addUnitField && !isPct && mode === "formula" && <input placeholder="Unidad" value={u} onChange={(e) => setU(e.target.value)} style={{ ...inputStyle, flex: 1 }} />}
                {isPct && <span style={{ ...inputStyle, flex: 1, display: "flex", alignItems: "center", color: COLORS.text, opacity: 0.6, fontSize: 12 }}>%</span>}
                {mode === "simple" && <button onClick={confirm} disabled={!n.trim()} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer", flexShrink: 0, opacity: n.trim() ? 1 : 0.5 }}>+</button>}
              </div>
            );
          })()}
          {mode === "formula" && availableMetrics && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <select value={fOp} onChange={(e) => setFOp(e.target.value)} style={{ ...selStyle }}>
                {FORMULA_OPS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select value={fA} onChange={(e) => setFA(e.target.value)} style={{ ...selStyle, flex: 1 }}>
                  <option value="">— Métrica A —</option>
                  {availableMetrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>↔</span>
                <select value={fB} onChange={(e) => setFB(e.target.value)} style={{ ...selStyle, flex: 1 }}>
                  <option value="">— Métrica B —</option>
                  {availableMetrics.filter((m) => m.key !== fA).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <button onClick={confirm} disabled={!n.trim() || !fA || !fB} style={{ padding: "10px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer", opacity: (!n.trim() || !fA || !fB) ? 0.5 : 1 }}>
                Añadir operación
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BUILT_IN_CATS = ["Fuerza", "Rendimiento", "Carga externa"];

const BUILT_IN_SECTION_KEYS = {
  "Fuerza": RM_EXERCISES.map((e) => e.key),
  "Rendimiento": [...PERFORMANCE_METRICS.map((m) => m.key), "cod505Right", "cod505Left"],
  "Carga externa": EXTERNAL_LOAD_METRICS.map((m) => m.key),
};

function initItemsOrder(team) {
  const stored = team.customTestItemOrder || {};
  const result = {};
  for (const cat of BUILT_IN_CATS) {
    const base = stored[cat] && stored[cat].length ? stored[cat] : [...(BUILT_IN_SECTION_KEYS[cat] || [])];
    const customIds = (team.customTestDefs || []).filter((d) => d.category === cat || (cat === "Carga externa" && d.category === "Carga externa/GPS")).map((d) => d.id);
    result[cat] = [...base, ...customIds.filter((id) => !base.includes(id))];
  }
  const extraCats = [...new Set((team.customTestDefs || []).map((d) => d.category).filter((c) => c && !BUILT_IN_CATS.includes(c)))];
  for (const cat of extraCats) {
    const base = stored[cat] || [];
    const customIds = (team.customTestDefs || []).filter((d) => d.category === cat).map((d) => d.id);
    result[cat] = [...base, ...customIds.filter((id) => !base.includes(id))];
  }
  return result;
}

function initSectionsOrder(team) {
  const extraCats = [...new Set((team.customTestDefs || []).map((d) => d.category).filter((c) => c && !BUILT_IN_CATS.includes(c)))];
  const stored = team.customTestSectionOrder;
  if (stored && stored.length) {
    const all = [...BUILT_IN_CATS, ...extraCats];
    return [...stored.filter((c) => all.includes(c)), ...all.filter((c) => !stored.includes(c))];
  }
  return [...BUILT_IN_CATS, ...extraCats];
}

function PhysicalDataForm({ player, team, existing, onSave, onCancel, saving }) {
  const initial = existing || {};
  const [date, setDate] = useState(initial.date || todayStr());
  const [vals, setVals] = useState(() => {
    const v = {};
    [...RM_EXERCISES, ...PERFORMANCE_METRICS, ...EXTERNAL_LOAD_METRICS].forEach((f) => {
      v[f.key] = initial[f.key] != null ? String(initial[f.key]) : "";
    });
    v.cod505Right = initial.cod505Right != null ? String(initial.cod505Right) : "";
    v.cod505Left  = initial.cod505Left  != null ? String(initial.cod505Left)  : "";
    return v;
  });
  const [customTestValues, setCustomTestValues] = useState(() =>
    Object.fromEntries(Object.entries(initial.customTestValues || {}).map(([k, v]) => [k, v != null ? String(v) : ""]))
  );
  const [localDefs, setLocalDefs] = useState(() => [...(team.customTestDefs || [])]);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [deletingSection, setDeletingSection] = useState(null);
  const [sectionsOrder, setSectionsOrder] = useState(() => initSectionsOrder(team));
  const [itemsOrder, setItemsOrder] = useState(() => initItemsOrder(team));
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMetric, setNewGroupMetric] = useState("");
  const [newGroupUnit, setNewGroupUnit] = useState("");

  const toNum = (s) => { if (s === "" || s == null) return null; const n = parseFloat(String(s).replace(",", ".")); return isNaN(n) ? null : n; };

  const activeDefs = localDefs.filter((d) => !removedIds.has(d.id));
  const defById = Object.fromEntries(activeDefs.map((d) => [d.id, d]));

  const addMetric = (category, name, unit, formula = null) => {
    const id = `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const def = { id, name: name.trim(), unit: unit.trim(), category };
    if (formula) def.formula = formula;
    setLocalDefs((p) => [...p, def]);
    if (!formula) setCustomTestValues((p) => ({ ...p, [id]: "" }));
    const storeCat = category === "Carga externa/GPS" ? "Carga externa" : category;
    setItemsOrder((o) => ({ ...o, [storeCat]: [...(o[storeCat] || []), id] }));
  };

  const removeMetric = (id) => {
    setRemovedIds((s) => new Set([...s, id]));
    setItemsOrder((o) => {
      const next = {};
      for (const [c, keys] of Object.entries(o)) next[c] = keys.filter((k) => k !== id);
      return next;
    });
  };

  const moveItem = (key, cat, dir) => {
    setItemsOrder((o) => {
      const items = [...(o[cat] || [])];
      const idx = items.indexOf(key);
      if (idx === -1) return o;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= items.length) return o;
      [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
      return { ...o, [cat]: items };
    });
  };

  const moveCat = (cat, dir) => {
    setSectionsOrder((order) => {
      const idx = order.indexOf(cat);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= order.length) return order;
      const next = [...order];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const addGroup = () => {
    if (!newGroupName.trim() || !newGroupMetric.trim()) return;
    const cat = newGroupName.trim();
    addMetric(cat, newGroupMetric.trim(), newGroupUnit.trim());
    if (!sectionsOrder.includes(cat)) setSectionsOrder((o) => [...o, cat]);
    setAddingGroup(false);
    setNewGroupName(""); setNewGroupMetric(""); setNewGroupUnit("");
  };

  const handleSubmit = () => {
    const allCustomTestValues = Object.fromEntries(Object.entries(customTestValues).map(([k, v]) => [k, toNum(v)]));
    const entry = { teamId: team.teamId, username: player.username, date, ts: Date.now(), customTestValues: allCustomTestValues, customGpsValues: {} };
    [...RM_EXERCISES, ...PERFORMANCE_METRICS, ...EXTERNAL_LOAD_METRICS].forEach((f) => { entry[f.key] = toNum(vals[f.key]); });
    entry.cod505Right = toNum(vals.cod505Right);
    entry.cod505Left  = toNum(vals.cod505Left);
    const finalDefs = localDefs.filter((d) => !removedIds.has(d.id));
    const orig = team.customTestDefs || [];
    const defsChanged = JSON.stringify(finalDefs) !== JSON.stringify(orig);
    const orderChanged = JSON.stringify(sectionsOrder) !== JSON.stringify(team.customTestSectionOrder)
      || JSON.stringify(itemsOrder) !== JSON.stringify(team.customTestItemOrder);
    const updatedFields = (defsChanged || orderChanged)
      ? { customTestDefs: finalDefs, customTestSectionOrder: sectionsOrder, customTestItemOrder: itemsOrder }
      : null;
    onSave(entry, updatedFields);
  };

  const toggleDelete = (cat) => setDeletingSection((s) => s === cat ? null : cat);

  const renderItem = (key, cat) => {
    const showDelete = deletingSection === cat;

    // built-in Fuerza
    const rmEx = RM_EXERCISES.find((e) => e.key === key);
    if (rmEx) return (
      <div key={key}>
        <label style={labelStyle}>{rmEx.label} (kg)</label>
        <input type="text" inputMode="decimal" value={vals[key]} onChange={(e) => setVals((p) => ({ ...p, [key]: e.target.value }))} placeholder="—" style={inputStyle} />
      </div>
    );

    // built-in Rendimiento
    const perfM = PERFORMANCE_METRICS.find((m) => m.key === key);
    if (perfM) return (
      <div key={key}>
        <label style={labelStyle}>{perfM.label} ({perfM.unit})</label>
        <input type="text" inputMode="decimal" value={vals[key]} onChange={(e) => setVals((p) => ({ ...p, [key]: e.target.value }))} placeholder="—" style={inputStyle} />
      </div>
    );
    if (key === "cod505Right") return (
      <div key={key}>
        <label style={labelStyle}>COD 5-0-5 Pierna dcha. (s)</label>
        <input type="text" inputMode="decimal" value={vals.cod505Right} onChange={(e) => setVals((p) => ({ ...p, cod505Right: e.target.value }))} placeholder="—" style={inputStyle} />
      </div>
    );
    if (key === "cod505Left") return (
      <div key={key}>
        <label style={labelStyle}>COD 5-0-5 Pierna izq. (s)</label>
        <input type="text" inputMode="decimal" value={vals.cod505Left} onChange={(e) => setVals((p) => ({ ...p, cod505Left: e.target.value }))} placeholder="—" style={inputStyle} />
      </div>
    );

    // built-in Carga externa
    const extM = EXTERNAL_LOAD_METRICS.find((m) => m.key === key);
    if (extM) return (
      <div key={key}>
        <label style={labelStyle}>{extM.unit ? `${extM.label} (${extM.unit})` : extM.label}</label>
        <input type="text" inputMode="decimal" value={vals[key]} onChange={(e) => setVals((p) => ({ ...p, [key]: e.target.value }))} placeholder="—" style={inputStyle} />
      </div>
    );

    // custom def
    const d = defById[key];
    if (!d) return null;
    if (d.formula) {
      const getVal = (k) => {
        if (defById[k]) { const v = customTestValues[k]; return v != null && v !== "" ? toNum(v) : null; }
        const bv = vals[k]; return bv != null && bv !== "" ? toNum(bv) : null;
      };
      const computed = computeFormula(d.formula, getVal);
      return (
        <div key={key} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: COLORS.text, fontWeight: 600 }}>{d.name}{d.unit ? ` (${d.unit})` : ""}</span>
              <span style={{ fontSize: 9, color: COLORS.lime, display: "block", marginTop: 1 }}>⟨ operación ⟩</span>
            </div>
            {showDelete && <button onClick={() => removeMetric(d.id)} style={{ background: "none", border: "none", color: COLORS.coral, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1, fontWeight: 700 }}>✕</button>}
          </div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, color: computed != null ? COLORS.lime : COLORS.line, textAlign: "center", padding: "4px 0" }}>
            {computed != null ? `${computed}${d.unit ? " " + d.unit : ""}` : "—"}
          </div>
        </div>
      );
    }
    return (
      <div key={key} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: COLORS.text, flex: 1, fontWeight: 600 }}>{d.name || "Nueva métrica"}{d.unit ? ` (${d.unit})` : ""}</span>
          {showDelete && <button onClick={() => removeMetric(d.id)} style={{ background: "none", border: "none", color: COLORS.coral, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1, fontWeight: 700 }}>✕</button>}
        </div>
        <input type="text" inputMode="decimal" value={customTestValues[d.id] ?? ""} onChange={(e) => setCustomTestValues((p) => ({ ...p, [d.id]: e.target.value }))} placeholder="—" style={inputStyle} />
      </div>
    );
  };

  const sectionTitle = (cat) => {
    const TITLES = { "Fuerza": "Fuerza (80% 1RM en kg)", "Rendimiento": "Rendimiento", "Carga externa": "Carga externa" };
    return TITLES[cat] || cat;
  };

  const hasCustom = (cat) => (itemsOrder[cat] || []).some((k) => defById[k] && !removedIds.has(k));

  const allMetricOptions = sectionsOrder.flatMap((cat) =>
    (itemsOrder[cat] || []).flatMap((key) => {
      const rmEx = RM_EXERCISES.find((e) => e.key === key);
      if (rmEx) return [{ key, label: rmEx.label }];
      const perfM = PERFORMANCE_METRICS.find((m) => m.key === key);
      if (perfM) return [{ key, label: `${perfM.label} (${perfM.unit})` }];
      if (key === "cod505Right") return [{ key, label: "COD 5-0-5 Dcha." }];
      if (key === "cod505Left") return [{ key, label: "COD 5-0-5 Izq." }];
      const extM = EXTERNAL_LOAD_METRICS.find((m) => m.key === key);
      if (extM) return [{ key, label: extM.label }];
      const d = defById[key];
      if (d && !d.formula) return [{ key: d.id, label: d.name }];
      return [];
    })
  );

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Fecha de la medición</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
      </div>

      {sectionsOrder.map((cat) => {
        const keys = (itemsOrder[cat] || []);
        const addFn = cat === "Fuerza" ? (n) => addMetric("Fuerza", n, "kg") : (n, u) => addMetric(cat, n, u);
        const addFormulaFn = (n, u, formula) => addMetric(cat, n, u, formula);
        return (
          <Section key={cat} title={sectionTitle(cat)}
            onAddMetric={addFn}
            onAddFormula={addFormulaFn}
            availableMetrics={allMetricOptions}
            addUnitField={cat !== "Fuerza"}
            hasCustom={hasCustom(cat)}
            isDeleting={deletingSection === cat}
            onToggleDelete={() => toggleDelete(cat)}>
            {keys.map((key) => renderItem(key, cat))}
          </Section>
        );
      })}

      <div style={{ marginBottom: 20 }}>
        {!addingGroup ? (
          <button onClick={() => setAddingGroup(true)} style={{ background: "none", border: `1px dashed ${COLORS.line}`, borderRadius: 10, color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "10px 16px", width: "100%" }}>
            + Nuevo grupo de tests
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <input placeholder="Nombre del grupo (ej: Test neuromuscular)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ ...inputStyle }} autoFocus />
              <div style={{ display: "flex", gap: 6 }}>
                <input placeholder="Primera métrica" value={newGroupMetric} onChange={(e) => setNewGroupMetric(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} style={{ ...inputStyle, flex: 2 }} />
                <input placeholder="Unidad" value={newGroupUnit} onChange={(e) => setNewGroupUnit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={addGroup} disabled={!newGroupName.trim() || !newGroupMetric.trim()} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer", opacity: (!newGroupName.trim() || !newGroupMetric.trim()) ? 0.5 : 1 }}>Crear</button>
              <button onClick={() => { setAddingGroup(false); setNewGroupName(""); setNewGroupMetric(""); setNewGroupUnit(""); }} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, cursor: "pointer" }}>✕</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando..." : "Guardar datos"}
        </button>
      </div>
    </div>
  );
}


function fmtDateShort(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function CoachInjuryPanel({ injuries, freeText }) {
  const hasInjuries = injuries.length > 0;
  const hasFreeText = freeText.trim().length > 0;
  if (!hasInjuries && !hasFreeText) return null;

  const active = injuries.filter((i) => !i.endDate);
  const closed = injuries.filter((i) => i.endDate);

  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {hasInjuries && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text, marginBottom: 10 }}>Lesiones temporada actual</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {active.map((inj) => (
              <div key={inj.id} style={{ background: COLORS.coralDark, border: `1px solid ${COLORS.coral}`, borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.coral }}>🤕 {inj.type} · {inj.zone}</span>
                  <span style={{ fontSize: 10, color: COLORS.coral, background: "rgba(255,90,95,0.15)", borderRadius: 5, padding: "2px 7px" }}>En curso</span>
                </div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 3 }}>{inj.laterality} · Desde {fmtDateShort(inj.startDate)}</div>
              </div>
            ))}
            {closed.map((inj) => (
              <div key={inj.id} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text }}>{inj.type} · {inj.zone}</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 3 }}>{inj.laterality} · {fmtDateShort(inj.startDate)} → {fmtDateShort(inj.endDate)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasFreeText && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text, marginBottom: 8 }}>Historial lesivo</div>
          <div style={{ fontSize: 13, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{freeText}</div>
        </div>
      )}
    </div>
  );
}

function CoachPlayerPhysicalEditor({ player, team, onBack, profile, onTeamUpdate, allPhysical = [], readOnly = false }) {
  const [history, setHistory] = useState([]);
  const [bodyWeight, setBodyWeight] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [subTab, setSubTab] = useState("ver");
  const [editEntry, setEditEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedHistIdx, setSelectedHistIdx] = useState(0);
  const [showPdf, setShowPdf] = useState(false);
  const [localTeamFields, setLocalTeamFields] = useState({});
  const effectiveTeam = { ...team, ...localTeamFields };

  const refresh = useCallback(async () => {
    const [h, w, wh] = await Promise.all([
      loadPlayerPhysicalHistory(team.teamId, player.username),
      getLatestWeight(team.teamId, player.username),
      loadPlayerWeightHistory(team.teamId, player.username),
    ]);
    setHistory(h);
    setBodyWeight(w);
    setWeightHistory(wh);
    setSelectedHistIdx(0);
  }, [team.teamId, player.username]);

  useEffect(() => { (async () => { await refresh(); setLoading(false); })(); }, [refresh]);

  const handleSave = async (entry, updatedFields) => {
    setSaving(true);
    try {
      const saves = [savePhysicalEntry(entry)];
      if (updatedFields) saves.push(saveTeam({ ...effectiveTeam, ...updatedFields }));
      await Promise.all(saves);
      if (updatedFields) {
        setLocalTeamFields((f) => ({ ...f, ...updatedFields }));
        if (onTeamUpdate) onTeamUpdate({ ...effectiveTeam, ...updatedFields });
      }
      await refresh();
      setSubTab("ver");
      setEditEntry(null);
    }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: COLORS.text, textAlign: "center", padding: "2rem" }}>Cargando...</div>;

  const age = profile?.birthDate ? Math.floor((Date.now() - new Date(profile.birthDate)) / (1000 * 60 * 60 * 24 * 365.25)) : null;
  const fmtDate = (d) => { if (!d) return null; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  return (
    <div>
      {/* Header jugador */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Avatar name={player.displayName || player.username} photoUrl={player.photoUrl} size={52} isInjured={(effectiveTeam.injuredPlayers || []).includes(player.username)} />
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 19, color: COLORS.text }}>{player.displayName || player.username}</div>
            {team.isTrainingGroup
              ? (effectiveTeam.playerSpecificTests || {})[player.username] && <div style={{ fontSize: 12, color: COLORS.text, marginTop: 2 }}>{(effectiveTeam.playerSpecificTests || {})[player.username]}</div>
              : (player.position || profile?.position) && <div style={{ fontSize: 12, color: COLORS.text, marginTop: 2 }}>{player.position || profile?.position}</div>}
          </div>
        </div>
        {profile && (profile.birthDate || profile.height || profile.dominantLeg || profile.dominantArm) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
            {profile.birthDate && (
              <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 2 }}>Fecha de nacimiento</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text }}>{fmtDate(profile.birthDate)}</div>
                {age != null && <div style={{ fontSize: 10, color: COLORS.text }}>{age} años</div>}
              </div>
            )}
            {profile.height && (
              <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 2 }}>Altura</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: COLORS.blue }}>{profile.height} cm</div>
              </div>
            )}
            {bodyWeight && (
              <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 2 }}>Peso actual</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: COLORS.lime }}>{bodyWeight} kg</div>
              </div>
            )}
            {profile.dominantLeg && (
              <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 2 }}>Pierna dominante</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text }}>{profile.dominantLeg}</div>
              </div>
            )}
            {profile.dominantArm && (
              <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 2 }}>Brazo dominante</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text }}>{profile.dominantArm}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {weightHistory.length > 1 && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Historial de peso</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {weightHistory.slice(1).map((w) => (
              <div key={w.date} style={{ display: "flex", justifyContent: "space-between", background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: COLORS.text }}>
                <span>{fmtDateLong(w.date)}</span>
                <span style={{ fontWeight: 600 }}>{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CoachInjuryPanel
        injuries={(effectiveTeam.playerInjuries || {})[player.username] || []}
        freeText={(effectiveTeam.playerInjuryHistories || {})[player.username] || ""}
      />

      {subTab === "ver" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 18 }}>
            {history.length > 0 && (
              <button onClick={() => setShowPdf(true)} style={{
                padding: "7px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`,
                background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}>Exportar PDF</button>
            )}
            {!readOnly && <button onClick={() => { setEditEntry(history[selectedHistIdx] || null); setSubTab("editar"); }} style={{
              padding: "7px 14px", borderRadius: 10, border: "none",
              background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>Añadir / Editar</button>}
          </div>

          {history.length === 0 ? (
            <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "2rem 0" }}>Sin datos físicos registrados.</div>
          ) : (
            <div>
              {history.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8 }}>Historial de mediciones</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {history.map((e, i) => (
                      <button key={e.date} onClick={() => setSelectedHistIdx(i)} style={{
                        background: selectedHistIdx === i ? COLORS.lime : COLORS.panelRaised,
                        border: `1px solid ${selectedHistIdx === i ? COLORS.lime : COLORS.line}`,
                        borderRadius: 8, padding: "6px 12px", fontSize: 12,
                        color: selectedHistIdx === i ? "#14171c" : COLORS.text, cursor: "pointer", fontWeight: selectedHistIdx === i ? 700 : 400,
                      }}>
                        {fmtDateLong(e.date)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 14 }}>Medición: {fmtDateLong(history[selectedHistIdx]?.date)}</div>
              <PhysicalDataView entry={history[selectedHistIdx]} bodyWeight={bodyWeight} customTestDefs={effectiveTeam.customTestDefs || []} customGpsDefs={effectiveTeam.customGpsDefs || []} sectionOrder={effectiveTeam.customTestSectionOrder} itemOrder={effectiveTeam.customTestItemOrder} />
            </div>
          )}
        </>
      )}

      {subTab === "editar" && (
        <PhysicalDataForm
          player={player} team={effectiveTeam} existing={editEntry}
          onSave={handleSave}
          onCancel={() => setSubTab("ver")}
          saving={saving}
        />
      )}

      {showPdf && history[selectedHistIdx] && (
        <PhysicalPdfModal
          player={player}
          team={effectiveTeam}
          entry={history[selectedHistIdx]}
          bodyWeight={bodyWeight}
          profile={profile}
          allPhysical={allPhysical}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}

const PRESET_CATEGORIES = ["Fuerza", "Rendimiento", "Carga externa/GPS", "Otro"];

export function CustomMetricEditor({ team, onSave }) {
  const initialAll = [
    ...(team.customTestDefs || []).map((d) => ({ ...d, _src: "test" })),
    ...(team.customGpsDefs  || []).map((d) => ({ ...d, category: d.category === "GPS" ? "Carga externa/GPS" : (d.category || "Carga externa/GPS"), _src: "gps" })),
  ];
  const [metrics, setMetrics] = useState(initialAll);
  const [newName, setNewName]       = useState("");
  const [newUnit, setNewUnit]       = useState("");
  const [newCat,  setNewCat]        = useState("Rendimiento");
  const [customCat, setCustomCat]   = useState("");

  const effectiveCat = newCat === "Otro" ? (customCat.trim() || "Otro") : newCat;

  const add = () => {
    const n = newName.trim();
    if (!n) return;
    const src = effectiveCat === "GPS" ? "gps" : "test";
    setMetrics((m) => [...m, { id: `${src}_${Date.now()}`, name: n, unit: newUnit.trim(), category: effectiveCat, _src: src }]);
    setNewName(""); setNewUnit(""); setCustomCat("");
  };

  const remove = (id) => setMetrics((m) => m.filter((x) => x.id !== id));

  const handleSave = () => {
    const testDefs = metrics.filter((m) => m._src !== "gps").map(({ _src, ...rest }) => rest);
    const gpsDefs  = metrics.filter((m) => m._src === "gps").map(({ _src, ...rest }) => rest);
    onSave(testDefs, gpsDefs);
  };

  const categories = [...new Set(metrics.map((m) => m.category || "Tests de campo"))];

  return (
    <div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 16, color: COLORS.text }}>Métricas personalizadas</div>

      {categories.length === 0 && (
        <div style={{ color: COLORS.text, fontSize: 13, textAlign: "center", padding: "1rem 0", marginBottom: 16 }}>Sin métricas todavía.</div>
      )}

      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${COLORS.line}` }}>{cat}</div>
          {metrics.filter((m) => (m.category || "Tests de campo") === cat).map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelRaised, borderRadius: 10, padding: "8px 12px", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: COLORS.text }}>{d.name}{d.unit ? ` (${d.unit})` : ""}</span>
              <button onClick={() => remove(d.id)} style={{ background: "none", border: "none", color: COLORS.coral, fontSize: 12, cursor: "pointer" }}>Quitar</button>
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: COLORS.panelRaised, borderRadius: 12, padding: "12px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Añadir métrica</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {PRESET_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setNewCat(c)} style={{
              padding: "5px 12px", borderRadius: 8, border: `1px solid ${newCat === c ? COLORS.lime : COLORS.line}`,
              background: newCat === c ? COLORS.lime : "transparent",
              color: newCat === c ? "#14171c" : COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>{c}</button>
          ))}
        </div>
        {newCat === "Otro" && (
          <input placeholder="Nombre del tipo..." value={customCat} onChange={(e) => setCustomCat(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <input placeholder="Nombre de la métrica" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <input placeholder="Unidad" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={add} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>+</button>
        </div>
      </div>

      <button onClick={handleSave} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
        Guardar configuración
      </button>
    </div>
  );
}

export default function CoachPhysicalDataTab({ team, onTeamUpdate, playerProfiles = {}, selectedPlayer = null, onSelectPlayer, allPhysical = [], readOnly = false }) {
  const setSelectedPlayer = onSelectPlayer || (() => {});

  const roster = team.roster || [];

  if (selectedPlayer) {
    return (
      <div>
        <button onClick={() => setSelectedPlayer(null)} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>← Volver</button>
        <CoachPlayerPhysicalEditor player={selectedPlayer} team={team} onBack={() => setSelectedPlayer(null)} profile={playerProfiles[selectedPlayer.username] || null} onTeamUpdate={readOnly ? null : onTeamUpdate} allPhysical={allPhysical} readOnly={readOnly} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17, marginBottom: 18, color: COLORS.text }}>Datos físicos</div>
      {roster.length === 0 ? (
        <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "2rem 0" }}>El equipo no tiene jugadores registrados.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {roster.map((player) => (
            <button key={player.username} onClick={() => setSelectedPlayer(player)} style={{
              display: "flex", alignItems: "center", gap: 12, background: COLORS.panel,
              border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.9rem 1rem",
              textAlign: "left", cursor: "pointer", width: "100%",
            }}>
              <Avatar name={player.displayName || player.username} photoUrl={player.photoUrl} size={40} isInjured={(team.injuredPlayers || []).includes(player.username)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{player.displayName || player.username}</div>
                <div style={{ fontSize: 12, color: COLORS.text }}>{team.isTrainingGroup ? ((team.playerSpecificTests || {})[player.username] || "Sin modalidad") : (player.position || "Sin posición")}</div>
              </div>
              <span style={{ color: COLORS.text, fontSize: 13 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
