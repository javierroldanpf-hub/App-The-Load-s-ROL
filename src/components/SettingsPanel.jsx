"use client";
import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { saveTeam, getTeamsByCoach, transferPlayerData, deletePlayerData, updateRpeDurationForMatch, getCoachNotifSettings, saveCoachNotifSettings } from "@/lib/db";
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

export default function SettingsPanel({ team, teamWithPhotos, onTeamUpdate, sessions = [], rpe = [], coachTeamIds = [], coachUsername = "" }) {
  const roster = teamWithPhotos?.roster || [];
  const [saving, setSaving] = useState(false);
  const [coachTeams, setCoachTeams] = useState([]);

  const [isTrainingGroup, setIsTrainingGroup] = useState(team.isTrainingGroup || false);
  const [injuredPlayers, setInjuredPlayers] = useState(team.injuredPlayers || []);
  const [defaultMatchDuration, setDefaultMatchDuration] = useState(team.defaultMatchDuration ?? 90);
  const [formDeadlineWellness, setFormDeadlineWellness] = useState(team.formDeadlineWellness || "");
  const [formDeadlineRpe, setFormDeadlineRpe] = useState(team.formDeadlineRpe || "");
  const [formDeadlineRpeDay, setFormDeadlineRpeDay] = useState(team.formDeadlineRpeDay || "same");
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
        <button onClick={async () => { const next = !isTrainingGroup; setIsTrainingGroup(next); await save({ isTrainingGroup: next }); }}
          style={{ width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer", position: "relative", background: isTrainingGroup ? COLORS.lime : COLORS.panelRaised, flexShrink: 0, transition: "background 0.2s" }}>
          <span style={{ position: "absolute", top: 3, left: isTrainingGroup ? 26 : 3, width: 22, height: 22, borderRadius: "50%", background: isTrainingGroup ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
        </button>
      </div>
      )}

      {/* ── PLANTILLA ── */}
      <Accordion title="Gestión de plantilla" defaultOpen>
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
                {coachTeams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
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

      {/* ── PDF SETTINGS ── */}
      <Accordion title="Exportar PDF — Ajustes de informe">
        <PdfSettingsSection team={team} save={save} />
      </Accordion>

      {/* ── NOTIFICACIONES ── */}
      <Accordion title="Notificaciones">
        <NotifSection coachUsername={coachUsername} />
      </Accordion>

      {saving && <div style={{ fontSize: 12, color: COLORS.lime, textAlign: "center", marginTop: 8 }}>Guardando...</div>}
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

function NotifSection({ coachUsername }) {
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
      <Toggle label="Jugador en estado de alerta" desc="Notificación cuando un jugador registra wellness en zona roja" value={alertWellness} onChange={setAlertWellness} />
      <Toggle label="Jugador en riesgo ACWR" desc="Notificación cuando el ACWR de un jugador supera 1.5 o baja de 0.8" value={alertAcwr} onChange={setAlertAcwr} />
      <Toggle label="Nuevos avisos" desc="Notificación cuando hay mensajes nuevos de jugadores sin leer" value={alertAviso} onChange={setAlertAviso} />
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
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: COLORS.text }}>{title}</span>
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
