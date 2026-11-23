"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { pitchProfile, SPORTS } from "@/lib/pitchPositions";
import { savePlayerProfile } from "@/lib/db";
import PitchField from "./PitchField";
import Avatar from "./Avatar";

const T = COLORS.text;

// ─── Token de jugador sobre el campo ─────────────────────────────────────────
function PlayerToken({ player, size = 36 }) {
  const initials = (player.displayName || player.username || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.9)", overflow: "hidden", background: COLORS.panelRaised, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {player.photoUrl
          ? <img src={player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.36, fontWeight: 700, color: T, lineHeight: 1 }}>{initials}</span>}
      </div>
      <span style={{ fontSize: 9, color: "#fff", fontWeight: 700, background: "rgba(0,0,0,0.65)", borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis" }}>
        {(player.displayName || player.username || "").split(" ")[0]}
      </span>
    </div>
  );
}

// ─── Campograma ───────────────────────────────────────────────────────────────
function CampoView({ players, team }) {
  const profile = pitchProfile(team);
  const [formationId, setFormationId] = useState(profile.defaultFormation);
  const formation = profile.formations.find((f) => f.id === formationId) || profile.formations[0];

  // Classify all players into lines
  const lineMap = {};
  const unassigned = [];
  for (const pl of players) {
    const slot = profile.classify(pl.position || "");
    if (slot) {
      const key = slot.line;
      if (!lineMap[key]) lineMap[key] = [];
      lineMap[key].push({ pl, order: slot.order });
    } else {
      unassigned.push(pl);
    }
  }
  for (const k of Object.keys(lineMap)) {
    lineMap[k] = lineMap[k].sort((a, b) => a.order - b.order).map((x) => x.pl);
  }

  // Build ordered lines from profile (bottom = gk, top = attack)
  const orderedLines = [...profile.lines].reverse(); // display: gk bottom → att top

  return (
    <div>
      {/* Formation selector */}
      {profile.formations.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: T, opacity: 0.6, alignSelf: "center" }}>Formación:</span>
          {profile.formations.map((f) => (
            <button key={f.id} onClick={() => setFormationId(f.id)} style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${formationId === f.id ? COLORS.lime : COLORS.line}`, background: formationId === f.id ? COLORS.limeDark : "transparent", color: formationId === f.id ? COLORS.lime : T, fontSize: 11, fontWeight: formationId === f.id ? 700 : 400, cursor: "pointer" }}>
              {f.id}
            </button>
          ))}
        </div>
      )}

      {/* Campo */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "150%", borderRadius: 10, overflow: "hidden" }}>
        <PitchField field={profile.field} />
        {/* Lines overlay */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "8px 4px" }}>
          {orderedLines.map((lineId) => {
            const linePlayers = lineMap[lineId] || [];
            if (linePlayers.length === 0) return <div key={lineId} style={{ flex: 1 }} />;
            return (
              <div key={lineId} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                {linePlayers.map((pl) => (
                  <PlayerToken key={pl.username} player={pl} size={32} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T, opacity: 0.6, marginBottom: 6 }}>Sin posición asignada ({unassigned.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unassigned.map((pl) => (
              <div key={pl.username} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.panelRaised, borderRadius: 8, padding: "4px 10px 4px 4px" }}>
                <Avatar name={pl.displayName || pl.username} photoUrl={pl.photoUrl} size={28} />
                <span style={{ fontSize: 12, color: T }}>{pl.displayName || pl.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vista de fotos ───────────────────────────────────────────────────────────
function FotosView({ players, team }) {
  const injuredPlayers = team.injuredPlayers || [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
      {players.map((pl) => {
        const isInjured = injuredPlayers.includes(pl.username);
        return (
          <div key={pl.username} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: COLORS.panelRaised, borderRadius: 10, padding: "12px 8px", border: isInjured ? `1px solid ${COLORS.coral}` : `1px solid ${COLORS.line}` }}>
            <div style={{ position: "relative" }}>
              <Avatar name={pl.displayName || pl.username} photoUrl={pl.photoUrl} size={52} />
              {isInjured && <span style={{ position: "absolute", bottom: -2, right: -4, fontSize: 12 }}>🩹</span>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T, textAlign: "center", lineHeight: 1.2 }}>{pl.displayName || pl.username}</div>
            {pl.position && <div style={{ fontSize: 10, color: T, opacity: 0.6, textAlign: "center" }}>{pl.position}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Editar posiciones ────────────────────────────────────────────────────────
function PosicionesView({ players, team, teamId, onPlayersUpdate }) {
  const profile = pitchProfile(team);
  const [saving, setSaving] = useState({});
  const [local, setLocal] = useState(() => Object.fromEntries(players.map((pl) => [pl.username, pl.position || ""])));
  const [saved, setSaved] = useState({});

  const handleSave = async (pl) => {
    setSaving((s) => ({ ...s, [pl.username]: true }));
    try {
      await savePlayerProfile({ teamId, username: pl.username, displayName: pl.displayName, photoUrl: pl.photoUrl || null, position: local[pl.username] || null });
      setSaved((s) => ({ ...s, [pl.username]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [pl.username]: false })), 1800);
      if (onPlayersUpdate) onPlayersUpdate();
    } catch (e) { console.error(e); }
    finally { setSaving((s) => ({ ...s, [pl.username]: false })); }
  };

  const inp = { width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: T, fontSize: 12, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {players.map((pl) => (
        <div key={pl.username} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px" }}>
          <Avatar name={pl.displayName || pl.username} photoUrl={pl.photoUrl} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T, marginBottom: 4 }}>{pl.displayName || pl.username}</div>
            {profile.positions && profile.positions.length > 0 ? (
              <select value={local[pl.username] || ""} onChange={(e) => setLocal((l) => ({ ...l, [pl.username]: e.target.value }))} style={{ ...inp, padding: "5px 8px" }}>
                <option value="">— Sin posición —</option>
                {profile.positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input value={local[pl.username] || ""} onChange={(e) => setLocal((l) => ({ ...l, [pl.username]: e.target.value }))} placeholder="Escribe la posición..." style={inp} />
            )}
          </div>
          <button onClick={() => handleSave(pl)} disabled={saving[pl.username]} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: saved[pl.username] ? COLORS.lime : COLORS.panelRaised, color: saved[pl.username] ? "#14171c" : T, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, border: `1px solid ${saved[pl.username] ? COLORS.lime : COLORS.line}`, opacity: saving[pl.username] ? 0.5 : 1 }}>
            {saved[pl.username] ? "✓" : "Guardar"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Vista lista (para grupos/atletas) ────────────────────────────────────────
function ListaView({ players, team }) {
  const injuredPlayers = team.injuredPlayers || [];
  const sorted = [...players].sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((pl) => {
        const isInjured = injuredPlayers.includes(pl.username);
        return (
          <div key={pl.username} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px", border: isInjured ? `1px solid ${COLORS.coral}44` : "none" }}>
            <Avatar name={pl.displayName || pl.username} photoUrl={pl.photoUrl} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T }}>{pl.displayName || pl.username}</div>
              {pl.position && <div style={{ fontSize: 11, color: T, opacity: 0.6 }}>{pl.position}</div>}
            </div>
            {isInjured && <span style={{ fontSize: 14 }}>🩹</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SquadTab({ team, teamId, players, onPlayersUpdate, readOnly = false }) {
  const kind = team.kind || "equipo";
  const isEquipo = kind === "equipo";

  const SUB_TABS = isEquipo
    ? [{ id: "campo", label: "🏟 Campograma" }, { id: "fotos", label: "📷 Fotos" }, { id: "posiciones", label: "✎ Posiciones" }]
    : [{ id: "lista", label: "📋 Listado" }];

  const [sub, setSub] = useState(SUB_TABS[0].id);

  if (players.length === 0) {
    return (
      <div style={{ color: T, fontSize: 14, textAlign: "center", padding: "2rem 0", opacity: 0.6 }}>
        Aún no hay jugadores. Comparte el código <span style={{ color: COLORS.lime, fontWeight: 700 }}>{team.code}</span>.
      </div>
    );
  }

  return (
    <div>
      {SUB_TABS.length > 1 && (
        <div style={{ display: "flex", gap: 4, background: COLORS.panelRaised, borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {SUB_TABS.map((t) => (
            <button key={t.id} onClick={() => setSub(t.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 600, background: sub === t.id ? COLORS.panel : "transparent", color: sub === t.id ? T : COLORS.textDim, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {sub === "campo" && <CampoView players={players} team={team} />}
      {sub === "fotos" && <FotosView players={players} team={team} />}
      {sub === "posiciones" && !readOnly && <PosicionesView players={players} team={team} teamId={teamId} onPlayersUpdate={onPlayersUpdate} />}
      {sub === "posiciones" && readOnly && <ListaView players={players} team={team} />}
      {sub === "lista" && <ListaView players={players} team={team} />}
    </div>
  );
}
