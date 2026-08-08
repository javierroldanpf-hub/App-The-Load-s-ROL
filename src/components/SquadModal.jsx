"use client";
import { useState, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import { saveTeam, updateRpeDurationForMatch } from "@/lib/db";

function Avatar({ name, photoUrl, size = 30 }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (photoUrl) return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: COLORS.text, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${dd} ${months[parseInt(m,10)-1]} ${y}`;
}

const inp = { background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" };

export default function SquadModal({ team, date, roster, displayNames, onClose, onSaved }) {
  const [squadData, setSquadData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Resolve display name
  const resolveName = (p) => {
    if (typeof p === "object") return p.displayName || p.username;
    const d = displayNames?.[p];
    return typeof d === "object" ? (d?.displayName || p) : (d || p);
  };
  const resolvePhoto = (p) => {
    if (typeof p === "object") return p.photoUrl || null;
    return null;
  };
  const resolveUsername = (p) => typeof p === "string" ? p : p.username;

  useEffect(() => {
    const saved = (team.matchSquads || {})[date] || {};
    const initial = {};
    (roster || []).forEach((p) => {
      const u = resolveUsername(p);
      initial[u] = saved[u] || { convocado: false, minutesPlayed: "" };
    });
    setSquadData(initial);
  }, [date, team]);

  const setPlayer = (username, field, value) => {
    setSquadData((prev) => ({ ...prev, [username]: { ...prev[username], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const squads = { ...(team.matchSquads || {}), [date]: squadData };
      const updated = { ...team, matchSquads: squads };
      await saveTeam(updated);
      const playerMinutes = {};
      Object.entries(squadData).forEach(([u, d]) => {
        if (d.convocado && d.minutesPlayed !== "" && d.minutesPlayed != null)
          playerMinutes[u] = Number(d.minutesPlayed);
      });
      if (Object.keys(playerMinutes).length)
        await updateRpeDurationForMatch(team.teamId, date, playerMinutes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.(updated);
    } finally { setSaving(false); }
  };

  const session = /* try to get session type from calendar context */ null;
  const convocados = Object.values(squadData).filter((d) => d.convocado).length;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.text }}>📋 Convocatoria</div>
            <div style={{ fontSize: 11, color: COLORS.lime, marginTop: 2 }}>{fmtDate(date)}{convocados > 0 ? ` · ${convocados} convocados` : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {(roster || []).length === 0 ? (
            <div style={{ fontSize: 13, color: COLORS.text, textAlign: "center", padding: "2rem 0" }}>No hay jugadores en el equipo.</div>
          ) : (roster || []).map((player) => {
            const username = resolveUsername(player);
            const name = resolveName(player);
            const photo = resolvePhoto(player);
            const d = squadData[username] || { convocado: false, minutesPlayed: "" };
            return (
              <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, background: d.convocado ? "#1a2a1a" : COLORS.panelRaised, border: `1px solid ${d.convocado ? COLORS.lime : COLORS.line}`, borderRadius: 10, padding: "8px 12px", transition: "all 0.15s" }}>
                <input
                  type="checkbox"
                  checked={!!d.convocado}
                  onChange={(e) => setPlayer(username, "convocado", e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0, accentColor: COLORS.lime }}
                />
                <Avatar name={name} photoUrl={photo} size={30} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{name}</div>
                {d.convocado && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: COLORS.text }}>min.</span>
                    <input
                      type="number" min={0} max={200}
                      value={d.minutesPlayed}
                      onChange={(e) => setPlayer(username, "minutesPlayed", e.target.value)}
                      placeholder="–"
                      style={{ ...inp, width: 60, padding: "5px 8px", textAlign: "center" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.line}` }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar convocatoria"}
          </button>
        </div>
      </div>
    </div>
  );
}
