"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { pitchProfile, SPORT_EMOJIS } from "@/lib/pitchPositions";
import { savePlayerProfile } from "@/lib/db";
import Avatar from "./Avatar";

const T = COLORS.text;

// ─── Tarjeta de jugador en el campograma ──────────────────────────────────────
function PlayerCard({ player, injured = false, size = 44 }) {
  const initials = (player.displayName || player.username || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const firstName = (player.displayName || player.username || "").split(" ")[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: size + 8 }}>
      <div style={{ position: "relative" }}>
        <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${injured ? "#ef4444" : "rgba(255,255,255,0.85)"}`, overflow: "hidden", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {player.photoUrl
            ? <img src={player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: size * 0.33, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{initials}</span>}
        </div>
        {injured && <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 11 }}>🩹</span>}
      </div>
      <span style={{ fontSize: 9, color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "nowrap", maxWidth: size + 20, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{firstName}</span>
      {player.position && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", textShadow: "0 1px 2px rgba(0,0,0,0.9)", whiteSpace: "nowrap", maxWidth: size + 20, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{player.position}</span>}
    </div>
  );
}

// ─── Campograma ───────────────────────────────────────────────────────────────
const FIELD_BG = {
  football: "repeating-linear-gradient(90deg, #2d7a38 0px, #2d7a38 55px, #27702f 55px, #27702f 110px)",
  hockey:   "repeating-linear-gradient(90deg, #2a78a0 0px, #2a78a0 55px, #256e94 55px, #256e94 110px)",
  futsal:   "#2f6fb5",
  basketball: "#c68a4b",
  handball: "#3a78b8",
  volleyball: "#2c6fa8",
  rugby:    "repeating-linear-gradient(90deg, #2d7a38 0px, #2d7a38 55px, #27702f 55px, #27702f 110px)",
};
const LINE_LABELS = {
  gk: "Portero", def: "Defensa", mcd: "Pivote", mc: "Medio", mp: "Media\npunta", att: "Ataque",
  base: "Base", wing: "Alero", piv: "Pívot",
  front: "Delantera", back: "Zaguera",
  fr: "Delantera", sl: "2ª línea", tr: "3ª línea", hv: "Medio", tq: "Tres cuartos", fb: "Zaguero",
};

function CampoView({ players, team }) {
  const profile = pitchProfile(team);
  const [formationId, setFormationId] = useState(profile.defaultFormation);
  const injuredPlayers = team.injuredPlayers || [];

  // GPS/App: sin campo, mostrar lista simple
  if (!profile.field) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map((pl) => (
          <div key={pl.username} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px" }}>
            <Avatar name={pl.displayName || pl.username} photoUrl={pl.photoUrl} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T }}>{pl.displayName || pl.username}</div>
              {pl.position && <div style={{ fontSize: 11, color: T, opacity: 0.6 }}>{pl.position}</div>}
            </div>
            {injuredPlayers.includes(pl.username) && <span style={{ fontSize: 14 }}>🩹</span>}
          </div>
        ))}
      </div>
    );
  }

  // Classify players into lines (preserving order within each line)
  const lineMap = {};
  const unassigned = [];
  for (const pl of players) {
    const slot = profile.classify(pl.position || "");
    if (slot) {
      if (!lineMap[slot.line]) lineMap[slot.line] = [];
      lineMap[slot.line].push({ pl, order: slot.order });
    } else {
      unassigned.push(pl);
    }
  }
  for (const k of Object.keys(lineMap)) {
    lineMap[k] = lineMap[k].sort((a, b) => a.order - b.order).map((x) => x.pl);
  }

  // Lines displayed left→right: gk first, attack last (like a horizontal pitch)
  const activeLinesOrdered = profile.lines; // already gk→att order in the profile

  const fieldBg = FIELD_BG[profile.field] || FIELD_BG.football;
  const hasPlayers = activeLinesOrdered.some((l) => (lineMap[l] || []).length > 0);

  return (
    <div>
      {/* Formation selector */}
      {profile.formations.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T, opacity: 0.6 }}>Formación:</span>
          {profile.formations.map((f) => (
            <button key={f.id} onClick={() => setFormationId(f.id)} style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${formationId === f.id ? COLORS.lime : COLORS.line}`, background: formationId === f.id ? COLORS.limeDark : "transparent", color: formationId === f.id ? COLORS.lime : T, fontSize: 11, fontWeight: formationId === f.id ? 700 : 400, cursor: "pointer" }}>
              {f.id}
            </button>
          ))}
        </div>
      )}

      {/* Tactical board – horizontal layout */}
      <div style={{ background: fieldBg, borderRadius: 12, border: "2px solid rgba(255,255,255,0.15)", overflow: "hidden", position: "relative" }}>
        {/* White pitch border lines */}
        <div style={{ position: "absolute", inset: "6px", border: "2px solid rgba(255,255,255,0.4)", borderRadius: 2, pointerEvents: "none" }} />
        {/* Center circle decoration */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 60, height: 60, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.25)", pointerEvents: "none" }} />

        {!hasPlayers ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            Asigna posiciones en la pestaña <strong style={{ color: "rgba(255,255,255,0.9)" }}>✎ Posiciones</strong> para ver los jugadores en el campo
          </div>
        ) : (
          <div style={{ display: "flex", minHeight: 240, padding: "12px 8px" }}>
            {activeLinesOrdered.map((lineId) => {
              const linePlayers = lineMap[lineId] || [];
              const label = LINE_LABELS[lineId] || lineId.toUpperCase();
              return (
                <div key={lineId} style={{ flex: linePlayers.length > 0 ? Math.max(1, linePlayers.length) : 1, display: "flex", flexDirection: "column", alignItems: "center", borderRight: "1px solid rgba(255,255,255,0.1)", padding: "0 4px", minWidth: 60 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, textAlign: "center", whiteSpace: "pre-line" }}>{label}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center", gap: 8 }}>
                    {linePlayers.length === 0
                      ? <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.2)" }} />
                      : linePlayers.map((pl) => (
                          <PlayerCard key={pl.username} player={pl} injured={injuredPlayers.includes(pl.username)} size={40} />
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
