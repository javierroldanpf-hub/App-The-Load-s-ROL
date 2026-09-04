"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { COLORS, INTENSITY_LEVELS, SESSION_TYPES, GROUP_SESSION_TYPES, MATCH_DEFAULT_DURATION, WEEKDAY_LABELS } from "@/lib/constants";
import { todayStr, mondayOf, addDays, fmtDateLong, fmtDateShort, weekdayLabel, weekDates, weekNumberFrom, firstOfMonth, addMonths, monthLabel, monthGridDates } from "@/lib/utils";
import { getSession, saveSession, deleteSession, deleteGroupSessionResponses, ensureFirstMonday, updateRpeDurationForSession, updateRpeSessionTypeForSession, getTeamsByCoach, loadTeamSessions } from "@/lib/db";
import ImageUploadButton from "./ImageUploadButton";
import SessionDetailModal from "./SessionDetailModal";
import MesocyclePanel, { MesoWeekInline } from "./MesocyclePanel";
import CalendarPdfExport from "./CalendarPdfExport";
import SquadModal from "./SquadModal";

function parseMatchDesc(raw) {
  try {
    const p = JSON.parse(raw || "{}");
    if (p.rivalText !== undefined) return { rivalText: p.rivalText || "", rivalPhoto: p.rivalPhoto || "", scoreHome: p.scoreHome ?? "", scoreAway: p.scoreAway ?? "", resultText: p.resultText || "" };
  } catch {}
  return { rivalText: "", rivalPhoto: "", scoreHome: "", scoreAway: "", resultText: "" };
}

// Returns "X – Y" with home team first. MD(H) = we are home, MD(A) = rival is home.
function scoreLabel(info, sessionType) {
  if (info.scoreHome === "" && info.scoreAway === "") return null;
  const isAway = sessionType === "MD(A)";
  return isAway ? `${info.scoreAway} – ${info.scoreHome}` : `${info.scoreHome} – ${info.scoreAway}`;
}

const BLOCK_TYPES = ["CAMPO", "PISTA", "FUERZA", "CARRERA", "METABÓLICO", "HIIT", "EMOM", "AMRAP", "CALENTAMIENTO", "MOVEMENT PREP", "OTRO"];
const STRENGTH_BLOCK_TYPES = ["FUERZA", "HIIT", "EMOM", "AMRAP"];

function getBlockType(b) {
  if (b.blockType) return b.blockType;
  const upper = b.name?.toUpperCase();
  if (BLOCK_TYPES.includes(upper)) return upper;
  if (b.name) return "OTRO";
  return "CAMPO";
}

