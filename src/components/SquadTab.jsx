"use client";
import { useState, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { pitchProfile, SPORT_EMOJIS } from "@/lib/pitchPositions";
import { savePlayerProfile } from "@/lib/db";
import Avatar from "./Avatar";

const T = COLORS.text;

// ─── Status helpers ───────────────────────────────────────────────────────────
function playerStatus(pl, injuredPlayers) {
  const injured = injuredPlayers.includes(pl.username);
  const lowWellness = typeof pl.wellnessToday === "number" && pl.wellnessToday <= 2;
  const hasUnread = !!pl.hasUnread;
  return { injured, lowWellness, hasUnread, available: !injured };
}

// ─── Foto cuadrada del jugador (campo) ───────────────────────────────────────
function FieldPhoto({ player, size, status }) {
  const initials = (player.displayName || player.username || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const border = status.injured ? "#ef4444" : status.available ? "#4ade80" : "rgba(255,255,255,0.4)";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: 8, border: `2px solid ${border}`, overflow: "hidden", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {player.photoUrl
          ? <img src={player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.33, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{initials}</span>}
      </div>
      {status.injured   && <span style={{ position: "absolute", bottom: -3, right: -3, fontSize: 10, lineHeight: 1 }}>🩹</span>}
      {status.lowWellness && !status.injured && <span style={{ position: "absolute", bottom: -3, right: -3, fontSize: 10, lineHeight: 1 }}>⚠️</span>}
      {status.hasUnread && <span style={{ position: "absolute", top: -3, right: -3, fontSize: 9, lineHeight: 1 }}>💬</span>}
    </div>
  );
}

// ─── Tarjeta jugador en campo (vertical) ─────────────────────────────────────
function FieldCard({ player, size = 42, status, onClick }) {
  const firstName = (player.displayName || player.username || "").split(" ")[0];
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: size + 12 }}>
      <FieldPhoto player={player} size={size} status={status} />
      <span style={{ fontSize: 9, color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "nowrap", maxWidth: size + 16, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{firstName}</span>
    </div>
  );
}

// ─── Modal detalle jugador ────────────────────────────────────────────────────
function PlayerModal({ player, status, onClose }) {
  if (!player) return null;
  const initials = (player.displayName || player.username || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.panel, borderRadius: 18, padding: 24, maxWidth: 320, width: "100%", border: `1px solid ${COLORS.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: T }}>{player.displayName || player.username}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T, fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", border: `2px solid ${status.injured ? "#ef4444" : "#4ade80"}`, flexShrink: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {player.photoUrl
              ? <img src={player.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 24, fontWeight: 700, color: T }}>{initials}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {player.position && <div style={{ fontSize: 12, color: T, opacity: 0.7 }}>{player.position}</div>}
            {player.number && <div style={{ fontSize: 13, fontWeight: 700, color: T }}>#{player.number}</div>}
            {status.available && !status.injured && <div style={{ fontSize: 12, color: "#4ade80" }}>● Disponible</div>}
            {status.injured && <div style={{ fontSize: 12, color: "#ef4444" }}>🩹 Lesionado</div>}
            {status.lowWellness && <div style={{ fontSize: 12, color: "#fbbf24" }}>⚠️ Wellness bajo hoy</div>}
            {status.hasUnread && <div style={{ fontSize: 12, color: "#93c5fd" }}>💬 Aviso sin leer</div>}
          </div>
        </div>
        {typeof player.wellnessToday === "number" && (
          <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: T, opacity: 0.7 }}>Wellness hoy</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: player.wellnessToday <= 2 ? "#fbbf24" : player.wellnessToday >= 4 ? "#4ade80" : T }}>{player.wellnessToday}/5</span>
          </div>
        )}
        {typeof player.rpeToday === "number" && (
          <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: T, opacity: 0.7 }}>RPE hoy</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: T }}>{player.rpeToday}/10</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Distribución aleatoria de jugadores sin posición a las líneas ────────────
function distributeRandom(unassigned, lineMap, formation, profile) {
  if (!unassigned.length) return lineMap;
  const result = { ...lineMap };
  for (const l of profile.lines) if (!result[l]) result[l] = [];

  const formLines = formation?.lines || [];
  const pool = [...unassigned].sort(() => Math.random() - 0.5);

  // Build deficit: slots per line in formation minus already assigned
  const deficits = formLines.map(({ line, orders }) => ({
    line,
    need: Math.max(0, orders.length - (result[line] || []).length),
  })).filter((d) => d.need > 0);

  let idx = 0;
  for (const { line, need } of deficits) {
    for (let i = 0; i < need && idx < pool.length; i++, idx++) {
      result[line].push(pool[idx]);
    }
  }
  // Remaining go into first line
  while (idx < pool.length) {
    const firstLine = profile.lines[0];
    result[firstLine].push(pool[idx++]);
  }
  return result;
}

// ─── Campo vertical ───────────────────────────────────────────────────────────
const FIELD_BG = {
  football: "repeating-linear-gradient(180deg, #2d7a38 0px, #2d7a38 55px, #27702f 55px, #27702f 110px)",
  hockey:   "repeating-linear-gradient(180deg, #2a78a0 0px, #2a78a0 55px, #256e94 55px, #256e94 110px)",
  futsal:   "#2f6fb5",
  basketball: "#c68a4b",
  handball: "#3a78b8",
  volleyball: "#2c6fa8",
  rugby:    "repeating-linear-gradient(180deg, #2d7a38 0px, #2d7a38 55px, #27702f 55px, #27702f 110px)",
};

const LINE_LABEL = {
  gk: "POR", def: "DEF", mcd: "PIV", mc: "MED", mp: "MP", att: "DEL",
  base: "BASE", wing: "ALERO", piv: "PÍVOT",
  front: "DELAN", back: "ZAG",
  fr: "DELAN", sl: "2ª", tr: "3ª", hv: "MEDIO", tq: "3/4", fb: "ZAG",
};

function CampoView({ players, team, campoMode, onPlayerClick }) {
  const profile = pitchProfile(team);
  const [formationId, setFormationId] = useState(profile.defaultFormation);
  const [reorderKey, setReorderKey] = useState(0);
  const injuredPlayers = team.injuredPlayers || [];

  const reorder = useCallback(() => setReorderKey((k) => k + 1), []);

  // GPS/App: sin campo
  if (!profile.field) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map((pl) => {
          const st = playerStatus(pl, injuredPlayers);
          return (
            <div key={pl.username} onClick={() => onPlayerClick(pl, st)} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", border: `2px solid ${st.injured ? "#ef4444" : "#4ade80"}`, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {pl.photoUrl ? <img src={pl.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 13, fontWeight: 700, color: T }}>{(pl.displayName || pl.username || "?").slice(0, 2).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T }}>{pl.displayName || pl.username}</div>
                {pl.position && <div style={{ fontSize: 11, color: T, opacity: 0.6 }}>{pl.position}</div>}
              </div>
              {st.injured && <span>🩹</span>}
              {st.lowWellness && !st.injured && <span>⚠️</span>}
              {st.hasUnread && <span>💬</span>}
            </div>
          );
        })}
      </div>
    );
  }

  const formation = profile.formations.find((f) => f.id === formationId) || profile.formations[0];

  // Classify players with known positions
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

  // Distribute unassigned randomly (reorderKey triggers re-randomize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const finalMap = (() => {
    if (!unassigned.length) return lineMap;
    // deterministic seed based on reorderKey so it re-randomizes on button click
    // We use a simple shuffle seeded by reorderKey + player names
    const toDistribute = [...unassigned];
    if (reorderKey > 0) toDistribute.sort(() => Math.random() - 0.5);
    return distributeRandom(toDistribute, lineMap, formation, profile);
  })();

  // Lines ordered from attack to GK (top to bottom in vertical field)
  const orderedLines = [...profile.lines].reverse();
  const fieldBg = FIELD_BG[profile.field] || FIELD_BG.football;

  // For "alineación por estado de forma": sort players by wellness desc within each line
  let displayMap = finalMap;
  if (campoMode === "forma") {
    displayMap = {};
    for (const [line, pls] of Object.entries(finalMap)) {
      displayMap[line] = [...pls].sort((a, b) => {
        const wa = typeof a.wellnessToday === "number" ? a.wellnessToday : 3;
        const wb = typeof b.wellnessToday === "number" ? b.wellnessToday : 3;
        return wb - wa;
      });
    }
  }

  return (
    <div>
      {/* Formation + reorder row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: T, opacity: 0.5, fontWeight: 700, letterSpacing: 1 }}>FORMACIÓN</span>
        {profile.formations.length > 1 ? (
          <select value={formationId} onChange={(e) => setFormationId(e.target.value)} style={{ padding: "5px 10px", borderRadius: 8, background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: T, fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" }}>
            {profile.formations.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: T, padding: "5px 10px", border: `1px solid ${COLORS.line}`, borderRadius: 8, background: COLORS.panelRaised }}>{formation?.id || "—"}</span>
        )}
        <button onClick={reorder} style={{ padding: "5px 11px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: "transparent", color: T, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          ↺ Reordenar automático
        </button>
      </div>

      {/* Campo VERTICAL */}
      <div style={{ background: fieldBg, borderRadius: 12, border: "2px solid rgba(255,255,255,0.15)", overflow: "hidden", position: "relative", width: "100%" }}>
        {/* Pitch border */}
        <div style={{ position: "absolute", inset: 6, border: "2px solid rgba(255,255,255,0.3)", borderRadius: 2, pointerEvents: "none" }} />
        {/* Center line */}
        <div style={{ position: "absolute", left: 10, right: 10, top: "50%", height: 1, background: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
        {/* Center circle */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 56, height: 56, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", pointerEvents: "none" }} />

        {/* Lines (rows) top=att, bottom=gk */}
        <div style={{ display: "flex", flexDirection: "column", padding: "10px 6px" }}>
          {orderedLines.map((lineId) => {
            const linePlayers = displayMap[lineId] || [];
            if (!linePlayers.length && !formation?.lines?.find((l) => l.line === lineId)) return null;
            const label = LINE_LABEL[lineId] || lineId.toUpperCase();
            return (
              <div key={lineId} style={{ display: "flex", alignItems: "center", minHeight: 72, borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "6px 0" }}>
                {/* Label */}
                <div style={{ width: 32, flexShrink: 0, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textAlign: "center", textTransform: "uppercase" }}>{label}</div>
                {/* Players row */}
                <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 4, padding: "0 4px" }}>
                  {linePlayers.length === 0
                    ? (
                        <div style={{ width: 42, height: 42, borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.18)" }} />
                      )
                    : linePlayers.map((pl) => {
                        const st = playerStatus(pl, injuredPlayers);
                        return (
                          <FieldCard key={pl.username} player={pl} status={st} size={42} onClick={() => onPlayerClick(pl, st)} />
                        );
                      })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ marginTop: 8, fontSize: 10, color: T, opacity: 0.55, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: "#4ade80" }}>●</span><span>disponible</span>
        <span>·</span>
        <span style={{ color: "#ef4444" }}>●</span><span>lesionado</span>
        <span>·</span>
        <span>⚠️</span><span>wellness ≤ 2</span>
        <span>·</span>
        <span>💬</span><span>aviso sin leer</span>
      </div>
    </div>
  );
}

// ─── Vista de fotos ───────────────────────────────────────────────────────────
function FotosView({ players, team, onPlayerClick }) {
  const injuredPlayers = team.injuredPlayers || [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
      {players.map((pl) => {
        const st = playerStatus(pl, injuredPlayers);
        const initials = (pl.displayName || pl.username || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div key={pl.username} onClick={() => onPlayerClick(pl, st)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: COLORS.panelRaised, borderRadius: 10, padding: "12px 8px", border: st.injured ? `1px solid ${COLORS.coral}` : `1px solid ${COLORS.line}`, cursor: "pointer" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 54, height: 54, borderRadius: 10, overflow: "hidden", border: `2px solid ${st.injured ? "#ef4444" : st.available ? "#4ade80" : COLORS.line}`, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {pl.photoUrl ? <img src={pl.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18, fontWeight: 700, color: T }}>{initials}</span>}
              </div>
              {st.injured && <span style={{ position: "absolute", bottom: -3, right: -3, fontSize: 11 }}>🩹</span>}
              {st.lowWellness && !st.injured && <span style={{ position: "absolute", bottom: -3, right: -3, fontSize: 11 }}>⚠️</span>}
              {st.hasUnread && <span style={{ position: "absolute", top: -3, right: -3, fontSize: 10 }}>💬</span>}
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
          <button onClick={() => handleSave(pl)} disabled={saving[pl.username]} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${saved[pl.username] ? COLORS.lime : COLORS.line}`, background: saved[pl.username] ? COLORS.lime : "transparent", color: saved[pl.username] ? "#14171c" : T, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, opacity: saving[pl.username] ? 0.5 : 1 }}>
            {saved[pl.username] ? "✓" : "Guardar"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Vista lista ──────────────────────────────────────────────────────────────
function ListaView({ players, team, onPlayerClick }) {
  const injuredPlayers = team.injuredPlayers || [];
  const sorted = [...players].sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((pl) => {
        const st = playerStatus(pl, injuredPlayers);
        return (
          <div key={pl.username} onClick={() => onPlayerClick && onPlayerClick(pl, st)} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px", border: st.injured ? `1px solid ${COLORS.coral}44` : "none", cursor: "pointer" }}>
            <Avatar name={pl.displayName || pl.username} photoUrl={pl.photoUrl} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T }}>{pl.displayName || pl.username}</div>
              {pl.position && <div style={{ fontSize: 11, color: T, opacity: 0.6 }}>{pl.position}</div>}
            </div>
            {st.available && !st.injured && <span style={{ fontSize: 10, color: "#4ade80" }}>●</span>}
            {st.injured && <span style={{ fontSize: 14 }}>🩹</span>}
            {st.lowWellness && !st.injured && <span>⚠️</span>}
            {st.hasUnread && <span>💬</span>}
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

  // Top-level: Campo / Lista
  const [viewMode, setViewMode] = useState("campo");
  // Campo sub: campograma / forma / posiciones / fotos
  const [campoSub, setCampoSub] = useState("campograma");

  // Player detail modal
  const [modalPlayer, setModalPlayer] = useState(null);
  const [modalStatus, setModalStatus] = useState(null);
  const openModal = useCallback((pl, st) => { setModalPlayer(pl); setModalStatus(st); }, []);
  const closeModal = useCallback(() => setModalPlayer(null), []);

  if (players.length === 0) {
    return (
      <div style={{ color: T, fontSize: 14, textAlign: "center", padding: "2rem 0", opacity: 0.6 }}>
        Aún no hay jugadores. Comparte el código <span style={{ color: COLORS.lime, fontWeight: 700 }}>{team.code}</span>.
      </div>
    );
  }

  if (!isEquipo) {
    return (
      <>
        <ListaView players={players} team={team} onPlayerClick={openModal} />
        {modalPlayer && <PlayerModal player={modalPlayer} status={modalStatus} onClose={closeModal} />}
      </>
    );
  }

  return (
    <div>
      {/* Top toggle: Campo / Lista */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[{ id: "campo", label: "🏟 Campo" }, { id: "lista", label: "≡ Lista" }].map(({ id, label }) => (
          <button key={id} onClick={() => setViewMode(id)} style={{ padding: "7px 16px", borderRadius: 9, border: `1px solid ${viewMode === id ? COLORS.lime : COLORS.line}`, background: viewMode === id ? COLORS.lime + "22" : "transparent", color: viewMode === id ? COLORS.lime : T, fontSize: 13, fontWeight: viewMode === id ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Campo sub-tabs */}
      {viewMode === "campo" && (
        <>
          <div style={{ display: "flex", gap: 4, background: COLORS.panelRaised, borderRadius: 10, padding: 4, marginBottom: 14 }}>
            {[
              { id: "campograma", label: "🏟 Campograma (toda la plantilla)" },
              { id: "forma",      label: "📊 Alineación por estado de forma" },
              { id: "fotos",      label: "📷 Fotos" },
              ...(!readOnly ? [{ id: "posiciones", label: "✎ Posiciones" }] : []),
            ].map((t) => (
              <button key={t.id} onClick={() => setCampoSub(t.id)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, border: "none", fontSize: 10, fontWeight: 600, background: campoSub === t.id ? COLORS.panel : "transparent", color: campoSub === t.id ? T : COLORS.textDim, cursor: "pointer", whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            ))}
          </div>

          {(campoSub === "campograma" || campoSub === "forma") && (
            <CampoView players={players} team={team} campoMode={campoSub} onPlayerClick={openModal} />
          )}
          {campoSub === "fotos" && <FotosView players={players} team={team} onPlayerClick={openModal} />}
          {campoSub === "posiciones" && !readOnly && <PosicionesView players={players} team={team} teamId={teamId} onPlayersUpdate={onPlayersUpdate} />}
          {campoSub === "posiciones" && readOnly && <ListaView players={players} team={team} onPlayerClick={openModal} />}
        </>
      )}

      {viewMode === "lista" && <ListaView players={players} team={team} onPlayerClick={openModal} />}

      {/* Modal detalle */}
      {modalPlayer && <PlayerModal player={modalPlayer} status={modalStatus} onClose={closeModal} />}
    </div>
  );
}
