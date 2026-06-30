"use client";
import { useMemo } from "react";
import { COLORS, WELLNESS_FIELDS } from "@/lib/constants";
import { fmtDateShort, wellnessScore, rpeStatus } from "@/lib/utils";
import MiniBarChart from "./MiniBarChart";

export default function PlayerHistory({ username, wellness, rpe, sessions, days = 14 }) {
  const sortedWellness = useMemo(
    () => wellness.filter((e) => e.username === username).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, days),
    [wellness, username, days]
  );
  const sortedRpe = useMemo(
    () => rpe.filter((e) => e.username === username).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, days),
    [rpe, username, days]
  );

  const wScores = sortedWellness.slice().reverse().map((e) => ({ label: fmtDateShort(e.date), value: wellnessScore(e) }));
  const rScores = sortedRpe.slice().reverse().map((e) => ({ label: fmtDateShort(e.date), value: e.rpe }));
  const loads = sortedRpe.slice().reverse().map((e) => ({ label: fmtDateShort(e.date), value: (e.rpe || 0) * (e.duration || 0) }));

  if (sortedWellness.length === 0 && sortedRpe.length === 0) {
    return (
      <div style={{ color: COLORS.text, fontSize: 13, textAlign: "center", padding: "1.5rem 0" }}>
        Sin registros de los últimos {days} días
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {wScores.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Wellness (puntuación media diaria)</div>
          <MiniBarChart data={wScores} max={5} color={COLORS.lime} />
        </div>
      )}
      {rScores.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>RPE percibido</div>
          <MiniBarChart data={rScores} max={10} color={COLORS.blue} />
        </div>
      )}
      {loads.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Carga de sesión (RPE × min)</div>
          <MiniBarChart data={loads} max={Math.max(...loads.map((d) => d.value), 1)} color={COLORS.amber} />
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Últimos registros de wellness</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sortedWellness.map((e) => (
            <div key={e.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 12, color: COLORS.text }}>{fmtDateShort(e.date)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {WELLNESS_FIELDS.map((f) => (
                  <div key={f.key} title={f.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: COLORS.text }}>{f.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{e[f.key] || "–"}</span>
                  </div>
                ))}
              </div>
              {e.comment && <span style={{ fontSize: 11, color: COLORS.text, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {e.comment}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
