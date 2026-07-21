"use client";
import { useState, useMemo } from "react";
import { COLORS } from "@/lib/constants";

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

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

export default function MonthlyLoadPanel({ sessions }) {
  const [openMonths, setOpenMonths] = useState({});
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
        map[mk].sessions.push(s);
        map[mk].totalMin += Number(s.duration) || 0;
      });

    // Find first and last month with any session
    const keys = Object.keys(map).sort();
    if (keys.length === 0) return [];

    // Fill gaps between first and last month (including months with 0 sessions)
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

  const toggle = (key) => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));

  if (months.length === 0) {
    return <div style={{ fontSize: 13, color: COLORS.text, textAlign: "center", padding: "2rem" }}>Sin sesiones registradas</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {months.map(({ key, sessions: ms, totalMin }) => {
        const isOpen = !!openMonths[key];
        const count = ms.length;
        return (
          <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
            <button
              onClick={() => toggle(key)}
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
                  ms.sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: COLORS.panelRaised, borderRadius: 8 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{s.sessionType}</span>
                        <span style={{ fontSize: 11, color: COLORS.text, marginLeft: 8 }}>{s.date.slice(8, 10)}/{s.date.slice(5, 7)}</span>
                      </div>
                      <span style={{ fontSize: 12, color: COLORS.text }}>{Number(s.duration) || 0} min</span>
                    </div>
                  ))
                )}
                {count > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${COLORS.line}` }}>
                    <span style={{ fontSize: 11, color: COLORS.text }}>Total: <strong style={{ color: COLORS.lime }}>{count} sesiones</strong></span>
                    <span style={{ fontSize: 11, color: COLORS.text }}>Tiempo: <strong style={{ color: COLORS.lime }}>{fmtTime(totalMin)}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