function SessionBlocksEditor({ blocks, setBlocks, inputStyle, isEquipo }) {
  const addBlock = () => setBlocks((prev) => [...prev, { name: "CAMPO", blockType: "CAMPO", duration: "", content: "", tasks: [] }]);
  const updateBlock = (i, field, val) => setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  const removeBlock = (i) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));

  const handleBlockType = (i, type) => setBlocks((prev) => prev.map((b, idx) => {
    if (idx !== i) return b;
    return { ...b, blockType: type, name: type === "OTRO" ? (b.name && !BLOCK_TYPES.includes(b.name) ? b.name : "") : type };
  }));

  const addTask = (bi) => setBlocks((prev) => prev.map((b, idx) => idx === bi ? { ...b, tasks: [...(b.tasks || []), { id: Date.now(), name: "", workTime: "", restTime: "", space: "", relativeArea: "", imageBase64: "" }] } : b));
  const updateTask = (bi, ti, field, val) => setBlocks((prev) => prev.map((b, idx) => idx === bi ? { ...b, tasks: (b.tasks || []).map((t, tidx) => tidx === ti ? { ...t, [field]: val } : t) } : b));
  const removeTask = (bi, ti) => setBlocks((prev) => prev.map((b, idx) => idx === bi ? { ...b, tasks: (b.tasks || []).filter((_, tidx) => tidx !== ti) } : b));

  const handleTaskImage = (bi, ti, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateTask(bi, ti, "imageBase64", ev.target.result);
    reader.readAsDataURL(file);
  };

  const addExercise = (bi) => setBlocks((prev) => prev.map((b, idx) => idx === bi ? { ...b, exercises: [...(b.exercises || []), { id: Date.now(), name: "", series: "", repeticiones: "", intensidad: "", recuperacion: "", videoUrl: "" }] } : b));
  const updateExercise = (bi, ei, field, val) => setBlocks((prev) => prev.map((b, idx) => idx === bi ? { ...b, exercises: (b.exercises || []).map((e, eidx) => eidx === ei ? { ...e, [field]: val } : e) } : b));
  const removeExercise = (bi, ei) => setBlocks((prev) => prev.map((b, idx) => idx === bi ? { ...b, exercises: (b.exercises || []).filter((_, eidx) => eidx !== ei) } : b));

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Bloques del entrenamiento</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {blocks.map((b, i) => (
          <div key={i} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <select
                value={getBlockType(b)}
                onChange={(e) => handleBlockType(i, e.target.value)}
                style={{ ...inputStyle, flex: 2, padding: "8px 10px", fontSize: 13, minWidth: 120 }}
              >
                {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {getBlockType(b) === "OTRO" && (
                <input value={b.name} onChange={(e) => updateBlock(i, "name", e.target.value)} placeholder="Escribe el nombre..." style={{ ...inputStyle, flex: 2, padding: "8px 10px", fontSize: 13 }} />
              )}
              <input type="number" value={b.duration} onChange={(e) => updateBlock(i, "duration", e.target.value)} placeholder="Min" style={{ ...inputStyle, flex: 1, minWidth: 60, padding: "8px 10px", fontSize: 13 }} />
              <button onClick={() => removeBlock(i)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
            <textarea value={b.content} onChange={(e) => updateBlock(i, "content", e.target.value)} placeholder="Contenido del bloque..." rows={3} style={{ ...inputStyle, resize: "vertical", fontSize: 13, padding: "8px 10px", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }} />
            {isEquipo && (
              <div style={{ marginTop: 10 }}>
                {(b.tasks || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                    {(b.tasks || []).map((t, ti) => (
                      <div key={t.id || ti} style={{ background: COLORS.bg || "#14171c", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ background: COLORS.lime, color: "#14171c", borderRadius: 5, padding: "2px 7px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>T{ti + 1}</span>
                          <input value={t.name} onChange={(e) => updateTask(i, ti, "name", e.target.value)} placeholder="Nombre de la tarea..." style={{ ...inputStyle, flex: 1, padding: "5px 8px", fontSize: 12 }} />
                          <button onClick={() => removeTask(i, ti)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
                          <input value={t.workTime} onChange={(e) => updateTask(i, ti, "workTime", e.target.value)} placeholder="T. trabajo" style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                          <input value={t.restTime} onChange={(e) => updateTask(i, ti, "restTime", e.target.value)} placeholder="T. descanso" style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                          <input value={t.space} onChange={(e) => updateTask(i, ti, "space", e.target.value)} placeholder="Espacio" style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                          <input value={t.relativeArea} onChange={(e) => updateTask(i, ti, "relativeArea", e.target.value)} placeholder="Área rel." style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {t.imageBase64 ? (
                            <img src={t.imageBase64} alt="tarea" onClick={() => updateTask(i, ti, "imageBase64", "")} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} title="Click para quitar" />
                          ) : (
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${COLORS.line}`, cursor: "pointer", fontSize: 11, color: COLORS.text, background: "transparent" }}>
                              + Imagen
                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleTaskImage(i, ti, e)} />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => addTask(i)} style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: `1px dashed ${COLORS.lime}`, background: "transparent", color: COLORS.lime, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Añadir tarea</button>
              </div>
            )}
            {STRENGTH_BLOCK_TYPES.includes(getBlockType(b)) && (
              <div style={{ marginTop: 10 }}>
                {(b.exercises || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                    {(b.exercises || []).map((ex, ei) => (
                      <div key={ex.id || ei} style={{ background: COLORS.bg || "#14171c", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ background: "#a78bfa", color: "#14171c", borderRadius: 5, padding: "2px 7px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>E{ei + 1}</span>
                          <input value={ex.name} onChange={(e) => updateExercise(i, ei, "name", e.target.value)} placeholder="Nombre del ejercicio..." style={{ ...inputStyle, flex: 1, padding: "5px 8px", fontSize: 12 }} />
                          <button onClick={() => removeExercise(i, ei)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 6, padding: "4px 7px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
                          <input value={ex.series} onChange={(e) => updateExercise(i, ei, "series", e.target.value)} placeholder="Series" style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                          <input value={ex.repeticiones} onChange={(e) => updateExercise(i, ei, "repeticiones", e.target.value)} placeholder="Reps" style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                          <input value={ex.intensidad} onChange={(e) => updateExercise(i, ei, "intensidad", e.target.value)} placeholder="Intensidad" style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                          <input value={ex.recuperacion} onChange={(e) => updateExercise(i, ei, "recuperacion", e.target.value)} placeholder="Recup." style={{ ...inputStyle, padding: "5px 8px", fontSize: 11 }} />
                        </div>
                        <input value={ex.videoUrl} onChange={(e) => updateExercise(i, ei, "videoUrl", e.target.value)} placeholder="URL del vídeo (YouTube, etc.)" style={{ ...inputStyle, width: "100%", padding: "5px 8px", fontSize: 11, boxSizing: "border-box" }} />
                        {ex.videoUrl && (
                          <a href={ex.videoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 4, fontSize: 10, color: "#a78bfa" }}>Ver vídeo</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => addExercise(i)} style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: `1px dashed #a78bfa`, background: "transparent", color: "#a78bfa", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Añadir ejercicio</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={addBlock} style={{ marginTop: 8, width: "100%", padding: "9px 0", borderRadius: 10, border: `1px dashed ${COLORS.lime}`, background: "transparent", color: COLORS.lime, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>+ Añadir bloque</button>
    </div>
  );
}

function SessionEditorModal({ date, existing, onClose, onSaveGroup, onSaveInd, onRepeatInd, onDelete, defaultMatchDuration, isTrainingGroup, isIndividualAthlete = false, mesocycles = [], roster: rosterRaw = [], displayNames = {}, defaultTab = "grupo", isEquipo = false, allSessions = [] }) {
  const roster = rosterRaw.map((u) => typeof u === "string" ? u : u.username);
  const availableTypes = isTrainingGroup ? GROUP_SESSION_TYPES : SESSION_TYPES;
  const [editorTab, setEditorTab] = useState(defaultTab);

  // ── Grupo ──
  const [sessionType, setSessionType] = useState(existing?.sessionType || availableTypes[0].id);
  const [intensity, setIntensity] = useState(existing ? existing.intensity : "amarillo");
  const [duration, setDuration] = useState(existing ? String(existing.duration) : "90");
  const parseDesc = (raw) => {
    try {
      const p = JSON.parse(raw || "{}");
      if (p.blocks) return { blocks: p.blocks, rivalText: "", rivalPhoto: "", scoreHome: "", scoreAway: "", resultText: "" };
      if (p.rivalText !== undefined) return { blocks: [], rivalText: p.rivalText || "", rivalPhoto: p.rivalPhoto || "", scoreHome: p.scoreHome ?? "", scoreAway: p.scoreAway ?? "", resultText: p.resultText || "" };
      if (p.g !== undefined || p.c !== undefined) return { blocks: [{ name: "Gimnasio", duration: "", content: p.g || "" }, { name: "Campo", duration: "", content: p.c || "" }].filter(b => b.content), rivalText: "", rivalPhoto: "", scoreHome: "", scoreAway: "", resultText: "" };
      return { blocks: [], rivalText: "", rivalPhoto: "", scoreHome: "", scoreAway: "", resultText: "" };
    } catch { return { blocks: [], rivalText: raw || "", rivalPhoto: "", scoreHome: "", scoreAway: "", resultText: "" }; }
  };
  const parsed = parseDesc(existing?.description);
  const existingAthleteNote = parsed.blocks.find((b) => b.name === "Nota del atleta") || null;
  const [blocks, setBlocks] = useState(parsed.blocks.filter((b) => b.name !== "Nota del atleta").length > 0 ? parsed.blocks.filter((b) => b.name !== "Nota del atleta") : []);
  const [description, setDescription] = useState(parsed.rivalText);
  const [rivalPhoto, setRivalPhoto] = useState(parsed.rivalPhoto || "");
  const [scoreHome, setScoreHome] = useState(String(parsed.scoreHome ?? ""));
  const [scoreAway, setScoreAway] = useState(String(parsed.scoreAway ?? ""));
  const [resultText, setResultText] = useState(parsed.resultText || "");
  const [isRest, setIsRest] = useState(existing ? !!existing.isRest : false);
  const [allowPlayerNote, setAllowPlayerNote] = useState(existing ? !!existing.allowPlayerNote : false);
  const [extraDates, setExtraDates] = useState([]);
  const isMatch = availableTypes.find((st) => st.id === sessionType)?.isMatch ?? false;

  // ── Individuales ──
  const existingIndividual = existing?.individualSessions || [];
  const [indSessions, setIndSessions] = useState(existingIndividual.length > 0 ? existingIndividual : []);
  const [repeatInd, setRepeatInd] = useState(null); // { indSession, selectedDates[] }
  const [repeatSaving, setRepeatSaving] = useState(false);
  const [repeatDone, setRepeatDone] = useState(false);

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
      const allBlocks = existingAthleteNote ? [...blocks, existingAthleteNote] : blocks;
      const finalDesc = isMatch
        ? JSON.stringify({ rivalText: description, rivalPhoto, scoreHome: scoreHome !== "" ? scoreHome : undefined, scoreAway: scoreAway !== "" ? scoreAway : undefined, resultText: resultText || undefined })
        : JSON.stringify({ blocks: allBlocks });
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
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          {rivalPhoto && <img src={rivalPhoto} alt="Escudo rival" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: COLORS.panelRaised, padding: 4 }} />}
                          <ImageUploadButton label={rivalPhoto ? "Cambiar escudo" : "+ Añadir escudo"} onUploaded={(dataUrl) => setRivalPhoto(dataUrl)} />
                          {rivalPhoto && <button onClick={() => setRivalPhoto("")} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Quitar</button>}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Marcador</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Tu equipo</div>
                            <input type="number" inputMode="numeric" min="0" value={scoreHome} onChange={(e) => setScoreHome(e.target.value)} placeholder="—" style={{ ...inputStyle, textAlign: "center" }} />
                          </div>
                          <span style={{ fontSize: 18, color: COLORS.text, marginTop: 18 }}>–</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>{description || "Rival"}</div>
                            <input type="number" inputMode="numeric" min="0" value={scoreAway} onChange={(e) => setScoreAway(e.target.value)} placeholder="—" style={{ ...inputStyle, textAlign: "center" }} />
                          </div>
                        </div>
                      </>
                    )}
                    {(isTrainingGroup || isIndividualAthlete) && (
                      <>
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Foto de referencia de la competición</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          {rivalPhoto && <img src={rivalPhoto} alt="Foto competición" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: COLORS.panelRaised, padding: 4 }} />}
                          <ImageUploadButton label={rivalPhoto ? "Cambiar foto" : "+ Añadir foto"} onUploaded={(dataUrl) => setRivalPhoto(dataUrl)} />
                          {rivalPhoto && <button onClick={() => setRivalPhoto("")} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Quitar</button>}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Resultado</div>
                        <input type="text" value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="Ej: 1.ª posición, medalla de oro..." style={inputStyle} />
                      </>
                    )}
                  </div>
                ) : (
                  <SessionBlocksEditor blocks={blocks} setBlocks={setBlocks} inputStyle={inputStyle} isEquipo={isEquipo} />
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
            {!isRest && isIndividualAthlete && (() => {
              const athleteNoteBlock = parsed.blocks.find((b) => b.name === "Nota del atleta");
              return (
                <>
                  {athleteNoteBlock?.content && (
                    <div style={{ marginBottom: 14, background: COLORS.panelRaised, border: `1px solid ${COLORS.lime}44`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.lime, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Nota del atleta</div>
                      <div style={{ fontSize: 13, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{athleteNoteBlock.content}</div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "12px 14px", background: COLORS.panelRaised, borderRadius: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Nota del atleta</div>
                      <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>El atleta podrá añadir un texto sobre el entreno en su calendario</div>
                    </div>
                    <button onClick={() => setAllowPlayerNote((v) => !v)} style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative", background: allowPlayerNote ? COLORS.lime : COLORS.panelRaised, transition: "background 0.2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 3, left: allowPlayerNote ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: allowPlayerNote ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
                    </button>
                  </div>
                </>
              );
            })()}
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
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setRepeatInd({ indSession: s, selectedDates: [] }); setRepeatDone(false); }} style={{ background: "transparent", border: `1px solid ${COLORS.blue}`, color: COLORS.blue, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>↻ Repetir</button>
                    <button onClick={() => removeInd(i)} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>Eliminar</button>
                  </div>
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
                <SessionBlocksEditor blocks={s.blocks || []} setBlocks={(newBlocks) => updateIndBlocks(i, typeof newBlocks === "function" ? newBlocks(s.blocks || []) : newBlocks)} inputStyle={{ ...inputStyle, fontSize: 13, padding: "8px 10px" }} isEquipo={isEquipo} />
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

      {repeatInd && (() => {
        const today = todayStr();
        const anchor = mondayOf(date);
        // Build 8 weeks of dates centered around the session date
        const weeks = Array.from({ length: 12 }, (_, wi) => {
          const mon = addDays(anchor, wi * 7 - 14);
          return Array.from({ length: 7 }, (_, di) => addDays(mon, di));
        });
        const toggleDate = (d) => {
          if (d === date) return;
          setRepeatInd((prev) => ({
            ...prev,
            selectedDates: prev.selectedDates.includes(d)
              ? prev.selectedDates.filter((x) => x !== d)
              : [...prev.selectedDates, d],
          }));
        };
        const handleConfirm = async () => {
          if (!repeatInd.selectedDates.length) return;
          setRepeatSaving(true);
          try {
            await onRepeatInd(repeatInd.indSession, repeatInd.selectedDates);
            setRepeatDone(true);
          } catch (e) {
            alert("Error: " + (e?.message || e));
          } finally {
            setRepeatSaving(false);
          }
        };
        return (
          <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "22px 20px", width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: 4 }}>Repetir sesión individual</div>
              <div style={{ fontSize: 11, color: COLORS.blue, marginBottom: 14 }}>{repeatInd.indSession.title || "Sin título"}</div>
              {repeatDone ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                  <div style={{ color: COLORS.lime, fontWeight: 700 }}>Sesión repetida en {repeatInd.selectedDates.length} día{repeatInd.selectedDates.length !== 1 ? "s" : ""}</div>
                  <button onClick={() => setRepeatInd(null)} style={{ marginTop: 16, padding: "9px 24px", borderRadius: 9, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 10 }}>Selecciona los días donde quieres añadir esta sesión:</div>
                  <div style={{ overflowX: "auto", marginBottom: 14 }}>
                    <table style={{ borderCollapse: "collapse", width: "100%" }}>
                      <thead>
                        <tr>{["L","M","X","J","V","S","D"].map((d) => <th key={d} style={{ fontSize: 10, color: COLORS.text, padding: "2px 0", textAlign: "center", fontWeight: 600 }}>{d}</th>)}</tr>
                      </thead>
                      <tbody>
                        {weeks.map((week, wi) => (
                          <tr key={wi}>
                            {week.map((d) => {
                              const isOrigin = d === date;
                              const isSel = repeatInd.selectedDates.includes(d);
                              const isPast = d < today;
                              return (
                                <td key={d} style={{ padding: "2px" }}>
                                  <button
                                    onClick={() => toggleDate(d)}
                                    disabled={isOrigin}
                                    style={{
                                      width: "100%", padding: "5px 2px", borderRadius: 6, border: `1px solid ${isOrigin ? COLORS.lime : isSel ? COLORS.blue : COLORS.line}`,
                                      background: isOrigin ? `${COLORS.lime}30` : isSel ? `${COLORS.blue}30` : "transparent",
                                      color: isOrigin ? COLORS.lime : isPast ? COLORS.text : COLORS.text,
                                      fontSize: 10, cursor: isOrigin ? "default" : "pointer", opacity: isPast && !isOrigin ? 0.5 : 1,
                                      fontWeight: isOrigin || isSel ? 700 : 400,
                                    }}
                                  >{d.slice(8)}</button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.blue, marginBottom: 12 }}>
                    {repeatInd.selectedDates.length > 0 ? `${repeatInd.selectedDates.length} día${repeatInd.selectedDates.length !== 1 ? "s" : ""} seleccionado${repeatInd.selectedDates.length !== 1 ? "s" : ""}` : "Ningún día seleccionado"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setRepeatInd(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleConfirm} disabled={!repeatInd.selectedDates.length || repeatSaving} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: repeatInd.selectedDates.length ? COLORS.blue : COLORS.line, color: "#fff", fontWeight: 700, cursor: repeatInd.selectedDates.length ? "pointer" : "default" }}>
                      {repeatSaving ? "Guardando..." : "Confirmar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function CoachCalendarEditor({ team, sessions, onSessionsChange, readOnly = false, displayNames = {}, coachName = "", teamGender = "masculino" }) {
  const [viewMode, setViewMode] = useState("week");
  const [showPdf, setShowPdf] = useState(false);
  const [mesocycles, setMesocycles] = useState([]);
  const [showCopyWeek, setShowCopyWeek] = useState(false);
  const [copyTeams, setCopyTeams] = useState([]);
  const [copyTarget, setCopyTarget] = useState(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    import("@/lib/db").then(({ loadMesocycles }) => loadMesocycles(team.teamId).then(setMesocycles));
  }, [team.teamId]);

  useEffect(() => {
    if (!showCopyWeek) return;
    getTeamsByCoach(team.coachUsername).then((all) => {
      setCopyTeams(all.filter((t) => t.teamId !== team.teamId));
      setCopyTarget(null);
      setCopyDone(false);
    });
  }, [showCopyWeek, team.coachUsername, team.teamId]);

  const handleCopyWeek = async () => {
    if (!copyTarget) return;
    setCopyLoading(true);
    try {
      const weekDays = weekDates(weekMonday);
      const weekSessions = sessions.filter((s) => weekDays.includes(s.date));
      await Promise.all(weekSessions.map((s) => saveSession({ ...s, teamId: copyTarget, individualSessions: (s.individualSessions || []).map((ind) => ({ ...ind, players: [] })) })));
      setCopyDone(true);
    } catch (e) {
      alert("Error al copiar: " + (e?.message || e));
    } finally {
      setCopyLoading(false);
    }
  };
  const [weekMonday, setWeekMonday] = useState(mondayOf(todayStr()));
  const [monthAnchor, setMonthAnchor] = useState(firstOfMonth(todayStr()));
  const [editDate, setEditDate] = useState(null);
  const [existingSession, setExistingSession] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [squadDate, setSquadDate] = useState(null);

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
      await saveSession({ teamId: team.teamId, date: editDate, sessionType: "", intensity: "amarillo", duration: 0, description: "", isRest: false, isMatch: false, individualSessions: indSessions });
    } else {
      await saveSession({ teamId: team.teamId, date: editDate, ...existing, individualSessions: indSessions });
    }
    await onSessionsChange();
    setEditDate(null);
  };

  const handleRepeatInd = async (indSession, targetDates) => {
    await Promise.all(targetDates.map(async (d) => {
      const existing = sessionByDate[d];
      const prevInds = existing?.individualSessions || [];
      const newInd = { ...indSession, id: Date.now() + Math.random(), players: indSession.players || [] };
      const merged = [...prevInds, newInd];
      if (!existing) {
        await saveSession({ teamId: team.teamId, date: d, sessionType: "", intensity: "amarillo", duration: 0, description: "", isRest: false, isMatch: false, individualSessions: merged });
      } else {
        await saveSession({ teamId: team.teamId, date: d, ...existing, individualSessions: merged });
      }
    }));
    await onSessionsChange();
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
          {(session.sessionType || session.isRest) && (() => {
            const matchInfo = (session.isMatch || session.sessionType === "MD(H)" || session.sessionType === "MD(A)") ? parseMatchDesc(session.description) : null;
            const hasScore = matchInfo && (matchInfo.scoreHome !== "" || matchInfo.scoreAway !== "");
            const hasResult = matchInfo && matchInfo.resultText;
            return (
          <div style={{ borderRadius: 7, overflow: "hidden", background: intensity ? intensity.dark : COLORS.panelRaised }}>
            <div onClick={() => openEditor(date)} style={{ padding: "6px 6px", cursor: "pointer", minHeight: 32 }}>
              <div style={{ fontSize: viewMode === "week" ? 12 : 10, fontWeight: 700, color: intensity ? intensity.color : COLORS.textFaint, fontFamily: "'Oswald', sans-serif" }}>
                {session.isRest ? "Descanso" : session.sessionType}
              </div>
              {(team.kind || "equipo") === "equipo" ? (
                <>
                  {matchInfo?.rivalPhoto && <div style={{ display: "flex", justifyContent: "center", marginTop: 4, marginBottom: 2 }}><img src={matchInfo.rivalPhoto} alt="" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }} /></div>}
                  {matchInfo?.rivalText && <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, marginTop: 2, wordBreak: "break-word", lineHeight: 1.2 }}>vs {matchInfo.rivalText}</div>}
                  {(() => { const sl = matchInfo ? scoreLabel(matchInfo, session.sessionType) : null; return sl ? <div style={{ fontSize: 9, color: COLORS.text, fontWeight: 700, marginTop: 1 }}>{sl}</div> : null; })()}
                </>
              ) : (
                <>
                  {matchInfo?.rivalText && <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, marginTop: 2, wordBreak: "break-word", lineHeight: 1.2 }}>{matchInfo.rivalText}</div>}
                  {matchInfo?.rivalPhoto && <div style={{ display: "flex", justifyContent: "center", marginTop: 3, marginBottom: 2 }}><img src={matchInfo.rivalPhoto} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4 }} /></div>}
                  {hasResult && <div style={{ fontSize: 9, color: COLORS.text, fontWeight: 700, marginTop: 1, wordBreak: "break-word", lineHeight: 1.2, textAlign: "center" }}>{matchInfo.resultText}</div>}
                </>
              )}
              {!session.isRest && session.duration > 0 && viewMode === "week" && (
                <div style={{ fontSize: 10, color: intensity ? intensity.color : COLORS.textFaint, opacity: 0.7, marginTop: 2 }}>{session.duration} min</div>
              )}
            </div>
            {!readOnly && viewMode !== "mesociclo" && (session.isMatch || session.sessionType === "MD(H)" || session.sessionType === "MD(A)") && (team.kind || "equipo") === "equipo" && (
              <button
                onClick={(e) => { e.stopPropagation(); setSquadDate(date); }}
                style={{ width: "100%", padding: "4px 2px", background: "#1a2a1a", border: "none", borderTop: `1px solid ${COLORS.lime}44`, color: COLORS.lime, fontSize: 8, fontWeight: 700, cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}
              >
                <span style={{ fontSize: 11 }}>📋</span>
                <span style={{ letterSpacing: 0.2, lineHeight: 1.2 }}>Convocatoria</span>
              </button>
            )}
          </div>
            );
          })()}
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
          {[{ id: "week", label: "Semanal" }, { id: "month", label: "Mensual" }, { id: "mesociclo", label: "Mesociclo" }].map((v) => (
            <button key={v.id} onClick={() => setViewMode(v.id)} style={{
              flex: 1, padding: "6px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
              background: viewMode === v.id ? COLORS.panel : "transparent",
              color: viewMode === v.id ? COLORS.text : COLORS.textDim, cursor: "pointer",
            }}>{v.label}</button>
          ))}
        </div>
        {!readOnly && <button onClick={() => setShowCopyWeek(true)} title="Copiar semana a otro equipo" style={{ padding: "7px 12px", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: COLORS.text, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>⧉ Copiar</button>}
        <button onClick={() => setShowPdf(true)} title="Exportar PDF" style={{ padding: "7px 12px", borderRadius: 9, border: "none", background: COLORS.lime, color: "#14171c", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>↓ PDF</button>
      </div>

      {viewMode === "mesociclo" && (
        <>
          <MesocyclePanel team={team} roster={team.roster || []} displayNames={displayNames} onMesocyclesChange={setMesocycles} readOnly={readOnly} teamGender={teamGender} />
          <MesoWeekInline mesocycles={mesocycles} weekMonday={weekMonday} onMesocyclesChange={setMesocycles} readOnly={true} sjPercentages={team.sjPercentages || null} />
        </>
      )}

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
                  {session && (session.sessionType || session.isRest) ? (() => {
                    const wkMatchInfo = (session.isMatch || session.sessionType === "MD(H)" || session.sessionType === "MD(A)") ? parseMatchDesc(session.description) : null;
                    const wkHasScore = wkMatchInfo && (wkMatchInfo.scoreHome !== "" || wkMatchInfo.scoreAway !== "");
                    return (
                    <div style={{ borderRadius: 6, overflow: "hidden", width: "100%", background: intensity ? intensity.dark : COLORS.panelRaised }}>
                      <div onClick={() => openEditor(date)} style={{ padding: "5px 3px", textAlign: "center", cursor: "pointer" }}>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 600, color: intensity ? intensity.color : COLORS.textFaint }}>{session.isRest ? "Descanso" : session.sessionType}</div>
                        {(team.kind || "equipo") === "equipo" ? (
                          <>
                            {wkMatchInfo?.rivalPhoto && <div style={{ display: "flex", justifyContent: "center", marginTop: 3 }}><img src={wkMatchInfo.rivalPhoto} alt="" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 3 }} /></div>}
                            {wkMatchInfo?.rivalText && <div style={{ fontSize: 8, color: "#f87171", fontWeight: 700, marginTop: 1, wordBreak: "break-word", lineHeight: 1.2 }}>vs {wkMatchInfo.rivalText}</div>}
                            {(() => { const sl = wkMatchInfo ? scoreLabel(wkMatchInfo, session.sessionType) : null; return sl ? <div style={{ fontSize: 8, color: COLORS.text, fontWeight: 700 }}>{sl}</div> : null; })()}
                          </>
                        ) : (
                          <>
                            {wkMatchInfo?.rivalText && <div style={{ fontSize: 8, color: "#f87171", fontWeight: 700, marginTop: 1, wordBreak: "break-word", lineHeight: 1.2 }}>{wkMatchInfo.rivalText}</div>}
                            {wkMatchInfo?.rivalPhoto && <div style={{ display: "flex", justifyContent: "center", marginTop: 3 }}><img src={wkMatchInfo.rivalPhoto} alt="" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 3 }} /></div>}
                            {wkMatchInfo?.resultText && <div style={{ fontSize: 8, color: COLORS.text, fontWeight: 700, wordBreak: "break-word", lineHeight: 1.2, textAlign: "center" }}>{wkMatchInfo.resultText}</div>}
                          </>
                        )}
                        {session.duration > 0 && !session.isRest && <div style={{ fontSize: 9, color: intensity ? intensity.color : COLORS.textFaint, opacity: 0.7 }}>{session.duration} min</div>}
                      </div>
                      {!readOnly && (session.isMatch || session.sessionType === "MD(H)" || session.sessionType === "MD(A)") && (team.kind || "equipo") === "equipo" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSquadDate(date); }}
                          style={{ width: "100%", padding: "4px 2px", background: "#1a2a1a", border: "none", borderTop: `1px solid ${COLORS.lime}44`, color: COLORS.lime, fontSize: 8, fontWeight: 700, cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}
                        >
                          <span style={{ fontSize: 11 }}>📋</span>
                          <span style={{ letterSpacing: 0.2, lineHeight: 1.2 }}>Convocatoria</span>
                        </button>
                      )}
                    </div>
                    );
                  })() : !readOnly ? (
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

      {/* ── Editor microciclo activo ─────────────────────────────────── */}
      {viewMode !== "mesociclo" && (
        <MesoWeekInline
          mesocycles={mesocycles}
          weekMonday={weekMonday}
          onMesocyclesChange={setMesocycles}
          readOnly={true}
          sjPercentages={team.sjPercentages || null}
        />
      )}

      {editDate && (
        <SessionEditorModal
          date={editDate}
          existing={existingSession}
          onClose={() => setEditDate(null)}
          onSaveGroup={handleSaveGroup}
          onSaveInd={handleSaveInd}
          onRepeatInd={handleRepeatInd}
          onDelete={handleDelete}
          defaultTab={editDefaultTab}
          defaultMatchDuration={team.defaultMatchDuration}
          isTrainingGroup={team.isTrainingGroup || false}
          isIndividualAthlete={(team.kind || "equipo") === "individual"}
          isEquipo={(team.kind || "equipo") === "equipo"}
          mesocycles={mesocycles}
          roster={team.roster || []}
          displayNames={displayNames}
          allSessions={sessions}
        />
      )}
      {viewDetail && sessionByDate[viewDetail] && (
        <SessionDetailModal date={viewDetail} session={sessionByDate[viewDetail]} onClose={() => setViewDetail(null)} isEquipo={(team.kind || "equipo") === "equipo"} />
      )}
      {squadDate && (
        <SquadModal
          team={team}
          date={squadDate}
          roster={team.roster || []}
          displayNames={displayNames}
          onClose={() => setSquadDate(null)}
          onSaved={() => { setSquadDate(null); onSessionsChange?.(); }}
        />
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
          isEquipo={(team.kind || "equipo") === "equipo"}
        />
      )}

      {showCopyWeek && (
        <div style={{ position: "fixed", inset: 0, background: "#0009", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "24px 22px", width: "100%", maxWidth: 380 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 17, color: COLORS.text, marginBottom: 4 }}>Copiar semana</div>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 16 }}>
              {fmtDateLong(weekDates(weekMonday)[0])} – {fmtDateLong(weekDates(weekMonday)[6])}
            </div>
            {copyDone ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <div style={{ color: COLORS.lime, fontWeight: 700, fontSize: 14 }}>Semana copiada</div>
                <button onClick={() => setShowCopyWeek(false)} style={{ marginTop: 16, padding: "9px 24px", borderRadius: 9, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Selecciona el equipo destino:</div>
                {copyTeams.length === 0 ? (
                  <div style={{ fontSize: 12, color: COLORS.text, padding: "12px 0" }}>No tienes otros equipos.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18, maxHeight: 240, overflowY: "auto" }}>
                    {copyTeams.map((t) => (
                      <button key={t.teamId} onClick={() => setCopyTarget(t.teamId)} style={{ padding: "10px 14px", borderRadius: 9, border: `2px solid ${copyTarget === t.teamId ? COLORS.lime : COLORS.line}`, background: copyTarget === t.teamId ? `${COLORS.lime}18` : COLORS.panelRaised, color: COLORS.text, fontWeight: copyTarget === t.teamId ? 700 : 400, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                        {t.name}
                        <span style={{ fontSize: 10, color: COLORS.text, marginLeft: 6, opacity: 0.6 }}>{t.kind || "equipo"}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowCopyWeek(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                  <button onClick={handleCopyWeek} disabled={!copyTarget || copyLoading} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: copyTarget ? COLORS.lime : COLORS.line, color: "#14171c", fontWeight: 700, cursor: copyTarget ? "pointer" : "default" }}>
                    {copyLoading ? "Copiando..." : "Copiar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
