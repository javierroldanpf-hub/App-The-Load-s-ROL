"use client";
import { useRef, useState, useEffect } from "react";
import { COLORS, WEEKDAY_LABELS } from "@/lib/constants";
import { weekDates, mondayOf, addWeeks, addMonths, monthGridDates, weekNumberFrom, addDays } from "@/lib/utils";
import Avatar from "./Avatar";

function monthLabel(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}
function fmtShort(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
function dayIdx(dateStr) {
  const d = new Date(dateStr + "T00:00:00").getDay();
  return d === 0 ? 6 : d - 1;
}
function parseBlocks(description) {
  if (!description) return [];
  try {
    const p = JSON.parse(description);
    if (p.blocks) return p.blocks.filter((b) => b.name || b.content);
    if (p.g || p.c) return [p.g && { name: "Gimnasio", content: p.g }, p.c && { name: "Campo", content: p.c }].filter(Boolean);
  } catch {}
  return description ? [{ name: "", content: description }] : [];
}

const D = {
  bg: "#14171c", panel: "#1c2128", panelRaised: "#232a33", line: "#2e3640",
  text: "#eef1f4", textMuted: "#8a939e",
  lime: "#b6e000", limeDark: "#27310a", blue: "#4fb3ff", blueDark: "#102733",
};
const INT = {
  amarillo: { bg: "#3a2f0c", color: "#f2c63c", border: "#5a4a1a" },
  naranja:  { bg: "#3a2710", color: "#ff9f40", border: "#5a3a18" },
  rojo:     { bg: "#3a1517", color: "#ff5a5f", border: "#5a2525" },
  "rojo+":  { bg: "#330c14", color: "#c01f3c", border: "#5a1828" },
  descanso: { bg: "#1c2128", color: "#8a939e", border: "#2e3640" },
};
const WT_COLOR = { carga: "#ff9f40", sobrecarga: "#ff5a5f", descarga: "#60a5fa" };

const MENSTRUAL_PHASES_PDF = [
  { short: "Semana Previa al Sangrado",  emoji: "🌕" },
  { short: "Semana de Sangrado",         emoji: "🔴" },
  { short: "Semana Post Sangrado",       emoji: "🔥💪" },
  { short: "Semana 2ª Post Sangrado",    emoji: "💙" },
];

function getMeso(date, mesocycles) {
  return mesocycles.find((m) => date >= m.startDate && date <= m.endDate) || null;
}
function getWT(date, mesocycles) {
  const m = getMeso(date, mesocycles);
  return m?.weeks?.find((w) => (w.weekStart || w.monday) === mondayOf(date)) || null;
}
function getMenstrualPhase(date, mesocycles) {
  for (const m of mesocycles) {
    if (!m.isMenstrual || date < m.startDate || date > m.endDate) continue;
    const idx = (m.weeks || []).findIndex((w) => (w.weekStart || w.monday) === mondayOf(date));
    if (idx >= 0) return MENSTRUAL_PHASES_PDF[idx] || MENSTRUAL_PHASES_PDF[MENSTRUAL_PHASES_PDF.length - 1];
  }
  return null;
}
function isRelaxinDay(date, mesocycles) {
  for (const m of mesocycles) {
    if (!m.isMenstrual || date < m.startDate || date > m.endDate) continue;
    const day1 = m.startDate;
    const diff = Math.round((new Date(date + "T00:00:00") - new Date(day1 + "T00:00:00")) / 86400000) + 1;
    if (diff === 20 || diff === 21 || diff === 22) return true;
  }
  return false;
}

// ── Day top badges: meso dot + week type line ─────────────────────────────────
function DayBadges({ date, mesocycles }) {
  const meso    = getMeso(date, mesocycles);
  const wt      = getWT(date, mesocycles);
  const phase   = getMenstrualPhase(date, mesocycles);
  const relaxin = isRelaxinDay(date, mesocycles);
  if (!meso && !wt && !phase && !relaxin) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5, minHeight: 10 }}>
      {meso && <span style={{ width: 8, height: 8, borderRadius: "50%", background: meso.color || D.lime, display: "inline-block", flexShrink: 0 }} />}
      {wt && WT_COLOR[wt.type] && <span style={{ flex: 1, height: 3, background: WT_COLOR[wt.type], borderRadius: 2, display: "inline-block" }} />}
      {phase && <span style={{ fontSize: 9, lineHeight: 1, flexShrink: 0 }}>{phase.emoji}</span>}
      {relaxin && <span style={{ fontSize: 9, lineHeight: 1, flexShrink: 0 }} title="Pico de relaxina">⚡</span>}
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────
function parseMatchDesc(description) {
  if (!description) return { rivalText: "", rivalPhoto: "" };
  try {
    const p = JSON.parse(description);
    if (p.rivalText !== undefined || p.rivalPhoto !== undefined)
      return { rivalText: p.rivalText || "", rivalPhoto: p.rivalPhoto || "" };
  } catch {}
  return { rivalText: description, rivalPhoto: "" };
}

