"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { COLORS, INTENSITY_LEVELS } from "@/lib/constants";
import {
  todayStr, addDays, fmtDateShort, fmtDateLong, sessionLoad, acwr, acwrStatus, mean,
  monotony, trainingStress, variability, weightedWellnessScore, mondayOf, weekDates, weekNumberFrom, weekdayLabel,
} from "@/lib/utils";
import { loadMesocycles } from "@/lib/db";
import Avatar from "./Avatar";

/* ── Color helpers (same as LoadControlPanel) ──────────────────────── */
const wsColor   = (v) => v === null ? "#888" : v >= 7.5 ? "#a3e635" : v >= 5 ? "#f2c63c" : "#ff5a5f";
const rpeColor  = (v) => v === null ? "#888" : v <= 6 ? "#a3e635" : v <= 7.5 ? "#f2c63c" : "#ff5a5f";
const acWsColor = (v) => v === null ? "#888" : v > 1.3 ? "#a3e635" : v >= 0.8 ? "#f2c63c" : "#ff5a5f";
const acRpeColor= (v) => v === null ? "#888" : v > 1.5 ? "#ff5a5f" : v > 1.3 ? "#ff9f40" : v < 0.8 ? "#60a5fa" : "#a3e635";
const monoColor = (v) => v === null ? "#888" : v >= 3.5 ? "#ff5a5f" : v >= 2.5 ? "#f2c63c" : "#a3e635";
const stressColor=(v) => v === null ? "#888" : (v < 2000 || v > 8000) ? "#ff5a5f" : v >= 5000 ? "#f2c63c" : "#a3e635";

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

const QUAD_COLORS = {
  good:    "#a3e635",
  loaded:  "#ff9f40",
  low:     "#60a5fa",
  bad:     "#ff5a5f",
};

