"use client";
import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { saveTeam, getTeamsByCoach, transferPlayerData, deletePlayerData, updateRpeDurationForMatch, getCoachNotifSettings, saveCoachNotifSettings, deleteTeam, expelPlayer, setPlayerTeam } from "@/lib/db";
import Avatar from "./Avatar";

const inp = { padding: "9px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
const sectionTitle = { fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: COLORS.text, marginBottom: 12, marginTop: 0 };
const card = { background: COLORS.panelRaised, borderRadius: 12, padding: "1rem", marginBottom: 16 };

const INJURY_TYPES = ["Muscular", "Articular", "Ósea", "Ligamentosa", "Tendinosa", "Otra"];

const INJURY_ZONES = {
  Muscular:    ["Isquiotibial", "Cuádriceps", "Gemelo / Sóleo", "Aductor", "Glúteo", "Abdominal", "Lumbar", "Bíceps / Tríceps", "Otra"],
  Articular:   ["Rodilla", "Tobillo", "Cadera", "Hombro", "Codo", "Muñeca", "Columna cervical", "Columna lumbar", "Otra"],
  Ósea:        ["Fémur", "Tibia / Peroné", "Pie / Metatarso", "Costilla", "Clavícula", "Húmero", "Otra"],
  Ligamentosa: ["LCA", "LCP", "Ligamento lateral tobillo", "Ligamento colateral rodilla", "Ligamento hombro", "Otro"],
  Tendinosa:   ["Tendón de Aquiles", "Rotuliano", "Bíceps", "Supraespinoso", "Otro"],
  Otra:        ["Otro"],
};

const LATERALITY = ["Derecha", "Izquierda", "Bilateral", "Central"];

const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function SettingsPanel({ team, teamWithPhotos, onTeamUpdate, sessions = [], rpe = [], coachTeamIds = [], coachUsername = "", onTeamDeleted }) {
  const roster = teamWithPhotos?.roster || [];
  const [saving, setSaving] = useState(false);
  const [coachTeams, setCoachTeams] = useState([]);

  const [isTrainingGroup, setIsTrainingGroup] = useState(team.isTrainingGroup || false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [injuredPlayers, setInjuredPlayers] = useState(team.injuredPlayers || []);
  const [defaultMatchDuration, setDefaultMatchDuration] = useState(team.defaultMatchDuration ?? 90);
  const [formDeadlineWellness, setFormDeadlineWellness] = useState(team.formDeadlineWellness || "");
  const [formDeadlineRpe, setFormDeadlineRpe] = useState(team.formDeadlineRpe || "");
  const [formDeadlineRpeDay, setFormDeadlineRpeDay] = useState(team.formDeadlineRpeDay || "same");
  const [teamSexo, setTeamSexo] = useState(team.sexo || "");
  const [transferPlayer, setTransferPlayer] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Injury form state
  const [injuryFormFor, setInjuryFormFor] = useState(null);
  const [injuryType, setInjuryType] = useState(INJURY_TYPES[0]);
  const [injuryZone, setInjuryZone] = useState("");
  const [injuryZoneCustom, setInjuryZoneCustom] = useState("");
  const [injuryLaterality, setInjuryLaterality] = useState(LATERALITY[0]);
  const [injuryStartDate, setInjuryStartDate] = useState(todayStr());

  useEffect(() => {
    setIsTrainingGroup(team.isTrainingGroup || false);
    setInjuredPlayers(team.injuredPlayers || []);
    setDefaultMatchDuration(team.defaultMatchDuration ?? 90);
    setFormDeadlineWellness(team.formDeadlineWellness || "");
    setFormDeadlineRpe(team.formDeadlineRpe || "");
    setFormDeadlineRpeDay(team.formDeadlineRpeDay || "same");
  }, [team]);

  useEffect(() => {
    if (team.coachUsername) {
      getTeamsByCoach(team.coachUsername).then((teams) => {
        const filtered = teams.filter((t) => t.teamId !== team.teamId);
        // If coachTeamIds provided, restrict to only teams the coach owns in this profile
        const owned = coachTeamIds.length > 0 ? filtered.filter((t) => coachTeamIds.includes(t.teamId)) : filtered;
        setCoachTeams(owned);
      });
    }
  }, [team.coachUsername, team.teamId]);

  const save = useCallback(async (patch) => {
    setSaving(true);
    try {
      const updated = { ...team, ...patch };
      await saveTeam(updated);
      onTeamUpdate(updated);
    } finally { setSaving(false); }
  }, [team, onTeamUpdate]);

  // When type changes, reset zone to first option
  const handleTypeChange = (t) => {
    setInjuryType(t);
    setInjuryZone(INJURY_ZONES[t]?.[0] || "");
    setInjuryZoneCustom("");
  };

  // ── Open injury form ─────────────────────────────────────────────────────
  const startMarkInjured = (username) => {
    setInjuryFormFor(username);
    setInjuryType(INJURY_TYPES[0]);
    setInjuryZone(INJURY_ZONES[INJURY_TYPES[0]][0]);
    setInjuryZoneCustom("");
    setInjuryLaterality(LATERALITY[0]);
    setInjuryStartDate(todayStr());
  };

  const cancelInjuryForm = () => setInjuryFormFor(null);

  const isCustomZone = INJURY_ZONES[injuryType]?.includes(injuryZone) && (injuryZone === "Otra" || injuryZone === "Otro");
  const resolvedZone = isCustomZone ? (injuryZoneCustom.trim() || injuryZone) : injuryZone;

  const confirmInjury = async (username) => {
    const next = [...injuredPlayers.filter((u) => u !== username), username];
    setInjuredPlayers(next);
    const newInjury = {
      id: `${Date.now()}`,
      type: injuryType,
      zone: resolvedZone,
      laterality: injuryLaterality,
      startDate: injuryStartDate,
      endDate: null,
    };
    const existing = (team.playerInjuries || {})[username] || [];
    const injuries = { ...(team.playerInjuries || {}), [username]: [...existing, newInjury] };
    setInjuryFormFor(null);
    await save({ injuredPlayers: next, playerInjuries: injuries });
  };

  // ── Close active injury ──────────────────────────────────────────────────
  const unmarkInjured = async (username) => {
    const next = injuredPlayers.filter((u) => u !== username);
    setInjuredPlayers(next);
    const today = todayStr();
    const list = (team.playerInjuries || {})[username] || [];
    const closed = list.map((inj) => inj.endDate ? inj : { ...inj, endDate: today });
    const injuries = { ...(team.playerInjuries || {}), [username]: closed };
    await save({ injuredPlayers: next, playerInjuries: injuries });
  };

  // ── Remove from team ─────────────────────────────────────────────────────
  const removePlayer = async (username, displayName) => {
    const confirmed = confirm(
      `⚠️ ATENCIÓN\n\nVas a expulsar a "${displayName}" del equipo.\n\nSe eliminarán TODOS sus datos históricos: wellness, RPE, cargas y test físicos.\n\nEsta acción NO se puede deshacer.\n\n¿Estás seguro?`
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      await deletePlayerData(username, team.teamId);
      const newRoster = (team.roster || []).filter((u) => (typeof u === "string" ? u : u.username) !== username);
      await save({ roster: newRoster, injuredPlayers: injuredPlayers.filter((u) => u !== username) });
      // Limpiar team_id del jugador para que tenga que unirse a un nuevo equipo
      await expelPlayer(username);
    } finally { setSaving(false); }
  };

  // ── Transfer ─────────────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!transferPlayer || !transferTarget) return;
    const targetTeam = coachTeams.find((t) => t.teamId === transferTarget);
    if (!targetTeam) return;
    const playerName = (() => { const p = roster.find((p) => (typeof p === "string" ? p : p.username) === transferPlayer); return typeof p === "string" ? p : (p?.displayName || p?.username || transferPlayer); })();
    if (!confirm(`¿Mover a "${playerName}" al equipo "${targetTeam.name}"?\n\nTodos sus datos históricos (wellness, RPE, cargas y test físicos) pasarán al equipo de destino.`)) return;
    setTransferring(true);
    try {
      await transferPlayerData(transferPlayer, team.teamId, transferTarget);
      await setPlayerTeam(transferPlayer, transferTarget);
      const targetRoster = [...(targetTeam.roster || [])];
      if (!targetRoster.includes(transferPlayer)) targetRoster.push(transferPlayer);
      await saveTeam({ ...targetTeam, roster: targetRoster });
      const newRoster = (team.roster || []).filter((u) => (typeof u === "string" ? u : u.username) !== transferPlayer);
      await save({ roster: newRoster, injuredPlayers: injuredPlayers.filter((u) => u !== transferPlayer) });
      setTransferPlayer("");
      setTransferTarget("");
    } finally { setTransferring(false); }
  };

  const saveMatchDuration = () => save({ defaultMatchDuration: Number(defaultMatchDuration) || 90 });
  const saveFormDeadlines = () => save({ formDeadlineWellness: formDeadlineWellness || null, formDeadlineRpe: formDeadlineRpe || null, formDeadlineRpeDay: formDeadlineRpeDay });

  // ── Convocatoria ─────────────────────────────────────────────────────────
  const matchSessions = sessions.filter((s) => !s.isRest && (s.isMatch || s.sessionType === "MD(H)" || s.sessionType === "MD(A)")).sort((a, b) => b.date.localeCompare(a.date));
  const [squadDate, setSquadDate] = useState("");
  const [squadData, setSquadData] = useState({}); // { [username]: { convocado, minutesPlayed } }
  const [squadSaving, setSquadSaving] = useState(false);

  const loadSquad = (date) => {
    setSquadDate(date);
    if (!date) { setSquadData({}); return; }
    const saved = (team.matchSquads || {})[date] || {};
    const initial = {};
    roster.forEach((p) => {
      const u = typeof p === "string" ? p : p.username;
      initial[u] = saved[u] || { convocado: false, minutesPlayed: "" };
    });
    setSquadData(initial);
  };

  const setPlayerSquad = (username, field, value) => {
    setSquadData((prev) => ({ ...prev, [username]: { ...prev[username], [field]: value } }));
  };

  const saveSquad = async () => {
    if (!squadDate) return;
    setSquadSaving(true);
    try {
      const squads = { ...(team.matchSquads || {}), [squadDate]: squadData };
      const updated = { ...team, matchSquads: squads };
      await saveTeam(updated);
      onTeamUpdate(updated);
      // Update duration in existing RPE entries for convocados with minutes
      const playerMinutes = {};
      Object.entries(squadData).forEach(([u, d]) => {
        if (d.convocado && d.minutesPlayed !== "" && d.minutesPlayed != null) playerMinutes[u] = Number(d.minutesPlayed);
      });
      if (Object.keys(playerMinutes).length) await updateRpeDurationForMatch(team.teamId, squadDate, playerMinutes);
    } finally { setSquadSaving(false); }
  };

  const zoneOptions = INJURY_ZONES[injuryType] || [];

  return (
    <div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20, color: COLORS.text, marginBottom: 20 }}>Ajustes</div>

      {/* ── TIPO DE EQUIPO ── */}
      {(team.kind || "equipo") !== "individual" && (
      <div style={{ background: COLORS.panelRaised, borderRadius: 12, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{isTrainingGroup ? "Grupo de entreno" : "Equipo"}</div>
          <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2, opacity: 0.7 }}>{isTrainingGroup ? "Sesiones numeradas · Competición · Sin posiciones" : "Sesiones MD · Partidos · Con posiciones"}</div>
        </div>
        <button onClick={async () => { const next = !isTrainingGroup; setIsTrainingGroup(next); await save({ isTrainingGroup: next, kind: next ? "grupo" : "equipo" }); }}
          style={{ width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer", position: "relative", background: isTrainingGroup ? COLORS.lime : COLORS.panelRaised, flexShrink: 0, transition: "background 0.2s" }}>
          <span style={{ position: "absolute", top: 3, left: isTrainingGroup ? 26 : 3, width: 22, height: 22, borderRadius: "50%", background: isTrainingGroup ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
        </button>
      </div>
      )}

      {/* ── PLANTILLA ── */}
      <Accordion title="Gestión de plantilla">
        {roster.length === 0 && <div style={{ fontSize: 13, color: COLORS.text }}>No hay jugadores en el equipo.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {roster.map((player) => {
            const username = typeof player === "string" ? player : player.username;
            const name = typeof player === "string" ? player : (player.displayName || player.username);
            const photo = typeof player === "object" ? player.photoUrl : null;
            const isInjured = injuredPlayers.includes(username);
            const showForm = injuryFormFor === username;

            // Active injury info
            const injuryList = (team.playerInjuries || {})[username] || [];
            const activeInjury = injuryList.find((i) => !i.endDate);

            return (
              <div key={username}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.panel, borderRadius: showForm ? "10px 10px 0 0" : 10, padding: "8px 12px" }}>
                  <Avatar name={name} photoUrl={photo} size={34} isInjured={isInjured} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{name}</div>
                    {isInjured && activeInjury && (
                      <div style={{ fontSize: 10, color: COLORS.coral, marginTop: 1 }}>
                        {activeInjury.type} · {activeInjury.zone} · {activeInjury.laterality} · desde {fmtDate(activeInjury.startDate)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => isInjured ? unmarkInjured(username) : startMarkInjured(username)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${isInjured ? COLORS.coral : COLORS.line}`, background: isInjured ? COLORS.coralDark : "transparent", color: isInjured ? COLORS.coral : COLORS.text, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {isInjured ? "🤕 Alta" : "Marcar lesión"}
                  </button>
                  <button
                    onClick={() => removePlayer(username, name)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                    Expulsar
                  </button>
                </div>

                {showForm && (
                  <div style={{ background: "#1c1216", border: `1px solid ${COLORS.coral}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.coral, marginBottom: 12 }}>Nueva lesión — {name}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Tipo de lesión</div>
                        <select value={injuryType} onChange={(e) => handleTypeChange(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                          {INJURY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Zona</div>
                        <select value={injuryZone} onChange={(e) => { setInjuryZone(e.target.value); setInjuryZoneCustom(""); }} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                          {zoneOptions.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>
                        {isCustomZone && (
                          <input
                            autoFocus
                            value={injuryZoneCustom}
                            onChange={(e) => setInjuryZoneCustom(e.target.value)}
                            placeholder="Especifica la zona..."
                            style={{ ...inp, width: "100%", marginTop: 6 }}
                          />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Lateralidad</div>
                        <select value={injuryLaterality} onChange={(e) => setInjuryLaterality(e.target.value)} style={{ ...inp, width: "100%", cursor: "pointer" }}>
                          {LATERALITY.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Fecha de inicio</div>
                        <input type="date" value={injuryStartDate} onChange={(e) => setInjuryStartDate(e.target.value)} style={{ ...inp, width: "100%", colorScheme: "dark" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={cancelInjuryForm} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                      <button onClick={() => confirmInjury(username)} disabled={saving} style={{ flex: 2, padding: "8px 0", borderRadius: 9, border: "none", background: COLORS.coral, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Confirmar lesión</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Accordion>

      {/* ── TRANSFERIR ── */}
      {coachTeams.length > 0 && (
        <Accordion title={`Mover ${isTrainingGroup ? "jugador/atleta" : "jugador"} a otro equipo/grupo`}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 10 }}>{isTrainingGroup ? "El atleta conserva todos sus datos históricos." : "El jugador conserva todos sus datos históricos."}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Jugador</div>
              <select value={transferPlayer} onChange={(e) => setTransferPlayer(e.target.value)} style={{ ...inp, width: "100%" }}>
                <option value="">Seleccionar jugador...</option>
                {roster.map((p) => { const u = typeof p === "string" ? p : p.username; const n = typeof p === "string" ? p : (p.displayName || p.username); return <option key={u} value={u}>{n}</option>; })}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Destino</div>
              <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)} style={{ ...inp, width: "100%" }}>
                <option value="">Seleccionar equipo/grupo...</option>
                {coachTeams.filter((t) => t.kind !== "individual").map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
              </select>
            </div>
            <button onClick={handleTransfer} disabled={!transferPlayer || !transferTarget || transferring} style={{ padding: "10px 0", borderRadius: 10, border: "none", background: transferPlayer && transferTarget ? COLORS.lime : COLORS.line, color: transferPlayer && transferTarget ? "#14171c" : COLORS.text, fontWeight: 700, fontSize: 13, cursor: transferPlayer && transferTarget ? "pointer" : "default" }}>
              {transferring ? "Moviendo..." : "Mover jugador"}
            </button>
          </div>
        </Accordion>
      )}

      {/* ── CONVOCATORIA ── */}
      {!isTrainingGroup && <Accordion title="Editar convocatoria">
        {matchSessions.length === 0 ? (
          <div style={{ fontSize: 13, color: COLORS.text }}>No hay partidos registrados en el calendario.</div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Selecciona el partido</div>
              <select
                value={squadDate}
                onChange={(e) => loadSquad(e.target.value)}
                style={{ ...inp, width: "100%" }}
              >
                <option value="">— Seleccionar partido —</option>
                {matchSessions.map((s) => (
                  <option key={s.date} value={s.date}>{fmtDate(s.date)} · {s.sessionType}{s.description ? ` · ${s.description}` : ""}</option>
                ))}
              </select>
            </div>

            {squadDate && (
              <>
                <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8 }}>Marca los convocados y añade los minutos jugados.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {roster.map((player) => {
                    const username = typeof player === "string" ? player : player.username;
                    const name = typeof player === "string" ? player : (player.displayName || player.username);
                    const photo = typeof player === "object" ? player.photoUrl : null;
                    const d = squadData[username] || { convocado: false, minutesPlayed: "" };
                    return (
                      <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, background: d.convocado ? "#1a2a1a" : COLORS.panel, border: `1px solid ${d.convocado ? COLORS.lime : COLORS.line}`, borderRadius: 10, padding: "8px 12px" }}>
                        <input
                          type="checkbox"
                          checked={!!d.convocado}
                          onChange={(e) => setPlayerSquad(username, "convocado", e.target.checked)}
                          style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0, accentColor: COLORS.lime }}
                        />
                        <Avatar name={name} photoUrl={photo} size={30} />
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{name}</div>
                        {d.convocado && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: COLORS.text }}>min.</span>
                            <input
                              type="number"
                              min={0}
                              max={200}
                              value={d.minutesPlayed}
                              onChange={(e) => setPlayerSquad(username, "minutesPlayed", e.target.value)}
                              placeholder="–"
                              style={{ ...inp, width: 60, padding: "5px 8px", textAlign: "center" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={saveSquad}
                  disabled={squadSaving}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: squadSaving ? 0.7 : 1 }}>
                  {squadSaving ? "Guardando..." : "Guardar convocatoria"}
                </button>
              </>
            )}
          </>
        )}
      </Accordion>}

      {/* ── PARTIDO ── */}
      {!isTrainingGroup && <Accordion title="Minutos predeterminados de Partido/Competición">
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 10 }}>Minutos predeterminados de partido. Se usa como duración por defecto en el formulario RPE el día de competición.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Duración (minutos)</div>
            <input type="number" min={1} max={300} value={defaultMatchDuration} onChange={(e) => setDefaultMatchDuration(e.target.value)} style={{ ...inp, width: "100%" }} />
          </div>
          <button onClick={saveMatchDuration} disabled={saving} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
        </div>
      </Accordion>}

      {/* ── SEXO DEL EQUIPO (solo equipo, no grupo ni individual) ── */}
      {(team.kind || "equipo") === "equipo" && (
        <Accordion title="Sexo del equipo">
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 12 }}>Indica el sexo del equipo para adaptar el lenguaje en las estadísticas y el PDF.</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["masculino", "femenino"].map((opt) => (
              <button key={opt} onClick={() => setTeamSexo(teamSexo === opt ? "" : opt)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${teamSexo === opt ? COLORS.lime : COLORS.line}`, background: teamSexo === opt ? COLORS.limeDark : "transparent", color: teamSexo === opt ? COLORS.lime : COLORS.text, fontSize: 13, fontWeight: teamSexo === opt ? 700 : 400, cursor: "pointer" }}>
                {opt === "masculino" ? "Masculino" : "Femenino"}
              </button>
            ))}
          </div>
          <button onClick={() => save({ sexo: teamSexo || null })} disabled={saving} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
        </Accordion>
      )}

      {/* ── FORMULARIOS ── */}
      <Accordion title="Hora límite de formularios">
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 12 }}>Los jugadores solo pueden enviar cada formulario antes de su hora límite. Déjalo vacío para sin restricción.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Wellness</div>
            <input type="time" value={formDeadlineWellness} onChange={(e) => setFormDeadlineWellness(e.target.value)} style={{ ...inp, width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>RPE</div>
            <input type="time" value={formDeadlineRpe} onChange={(e) => setFormDeadlineRpe(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 6 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {[{ val: "same", label: "Mismo día" }, { val: "next", label: "Día siguiente" }].map(({ val, label }) => (
                <button key={val} onClick={() => setFormDeadlineRpeDay(val)}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${formDeadlineRpeDay === val ? COLORS.lime : COLORS.line}`, background: formDeadlineRpeDay === val ? COLORS.limeDark : "transparent", color: formDeadlineRpeDay === val ? COLORS.lime : COLORS.text, fontSize: 11, fontWeight: formDeadlineRpeDay === val ? 700 : 400, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={saveFormDeadlines} disabled={saving} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
      </Accordion>

      {/* ── SEMANA 1 DE TEMPORADA ── */}
      <Accordion title="Semana 1 de temporada">
        <SeasonStartSection team={team} save={save} />
      </Accordion>

      {/* ── PDF SETTINGS ── */}
      <Accordion title="Exportar PDF — Ajustes de informe">
        <PdfSettingsSection team={team} save={save} />
      </Accordion>

      {/* ── PLANTILLAS MESOCICLO ── */}
      {((team.kind || "equipo") === "equipo" || team.kind === "grupo") && (
        <Accordion title="Planificación del mesociclo">
          <MesoTemplatesSection team={team} save={save} showBuiltIn={(team.kind || "equipo") === "equipo"} />
        </Accordion>
      )}

      {/* ── NOTIFICACIONES ── */}
      <Accordion title="Notificaciones">
        <NotifSection coachUsername={coachUsername} team={team} teamWithPhotos={teamWithPhotos} />
      </Accordion>

      {saving && <div style={{ fontSize: 12, color: COLORS.lime, textAlign: "center", marginTop: 8 }}>Guardando...</div>}

      {/* ── ZONA DE PELIGRO ── */}
      {(() => {
        const kindLabel = team.kind === "individual" ? "atleta individual" : isTrainingGroup ? "grupo" : "equipo";
        return (
          <div style={{ marginTop: 32, borderTop: `1px solid ${COLORS.coral}`, paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.coral, marginBottom: 6 }}>Zona de peligro</div>
            <div style={{ fontSize: 12, color: COLORS.text, opacity: 0.7, marginBottom: 12 }}>
              Eliminar el {kindLabel} borrará permanentemente todos los datos: jugadores, sesiones, wellness, RPE y mesociclos. Esta acción no se puede deshacer.
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: `1px solid ${COLORS.coral}`, background: "transparent", color: COLORS.coral, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              🗑️ Eliminar {kindLabel}
            </button>

            {showDeleteConfirm && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 100 }}>
                <div style={{ background: COLORS.panel, borderRadius: 16, padding: 24, maxWidth: 340, width: "100%" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.coral, marginBottom: 10 }}>⚠️ Eliminar {kindLabel}</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 20 }}>
                    ¿Seguro que quieres eliminar <strong>"{team.name}"</strong>? Se borrarán todos los datos permanentemente. Esta acción no se puede deshacer.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await deleteTeam(team.teamId);
                          setShowDeleteConfirm(false);
                          if (onTeamDeleted) onTeamDeleted();
                        } catch (e) {
                          alert("Error al eliminar: " + e.message);
                        } finally {
                          setDeleting(false);
                        }
                      }}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: COLORS.coral, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      {deleting ? "Eliminando..." : "Sí, eliminar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

const ALL_LOAD_SECTIONS = [
  { key: "teamStatus",        label: "Estado del equipo (cargados / alerta / duda / forma)" },
  { key: "wellnessRpeQuadrant", label: "Cuadrante Wellness vs RPE (tabla de jugadores)" },
  { key: "wellnessRpeChart",  label: "Gráfica Wellness vs RPE" },
  { key: "weekCalendar",      label: "Calendario semanal" },
  { key: "mesoInfo",          label: "Info del mesociclo" },
];
const DEFAULT_LOAD_ORDER = ALL_LOAD_SECTIONS.map((s) => s.key);

const BASE_PHYS_SECTIONS = [
  { key: "personalData",   label: "Datos personales (edad, altura, peso...)" },
  { key: "injuries",       label: "Lesiones" },
  { key: "forceTests",     label: "Test de Fuerza" },
  { key: "performance",    label: "Métricas de Rendimiento" },
  { key: "customSections", label: "Secciones personalizadas" },
];
/* ── Semana 1 de temporada ───────────────────────────────────────────── */
function SeasonStartSection({ team, save }) {
  // firstMonday is stored as "YYYY-MM-DD" (always a Monday)
  const toMonday = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay(); // 0=sun,1=mon,...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  };

  const weekNumFromDate = (firstMonday, targetMonday) => {
    if (!firstMonday || !targetMonday) return null;
    const a = new Date(firstMonday + "T12:00:00");
    const b = new Date(targetMonday + "T12:00:00");
    const diff = Math.round((b - a) / 86400000 / 7);
    return diff >= 0 ? diff + 1 : diff;
  };

  const fmtSpanish = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  };

  const current = team.firstMonday || null;
  const [picked, setPicked] = useState(current || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Current week number relative to set firstMonday
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const today = todayStr();
  const todayMonday = toMonday(today);
  const currentWeekNum = current ? weekNumFromDate(current, todayMonday) : null;

  const handleSave = async () => {
    if (!picked) return;
    const monday = toMonday(picked);
    if (!monday) return;
    setSaving(true);
    try {
      await save({ firstMonday: monday });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const pickedMonday = picked ? toMonday(picked) : null;
  const pickedWeekNum = pickedMonday && current ? weekNumFromDate(current, pickedMonday) : null;

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 14, lineHeight: 1.6, opacity: 0.85 }}>
        Define el lunes de la <strong style={{ color: COLORS.lime }}>Semana 1</strong> de tu temporada. El calendario y las gráficas de carga mostrarán los números de semana relativos a esta fecha. Las semanas anteriores serán Semana −1, Semana −2, etc.
      </div>

      {current && (
        <div style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Semana 1 actual</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.lime }}>{fmtSpanish(current)}</div>
          {currentWeekNum !== null && (
            <div style={{ fontSize: 11, color: COLORS.text, marginTop: 4 }}>
              Esta semana es la <strong style={{ color: COLORS.lime }}>Semana {currentWeekNum}</strong>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6 }}>Selecciona cualquier día de la semana 1 (se ajustará al lunes)</div>
        <input
          type="date"
          value={picked}
          onChange={(e) => { setPicked(e.target.value); setSaved(false); }}
          style={inputStyle}
        />
        {pickedMonday && (
          <div style={{ fontSize: 11, color: COLORS.text, marginTop: 6 }}>
            La Semana 1 empezará el <strong style={{ color: COLORS.lime }}>{fmtSpanish(pickedMonday)}</strong>
            {current && pickedWeekNum !== null && pickedMonday !== current && (
              <span style={{ color: "#94a3b8" }}> (antes era Semana {pickedWeekNum})</span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!picked || saving}
        style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: (!picked || saving) ? COLORS.panelRaised : COLORS.lime, color: (!picked || saving) ? COLORS.text : "#14171c", fontWeight: 700, fontSize: 13, cursor: (!picked || saving) ? "default" : "pointer" }}
      >
        {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar Semana 1"}
      </button>
    </div>
  );
}

// Quadrant keys are dynamic: quadrant_0, quadrant_1, etc.

function PdfSettingsSection({ team, save }) {
  const current = team.pdfSettings || {};
  const loadPdf = current.load || {};
  const physPdf = current.physical || {};

  // Build dynamic physical sections including one entry per quadrant config
  const quadConfigs = team.quadrantConfigs || [];
  const ALL_PHYS_SECTIONS = [
    ...BASE_PHYS_SECTIONS,
    ...quadConfigs.map((q, i) => ({ key: `quadrant_${i}`, label: `Cuadrante: ${q.name || `Cuadrante ${i + 1}`}` })),
  ];
  const DEFAULT_PHYS_ORDER = ALL_PHYS_SECTIONS.map((s) => s.key);

  const isOn = (obj, key) => obj[key] !== false;

  const toggle = async (pdfType, key) => {
    const group = pdfType === "load" ? { ...loadPdf } : { ...physPdf };
    group[key] = !isOn(group, key);
    await save({ pdfSettings: { ...current, [pdfType]: group } });
  };

  const move = async (pdfType, idx, dir, totalLen) => {
    const group = pdfType === "load" ? { ...loadPdf } : { ...physPdf };
    const defOrder = pdfType === "load" ? DEFAULT_LOAD_ORDER : DEFAULT_PHYS_ORDER;
    const order = [...(group.order || defOrder)];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= totalLen) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    group.order = order;
    await save({ pdfSettings: { ...current, [pdfType]: group } });
  };

  const SectionList = ({ pdfType }) => {
    const allSects = pdfType === "load" ? ALL_LOAD_SECTIONS : ALL_PHYS_SECTIONS;
    const defOrder = pdfType === "load" ? DEFAULT_LOAD_ORDER : DEFAULT_PHYS_ORDER;
    const group = pdfType === "load" ? loadPdf : physPdf;

    // Merge stored order with current sections: keep stored order for known keys, append new keys at end
    const storedOrder = group.order || defOrder;
    const allKeys = allSects.map((s) => s.key);
    const order = [
      ...storedOrder.filter((k) => allKeys.includes(k)),
      ...allKeys.filter((k) => !storedOrder.includes(k)),
    ];

    const labelMap = Object.fromEntries(allSects.map((s) => [s.key, s.label]));
    return (
      <div>
        {order.map((key, idx) => {
          const label = labelMap[key];
          if (!label) return null;
          const on = isOn(group, key);
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <button onClick={() => move(pdfType, idx, -1, order.length)} disabled={idx === 0}
                  style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? COLORS.line : COLORS.text, fontSize: 10, lineHeight: 1, padding: "1px 3px" }}>▲</button>
                <button onClick={() => move(pdfType, idx, 1, order.length)} disabled={idx === order.length - 1}
                  style={{ background: "none", border: "none", cursor: idx === order.length - 1 ? "default" : "pointer", color: idx === order.length - 1 ? COLORS.line : COLORS.text, fontSize: 10, lineHeight: 1, padding: "1px 3px" }}>▼</button>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer" }}>
                <input type="checkbox" checked={on} onChange={() => toggle(pdfType, key)}
                  style={{ width: 15, height: 15, accentColor: COLORS.lime, cursor: "pointer", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: on ? COLORS.text : "#6a7380" }}>{label}</span>
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 8, marginTop: 4 }}>PDF Control de Carga</div>
      <div style={{ marginBottom: 16 }}>
        <SectionList pdfType="load" />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>PDF Datos Físicos del jugador</div>
      <SectionList pdfType="physical" />
    </div>
  );
}

/* ── Plantillas de mesociclo ─────────────────────────────────────────── */
const TEMPLATE_COLORS = ["#38bdf8","#a78bfa","#fb923c","#34d399","#f472b6","#fbbf24","#f87171","#60a5fa","#e879f9","#94a3b8"];

const SPORT_EMOJIS = {
  "Deportes de equipo": ["⚽","🏀","🏈","⚾","🥎","🏐","🏉","🎾","🏸","🏓","🏒","🏑","🥍","🏏","🤾","🏊‍♂️","🤽"],
  "Deportes individuales": ["🏋️","🤸","🥊","🥋","⛷️","🏂","🤺","🏄","🧗","🏌️","🚴","🏇","🤿","🛹","🛼","🧘","🏹","🚵","🤼","🏃","🎽","🎿","🛷","🤺","🧜"],
  "Otros": ["🏆","🥇","🎯","🎱","🎣","⛳","🪃","🥅","🏟️","🎖️"],
};

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 24, background: open ? COLORS.panelRaised : "#1c2128", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", lineHeight: 1 }}
      >
        {value || "🏅"}
      </button>
      {open && (
        <div style={{ position: "absolute", top: 44, left: 0, zIndex: 50, background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 12px", width: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {Object.entries(SPORT_EMOJIS).map(([group, emojis]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: COLORS.text, opacity: 0.6, marginBottom: 4, textTransform: "uppercase" }}>{group}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {emojis.map((e) => (
                  <button key={e} type="button" onClick={() => { onChange(e); setOpen(false); }}
                    style={{ fontSize: 20, background: value === e ? COLORS.panelRaised : "transparent", border: value === e ? `1px solid ${COLORS.line}` : "1px solid transparent", borderRadius: 6, padding: "2px 4px", cursor: "pointer", lineHeight: 1 }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel }) {
  const [name, setName]   = useState(template?.name || "");
  const [emoji, setEmoji] = useState(template?.emoji || "");
  const [weeks, setWeeks] = useState(template?.weeks || 6);
  const [types, setTypes] = useState(template?.types || [
    { id: "t1", label: "Tipo 1", color: TEMPLATE_COLORS[0], subtypes: [{ id: "s1", label: "EG" },{ id: "s2", label: "EM" },{ id: "s3", label: "EP" }] },
  ]);
  const [percentages, setPercentages] = useState(template?.percentages || []);

  // Ensure percentages matrix matches weeks × cols
  const getCols = () => types.flatMap((t) => t.subtypes?.length ? t.subtypes.map((s) => ({ key: `${t.id}_${s.id}`, typeLabel: t.label, subLabel: s.label, color: t.color })) : [{ key: t.id, typeLabel: t.label, subLabel: null, color: t.color }]);

  const getPct = (wIdx, colKey) => percentages[wIdx]?.[colKey] ?? "";
  const setPct = (wIdx, colKey, val) => {
    setPercentages((prev) => {
      const next = [...prev];
      if (!next[wIdx]) next[wIdx] = {};
      next[wIdx] = { ...next[wIdx], [colKey]: val === "" ? "" : Math.min(100, Math.max(0, Number(val) || 0)) };
      return next;
    });
  };
  const rowSum = (wIdx) => getCols().reduce((acc, c) => acc + (Number(percentages[wIdx]?.[c.key]) || 0), 0);

  const addType = () => setTypes((prev) => [...prev, { id: `t${Date.now()}`, label: `Tipo ${prev.length + 1}`, color: TEMPLATE_COLORS[prev.length % TEMPLATE_COLORS.length], subtypes: [] }]);
  const removeType = (tid) => setTypes((prev) => prev.filter((t) => t.id !== tid));
  const updateType = (tid, field, val) => setTypes((prev) => prev.map((t) => t.id === tid ? { ...t, [field]: val } : t));
  const addSubtype = (tid) => setTypes((prev) => prev.map((t) => t.id !== tid ? t : { ...t, subtypes: [...(t.subtypes || []), { id: `s${Date.now()}`, label: `Sub ${(t.subtypes?.length || 0) + 1}` }] }));
  const removeSubtype = (tid, sid) => setTypes((prev) => prev.map((t) => t.id !== tid ? t : { ...t, subtypes: t.subtypes.filter((s) => s.id !== sid) }));
  const updateSubtype = (tid, sid, val) => setTypes((prev) => prev.map((t) => t.id !== tid ? t : { ...t, subtypes: t.subtypes.map((s) => s.id === sid ? { ...s, label: val } : s) }));

  const handleSave = () => {
    if (!name.trim()) return alert("Ponle un nombre a la plantilla");
    onSave({ id: template?.id || `tpl_${Date.now()}`, name: name.trim(), emoji: emoji || null, weeks: Number(weeks) || 6, types, percentages });
  };

  const cols = getCols();
  const inputStyle = { padding: "6px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 12, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem", marginBottom: 12 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>
        {template?.id ? "Editar plantilla" : "Nueva plantilla"}
      </div>

      {/* Emoji, nombre y semanas */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Deporte</div>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Nombre</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Fuerza y velocidad..." style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>Nº semanas</div>
          <input type="number" min={1} max={20} value={weeks} onChange={(e) => setWeeks(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
      </div>

      {/* Tipos y subtipos */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Tipos de carga</div>
        {types.map((t) => (
          <div key={t.id} style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: `1px solid ${t.color}44` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input
                type="color" value={t.color} onChange={(e) => updateType(t.id, "color", e.target.value)}
                style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "none", cursor: "pointer", padding: 0 }}
              />
              <input value={t.label} onChange={(e) => updateType(t.id, "label", e.target.value)} style={{ ...inputStyle, flex: 1, color: t.color, fontWeight: 700 }} />
              <button onClick={() => removeType(t.id)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {(t.subtypes || []).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, background: `${t.color}18`, borderRadius: 6, padding: "3px 8px", border: `1px solid ${t.color}44` }}>
                  <input value={s.label} onChange={(e) => updateSubtype(t.id, s.id, e.target.value)} style={{ background: "transparent", border: "none", color: t.color, fontSize: 11, fontWeight: 600, outline: "none", width: 80 }} />
                  <button onClick={() => removeSubtype(t.id, s.id)} style={{ background: "transparent", border: "none", color: COLORS.coral, cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 0 }}>✕</button>
                </div>
              ))}
              <button onClick={() => addSubtype(t.id)} style={{ background: "transparent", border: `1px dashed ${t.color}`, color: t.color, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>+ Subtipo</button>
            </div>
          </div>
        ))}
        <button onClick={addType} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: `1px dashed ${COLORS.lime}`, background: "transparent", color: COLORS.lime, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Añadir tipo</button>
      </div>

      {/* Tabla de porcentajes */}
      {cols.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Porcentajes por semana</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 10, minWidth: 300 }}>
              <thead>
                <tr>
                  <th style={{ padding: "4px 6px", color: COLORS.text, textAlign: "left", borderBottom: `1px solid ${COLORS.line}` }}>Semana</th>
                  {cols.map((c) => (
                    <th key={c.key} style={{ padding: "4px 4px", color: c.color, textAlign: "center", borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap", fontSize: 9 }}>
                      {c.subLabel ? `${c.typeLabel}\n${c.subLabel}` : c.typeLabel}
                    </th>
                  ))}
                  <th style={{ padding: "4px 4px", color: COLORS.text, textAlign: "center", borderBottom: `1px solid ${COLORS.line}`, fontSize: 9 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Number(weeks) || 6 }, (_, wi) => {
                  const sum = rowSum(wi);
                  const sumColor = sum > 100 ? "#ff5a5f" : sum === 100 ? COLORS.lime : COLORS.text;
                  return (
                    <tr key={wi}>
                      <td style={{ padding: "3px 6px", color: COLORS.text, fontWeight: 600, fontSize: 10 }}>M{wi + 1}</td>
                      {cols.map((c) => (
                        <td key={c.key} style={{ padding: "2px 3px" }}>
                          <input
                            type="number" min={0} max={100} value={getPct(wi, c.key)}
                            onChange={(e) => setPct(wi, c.key, e.target.value)}
                            className="no-arrows"
                            style={{ width: 42, padding: "3px 2px", borderRadius: 4, border: `1px solid ${COLORS.line}`, background: "#1c2128", color: c.color, fontSize: 10, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: "3px 6px", color: sumColor, fontWeight: 700, textAlign: "center" }}>{sum}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={handleSave} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar plantilla</button>
      </div>
    </div>
  );
}

const DEFAULT_SJ_DAY_MINUTES = { "1": 60, "2": 75, "3": 90, "4": 100, "5": 110, "6": 120, "7": 130 };
const SJ_PERCENTAGES_DEFAULT = [
  { sgj_eg: 15, sgj_em: 25, sgj_ep: 10, smj_eg: 10, smj_em: 10, smj_ep: 15, srj_eg: 5,  srj_em: 5,  srj_ep: 5,  micro: 0 },
  { sgj_eg: 20, sgj_em: 30, sgj_ep: 0,  smj_eg: 15, smj_em: 15, smj_ep: 5,  srj_eg: 0,  srj_em: 5,  srj_ep: 10, micro: 0 },
  { sgj_eg: 15, sgj_em: 0,  sgj_ep: 0,  smj_eg: 25, smj_em: 10, smj_ep: 15, srj_eg: 0,  srj_em: 20, srj_ep: 15, micro: 0 },
  { sgj_eg: 15, sgj_em: 0,  sgj_ep: 0,  smj_eg: 30, smj_em: 5,  smj_ep: 15, srj_eg: 5,  srj_em: 10, srj_ep: 20, micro: 0 },
  { sgj_eg: 15, sgj_em: 5,  sgj_ep: 15, smj_eg: 10, smj_em: 5,  smj_ep: 0,  srj_eg: 5,  srj_em: 20, srj_ep: 25, micro: 5 },
  { sgj_eg: 10, sgj_em: 15, sgj_ep: 10, smj_eg: 0,  smj_em: 5,  smj_ep: 10, srj_eg: 5,  srj_em: 15, srj_ep: 30, micro: 10 },
];
const SJ_PCT_COLS = [
  { key: "sgj_eg", label: "EG", group: "SGJ", color: "#38bdf8" },
  { key: "sgj_em", label: "EM", group: "SGJ", color: "#38bdf8" },
  { key: "sgj_ep", label: "EP", group: "SGJ", color: "#38bdf8" },
  { key: "smj_eg", label: "EG", group: "SMJ", color: "#a78bfa" },
  { key: "smj_em", label: "EM", group: "SMJ", color: "#a78bfa" },
  { key: "smj_ep", label: "EP", group: "SMJ", color: "#a78bfa" },
  { key: "srj_eg", label: "EG", group: "SRJ", color: "#fb923c" },
  { key: "srj_em", label: "EM", group: "SRJ", color: "#fb923c" },
  { key: "srj_ep", label: "EP*", group: "SRJ", color: "#fb923c" },
  { key: "micro",  label: "1x1", group: "Micro", color: "#ff5a5f" },
];

function MesoTemplatesSection({ team, save, showBuiltIn = true }) {
  const templates = team.customMesoTemplates || [];
  const [editing, setEditing] = useState(null); // null | "new" | template object
  const [showDayMinutes, setShowDayMinutes] = useState(false);
  const [showPctEditor, setShowPctEditor] = useState(false);
  const [dayMinEdits, setDayMinEdits] = useState(null); // null = not yet opened
  const [pctEdits, setPctEdits] = useState(null); // null = not yet opened
  const [savingDm, setSavingDm] = useState(false);
  const [savingPct, setSavingPct] = useState(false);

  const openDayMinutes = () => {
    if (!showDayMinutes) {
      const cur = team.sjDayMinutes || DEFAULT_SJ_DAY_MINUTES;
      setDayMinEdits({ ...DEFAULT_SJ_DAY_MINUTES, ...cur });
    }
    setShowDayMinutes((v) => !v);
  };

  const openPctEditor = () => {
    if (!showPctEditor) {
      const cur = (team.sjPercentages && team.sjPercentages.length >= 6) ? team.sjPercentages : SJ_PERCENTAGES_DEFAULT;
      setPctEdits(cur.map((row) => ({ ...row })));
    }
    setShowPctEditor((v) => !v);
  };

  const handleSaveDayMinutes = async () => {
    setSavingDm(true);
    try { await save({ sjDayMinutes: dayMinEdits }); } finally { setSavingDm(false); }
  };

  const handleSavePct = async () => {
    setSavingPct(true);
    try { await save({ sjPercentages: pctEdits }); } finally { setSavingPct(false); }
  };

  const handleSave = (tpl) => {
    const existing = templates.find((t) => t.id === tpl.id);
    const next = existing ? templates.map((t) => t.id === tpl.id ? tpl : t) : [...templates, tpl];
    save({ customMesoTemplates: next });
    setEditing(null);
  };

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    save({ customMesoTemplates: templates.filter((t) => t.id !== id) });
  };

  const inputNumStyle = { width: 52, padding: "4px 6px", borderRadius: 6, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 12, outline: "none", textAlign: "center", boxSizing: "border-box" };

  return (
    <div>
      {/* Built-in template */}
      {showBuiltIn && (
        <div style={{ background: "#0c1e2a", border: "1px solid #38bdf844", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚽</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>Situaciones Jugadas (Fútbol)</div>
              <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>Predeterminada · 6 semanas · SGJ / SMJ / SRJ</div>
            </div>
            <span style={{ fontSize: 10, color: "#38bdf8", background: "#0c1e2a", border: "1px solid #38bdf844", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>BUILT-IN</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={openDayMinutes} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid #38bdf844`, background: showDayMinutes ? "#38bdf822" : "transparent", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {showDayMinutes ? "▲" : "▼"} Minutos por días de entreno
            </button>
            <button onClick={openPctEditor} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid #38bdf844`, background: showPctEditor ? "#38bdf822" : "transparent", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {showPctEditor ? "▲" : "▼"} Editar porcentajes
            </button>
          </div>

          {showDayMinutes && dayMinEdits && (
            <div style={{ marginTop: 10, background: "#0a1820", borderRadius: 8, padding: "10px 12px", border: "1px solid #38bdf822" }}>
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Minutos por defecto según días de entreno</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 10, color: COLORS.text, textAlign: "left", padding: "3px 6px" }}>Días</th>
                    <th style={{ fontSize: 10, color: COLORS.text, textAlign: "center", padding: "3px 6px" }}>Minutos</th>
                  </tr>
                </thead>
                <tbody>
                  {["1","2","3","4","5","6","7"].map((d) => (
                    <tr key={d} style={{ borderBottom: `1px solid ${COLORS.line}22` }}>
                      <td style={{ fontSize: 11, color: "#38bdf8", padding: "4px 6px", fontWeight: 600 }}>{d} día{d !== "1" ? "s" : ""}</td>
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        <input type="number" className="no-arrows" min={0} value={dayMinEdits[d] ?? DEFAULT_SJ_DAY_MINUTES[d]} onChange={(e) => setDayMinEdits((prev) => ({ ...prev, [d]: Number(e.target.value) || 0 }))} style={inputNumStyle} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setDayMinEdits({ ...DEFAULT_SJ_DAY_MINUTES })} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontSize: 11, cursor: "pointer" }}>Restablecer</button>
                <button onClick={handleSaveDayMinutes} disabled={savingDm} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{savingDm ? "..." : "Guardar"}</button>
              </div>
            </div>
          )}

          {showPctEditor && pctEdits && (
            <div style={{ marginTop: 10, background: "#0a1820", borderRadius: 8, padding: "10px 12px", border: "1px solid #38bdf822", overflowX: "auto" }}>
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Tabla de porcentajes (6 semanas × columnas)</div>
              <table style={{ borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", textAlign: "left" }}>Sem.</th>
                    {SJ_PCT_COLS.map((c) => (
                      <th key={c.key} style={{ fontSize: 9, color: c.color, padding: "3px 3px", textAlign: "center", fontWeight: 700 }}>{c.group}<br/>{c.label}</th>
                    ))}
                    <th style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", textAlign: "center" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pctEdits.map((row, i) => {
                    const total = SJ_PCT_COLS.reduce((s, c) => s + (Number(row[c.key]) || 0), 0);
                    const totalColor = total === 100 ? COLORS.lime : total > 100 ? "#ff5a5f" : COLORS.text;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${COLORS.line}22` }}>
                        <td style={{ fontSize: 10, color: COLORS.text, padding: "3px 4px", fontWeight: 700, whiteSpace: "nowrap" }}>M{i + 1}</td>
                        {SJ_PCT_COLS.map((c) => (
                          <td key={c.key} style={{ padding: "2px 2px", textAlign: "center" }}>
                            <input type="number" className="no-arrows" min={0} max={100} value={row[c.key] ?? 0}
                              onChange={(e) => setPctEdits((prev) => prev.map((r, ri) => ri === i ? { ...r, [c.key]: Number(e.target.value) || 0 } : r))}
                              style={{ ...inputNumStyle, width: 38, borderColor: c.color + "44" }} />
                          </td>
                        ))}
                        <td style={{ fontSize: 11, color: totalColor, padding: "3px 6px", textAlign: "center", fontWeight: 700 }}>{total}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setPctEdits(SJ_PERCENTAGES_DEFAULT.map((r) => ({ ...r })))} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontSize: 11, cursor: "pointer" }}>Restablecer</button>
                <button onClick={handleSavePct} disabled={savingPct} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{savingPct ? "..." : "Guardar"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom templates */}
      {templates.map((t) => (
        <div key={t.id} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          {t.emoji && <span style={{ fontSize: 22 }}>{t.emoji}</span>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t.name}</div>
            <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>
              {t.weeks} semanas · {t.types?.map((tp) => tp.label).join(" / ")}
            </div>
          </div>
          <button onClick={() => setEditing(t)} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Editar</button>
          <button onClick={() => handleDelete(t.id)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Eliminar</button>
        </div>
      ))}

      {editing && (
        <TemplateEditor
          template={editing === "new" ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {!editing && (
        <button onClick={() => setEditing("new")} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: `1px dashed ${COLORS.lime}`, background: "transparent", color: COLORS.lime, fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
          + Nueva plantilla de mesociclo
        </button>
      )}
    </div>
  );
}

function NotifSection({ coachUsername, team = {}, teamWithPhotos = {} }) {
  const kind = team.kind || "equipo";
  const isGrupo = kind === "grupo";
  const isIndividual = kind === "individual";
  const isEquipo = !isGrupo && !isIndividual;

  // Calcular género efectivo igual que en StaffTeamDashboard
  const teamGender = (() => {
    if (isEquipo) return team.sexo || "masculino";
    const roster = teamWithPhotos?.roster || [];
    const sexos = roster.map((u) => (typeof u === "object" ? u.sexo : null)).filter(Boolean);
    if (sexos.length === 0) return "masculino";
    if (sexos.every((s) => s === "femenino")) return "femenino";
    if (isIndividual) return sexos[0] || "masculino";
    return sexos.some((s) => s === "masculino") && sexos.some((s) => s === "femenino") ? "mixto" : "masculino";
  })();

  const isFem = teamGender === "femenino";
  // jugador/jugadora o atleta/atleta
  const personLabel = isEquipo
    ? (isFem ? "jugadora" : "jugador")
    : (isFem ? "atleta (femenina)" : "atleta");
  const PersonLabel = personLabel.charAt(0).toUpperCase() + personLabel.slice(1);
  const [alertWellness, setAlertWellness] = useState(false);
  const [alertAcwr, setAlertAcwr] = useState(false);
  const [alertAviso, setAlertAviso] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!coachUsername) return;
    getCoachNotifSettings(coachUsername).then((s) => {
      setAlertWellness(s.alertWellness);
      setAlertAcwr(s.alertAcwr);
      setAlertAviso(s.alertAviso);
    });
  }, [coachUsername]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCoachNotifSettings(coachUsername, { alertWellness, alertAcwr, alertAviso });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const Toggle = ({ label, desc, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${COLORS.line}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 26, borderRadius: 13, background: value ? COLORS.lime : COLORS.line, position: "relative", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
        <span style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: value ? "#14171c" : COLORS.textDim, transition: "left 0.15s" }} />
      </div>
    </div>
  );

  return (
    <div>
      <Toggle label={`${PersonLabel} en estado de alerta`} desc={`Notificación cuando un ${personLabel} registra wellness en zona roja`} value={alertWellness} onChange={setAlertWellness} />
      <Toggle label={`${PersonLabel} en riesgo ACWR`} desc={`Notificación cuando el ACWR de un ${personLabel} supera 1.5 o baja de 0.8`} value={alertAcwr} onChange={setAlertAcwr} />
      <Toggle label="Nuevos avisos" desc={`Notificación cuando hay mensajes nuevos de ${personLabel}s sin leer`} value={alertAviso} onChange={setAlertAviso} />
      <button onClick={handleSave} disabled={saving || !coachUsername} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 14 }}>
        {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false, disabled = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: COLORS.panelRaised, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 16px", background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: COLORS.text, textAlign: "left", flex: 1 }}>{title}</span>
        {!disabled && (
          <span style={{ color: COLORS.text, fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
        )}
      </button>
      {open && !disabled && (
        <div style={{ padding: "0 16px 16px" }}>{children}</div>
      )}
    </div>
  );
}
