"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { COLORS, INTENSITY_LEVELS, SESSION_TYPES, GROUP_SESSION_TYPES, MATCH_DEFAULT_DURATION, WEEKDAY_LABELS } from "@/lib/constants";
import { todayStr, mondayOf, addDays, fmtDateLong, fmtDateShort, weekdayLabel, weekDates, weekNumberFrom, firstOfMonth, addMonths, monthLabel, monthGridDates } from "@/lib/utils";
import { getSession, saveSession, deleteSession, deleteGroupSessionResponses, ensureFirstMonday, updateRpeDurationForSession, updateRpeSessionTypeForSession } from "@/lib/db";
import ImageUploadButton from "./ImageUploadButton";
import SessionDetailModal from "./SessionDetailModal";
import MesocyclePanel from "./MesocyclePanel";
import CalendarPdfExport from "./CalendarPdfExport";

function SessionBlocksEditor({ blocks, setBlocks, inputStyle }) {
  const addBlock = () => setBlocks((prev) => [...prev, { name: "", duration: "", content: "" }]);
  const updateBlock = (i, field, val) => setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  const removeBlock = (i) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Bloques del entrenamiento</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {blocks.map((b, i) => (
          <div key={i} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={b.name} onChange={(e) => updateBlock(i, "name", e.target.value)} placeholder="Nombre del bloque..." style={{ ...inputStyle, flex: 2, padding: "8px 10px", fontSize: 13 }} />
              <input type="number" value={b.duration} onChange={(e) => updateBlock(i, "duration", e.target.value)} placeholder="Min" style={{ ...inputStyle, flex: 1, padding: "8px 10px", fontSize: 13 }} />
              <button onClick={() => removeBlock(i)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
            <textarea value={b.content} onChange={(e) => updateBlock(i, "content", e.target.value)} placeholder="Contenido del bloque..." rows={3} style={{ ...inputStyle, resize: "vertical", fontSize: 13, padding: "8px 10px", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <button onClick={addBlock} style={{ marginTop: 8, width: "100%", padding: "9px 0", borderRadius: 10, border: `1px dashed ${COLORS.lime}`, background: "transparent", color: COLORS.lime, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Añadir bloque</button>
    </div>
  );
}

function SessionEditorModal({ date, existing, onClose, onSaveGroup, onSaveInd, onDelete, defaultMatchDuration, isTrainingGroup, isIndividualAthlete = false, mesocycles = [], roster = [], displayNames = {}, defaultTab = "grupo" }) {
  const availableTypes = isTrainingGroup ? GROUP_SESSION_TYPES : SESSION_TYPES;
  const [editorTab, setEditorTab] = useState(defaultTab);

  // ── Grupo ──
  const [sessionType, setSessionType] = useState(existing?.sessionType || availableTypes[0].id);
  const [intensity, setIntensity] = useState(existing ? existing.intensity : "amarillo");
  const [duration, setDuration] = useState(existing ? String(existing.duration) : "90");
  const parseDesc = (raw) => {
    try {
      const p = JSON.parse(raw || "{}");
      if (p.blocks) return { blocks: p.blocks, rivalText: "", rivalPhoto: "" };
      if (p.rivalText !== undefined) return { blocks: [], rivalText: p.rivalText || "", rivalPhoto: p.rivalPhoto || "" };
      if (p.g !== undefined || p.c !== undefined) return { blocks: [{ name: "Gimnasio", duration: "", content: p.g || "" }, { name: "Campo", duration: "", content: p.c || "" }].filter(b => b.content), rivalText: "", rivalPhoto: "" };
      return { blocks: [], rivalText: "" , rivalPhoto: "" };
    } catch { return { blocks: [], rivalText: raw || "", rivalPhoto: "" }; }
  };
  const parsed = parseDesc(existing?.description);
  const [blocks, setBlocks] = useState(parsed.blocks.length > 0 ? parsed.blocks : []);
  const [description, setDescription] = useState(parsed.rivalText);
  const [rivalPhoto, setRivalPhoto] = useState(parsed.rivalPhoto || "");
  const [isRest, setIsRest] = useState(existing ? !!existing.isRest : false);
  const [allowPlayerNote, setAllowPlayerNote] = useState(existing ? !!existing.allowPlayerNote : false);
  const [extraDates, setExtraDates] = useState([]);
  const isMatch = availableTypes.find((st) => st.id === sessionType)?.isMatch ?? false;

  // ── Individuales ──
  const existingIndividual = existing?.individualSessions || [];
  const [indSessions, setIndSessions] = useState(existingIndividual.length > 0 ? existingIndividual : []);

  const addIndSession = () => setIndSessions((prev) => [...prev, { id: Date.now(), title: "", intensity: "amarillo", duration: "60", blocks: [], players: [] }]);
  const updateInd = (i, field, val) => setIndSessions((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeInd = (i) => setIndSessions((prev) => prev.filter((_, idx) => idx !== i));
  const toggleIndPlayer = (i, username) => setIndSessions((prev) => prev.map((s, idx) => {
    if (idx !== i) return s;
    const players = s.players.includes(username) ? s.players.filter(p => p !== username) : [...s.players, username];
    return { ...s, players };
  }));
  const updateIndBlocks = (i, newBlocks) => setIndSessions((prev) => prev.map((s, idx) => idx === i ? { ...s, blocks: newBlocks } : s));

  // ── Microciclos ──
  const dayOffset = Math.round((new Date(date + "T00:00:00") - new Date(mondayOf(date) + "T00:00:00")) / 86400000);
  const currentMeso = mesocycles.find((m) => date >= m.startDate && date <= m.endDate);
  const mesoOptions = (currentMeso ? [currentMeso] : []).map((m) => {
    const weeks = (m.weeks || []).filter((w) => {
      const target = addDays(w.weekStart, dayOffset);
      return target >= w.weekStart && target <= w.weekEnd && target !== date;
    }).map((w) => ({ targetDate: addDays(w.weekStart, dayOffset), weekIdx: (m.weeks || []).indexOf(w) }));
    return weeks.length > 0 ? { meso: m, weeks } : null;
  }).filter(Boolean);
  const toggleDate = (d) => setExtraDates((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const handleSessionTypeChange = (id) => {
    setSessionType(id);
    const st = availableTypes.find((s) => s.id === id);
    if (st?.isMatch) {
      if (!isTrainingGroup) setDuration(String(defaultMatchDuration || MATCH_DEFAULT_DURATION));
      setIntensity("rojo+");
    }
  };
  const [saving, setSaving] = useState(false);
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4", fontSize: 15, outline: "none" };

  const handleSaveGroup = async () => {
    setSaving(true);
    try {
      const finalDesc = isMatch ? JSON.stringify({ rivalText: description, rivalPhoto }) : JSON.stringify({ blocks });
      await onSaveGroup({ sessionType, intensity, duration: parseInt(duration) || 0, description: finalDesc, isRest, isMatch, allowPlayerNote }, extraDates);
    } finally { setSaving(false); }
  };

  const handleSaveInd = async () => {
    setSaving(true);
    try {
      await onSaveInd(indSessions);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 50 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 2 }}>{weekdayLabel(date)}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20, marginBottom: 14 }}>{fmtDateLong(date)}</div>

        {/* Pestañas */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: COLORS.panelRaised, borderRadius: 10, padding: 4 }}>
          {["grupo", "individual"].map((t) => (
            <button key={t} onClick={() => setEditorTab(t)} style={{
              flex: 1, padding: "7px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: editorTab === t ? COLORS.panel : "transparent",
              color: editorTab === t ? COLORS.text : COLORS.textDim,
            }}>{t === "grupo" ? "Sesión de grupo" : isIndividualAthlete ? "Sesión Extra" : "Sesión individual"}</button>
          ))}
        </div>

        {editorTab === "grupo" && (
          <>
            <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 14 }}>Día de descanso</span>
              <button onClick={() => setIsRest((r) => !r)} style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative", background: isRest ? COLORS.lime : COLORS.panelRaised, transition: "background 0.2s" }}>
                <span style={{ position: "absolute", top: 3, left: isRest ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: isRest ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
              </button>
            </div>

            {!isRest && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Tipo de sesión</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {availableTypes.filter((st) => !st.isRest).map((st) => (
                      <button key={st.id} onClick={() => handleSessionTypeChange(st.id)} style={{
                        padding: "8px 4px", borderRadius: 8, border: `1px solid ${sessionType === st.id ? COLORS.lime : COLORS.line}`,
                        background: sessionType === st.id ? COLORS.limeDark : "transparent",
                        color: sessionType === st.id ? COLORS.lime : COLORS.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>{st.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Intensidad</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                    {Object.entries(INTENSITY_LEVELS).filter(([key]) => key !== "descanso").map(([key, val]) => (
                      <button key={key} onClick={() => setIntensity(key)} style={{
                        padding: "8px 4px", borderRadius: 8, border: `1px solid ${intensity === key ? val.color : COLORS.line}`,
                        background: intensity === key ? val.dark : "transparent",
                        color: intensity === key ? val.color : COLORS.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>{key === "rojo+" && isTrainingGroup ? "Rojo+ (competición)" : val.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Duración total prevista (m)</div>
                  <input type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
                </div>
                {isMatch ? (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>{isTrainingGroup ? "Información Competición" : "Rival"}</div>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isTrainingGroup ? "Información de la competición..." : "Nombre del rival..."} style={{ ...inputStyle, marginBottom: 10 }} />
                    {!isTrainingGroup && !isIndividualAthlete && (
                      <>
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Escudo del rival</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {rivalPhoto && <img src={rivalPhoto} alt="Escudo rival" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: COLORS.panelRaised, padding: 4 }} />}
                          <ImageUploadButton label={rivalPhoto ? "Cambiar escudo" : "+ Añadir escudo"} onUploaded={(dataUrl) => setRivalPhoto(dataUrl)} />
                          {rivalPhoto && <button onClick={() => setRivalPhoto("")} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Quitar</button>}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <SessionBlocksEditor blocks={blocks} setBlocks={setBlocks} inputStyle={inputStyle} />
                )}
                {mesoOptions.length > 0 && !isMatch && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Aplicar también en otros microciclos</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 150, overflowY: "auto" }}>
                      {mesoOptions.map(({ meso, weeks }) => weeks.map(({ targetDate, weekIdx }) => {
                        const checked = extraDates.includes(targetDate);
                        return (
                          <button key={targetDate} onClick={() => toggleDate(targetDate)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: `1px solid ${checked ? COLORS.lime : COLORS.line}`, background: checked ? COLORS.limeDark : "transparent", cursor: "pointer", textAlign: "left" }}>
                            <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? COLORS.lime : COLORS.line}`, background: checked ? COLORS.lime : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {checked && <span style={{ fontSize: 9, color: "#14171c", fontWeight: 900 }}>✓</span>}
                            </span>
                            <span style={{ fontSize: 12, color: COLORS.text }}>{meso.name} · Microciclo {weekIdx + 1} · {fmtDateShort(targetDate)}</span>
                          </button>
                        );
                      }))}
                    </div>
                  </div>
                )}
              </>
            )}
            {!isRest && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "12px 14px", background: COLORS.panelRaised, borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Nota del jugador/a</div>
                  <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>El jugador/a podrá añadir un texto sobre el entreno</div>
                </div>
                <button onClick={() => setAllowPlayerNote((v) => !v)} style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative", background: allowPlayerNote ? COLORS.lime : COLORS.panelRaised, transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: allowPlayerNote ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: allowPlayerNote ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {existing && (
                <button onClick={onDelete} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${COLORS.coral}`, background: "transparent", color: COLORS.coral, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Eliminar</button>
              )}
              <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSaveGroup} disabled={saving} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
            </>
          </>
        )}

        {editorTab === "individual" && (
          <div>
            {indSessions.map((s, i) => (
              <div key={s.id || i} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.lime }}>Sesión individual {i + 1}</div>
                  <button onClick={() => removeInd(i)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>Eliminar</button>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Título / nombre de sesión</div>
                  <input value={s.title} onChange={(e) => updateInd(i, "title", e.target.value)} placeholder="Ej: Trabajo de fuerza específico..." style={{ ...inputStyle, fontSize: 13, padding: "8px 10px" }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Intensidad</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                    {Object.entries(INTENSITY_LEVELS).filter(([key]) => key !== "descanso").map(([key, val]) => (
                      <button key={key} onClick={() => updateInd(i, "intensity", key)} style={{
                        padding: "6px 2px", borderRadius: 6, border: `1px solid ${s.intensity === key ? val.color : COLORS.line}`,
                        background: s.intensity === key ? val.dark : "transparent",
                        color: s.intensity === key ? val.color : COLORS.textDim, fontSize: 10, fontWeight: 600, cursor: "pointer",
                      }}>{val.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Duración total prevista (m)</div>
                  <input type="number" value={s.duration} onChange={(e) => updateInd(i, "duration", e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "8px 10px" }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Jugadores / atletas asignados</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {roster.map((username) => {
                      const checked = s.players.includes(username);
                      return (
                        <button key={username} onClick={() => toggleIndPlayer(i, username)} style={{
                          padding: "5px 10px", borderRadius: 8, border: `1px solid ${checked ? COLORS.lime : COLORS.line}`,
                          background: checked ? COLORS.limeDark : "transparent", color: checked ? COLORS.lime : COLORS.text,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}>{typeof displayNames[username] === "object" ? (displayNames[username]?.displayName || username) : (displayNames[username] || username)}</button>
                      );
                    })}
                  </div>
                </div>
                <SessionBlocksEditor blocks={s.blocks || []} setBlocks={(newBlocks) => updateIndBlocks(i, typeof newBlocks === "function" ? newBlocks(s.blocks || []) : newBlocks)} inputStyle={{ ...inputStyle, fontSize: 13, padding: "8px 10px" }} />
              </div>
            ))}
            <button onClick={addIndSession} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: `1px dashed ${COLORS.blue}`, background: "transparent", color: COLORS.blue, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Añadir sesión individual</button>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSaveInd} disabled={saving} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: COLORS.blue, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachCalendarEditor({ team, sessions, onSessionsChange, readOnly = false, displayNames = {}, coachName = "" }) {
  const [viewMode, setViewMode] = useState("week");
  const [showPdf, setShowPdf] = useState(false);
  const [mesocycles, setMesocycles] = useState([]);

  useEffect(() => {
    import("@/lib/db").then(({ loadMesocycles }) => loadMesocycles(team.teamId).then(setMesocycles));
  }, [team.teamId]);
  const [weekMonday, setWeekMonday] = useState(mondayOf(todayStr()));
  const [monthAnchor, setMonthAnchor] = useState(firstOfMonth(todayStr()));
  const [editDate, setEditDate] = useState(null);
  const [existingSession, setExistingSession] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);

  // Si hay sesiones pero firstMonday no está fijado, lo fijamos ahora
  useEffect(() => {
    if (!team?.firstMonday && sessions.length > 0) {
      const earliest = sessions.map((s) => mondayOf(s.date)).sort()[0];
      ensureFirstMonday(team, earliest).then(() => onSessionsChange());
    }
  }, [team?.firstMonday, sessions.length]);

  const days = weekDates(weekMonday);
  // Si firstMonday no está en BD todavía, usamos la semana actual como ancla local
  const effectiveFirstMonday = team?.firstMonday || mondayOf(todayStr());
  const weekNum = weekNumberFrom(effectiveFirstMonday, weekMonday);
  const today = todayStr();
  const monthCells = useMemo(() => monthGridDates(monthAnchor), [monthAnchor]);

  const sessionByDate = useMemo(() => {
    const map = {};
    sessions.forEach((s) => { map[s.date] = s; });
    return map;
  }, [sessions]);

  const [editDefaultTab, setEditDefaultTab] = useState("grupo");

  const openEditor = (date, defaultTab = "grupo") => {
    if (readOnly) return;
    setEditDate(date);
    setEditDefaultTab(defaultTab);
    setExistingSession(sessionByDate[date] || null);
  };

  const handleSaveGroup = async (groupData, extraDates = []) => {
    if (!editDate) return;
    await ensureFirstMonday(team, weekMonday);
    const allDates = [editDate, ...extraDates];
    await Promise.all(allDates.map(async (d) => {
      const prevInd = sessionByDate[d]?.individualSessions || [];
      await saveSession({ teamId: team.teamId, date: d, ...groupData, individualSessions: prevInd });
      if (!groupData.isRest) {
        await updateRpeDurationForSession(team.teamId, d, groupData.duration);
        await updateRpeSessionTypeForSession(team.teamId, d, groupData.sessionType);
      }
    }));
    await onSessionsChange();
    setEditDate(null);
  };

  const handleSaveInd = async (indSessions) => {
    if (!editDate) return;
    const existing = sessionByDate[editDate];
    if (!existing) {
      // No hay sesión de grupo aún — guardamos solo las individuales con sessionType vacío
      await saveSession({ teamId: team.teamId, date: editDate, sessionType: "", intensity: "amarillo", duration: 0, description: "", isRest: false, isMatch: false, individualSessions: indSessions });
    } else {
      await saveSession({ teamId: team.teamId, date: editDate, ...existing, individualSessions: indSessions });
    }
    await onSessionsChange();
    setEditDate(null);
  };

  const handleDelete = async () => {
    if (!editDate) return;
    const existingInd = sessionByDate[editDate]?.individualSessions || [];
    // Siempre borrar RPE y wellness del día al eliminar la sesión de grupo
    await deleteGroupSessionResponses(team.teamId, editDate);
    if (existingInd.length > 0) {
      // Hay individuales — conservar la fila pero vaciar el grupo
      await saveSession({ teamId: team.teamId, date: editDate, sessionType: "", intensity: "amarillo", duration: 0, description: "", isRest: false, isMatch: false, individualSessions: existingInd });
    } else {
      await deleteSession(team.teamId, editDate);
    }
    await onSessionsChange();
    setEditDate(null);
  };

  const DayCell = ({ date, inMonth = true }) => {
    const session = sessionByDate[date];
    const isToday = date === today;
    const intensity = session && !session.isRest ? INTENSITY_LEVELS[session.intensity] : null;
    const MENSTRUAL_PHASES_CAL = [
      { short: "Previa",   emoji: "🌕" },
      { short: "Sangrado", emoji: "🔴" },
      { short: "Post 1",   emoji: "🔥💪" },
      { short: "Post 2",   emoji: "💙" },
    ];
    const mesoColors = mesocycles.filter((m) => m.color && date >= m.startDate && date <= m.endDate).map((m) => m.color);
    const WEEK_TYPE_COLORS = { carga: "#ff9f40", sobrecarga: "#ff5a5f", descarga: "#60a5fa" };
    const weekTypeColor = (() => {
      for (const m of mesocycles) {
        if (date < m.startDate || date > m.endDate) continue;
        const week = (m.weeks || []).find((w) => date >= w.weekStart && date <= w.weekEnd);
        if (week?.type) return WEEK_TYPE_COLORS[week.type] || null;
      }
      return null;
    })();
    const menstrualPhase = (() => {
      for (const m of mesocycles) {
        if (!m.isMenstrual || date < m.startDate || date > m.endDate) continue;
        const weekIdx = (m.weeks || []).findIndex((w) => date >= w.weekStart && date <= w.weekEnd);
        if (weekIdx >= 0) return MENSTRUAL_PHASES_CAL[weekIdx] || MENSTRUAL_PHASES_CAL[MENSTRUAL_PHASES_CAL.length - 1];
      }
      return null;
    })();
    const relaxin = mesocycles.some((m) => {
      if (!m.isMenstrual || date < m.startDate || date > m.endDate) return false;
      const diff = Math.round((new Date(date + "T00:00:00") - new Date(m.startDate + "T00:00:00")) / 86400000) + 1;
      return diff === 20 || diff === 21 || diff === 22;
    });

    return (
      <div style={{
        display: "flex", flexDirection: "column", gap: 4,
        background: COLORS.panel, border: `1px solid ${isToday ? COLORS.lime : COLORS.line}`,
        borderRadius: 10, padding: viewMode === "week" ? "10px 8px" : "6px 6px",
        opacity: inMonth ? 1 : 0.35, cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: viewMode === "week" ? 11 : 10, fontWeight: 600, color: isToday ? COLORS.lime : COLORS.text }}>
            {viewMode === "week" ? weekdayLabel(date).slice(0, 3) : new Date(date + "T00:00:00").getDate()}
          </span>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {mesoColors.map((c, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />)}
            {menstrualPhase && <span style={{ fontSize: 8, lineHeight: 1 }} title={menstrualPhase.short}>{menstrualPhase.emoji}</span>}
            {relaxin && <span style={{ fontSize: 8, lineHeight: 1 }} title="Pico de relaxina — cuidado con estiramientos">⚡</span>}
            {viewMode === "week" && <span style={{ fontSize: 10, color: COLORS.text }}>{fmtDateShort(date)}</span>}
          </div>
        </div>

        {session ? (
          <>
          {(session.sessionType || session.isRest) && (
          <div onClick={() => openEditor(date)} style={{ borderRadius: 7, padding: "6px 6px", background: intensity ? intensity.dark : COLORS.panelRaised, cursor: "pointer", minHeight: 32 }}>
            <div style={{ fontSize: viewMode === "week" ? 12 : 10, fontWeight: 700, color: intensity ? intensity.color : COLORS.textFaint, fontFamily: "'Oswald', sans-serif" }}>
              {session.isRest ? "Descanso" : session.sessionType}
            </div>
            {!session.isRest && session.duration > 0 && viewMode === "week" && (
              <div style={{ fontSize: 10, color: intensity ? intensity.color : COLORS.textFaint, opacity: 0.7, marginTop: 2 }}>{session.duration} min</div>
            )}
          </div>
          )}
          {!session.sessionType && !session.isRest && !readOnly && (
            <div onClick={() => openEditor(date, "grupo")} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: `1px dashed ${COLORS.line}`, height: 28, cursor: "pointer" }}>
              <span style={{ fontSize: 14, color: COLORS.text }}>+</span>
            </div>
          )}
          {(session.individualSessions || []).filter(s => s.title).map((s, idx) => (
            <div key={idx} onClick={(e) => { e.stopPropagation(); openEditor(date, "individual"); }} style={{ borderRadius: 6, padding: "4px 6px", background: COLORS.panelRaised, border: `1px solid ${COLORS.blue}`, cursor: "pointer" }}>
              <div style={{ fontSize: viewMode === "week" ? 10 : 9, fontWeight: 700, color: COLORS.blue, fontFamily: "'Oswald', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              {viewMode === "week" && s.players?.length > 0 && <div style={{ fontSize: 9, color: COLORS.text, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.players.map(p => { const d = displayNames[p]; return typeof d === "object" ? (d?.displayName || p) : (d || p); }).join(", ")}</div>}
            </div>
          ))}
          </>
        ) : !readOnly ? (
          <div onClick={() => openEditor(date)} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: `1px dashed ${COLORS.line}`, height: 32, cursor: "pointer" }}>
            <span style={{ fontSize: 16, color: COLORS.text }}>+</span>
          </div>
        ) : (
          <div style={{ height: 32 }} />
        )}
        {weekTypeColor && (
          <div style={{ height: 3, borderRadius: 2, background: weekTypeColor, opacity: 0.8 }} />
        )}
      </div>
    );
  };

  return (
    <div>
      {(() => {
        const visibleDates = viewMode === "week" ? days : monthCells.filter((c) => c.inMonth).map((c) => c.date);
        const first = visibleDates[0];
        const last = visibleDates[visibleDates.length - 1];
        const visibleMesos = mesocycles.filter((m) => m.startDate <= last && m.endDate >= first);
        if (visibleMesos.length === 0) return null;

        const WEEK_TYPE_DEFS = [
          { id: "carga", label: "Carga", color: "#ff9f40" },
          { id: "sobrecarga", label: "Sobrecarga", color: "#ff5a5f" },
          { id: "descarga", label: "Descarga", color: "#60a5fa" },
        ];
        const visibleWeekTypes = new Set(visibleDates.flatMap((d) => {
          for (const m of visibleMesos) {
            if (d < m.startDate || d > m.endDate) continue;
            const w = (m.weeks || []).find((w) => d >= w.weekStart && d <= w.weekEnd);
            if (w?.type) return [w.type];
          }
          return [];
        }));

        const ALL_MENSTRUAL = [
          { emoji: "🌕", label: "Semana Previa al Sangrado",  idx: 0 },
          { emoji: "🔴", label: "Semana de Sangrado",         idx: 1 },
          { emoji: "🔥💪", label: "Semana Post Sangrado",       idx: 2 },
          { emoji: "💙", label: "Semana 2ª Post Sangrado",    idx: 3 },
        ];
        const visibleMenstrualIdxs = new Set(visibleDates.flatMap((d) => {
          for (const m of visibleMesos) {
            if (!m.isMenstrual || d < m.startDate || d > m.endDate) continue;
            const idx = (m.weeks || []).findIndex((w) => d >= w.weekStart && d <= w.weekEnd);
            if (idx >= 0) return [Math.min(idx, 3)];
          }
          return [];
        }));
        const visibleMenstrual = ALL_MENSTRUAL.filter((p) => visibleMenstrualIdxs.has(p.idx));

        const hasRelaxin = visibleDates.some((d) =>
          visibleMesos.some((m) => {
            if (!m.isMenstrual || d < m.startDate || d > m.endDate) return false;
            const diff = Math.round((new Date(d + "T00:00:00") - new Date(m.startDate + "T00:00:00")) / 86400000) + 1;
            return diff === 20 || diff === 21 || diff === 22;
          })
        );

        return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, padding: "8px 10px", background: COLORS.panelRaised, borderRadius: 10 }}>
          {visibleMesos.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color || COLORS.lime, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: COLORS.text }}>{m.name}</span>
            </div>
          ))}
          {visibleWeekTypes.size > 0 && (
            <>
              <span style={{ color: COLORS.line, fontSize: 10 }}>·</span>
              {WEEK_TYPE_DEFS.filter((t) => visibleWeekTypes.has(t.id)).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 3, background: t.color, borderRadius: 2, display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: COLORS.text }}>{t.label}</span>
                </div>
              ))}
            </>
          )}
          {visibleMenstrual.length > 0 && (
            <>
              <span style={{ color: COLORS.line, fontSize: 10 }}>·</span>
              {visibleMenstrual.map((p) => (
                <div key={p.idx} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 9 }}>{p.emoji}</span>
                  <span style={{ fontSize: 10, color: "#e879f9" }}>{p.label}</span>
                </div>
              ))}
            </>
          )}
          {hasRelaxin && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>⚡</span>
              <span style={{ fontSize: 10, color: "#fde68a" }}>Pico relaxina</span>
            </div>
          )}
        </div>
        );
      })()}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, background: COLORS.panelRaised, borderRadius: 10, padding: 4 }}>
          {[{ id: "week", label: "Semana" }, { id: "month", label: "Mes" }, { id: "mesociclo", label: "Mesociclo" }].map((v) => (
            <button key={v.id} onClick={() => setViewMode(v.id)} style={{
              flex: 1, padding: "6px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
              background: viewMode === v.id ? COLORS.panel : "transparent",
              color: viewMode === v.id ? COLORS.text : COLORS.textDim, cursor: "pointer",
            }}>{v.label}</button>
          ))}
        </div>
        <button onClick={() => setShowPdf(true)} title="Exportar PDF" style={{ padding: "7px 12px", borderRadius: 9, border: "none", background: COLORS.lime, color: "#14171c", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>↓ PDF</button>
      </div>

      {viewMode === "mesociclo" && <MesocyclePanel team={team} roster={team.roster || []} displayNames={displayNames} onMesocyclesChange={setMesocycles} readOnly={readOnly} />}

      {viewMode !== "mesociclo" && viewMode === "week" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => setWeekMonday(addDays(weekMonday, -7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>←</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.lime }}>
                {weekNum !== null ? `Semana ${weekNum}` : "Elige una semana"}
              </div>
              <div style={{ fontSize: 11, color: COLORS.text }}>{fmtDateLong(days[0])} – {fmtDateLong(days[6])}</div>
            </div>
            <button onClick={() => setWeekMonday(addDays(weekMonday, 7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {days.map((date) => {
              const session = sessionByDate[date];
              const isToday = date === today;
              const intensity = session && !session.isRest ? INTENSITY_LEVELS[session.intensity] : null;
              const MENSTRUAL_PHASES_CAL = [{ emoji: "🌕" }, { emoji: "🔴" }, { emoji: "🔥💪" }, { emoji: "💙" }];
              const mesoColors = mesocycles.filter((m) => m.color && date >= m.startDate && date <= m.endDate).map((m) => m.color);
              const weekTypeColor = (() => {
                const WEEK_TYPE_COLORS = { carga: "#ff9f40", sobrecarga: "#ff5a5f", descarga: "#60a5fa" };
                for (const m of mesocycles) {
                  if (date < m.startDate || date > m.endDate) continue;
                  const week = (m.weeks || []).find((w) => date >= w.weekStart && date <= w.weekEnd);
                  if (week?.type) return WEEK_TYPE_COLORS[week.type] || null;
                }
                return null;
              })();
              const menstrualPhase = (() => {
                for (const m of mesocycles) {
                  if (!m.isMenstrual || date < m.startDate || date > m.endDate) continue;
                  const weekIdx = (m.weeks || []).findIndex((w) => date >= w.weekStart && date <= w.weekEnd);
                  if (weekIdx >= 0) return MENSTRUAL_PHASES_CAL[weekIdx] || MENSTRUAL_PHASES_CAL[MENSTRUAL_PHASES_CAL.length - 1];
                }
                return null;
              })();
              const relaxin = mesocycles.some((m) => {
                if (!m.isMenstrual || date < m.startDate || date > m.endDate) return false;
                const diff = Math.round((new Date(date + "T00:00:00") - new Date(m.startDate + "T00:00:00")) / 86400000) + 1;
                return diff === 20 || diff === 21 || diff === 22;
              });
              const indSessions = (session?.individualSessions || []).filter(s => s.title);
              return (
                <div key={date} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: COLORS.panel, border: `1px solid ${isToday ? COLORS.lime : COLORS.line}`,
                  borderRadius: 10, padding: "0.6rem 0.3rem", minWidth: 0, overflow: "hidden",
                }}>
                  <div style={{ display: "flex", gap: 2, minHeight: 6, alignItems: "center" }}>
                    {mesoColors.map((c, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />)}
                    {menstrualPhase && <span style={{ fontSize: 8, lineHeight: 1 }}>{menstrualPhase.emoji}</span>}
                    {relaxin && <span style={{ fontSize: 8, lineHeight: 1 }}>⚡</span>}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? COLORS.lime : COLORS.text }}>{weekdayLabel(date).slice(0, 3)}</div>
                    <div style={{ fontSize: 9, color: COLORS.text }}>{fmtDateShort(date)}</div>
                  </div>
                  {session && (session.sessionType || session.isRest) ? (
                    <div onClick={() => openEditor(date)} style={{ borderRadius: 6, padding: "5px 3px", textAlign: "center", width: "100%", background: intensity ? intensity.dark : COLORS.panelRaised, cursor: "pointer" }}>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 600, color: intensity ? intensity.color : COLORS.textFaint }}>{session.isRest ? "Descanso" : session.sessionType}</div>
                      {session.duration > 0 && !session.isRest && <div style={{ fontSize: 9, color: intensity ? intensity.color : COLORS.textFaint, opacity: 0.7 }}>{session.duration} min</div>}
                    </div>
                  ) : !readOnly ? (
                    <div onClick={() => openEditor(date)} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: `1px dashed ${COLORS.line}`, width: "100%", height: 36, cursor: "pointer" }}>
                      <span style={{ fontSize: 16, color: COLORS.text }}>+</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 9, color: COLORS.text, padding: "8px 0" }}>—</div>
                  )}
                  {indSessions.map((s, i) => (
                    <div key={i} onClick={() => openEditor(date, "individual")} style={{ borderRadius: 6, padding: "4px 3px", textAlign: "center", width: "100%", background: COLORS.panelRaised, border: `1px solid ${COLORS.blue}`, cursor: "pointer" }}>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, fontWeight: 700, color: COLORS.blue, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    </div>
                  ))}
                  {weekTypeColor && <div style={{ height: 3, width: "100%", background: weekTypeColor, borderRadius: 2, marginTop: "auto" }} />}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>←</button>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.lime, textTransform: "capitalize" }}>{monthLabel(monthAnchor)}</div>
            <button onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ textAlign: "center", fontSize: 10, color: COLORS.text, fontWeight: 600 }}>{label.slice(0, 3)}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
            {monthCells.map(({ date, inMonth }) => <DayCell key={date} date={date} inMonth={inMonth} />)}
          </div>
        </>
      )}

      {editDate && (
        <SessionEditorModal
          date={editDate}
          existing={existingSession}
          onClose={() => setEditDate(null)}
          onSaveGroup={handleSaveGroup}
          onSaveInd={handleSaveInd}
          onDelete={handleDelete}
          defaultTab={editDefaultTab}
          defaultMatchDuration={team.defaultMatchDuration}
          isTrainingGroup={team.isTrainingGroup || false}
          isIndividualAthlete={(team.kind || "equipo") === "individual"}
          mesocycles={mesocycles}
          roster={team.roster || []}
          displayNames={displayNames}
        />
      )}
      {viewDetail && sessionByDate[viewDetail] && (
        <SessionDetailModal date={viewDetail} session={sessionByDate[viewDetail]} onClose={() => setViewDetail(null)} />
      )}
      {showPdf && (
        <CalendarPdfExport
          team={team}
          sessions={sessions}
          mesocycles={mesocycles}
          currentWeekMonday={weekMonday}
          currentMonthAnchor={monthAnchor}
          currentMesoId={mesocycles[0]?.id}
          coachName={coachName}
          displayNames={displayNames}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