export default function LoadControlPdfModal({ team, wellness, rpe, sessions, onClose, teamGender = "masculino" }) {
  const reportRef = useRef();
  const [downloading, setDownloading] = useState(false);
  const [photoB64, setPhotoB64] = useState({});
  const [mesocycles, setMesocycles] = useState([]);
  const today = todayStr();
  const isTrainingGroup = team.isTrainingGroup || false;
  const isIndividual = team.kind === "individual";
  const isFem = teamGender === "femenino";
  const isMixto = teamGender === "mixto";
  const adjSing = isFem ? "cargada" : "cargado";
  const adjPlural = isMixto ? "cargad@s" : isFem ? "cargadas" : "cargados";
  const malSing = isFem ? "adaptada" : "adaptado";
  const malPlural = isMixto ? "adaptad@s" : isFem ? "adaptadas" : "adaptados";
  const personLabel = isIndividual ? "atleta" : isTrainingGroup ? "atletas" : (isFem ? "jugadoras" : "jugadores");
  const PersonLabel = isIndividual ? "Atleta" : isTrainingGroup ? "Atletas" : (isFem ? "Jugadoras" : "Jugadores");
  const teamGroupLabel = isIndividual ? "atleta" : isTrainingGroup ? "grupo" : "equipo";
  const loadPdf = team.pdfSettings?.load || {};
  const show = (key) => loadPdf[key] !== false;
  const DEFAULT_LOAD_ORDER = ["teamStatus", "wellnessRpeQuadrant", "wellnessRpeChart", "weekCalendar", "mesoInfo"];
  const storedLoadOrder = loadPdf.order || DEFAULT_LOAD_ORDER;
  // Merge stored order with default (new sections like mesoInfo appear at end if not yet stored)
  const sectionOrder = [
    ...storedLoadOrder.filter((k) => DEFAULT_LOAD_ORDER.includes(k)),
    ...DEFAULT_LOAD_ORDER.filter((k) => !storedLoadOrder.includes(k)),
  ];
  const roster = team.roster || [];
  const weekMonday = mondayOf(today);
  const weekDays = weekDates(weekMonday);
  const effectiveFirstMonday = team?.firstMonday || weekMonday;
  const weekNum = weekNumberFrom(effectiveFirstMonday, weekMonday);

  /* Sesión especial esta semana */
  const weekSpecialSession = weekDays.map((d) => sessions.find((s) => s.date === d && !s.isRest && (s.sessionType?.includes("(H)") || s.sessionType?.includes("(A)")))).find(Boolean);

  /* Mesociclo activo */
  const activeMeso = mesocycles.find((m) => m.startDate && m.endDate && today >= m.startDate && today <= m.endDate) || null;
  const mesoWeekNum = activeMeso
    ? Math.floor((new Date(weekMonday) - new Date(mondayOf(activeMeso.startDate))) / (7 * 86400000)) + 1
    : null;
  const mesoWeekInfo = activeMeso?.weeks?.[mesoWeekNum - 1] || null;

  const playerStats = useMemo(() => {
    const d7 = addDays(today, -6);
    const d7priorStart = addDays(today, -27);
    const d7priorEnd = addDays(today, -7);

    return roster.map((player) => {
      const myW = wellness.filter((e) => e.username === player.username);
      const myR = rpe.filter((e) => e.username === player.username);
      const allLoads = myR.map((e) => ({ date: e.date, load: sessionLoad(e) }));

      const w7 = myW.filter((e) => e.date >= d7 && e.date <= today).map((e) => weightedWellnessScore(e));
      const wPrior = myW.filter((e) => e.date >= d7priorStart && e.date <= d7priorEnd).map((e) => weightedWellnessScore(e));
      const wsMedio = w7.length ? mean(w7) : null;
      const wsAC    = wsMedio !== null && wPrior.length ? wsMedio / mean(wPrior) : null;
      const wsMono  = w7.length >= 3 ? monotony(w7) : null;
      const wsStr   = wsMono !== null && wsMedio !== null ? trainingStress(w7) : null;

      const r7 = myR.filter((e) => e.date >= d7 && e.date <= today).map((e) => e.rpe);
      const rPrior = myR.filter((e) => e.date >= d7priorStart && e.date <= d7priorEnd).map((e) => e.rpe);
      const rpeMedio = r7.length ? mean(r7) : null;
      const rpeAC   = rpeMedio !== null && rPrior.length ? rpeMedio / mean(rPrior) : null;
      const rpeMono = r7.length >= 3 ? monotony(r7) : null;
      const rpeStr  = rpeMono !== null && rpeMedio !== null ? trainingStress(r7) : null;

      const redCount = [
        isRed.wsMedio(wsMedio), isRed.wsAC(wsAC), isRed.wsMono(wsMono), isRed.wsStr(wsStr),
        isRed.rpeMedio(rpeMedio), isRed.rpeAC(rpeAC), isRed.rpeMono(rpeMono), isRed.rpeStr(rpeStr),
      ].filter(Boolean).length;

      const acwrVal = acwr(allLoads, today);
      const avgWS = wsMedio;
      const avgRpe = rpeMedio;

      return { ...player, wsMedio, wsAC, wsMono, wsStr, rpeMedio, rpeAC, rpeMono, rpeStr, redCount, acwrVal, avgWS, avgRpe };
    });
  }, [roster, wellness, rpe, today]);

  /* Pre-cargar fotos como base64 para que html2canvas las pueda incluir */
  useEffect(() => {
    const toB64 = async (url) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch { return null; }
    };
    const players = team.roster || [];
    Promise.all(players.map(async (p) => {
      if (!p.photoUrl) return [p.username, null];
      const b64 = await toB64(p.photoUrl);
      return [p.username, b64];
    })).then((entries) => setPhotoB64(Object.fromEntries(entries)));
  }, [team.roster]);

  useEffect(() => {
    if (team?.teamId) loadMesocycles(team.teamId).then(setMesocycles).catch(() => {});
  }, [team?.teamId]);

  const xMid = 5, yMid = 5;
  const loaded   = playerStats.filter((p) => p.acwrVal !== null && (p.acwrVal > 1.5 || p.acwrVal < 0.8));
  const alert4   = playerStats.filter((p) => p.redCount >= 4);
  const doubt    = playerStats.filter((p) => p.redCount >= 2 && p.redCount < 4);
  const goodForm = playerStats.filter((p) => p.acwrVal !== null && p.acwrVal >= 0.8 && p.acwrVal <= 1.3);

  /* Quadrant groups */
  const quads = [
    { label: "Asimila bien la carga", color: QUAD_COLORS.good,   list: playerStats.filter((p) => (p.avgWS ?? 0) >= xMid && (p.avgRpe ?? 0) >= yMid) },
    { label: isIndividual ? `Atleta ${adjSing}`  : `${PersonLabel} ${adjPlural}`, color: QUAD_COLORS.loaded, list: playerStats.filter((p) => (p.avgWS ?? 10) < xMid && (p.avgRpe ?? 0) >= yMid) },
    { label: isIndividual ? `Poco ${adjSing}`    : `Poco ${adjPlural}`,           color: QUAD_COLORS.low,    list: playerStats.filter((p) => (p.avgWS ?? 0) >= xMid && (p.avgRpe ?? 10) < yMid) },
    { label: isIndividual ? `Mal ${malSing}`     : `Mal ${malPlural}`,            color: QUAD_COLORS.bad,    list: playerStats.filter((p) => (p.avgWS ?? 10) < xMid && (p.avgRpe ?? 10) < yMid) },
  ];


  const StatusGroup = ({ title, players, color }) => {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
          {title} ({players.length})
        </div>
        {players.length === 0 ? (
          <div style={{ fontSize: 12, color: "#9aa0ab" }}>–</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {players.map((p) => (
              <span key={p.username} style={{ background: "#1e2330", border: `1px solid ${color}`, borderRadius: 8, padding: "3px 10px", fontSize: 12, color: "#eef1f4" }}>
                {p.displayName || p.username}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleDownload = async () => {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#14171c", useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`control-carga-${today}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div id="load-pdf-modal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", zIndex: 200 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1.5rem", background: "#1e2330", borderBottom: "1px solid #2a2f38" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17, color: "#eef1f4" }}>Informe Control de Carga</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleDownload} disabled={downloading} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: downloading ? "#5a8a1a" : "#a3e635", color: "#14171c", fontWeight: 700, fontSize: 13, cursor: downloading ? "default" : "pointer" }}>
              {downloading ? "Generando…" : "Descargar PDF"}
            </button>
            <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #2a2f38", background: "transparent", color: "#eef1f4", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Cerrar
            </button>
          </div>
        </div>

        {/* Report content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          <div id="load-pdf-report" ref={reportRef} style={{ background: "#14171c", borderRadius: 16, padding: "1.5rem", maxWidth: 720, margin: "0 auto", color: "#eef1f4" }}>

            {/* Header equipo */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #2a2f38" }}>
              <Avatar name={team.name} photoUrl={team.crestUrl} size={56} square />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 24, color: "#eef1f4" }}>{team.name}</div>
                <div style={{ fontSize: 13, color: "#9aa0ab", marginTop: 2 }}>
                  {isIndividual ? "Atleta individual" : `${roster.length} ${personLabel}`} · Semana {weekNum} · {fmtDateShort(weekDays[0])} – {fmtDateShort(weekDays[6])}
                  {weekSpecialSession && (() => {
                    const rival = weekSpecialSession.description ? (() => { try { return null; } catch { return weekSpecialSession.description; } })() : null;
                    const rivalName = weekSpecialSession.description && (() => { try { JSON.parse(weekSpecialSession.description); return null; } catch { return weekSpecialSession.description; } })();
                    return (
                      <span style={{ marginLeft: 8, color: INTENSITY_LEVELS[weekSpecialSession.intensity]?.color || "#eef1f4", fontWeight: 600 }}>
                        {weekSpecialSession.sessionType}{rivalName ? ` · ${rivalName}` : ""}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ fontSize: 11, color: "#9aa0ab", marginTop: 2 }}>Generado: {fmtDateLong(today)}</div>
              </div>
            </div>

            {sectionOrder.map((key) => {
              if (!show(key)) return null;
              if (key === "teamStatus") return (
                <div key={key} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 12, color: "#eef1f4" }}>Estado del {teamGroupLabel}</div>
                  <StatusGroup title={isIndividual ? `Atleta ${adjSing} (ACWR)`               : `${PersonLabel} ${adjPlural} (ACWR)`}               players={loaded}   color="#ff9f40" />
                  <StatusGroup title={isIndividual ? "Atleta en alerta (≥4 factores en rojo)"  : `${PersonLabel} en alerta (≥4 factores en rojo)`}  players={alert4}   color="#ff5a5f" />
                  <StatusGroup title={isIndividual ? "Atleta en duda (2–3 factores en rojo)"   : `${PersonLabel} en duda (2–3 factores en rojo)`}   players={doubt}    color="#f2c63c" />
                  <StatusGroup title={isIndividual ? "Atleta en buena forma"                   : `${PersonLabel} en buena forma`}                   players={goodForm} color="#a3e635" />
                </div>
              );
              if (key === "wellnessRpeQuadrant") return (
                <div key={key} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 12, color: "#eef1f4" }}>Cuadrante Wellness vs RPE · media semana</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {quads.map((q) => (
                      <div key={q.label} style={{ background: "#1e2330", border: `1px solid ${q.color}`, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: q.color, marginBottom: 6 }}>{q.label} <span style={{ color: "#eef1f4", fontWeight: 400 }}>({q.list.length})</span></div>
                        {q.list.length === 0 ? <div style={{ fontSize: 11, color: "#9aa0ab" }}>–</div> : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {q.list.map((p) => <div key={p.username} style={{ fontSize: 12, color: "#eef1f4" }}>{p.displayName || p.username}</div>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
              if (key === "wellnessRpeChart") return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#eef1f4" }}>Gráfica Wellness vs RPE</div>
                  {(() => {
                    const svgW = 560, svgH = 400, pad = { l: 36, r: 16, t: 16, b: 36 };
                    const plotW = svgW - pad.l - pad.r, plotH = svgH - pad.t - pad.b, maxV = 10;
                    const px2 = (ws) => pad.l + (ws / maxV) * plotW;
                    const py2 = (r) => svgH - pad.b - (r / maxV) * plotH;
                    const midX = px2(5), midY = py2(5);
                    return (
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block", background: "#1a1e25", borderRadius: 10 }}>
                        <rect x={pad.l} y={pad.t} width={midX - pad.l} height={midY - pad.t} fill="#ff9f40" opacity={0.08} />
                        <rect x={midX} y={pad.t} width={svgW - pad.r - midX} height={midY - pad.t} fill="#a3e635" opacity={0.08} />
                        <rect x={pad.l} y={midY} width={midX - pad.l} height={svgH - pad.b - midY} fill="#ff5a5f" opacity={0.08} />
                        <rect x={midX} y={midY} width={svgW - pad.r - midX} height={svgH - pad.b - midY} fill="#60a5fa" opacity={0.08} />
                        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={svgH - pad.b} stroke="#eef1f4" strokeWidth={1} />
                        <line x1={pad.l} y1={svgH - pad.b} x2={svgW - pad.r} y2={svgH - pad.b} stroke="#eef1f4" strokeWidth={1} />
                        <line x1={midX} y1={pad.t} x2={midX} y2={svgH - pad.b} stroke="#eef1f4" strokeWidth={1} strokeDasharray="5 3" />
                        <line x1={pad.l} y1={midY} x2={svgW - pad.r} y2={midY} stroke="#eef1f4" strokeWidth={1} strokeDasharray="5 3" />
                        {[0,2.5,5,7.5,10].map((v) => (<g key={`x${v}`}><text x={px2(v)} y={svgH - pad.b + 12} textAnchor="middle" fill="#eef1f4" fontSize={9}>{v}</text><text x={pad.l - 6} y={py2(v)} textAnchor="end" dominantBaseline="middle" fill="#eef1f4" fontSize={9}>{v}</text></g>))}
                        <text x={pad.l + 6} y={pad.t + 14} fontSize={9} fill="#ff9f40" fontWeight="600">{isIndividual ? `Atleta ${adjSing}` : `${PersonLabel} ${adjPlural}`}</text>
                        <text x={midX + 6} y={pad.t + 14} fontSize={9} fill="#a3e635" fontWeight="600">Asimila bien la carga</text>
                        <text x={pad.l + 6} y={svgH - pad.b - 8} fontSize={9} fill="#ff5a5f" fontWeight="600">{isIndividual ? `Mal ${malSing}` : `Mal ${malPlural}`}</text>
                        <text x={midX + 6} y={svgH - pad.b - 8} fontSize={9} fill="#60a5fa" fontWeight="600">{isIndividual ? `Poco ${adjSing}` : `Poco ${adjPlural}`}</text>
                        <text x={pad.l + plotW / 2} y={svgH - 4} fontSize={9} fill="#eef1f4" textAnchor="middle">WS →</text>
                        <text x={10} y={pad.t + plotH / 2} fontSize={9} fill="#eef1f4" textAnchor="middle" transform={`rotate(-90,10,${pad.t + plotH / 2})`}>RPE →</text>
                        <defs>{playerStats.map((p) => (<clipPath key={`clip-${p.username}`} id={`clip-pdf-${p.username}`}><circle cx={0} cy={0} r={10} /></clipPath>))}</defs>
                        {playerStats.map((p) => {
                          if (p.avgWS === null || p.avgRpe === null) return null;
                          const cx = px2(p.avgWS), cy = py2(p.avgRpe);
                          const initials = (p.displayName || p.username).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                          return (
                            <g key={p.username} transform={`translate(${cx},${cy})`}>
                              {photoB64[p.username] ? (<image href={photoB64[p.username]} x={-10} y={-10} width={20} height={20} clipPath={`url(#clip-pdf-${p.username})`} preserveAspectRatio="xMidYMid slice" />) : (<><circle r={10} fill="#2a2f3e" stroke="#eef1f4" strokeWidth={1} /><text textAnchor="middle" dominantBaseline="central" fill="#eef1f4" fontSize={7} fontWeight="600">{initials}</text></>)}
                              <text y={-14} textAnchor="middle" fill="#eef1f4" fontSize={7}>{(p.displayName || p.username).slice(0, 18)}</text>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
              );
              if (key === "weekCalendar") return (
                <div key={key} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 10, color: "#eef1f4" }}>Semana {weekNum}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {weekDays.map((date) => {
                      const s = sessions.find((s) => s.date === date);
                      const intColor = s && !s.isRest ? (INTENSITY_LEVELS[s.intensity]?.color || "#eef1f4") : null;
                      const isToday = date === today;
                      return (
                        <div key={date} style={{ background: isToday ? "#1e2a3a" : "#1a1e25", border: `1px solid ${isToday ? "#4fb3ff" : "#2a2f38"}`, borderRadius: 8, padding: "6px 4px", textAlign: "center", minHeight: 70 }}>
                          <div style={{ fontSize: 8, color: "#9aa0ab", marginBottom: 2 }}>{weekdayLabel(date).slice(0, 3).toUpperCase()}</div>
                          <div style={{ fontSize: 10, color: isToday ? "#4fb3ff" : "#eef1f4", fontWeight: isToday ? 700 : 400, marginBottom: 4 }}>{date.slice(8)}</div>
                          {s ? (
                            s.isRest ? (
                              <div style={{ fontSize: 8, color: "#9aa0ab" }}>Descanso</div>
                            ) : (
                              <>
                                <div style={{ fontSize: 8, color: intColor || "#eef1f4", fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{s.sessionType}</div>
                                {intColor && <div style={{ width: "60%", height: 3, background: intColor, borderRadius: 2, margin: "0 auto" }} />}
                                {s.duration > 0 && <div style={{ fontSize: 7, color: "#9aa0ab", marginTop: 3 }}>{s.duration} min</div>}
                              </>
                            )
                          ) : (
                            <div style={{ fontSize: 8, color: "#3a4050" }}>–</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
              if (key === "mesoInfo") {
                if (!activeMeso) return (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 8, color: "#eef1f4" }}>Mesociclo</div>
                    <div style={{ fontSize: 12, color: "#9aa0ab" }}>No hay mesociclo activo para esta semana.</div>
                  </div>
                );
                const totalWeeks = activeMeso.weeks?.length || Math.round((new Date(activeMeso.endDate) - new Date(activeMeso.startDate)) / (7 * 86400000)) + 1;
                return (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 10, color: "#eef1f4" }}>Mesociclo</div>
                    <div style={{ background: "#1a1e25", border: `1px solid ${activeMeso.color || "#2a2f38"}`, borderRadius: 10, padding: "12px 16px" }}>
                      {/* Nombre y rango */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: activeMeso.color || "#eef1f4", marginBottom: 2 }}>{activeMeso.name || "Mesociclo"}</div>
                          <div style={{ fontSize: 11, color: "#9aa0ab" }}>{fmtDateShort(activeMeso.startDate)} → {fmtDateShort(activeMeso.endDate)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#eef1f4" }}>Semana {mesoWeekNum} / {totalWeeks}</div>
                          <div style={{ fontSize: 11, color: "#9aa0ab" }}>Semana global {weekNum}</div>
                        </div>
                      </div>
                      {/* Barra de progreso */}
                      <div style={{ background: "#2a2f38", borderRadius: 4, height: 6, marginBottom: 10 }}>
                        <div style={{ background: activeMeso.color || "#b6e000", borderRadius: 4, height: 6, width: `${Math.min(100, ((mesoWeekNum - 1) / totalWeeks) * 100)}%` }} />
                      </div>
                      {/* Semanas del meso */}
                      {activeMeso.weeks?.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(activeMeso.weeks.length, 8)}, 1fr)`, gap: 4 }}>
                          {activeMeso.weeks.map((w, i) => {
                            const isCurrent = i === mesoWeekNum - 1;
                            return (
                              <div key={i} style={{ background: isCurrent ? (activeMeso.color ? `${activeMeso.color}22` : "#b6e00022") : "#1e2330", border: `1px solid ${isCurrent ? (activeMeso.color || "#b6e000") : "#2a2f38"}`, borderRadius: 6, padding: "5px 4px", textAlign: "center" }}>
                                <div style={{ fontSize: 8, color: isCurrent ? (activeMeso.color || "#b6e000") : "#9aa0ab", fontWeight: isCurrent ? 700 : 400 }}>S{i + 1}</div>
                                {w.label && <div style={{ fontSize: 7, color: isCurrent ? "#eef1f4" : "#6a7380", marginTop: 1, lineHeight: 1.2 }}>{w.label}</div>}
                                {w.volume != null && <div style={{ fontSize: 7, color: "#9aa0ab", marginTop: 1 }}>V{w.volume}</div>}
                                {w.intensity != null && <div style={{ fontSize: 7, color: "#9aa0ab" }}>I{w.intensity}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Contenidos */}
                      {activeMeso.contenidos && (
                        <div style={{ marginTop: 10, fontSize: 11, color: "#eef1f4", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                          <span style={{ color: "#9aa0ab", fontSize: 10 }}>CONTENIDOS: </span>{activeMeso.contenidos}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}

            <div style={{ fontSize: 10, color: "#9aa0ab", textAlign: "right", marginTop: 12 }}>
              Wellness RPE · Control de Carga · {fmtDateLong(today)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
