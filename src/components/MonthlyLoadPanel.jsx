"use client";
import { useState, useMemo } from "react";
import { COLORS } from "@/lib/constants";

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const BLOCK_TYPE_COLORS = {
  "CAMPO": "#4caf8a",
  "PISTA": "#4a9fd4",
  "FUERZA": "#e07b54",
  "CARRERA": "#f2c63c",
  "METABÓLICO": "#c97dd4",
  "HIIT": "#e05c5c",
  "EMOM": "#5c9ee0",
  "AMRAP": "#e0a05c",
  "CALENTAMIENTO": "#8ab87a",
  "MOVEMENT PREP": "#a0c4b8",
};
function blockColor(name) { return BLOCK_TYPE_COLORS[name] || COLORS.lime; }

function fmtTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${min} min`;
  if (m === 0) return `${min} min · ${h}h`;
  return `${min} min · ${h}h ${m}min`;
}

function monthKey(date) { return date.slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function parseBlocks(description) {
  try {
    const p = JSON.parse(description || "{}");
    return Array.isArray(p.blocks) ? p.blocks : [];
  } catch { return []; }
}

function blockDisplayName(b) {
  if (b.blockType && b.blockType !== "OTRO") return b.blockType;
  return (b.name || "BLOQUE").toUpperCase();
}

export default function MonthlyLoadPanel({ sessions }) {
  const [openMonths, setOpenMonths] = useState({});
  const [openSessions, setOpenSessions] = useState({});
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const months = useMemo(() => {
    const map = {};
    sessions
      .filter((s) => !s.isRest && s.sessionType && s.date <= today)
      .forEach((s) => {
        const mk = monthKey(s.date);
        if (mk > currentMonth) return;
        if (!map[mk]) map[mk] = { sessions: [], totalMin: 0 };
        const blocks = parseBlocks(s.description);
        map[mk].sessions.push({ ...s, parsedBlocks: blocks });
        map[mk].totalMin += Number(s.duration) || 0;
      });

    const keys = Object.keys(map).sort();
    if (keys.length === 0) return [];

    const result = [];
    const [fy, fm] = keys[0].split("-").map(Number);
    const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
    let y = fy, m = fm;
    while (y < ly || (y === ly && m <= lm)) {
      const mk = `${y}-${String(m).padStart(2, "0")}`;
      result.push({ key: mk, ...(map[mk] || { sessions: [], totalMin: 0 }) });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return result.reverse();
  }, [sessions, today, currentMonth]);

  const toggleMonth = (key) => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleSession = (key) => setOpenSessions((prev) => ({ ...prev, [key]: !prev[key] }));

  if (months.length === 0) {
    return <div style={{ fontSize: 13, color: COLORS.text, textAlign: "center", padding: "2rem" }}>Sin sesiones registradas</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {months.map(({ key, sessions: ms, totalMin }) => {
        const isOpen = !!openMonths[key];
        const count = ms.length;

        // Aggregate block type total minutes for this month
        const blockMins = {};
        ms.forEach((s) => {
          (s.parsedBlocks || []).forEach((b) => {
            const name = blockDisplayName(b);
            blockMins[name] = (blockMins[name] || 0) + (Number(b.duration) || 0);
          });
        });
        const hasBlocks = Object.keys(blockMins).length > 0;

        return (
          <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
            <button
              onClick={() => toggleMonth(key)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>{monthLabel(key)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: count > 0 ? COLORS.lime : COLORS.text, fontWeight: 600 }}>{count} sesión{count !== 1 ? "es" : ""}</span>
                <span style={{ fontSize: 12, color: COLORS.text }}>{fmtTime(totalMin)}</span>
                <span style={{ fontSize: 11, color: COLORS.lime, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${COLORS.line}`, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {count === 0 ? (
                  <div style={{ fontSize: 12, color: COLORS.text }}>Sin sesiones este mes</div>
                ) : (
                  <>
                    {/* Block type totals for month */}
                    {hasBlocks && (
                      <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "8px 10px", marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>Tipos de bloque este mes</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(blockMins).map(([name, mins]) => (
                            <span key={name} style={{ display: "flex", alignItems: "center", gap: 4, background: `${blockColor(name)}22`, border: `1px solid ${blockColor(name)}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: blockColor(name), fontWeight: 600 }}>
                              {name} <span style={{ opacity: 0.8, fontWeight: 400 }}>{mins > 0 ? `${mins} min` : "–"}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sessions */}
                    {ms.sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => {
                      const sessionKey = `${key}-${i}`;
                      const isSessionOpen = !!openSessions[sessionKey];
                      const blocks = s.parsedBlocks || [];
                      return (
                        <div key={i} style={{ background: COLORS.panelRaised, borderRadius: 8, overflow: "hidden" }}>
                          <button
                            onClick={() => blocks.length > 0 && toggleSession(sessionKey)}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "none", border: "none", cursor: blocks.length > 0 ? "pointer" : "default" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{s.sessionType}</span>
                              <span style={{ fontSize: 11, color: COLORS.text, opacity: 0.7 }}>{s.date.slice(8, 10)}/{s.date.slice(5, 7)}</span>
                              {blocks.length > 0 && (
                                <div style={{ display: "flex", gap: 4 }}>
                                  {blocks.map((b, bi) => (
                                    <span key={bi} style={{ fontSize: 10, background: `${blockColor(blockDisplayName(b))}33`, color: blockColor(blockDisplayName(b)), borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
                                      {blockDisplayName(b)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, color: COLORS.text }}>{Number(s.duration) || 0} min</span>
                              {blocks.length > 0 && (
                                <span style={{ fontSize: 10, color: COLORS.lime, transform: isSessionOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
                              )}
                            </div>
                          </button>

                          {isSessionOpen && blocks.length > 0 && (
                            <div style={{ borderTop: `1px solid ${COLORS.line}`, padding: "6px 10px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                              {blocks.map((b, bi) => {
                                const bName = blockDisplayName(b);
                                const bColor = blockColor(bName);
                                return (
                                  <div key={bi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: `${bColor}11`, borderLeft: `3px solid ${bColor}`, borderRadius: "0 6px 6px 0" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: bColor, minWidth: 90 }}>{bName}</span>
                                    {b.duration && <span style={{ fontSize: 11, color: COLORS.text }}>{b.duration} min</span>}
                                    {b.content && <span style={{ fontSize: 11, color: COLORS.text, opacity: 0.8, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.content}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${COLORS.line}` }}>
                      <span style={{ fontSize: 11, color: COLORS.text }}>Total: <strong style={{ color: COLORS.lime }}>{count} sesiones</strong></span>
                      <span style={{ fontSize: 11, color: COLORS.text }}>Tiempo: <strong style={{ color: COLORS.lime }}>{fmtTime(totalMin)}</strong></span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