function SessionCard({ session, showGroup, showInd, compact = false, displayNames }) {
  if (!session) return null;
  const blocks = parseBlocks(session.description);
  const int = INT[session.intensity] || INT.amarillo;
  const match = session.isMatch ? parseMatchDesc(session.description) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {showGroup && session.sessionType && (
        session.isRest ? (
          <div style={{ background: INT.descanso.bg, border: `1px solid ${INT.descanso.border}`, borderRadius: 5, padding: "4px 7px", fontSize: 12, color: INT.descanso.color, fontWeight: 700 }}>Descanso</div>
        ) : (
          <div style={{ background: int.bg, border: `1px solid ${int.border}`, borderRadius: 5, padding: compact ? "4px 7px" : "7px 9px" }}>
            <div style={{ fontSize: compact ? 11 : 13, fontWeight: 800, color: int.color }}>
              {session.sessionType}{match?.rivalText ? ` · ${match.rivalText}` : ""}
              {!compact && session.duration > 0 && <span style={{ fontWeight: 400, fontSize: 10, color: D.textMuted, marginLeft: 6 }}>{session.duration} min</span>}
            </div>
            {match?.rivalPhoto && (
              <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                <img src={match.rivalPhoto} alt="" style={{ width: compact ? 28 : 64, height: compact ? 28 : 64, objectFit: "contain", borderRadius: 6, background: "rgba(255,255,255,0.07)", padding: 4 }} />
              </div>
            )}
            {!compact && !match && blocks.map((b, i) => (
              <div key={i} style={{ marginTop: 4, paddingLeft: 7, borderLeft: `2px solid ${int.border}` }}>
                {b.name && <div style={{ fontSize: 10, fontWeight: 700, color: int.color }}>{b.name}{b.duration ? ` · ${b.duration} min` : ""}</div>}
                {b.content && <div style={{ fontSize: 10, color: D.text, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{b.content}</div>}
              </div>
            ))}
          </div>
        )
      )}
      {showInd && (session.individualSessions || []).filter((s) => s.title).map((s, i) => (
        <div key={i} style={{ background: D.blueDark, border: `1px solid ${D.blue}`, borderRadius: 5, padding: compact ? "3px 7px" : "5px 8px" }}>
          <div style={{ fontSize: compact ? 10 : 12, fontWeight: 700, color: D.blue }}>{s.title}</div>
          {!compact && s.players?.length > 0 && <div style={{ fontSize: 9, color: D.textMuted, marginTop: 1 }}>{s.players.map((u) => resolveDisplayName(displayNames, u)).join(", ")}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Shared PDF header (same style as PrintableReportModal) ────────────────────
function PdfHeader({ team, coachName, mesocycles, visibleDates, title }) {
  const first = visibleDates[0], last = visibleDates[visibleDates.length - 1];
  const visMesos = mesocycles.filter((m) => m.startDate <= last && m.endDate >= first);
  const visibleTypes = [...new Set(visMesos.flatMap((m) =>
    (m.weeks || []).filter((w) => {
      const ws = w.weekStart || w.monday;
      return ws >= first && ws <= last && w.type && WT_COLOR[w.type];
    }).map((w) => w.type)
  ))];
  return (
    <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${D.line}` }}>
      {/* Same layout as PrintableReportModal header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={team.name} photoUrl={team.crestUrl || team.photoUrl} size={56} square />
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: D.text }}>{team.name}</div>
            <div style={{ fontSize: 13, color: D.textMuted, marginTop: 2 }}>{title}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: D.textMuted }}>Preparador físico</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{coachName}</div>
        </div>
      </div>
      {/* Mesocycle + week type legend */}
      {visMesos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          {visMesos.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: m.color || D.lime, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>{m.name}</span>
            </div>
          ))}
          {visibleTypes.length > 0 && (
            <>
              <span style={{ color: D.line }}>·</span>
              {visibleTypes.map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 18, height: 3, background: WT_COLOR[k], borderRadius: 2, display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: WT_COLOR[k], fontWeight: 700, textTransform: "capitalize" }}>{k}</span>
                </div>
              ))}
            </>
          )}
          {(() => {
            const visibleMenstrualIdxs = new Set(visibleDates.flatMap((d) => {
              for (const m of visMesos) {
                if (!m.isMenstrual || d < m.startDate || d > m.endDate) continue;
                const idx = (m.weeks || []).findIndex((w) => (w.weekStart || w.monday) === mondayOf(d));
                if (idx >= 0) return [Math.min(idx, 3)];
              }
              return [];
            }));
            const visiblePhases = MENSTRUAL_PHASES_PDF.filter((_, i) => visibleMenstrualIdxs.has(i));
            const hasRelaxin = visibleDates.some((d) =>
              visMesos.some((m) => {
                if (!m.isMenstrual || d < m.startDate || d > m.endDate) return false;
                const diff = Math.round((new Date(d + "T00:00:00") - new Date(m.startDate + "T00:00:00")) / 86400000) + 1;
                return diff === 20 || diff === 21 || diff === 22;
              })
            );
            if (visiblePhases.length === 0 && !hasRelaxin) return null;
            return (
              <>
                <span style={{ color: D.line }}>·</span>
                {visiblePhases.map((p) => (
                  <div key={p.short} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11 }}>{p.emoji}</span>
                    <span style={{ fontSize: 10, color: "#e879f9", fontWeight: 600 }}>{p.short}</span>
                  </div>
                ))}
                {hasRelaxin && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11 }}>⚡</span>
                    <span style={{ fontSize: 10, color: "#fde68a", fontWeight: 600 }}>Pico relaxina (cuidado estiramiento)</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Week content ──────────────────────────────────────────────────────────────
function WeekContent({ team, sessions, mesocycles, weekMonday, coachName, showGroup, showInd, displayNames }) {
  const byDate = Object.fromEntries(sessions.map((s) => [s.date, s]));
  const days = weekDates(weekMonday);
  const meso = getMeso(days[0], mesocycles) || getMeso(days[6], mesocycles);
  const weekNum = meso ? weekNumberFrom(mondayOf(meso.startDate), weekMonday) : null;
  const title = weekNum ? `Semana ${weekNum} · ${fmtShort(days[0])} – ${fmtShort(days[6])}` : `${fmtShort(days[0])} – ${fmtShort(days[6])}`;
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: D.text, background: D.bg, padding: 28, minWidth: 900 }}>
      <PdfHeader team={team} coachName={coachName} mesocycles={mesocycles} visibleDates={days} title={title} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7 }}>
        {days.map((date, i) => (
          <div key={date} style={{ border: `1px solid ${D.line}`, borderRadius: 9, overflow: "hidden", background: D.panel, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 9px", borderBottom: `1px solid ${D.line}`, background: D.panelRaised }}>
              <DayBadges date={date} mesocycles={mesocycles} />
              <div style={{ fontSize: 11, fontWeight: 700, color: D.textMuted }}>{WEEKDAY_LABELS[i].toUpperCase()}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: D.text }}>{fmtShort(date)}</div>
            </div>
            <div style={{ padding: 9, flex: 1 }}>
              {byDate[date] ? <SessionCard session={byDate[date]} showGroup={showGroup} showInd={showInd} displayNames={displayNames} /> : <div style={{ fontSize: 12, color: D.textMuted }}>—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Month content ─────────────────────────────────────────────────────────────
function MonthContent({ team, sessions, mesocycles, monthAnchor, coachName, showGroup, showInd }) {
  const byDate = Object.fromEntries(sessions.map((s) => [s.date, s]));
  const cells = monthGridDates(monthAnchor);
  const inMonth = cells.filter((c) => c.inMonth).map((c) => c.date);
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: D.text, background: D.bg, padding: 28, minWidth: 800 }}>
      <PdfHeader team={team} coachName={coachName} mesocycles={mesocycles} visibleDates={inMonth} title={monthLabel(monthAnchor)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 5 }}>
        {WEEKDAY_LABELS.map((d) => <div key={d} style={{ fontSize: 11, fontWeight: 700, color: D.textMuted, textAlign: "center", padding: "4px 0" }}>{d.slice(0, 3).toUpperCase()}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map(({ date, inMonth: im }) => {
          const session = byDate[date];
          const int = session && !session.isRest && session.sessionType ? (INT[session.intensity] || INT.amarillo) : null;
          return (
            <div key={date} style={{ border: `1px solid ${D.line}`, borderRadius: 6, padding: "5px 6px", minHeight: 70, opacity: im ? 1 : 0.2, background: D.panel, display: "flex", flexDirection: "column", gap: 3 }}>
              <DayBadges date={date} mesocycles={mesocycles} />
              <div style={{ fontSize: 13, fontWeight: 700, color: D.textMuted }}>{new Date(date + "T00:00:00").getDate()}</div>
              {showGroup && session?.isRest && <div style={{ fontSize: 10, color: INT.descanso.color, fontWeight: 700 }}>Descanso</div>}
              {showGroup && session && !session.isRest && session.sessionType && (() => {
                const m = session.isMatch ? parseMatchDesc(session.description) : null;
                return (
                  <div style={{ background: int?.bg, border: `1px solid ${int?.border}`, borderRadius: 4, padding: "3px 5px", fontSize: 10, fontWeight: 700, color: int?.color }}>
                    <div>{session.sessionType}{m?.rivalText ? ` · ${m.rivalText}` : ""}</div>
                    {m?.rivalPhoto && <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}><img src={m.rivalPhoto} alt="" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, background: "rgba(255,255,255,0.07)", padding: 3 }} /></div>}
                  </div>
                );
              })()}
              {showInd && (session?.individualSessions || []).filter((s) => s.title).map((s, i) => (
                <div key={i} style={{ background: D.blueDark, border: `1px solid ${D.blue}`, borderRadius: 4, padding: "2px 5px", fontSize: 9, fontWeight: 700, color: D.blue }}>{s.title}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Meso content ──────────────────────────────────────────────────────────────
function MesoContent({ team, sessions, meso, mesocycles, coachName, showGroup, showInd, displayNames }) {
  const byDate = Object.fromEntries(sessions.map((s) => [s.date, s]));
  if (!meso) return null;
  const allDates = [];
  const cur = new Date(meso.startDate + "T00:00:00"), end = new Date(meso.endDate + "T00:00:00");
  while (cur <= end) { allDates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  const title = `${meso.name} · ${fmtShort(meso.startDate)} – ${fmtShort(meso.endDate)}`;
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", color: D.text, background: D.bg, padding: 28, minWidth: 900 }}>
      <PdfHeader team={team} coachName={coachName} mesocycles={mesocycles} visibleDates={allDates} title={title} />
      {(meso.weeks || []).map((week, wi) => {
        const days = weekDates(week.weekStart || week.monday).filter((d) => d >= meso.startDate && d <= meso.endDate);
        const wtColor = WT_COLOR[week.type];
        return (
          <div key={wi} style={{ marginBottom: 14, border: `1px solid ${D.line}`, borderRadius: 9, overflow: "hidden" }}>
            <div style={{ background: D.panelRaised, borderBottom: `1px solid ${D.line}`, padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Microciclo {wi + 1}</span>
              {wtColor && <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 18, height: 3, background: wtColor, borderRadius: 2, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: wtColor, fontWeight: 700, textTransform: "capitalize" }}>{week.type}</span>
              </span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, background: D.bg }}>
              {days.map((date, di) => (
                <div key={date} style={{ borderRight: di < days.length - 1 ? `1px solid ${D.line}` : "none", padding: 10, minHeight: 120 }}>
                  <DayBadges date={date} mesocycles={mesocycles} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.textMuted }}>{WEEKDAY_LABELS[dayIdx(date)]?.slice(0, 3).toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{fmtShort(date)}</div>
                  {byDate[date] ? <SessionCard session={byDate[date]} showGroup={showGroup} showInd={showInd} displayNames={displayNames} /> : <div style={{ fontSize: 11, color: D.textMuted }}>—</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function resolveDisplayName(displayNames, username) {
  const d = displayNames?.[username];
  if (!d) return username;
  return typeof d === "object" ? (d.displayName || username) : d;
}

export default function CalendarPdfExport({ team, sessions, mesocycles, currentWeekMonday, currentMonthAnchor, coachName, displayNames, onClose }) {
  const [step, setStep] = useState("config"); // "config" | "preview"
  const [type, setType] = useState("week");
  const [weekMonday, setWeekMonday] = useState(currentWeekMonday);
  const [monthAnchor, setMonthAnchor] = useState(currentMonthAnchor);
  const [mesoId, setMesoId] = useState(mesocycles[0]?.id || null);
  const [showGroup, setShowGroup] = useState(true);
  const [showInd, setShowInd] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);
  const selectedMeso = mesocycles.find((m) => m.id === mesoId) || mesocycles[0];

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: D.bg,
        width: printRef.current.scrollWidth, height: printRef.current.scrollHeight,
        imageTimeout: 15000,
      });
      const imgData = canvas.toDataURL("image/png");
      const w = canvas.width / 2, h = canvas.height / 2;
      const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h] });
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      const name = type === "week" ? `semana-${weekMonday}` : type === "month" ? `mes-${monthAnchor.slice(0, 7)}` : `mesociclo-${selectedMeso?.name || "meso"}`;
      pdf.save(`${name}.pdf`);
    } finally { setDownloading(false); }
  };

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setType(id)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${type === id ? COLORS.lime : COLORS.line}`, background: type === id ? COLORS.limeDark : "transparent", color: type === id ? COLORS.lime : COLORS.text, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{label}</button>
  );
  const navBtn = (label, fn) => (
    <button onClick={fn} style={{ background: COLORS.lime, border: "none", color: "#14171c", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>{label}</button>
  );
  const Toggle = ({ label, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: COLORS.panelRaised, borderRadius: 10, cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div style={{ width: 42, height: 24, borderRadius: 12, background: value ? COLORS.lime : COLORS.line, position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: value ? "#14171c" : COLORS.textDim, transition: "left 0.15s" }} />
      </div>
      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{label}</span>
    </div>
  );

  // ── Config screen ───────────────────────────────────────────────────────────
  if (step === "config") return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 100 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 18, padding: "1.5rem", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 20, color: COLORS.text, marginBottom: 20 }}>Exportar PDF</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{tabBtn("week","Semana")}{tabBtn("month","Mes")}{tabBtn("meso","Mesociclo")}</div>

        {type === "week" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Seleccionar semana</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {navBtn("←", () => setWeekMonday(addWeeks(weekMonday, -1)))}
              <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: COLORS.text }}>{fmtShort(weekMonday)} – {fmtShort(weekDates(weekMonday)[6])}</div>
              {navBtn("→", () => setWeekMonday(addWeeks(weekMonday, 1)))}
            </div>
          </div>
        )}
        {type === "month" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Seleccionar mes</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {navBtn("←", () => setMonthAnchor(addMonths(monthAnchor, -1)))}
              <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: COLORS.text, textTransform: "capitalize" }}>{monthLabel(monthAnchor)}</div>
              {navBtn("→", () => setMonthAnchor(addMonths(monthAnchor, 1)))}
            </div>
          </div>
        )}
        {type === "meso" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Seleccionar mesociclo</div>
            {mesocycles.length === 0 && <div style={{ fontSize: 13, color: COLORS.textMuted }}>No hay mesociclos creados</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mesocycles.map((m) => (
                <button key={m.id} onClick={() => setMesoId(m.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${mesoId === m.id ? COLORS.lime : COLORS.line}`, background: mesoId === m.id ? COLORS.limeDark : COLORS.panelRaised, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color || COLORS.lime, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: mesoId === m.id ? COLORS.lime : COLORS.text }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.text }}>{m.startDate} – {m.endDate}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Contenido</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          <Toggle label="Sesiones de grupo" value={showGroup} onChange={setShowGroup} />
          <Toggle label="Sesiones individuales" value={showInd} onChange={setShowInd} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => setStep("preview")} style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Vista previa →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Preview screen (same layout as PrintableReportModal) ────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", zIndex: 100 }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1.5rem", background: COLORS.panel, borderBottom: `1px solid ${COLORS.line}`, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 17, color: COLORS.text }}>Vista previa del PDF</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setStep("config")} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Volver</button>
          <button onClick={handleDownload} disabled={downloading} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: downloading ? COLORS.limeDark : COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: downloading ? "default" : "pointer" }}>
            {downloading ? "Generando..." : "Descargar PDF"}
          </button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
      {/* Scrollable preview */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "1.5rem", display: "flex", justifyContent: "center" }}>
        <div ref={printRef} style={{ display: "inline-block" }}>
          {type === "week" && <WeekContent team={team} sessions={sessions} mesocycles={mesocycles} weekMonday={weekMonday} coachName={coachName} showGroup={showGroup} showInd={showInd} displayNames={displayNames} />}
          {type === "month" && <MonthContent team={team} sessions={sessions} mesocycles={mesocycles} monthAnchor={monthAnchor} coachName={coachName} showGroup={showGroup} showInd={showInd} displayNames={displayNames} />}
          {type === "meso" && selectedMeso && <MesoContent team={team} sessions={sessions} meso={selectedMeso} mesocycles={mesocycles} coachName={coachName} showGroup={showGroup} showInd={showInd} displayNames={displayNames} />}
        </div>
      </div>
    </div>
  );
}
