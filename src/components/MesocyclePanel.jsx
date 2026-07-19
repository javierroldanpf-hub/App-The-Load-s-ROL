"use client";
import { useState, useEffect, useMemo } from "react";
import { COLORS } from "@/lib/constants";
import { todayStr, mondayOf, addDays, fmtDateShort, fmtDateLong, monthLabel, firstOfMonth, addMonths, monthGridDates } from "@/lib/utils";
import { loadMesocycles, saveMesocycle, deleteMesocycle } from "@/lib/db";

const MESO_COLORS = [
  "#a3e635", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#38bdf8", "#e879f9",
];

const WEEK_TYPES = [
  { id: "carga",      label: "Carga",      color: "#ff9f40", dark: "#3a2710" },
  { id: "sobrecarga", label: "Sobrecarga", color: "#ff5a5f", dark: "#3a1517" },
  { id: "descarga",   label: "Descarga",   color: "#60a5fa", dark: "#0c2040" },
];

const MENSTRUAL_PHASES = [
  {
    label: "Semana Previa al Sangrado", short: "Previa", type: "carga", emoji: "🌕",
    fase: "Fase Lútea Tardía",
    metabolismo: "Predominancia de Progesterona (Metabolismo de Ácidos Grasos)",
    contenidos: "Fase Lútea Tardía\nPredominancia de Progesterona (Metabolismo de Ácidos Grasos)\n\nEl cuerpo utiliza preferentemente las grasas como fuente de energía. Buena tolerancia al entrenamiento de fuerza e intensidad moderada-alta. Evitar volúmenes excesivos en los últimos días antes del sangrado.",
  },
  {
    label: "Semana de Sangrado", short: "Sangrado", type: "carga", emoji: "🔴",
    fase: "Fase Folicular Temprana",
    metabolismo: "Bajada de Progesterona y Subida del Estrógeno (No hay predominancia de ninguna vía metabólica)",
    contenidos: "Fase Folicular Temprana\nBajada de Progesterona y Subida del Estrógeno\nNo hay predominancia de ninguna vía metabólica\n\nPueden aparecer molestias (calambres, fatiga). Adaptar la carga según el estado individual. El rendimiento puede estar reducido los primeros días. Movilidad suave y trabajo técnico recomendado.",
  },
  {
    label: "Semana Post Sangrado", short: "Post 1", type: "sobrecarga", emoji: "🔥💪",
    fase: "Fase Folicular Tardía",
    metabolismo: "Predominancia del Estrógeno (Síntesis y Almacenamiento de Glucógeno)",
    contenidos: "Fase Folicular Tardía\nPredominancia del Estrógeno (Síntesis y Almacenamiento de Glucógeno)\n\nMejor momento para el rendimiento y la adaptación. Alta tolerancia al esfuerzo, buena recuperación muscular y síntesis de glucógeno óptima. Semana ideal para cargas altas y trabajo de alta intensidad.\n\n⚡ Días 20-22 del ciclo (13-15 días post sangrado): Pico de relaxina — precaución con estiramientos y movilidad extrema.",
  },
  {
    label: "Semana 2ª Post Sangrado", short: "Post 2", type: "descarga", emoji: "💙",
    fase: "Fase Lútea Temprana",
    metabolismo: "Bajada del Estrógeno y Subida de la Progesterona (Aumento del Metabolismo de Ácidos Grasos)",
    contenidos: "Fase Lútea Temprana\nBajada del Estrógeno y Subida de la Progesterona (Aumento del Metabolismo de Ácidos Grasos)\n\nEl metabolismo vuelve a orientarse hacia las grasas. Puede aumentar la temperatura corporal basal y la percepción del esfuerzo. Semana de descarga y recuperación activa. Buena para trabajo técnico y volumen bajo.",
  },
];

const SJ_PERCENTAGES = [
  { sgj_eg: 15, sgj_em: 25, sgj_ep: 10, smj_eg: 10, smj_em: 10, smj_ep: 15, srj_eg: 5,  srj_em: 5,  srj_ep: 5,  micro: 0 },
  { sgj_eg: 20, sgj_em: 30, sgj_ep: 0,  smj_eg: 15, smj_em: 15, smj_ep: 5,  srj_eg: 0,  srj_em: 5,  srj_ep: 10, micro: 0 },
  { sgj_eg: 15, sgj_em: 0,  sgj_ep: 0,  smj_eg: 25, smj_em: 10, smj_ep: 15, srj_eg: 0,  srj_em: 20, srj_ep: 15, micro: 0 },
  { sgj_eg: 15, sgj_em: 0,  sgj_ep: 0,  smj_eg: 30, smj_em: 5,  smj_ep: 15, srj_eg: 5,  srj_em: 10, srj_ep: 20, micro: 0 },
  { sgj_eg: 15, sgj_em: 5,  sgj_ep: 15, smj_eg: 10, smj_em: 5,  smj_ep: 0,  srj_eg: 5,  srj_em: 20, srj_ep: 25, micro: 5 },
  { sgj_eg: 10, sgj_em: 15, sgj_ep: 10, smj_eg: 0,  smj_em: 5,  smj_ep: 10, srj_eg: 5,  srj_em: 15, srj_ep: 30, micro: 0 },
];

const SJ_COLS = [
  { key: "sgj_eg", label: "EG", group: "SGJ", color: "#38bdf8" },
  { key: "sgj_em", label: "EM", group: "SGJ", color: "#38bdf8" },
  { key: "sgj_ep", label: "EP", group: "SGJ", color: "#38bdf8" },
  { key: "smj_eg", label: "EG", group: "SMJ", color: "#a78bfa" },
  { key: "smj_em", label: "EM", group: "SMJ", color: "#a78bfa" },
  { key: "smj_ep", label: "EP", group: "SMJ", color: "#a78bfa" },
  { key: "srj_eg", label: "EG", group: "SRJ", color: "#fb923c" },
  { key: "srj_em", label: "EM", group: "SRJ", color: "#fb923c" },
  { key: "srj_ep", label: "EP*", group: "SRJ", color: "#fb923c" },
];

function mesoWeeks(startDate, endDate) {
  const weeks = [];
  let monday = mondayOf(startDate);
  while (monday <= endDate) {
    const sunday = addDays(monday, 6);
    weeks.push({ weekStart: monday, weekEnd: sunday > endDate ? endDate : sunday });
    monday = addDays(monday, 7);
  }
  return weeks;
}

/* ── Range date picker ───────────────────────────────────────────────── */
function RangePicker({ startDate, endDate, onChange }) {
  const [anchor, setAnchor] = useState(firstOfMonth(startDate || todayStr()));
  const cells = useMemo(() => monthGridDates(anchor), [anchor]);

  const handleDay = (date) => {
    if (!startDate || (startDate && endDate)) {
      onChange(date, null);
    } else {
      if (date < startDate) onChange(date, startDate);
      else onChange(startDate, date);
    }
  };

  const inRange = (date) => startDate && endDate && date >= startDate && date <= endDate;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => setAnchor(addMonths(anchor, -1))} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>←</button>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, textTransform: "capitalize" }}>{monthLabel(anchor)}</div>
        <button onClick={() => setAnchor(addMonths(anchor, 1))} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>→</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
        {["L","M","X","J","V","S","D"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, color: COLORS.text, fontWeight: 700 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map(({ date, inMonth }) => {
          const isStart = date === startDate;
          const isEnd = date === endDate;
          const inR = inRange(date);
          return (
            <button key={date} onClick={() => inMonth && handleDay(date)} style={{
              padding: "6px 2px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: isStart || isEnd ? 700 : 400, cursor: inMonth ? "pointer" : "default",
              background: isStart || isEnd ? COLORS.lime : inR ? "#2a3a1a" : "transparent",
              color: isStart || isEnd ? "#14171c" : inMonth ? COLORS.text : "#3a4050",
              outline: "none",
            }}>
              {new Date(date + "T00:00:00").getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Editor de semana ────────────────────────────────────────────────── */
function WeekEditor({ week, onSave, onClose, isSJ = false }) {
  const [name, setName]           = useState(week.name || "");
  const [type, setType]           = useState(week.type || "carga");
  const [volume, setVolume]       = useState(String(week.volume ?? (isSJ ? 100 : 70)));
  const [intensity, setIntensity] = useState(String(week.intensity ?? 70));
  const [contenidos, setContenidos] = useState(week.contenidos || "");
  const [sjDays, setSjDays]       = useState(String(week.sjDays ?? 4));
  const [sjBaseMin, setSjBaseMin] = useState(String(week.sjBaseMinutes ?? 100));

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 60 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 380 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4, color: COLORS.text }}>Editar microciclo</div>
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 16 }}>{fmtDateShort(week.weekStart)} – {fmtDateShort(week.weekEnd)}</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Nombre</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Microciclo de choque..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Tipo</div>
          <div style={{ display: "flex", gap: 6 }}>
            {WEEK_TYPES.map((t) => (
              <button key={t.id} onClick={() => setType(t.id)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${type === t.id ? t.color : COLORS.line}`,
                background: type === t.id ? t.dark : "transparent", color: type === t.id ? t.color : COLORS.text,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {isSJ && (
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Días semana tipo</div>
              <input type="number" inputMode="numeric" min={1} max={7} value={sjDays} onChange={(e) => setSjDays(e.target.value)} style={{ ...inputStyle, color: "#38bdf8" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Min. semana tipo</div>
              <input type="number" inputMode="numeric" min={0} value={sjBaseMin} onChange={(e) => setSjBaseMin(e.target.value)} style={{ ...inputStyle, color: "#38bdf8" }} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Volumen (%)</div>
            <input type="number" inputMode="numeric" min={0} max={200} value={volume}
              onChange={(e) => setVolume(e.target.value)}
              style={{ ...inputStyle, color: COLORS.lime }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Intensidad (%)</div>
            <input type="number" inputMode="numeric" min={0} max={100} value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              style={{ ...inputStyle, color: "#ff9f40" }} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Contenidos</div>
          <textarea value={contenidos} onChange={(e) => setContenidos(e.target.value)} rows={4} placeholder="Describe los contenidos del microciclo..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave({ name, type, volume: Number(volume) || 0, intensity: Number(intensity) || 0, contenidos, ...(isSJ ? { sjDays: Number(sjDays) || 4, sjBaseMinutes: Number(sjBaseMin) || 100 } : {}) })} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Creador de mesociclo ────────────────────────────────────────────── */
function CreateMesoModal({ teamId, onSave, onClose, roster = [], displayNames = {}, showMenstrual = false, showSJ = false }) {
  const [name, setName]               = useState("");
  const [startDate, setStart]         = useState(null);
  const [endDate, setEnd]             = useState(null);
  const [color, setColor]             = useState(MESO_COLORS[0]);
  const [isMenstrual, setIsMenstrual] = useState(false);
  const [menstrualPlayers, setMenstrualPlayers] = useState([]);
  const [isSJ, setIsSJ]               = useState(false);
  const [saving, setSaving]           = useState(false);

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  const togglePlayer = (username) => setMenstrualPlayers((prev) =>
    prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
  );

  const handleSave = async () => {
    if (!startDate) return;
    if (!isSJ && !endDate) return;
    setSaving(true);
    try {
      const sjEndDate = isSJ ? addDays(mondayOf(startDate), 41) : null;
      const effectiveEnd = isSJ ? sjEndDate : endDate;
      const weeks = (isSJ
        ? Array.from({ length: 6 }, (_, i) => {
            const ws = addDays(mondayOf(startDate), i * 7);
            return { weekStart: ws, weekEnd: addDays(ws, 6) };
          })
        : mesoWeeks(startDate, effectiveEnd)
      ).map((w, i) => {
        if (isSJ) return { ...w, name: `Microciclo ${i + 1}`, type: "carga", volume: 100, intensity: 70, sjDays: 4, sjBaseMinutes: 100 };
        if (isMenstrual) {
          const phase = MENSTRUAL_PHASES[i] || MENSTRUAL_PHASES[MENSTRUAL_PHASES.length - 1];
          return { ...w, name: phase.label, type: phase.type, volume: 70, intensity: 70, contenidos: phase.contenidos };
        }
        return { ...w, name: "", type: "carga", volume: 70, intensity: 70 };
      });
      const id = await saveMesocycle({ teamId, name, startDate, endDate: effectiveEnd, weeks, color, isMenstrual: isSJ ? false : isMenstrual, menstrualPlayers: isSJ ? [] : menstrualPlayers, isSituacionesJugadas: isSJ });
      onSave({ id, teamId, name, startDate, endDate: effectiveEnd, weeks, color, isMenstrual: isSJ ? false : isMenstrual, menstrualPlayers: isSJ ? [] : menstrualPlayers, isSituacionesJugadas: isSJ });
    } catch (err) {
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      alert("Error al guardar: " + msg);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 60 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 16, color: COLORS.text }}>Nuevo mesociclo</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Nombre del mesociclo</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pretemporada..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Color</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MESO_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? `3px solid #fff` : "3px solid transparent", cursor: "pointer", outline: "none", boxSizing: "border-box" }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>
            Selecciona el rango de fechas
            {startDate && !endDate && <span style={{ color: COLORS.lime, marginLeft: 8 }}>Elige fecha fin</span>}
            {startDate && endDate && <span style={{ color: COLORS.lime, marginLeft: 8 }}>{fmtDateShort(startDate)} → {fmtDateShort(endDate)}</span>}
          </div>
          <RangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStart(s); setEnd(e); }} />
        </div>

        {showSJ && (
          <div style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>⚽ Situaciones Jugadas</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>6 microciclos con tabla de volumen por situación</div>
              </div>
              <button onClick={() => { setIsSJ((v) => !v); if (!isSJ) setIsMenstrual(false); }} style={{
                width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
                background: isSJ ? "#38bdf8" : COLORS.line, transition: "background 0.2s",
              }}>
                <span style={{ position: "absolute", top: 3, left: isSJ ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>
            {isSJ && (
              <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#0c1e2a", border: "1px solid #38bdf844" }}>
                <div style={{ fontSize: 11, color: "#38bdf8" }}>Se crearán automáticamente 6 microciclos desde la fecha de inicio seleccionada.</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 4 }}>La fecha de fin se calcula automáticamente (42 días desde el inicio).</div>
              </div>
            )}
          </div>
        )}

        {showMenstrual && (
          <div style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>🔴 Ciclo menstrual</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>Semanas prefijadas según fase del ciclo</div>
              </div>
              <button onClick={() => { setIsMenstrual((v) => !v); if (!isMenstrual) setIsSJ(false); }} style={{
                width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
                background: isMenstrual ? "#e879f9" : COLORS.line, transition: "background 0.2s",
              }}>
                <span style={{ position: "absolute", top: 3, left: isMenstrual ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>
            {isMenstrual && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Fases automáticas:</div>
                {MENSTRUAL_PHASES.map((p, i) => {
                  const wt = WEEK_TYPES.find((t) => t.id === p.type);
                  return (
                    <div key={i} style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12 }}>{p.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>M{i + 1} · {p.label}</span>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${wt.color}22`, color: wt.color, fontWeight: 700, marginLeft: "auto" }}>{wt.label}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#e879f9", fontWeight: 600, marginBottom: 2 }}>{p.fase}</div>
                      <div style={{ fontSize: 10, color: COLORS.text, lineHeight: 1.4 }}>{p.metabolismo}</div>
                    </div>
                  );
                })}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, padding: "6px 8px", borderRadius: 8, background: "#2a2a0a", border: "1px solid #fde68a44" }}>
                  <span style={{ fontSize: 12 }}>⚡</span>
                  <span style={{ fontSize: 11, color: "#fde68a" }}>Días 20–22 del ciclo (13–15 post sangrado) · Pico de relaxina</span>
                  <span style={{ fontSize: 10, color: COLORS.text }}>Cuidado con estiramientos y movilidad</span>
                </div>
                {(() => {
                  const femRoster = roster.filter((p) => (typeof p === "object" ? p.sexo : null) === "femenino");
                  return femRoster.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6, fontWeight: 600 }}>Atletas que ven este ciclo:</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                        {femRoster.map((p) => {
                          const username = typeof p === "string" ? p : p.username;
                          const dn = displayNames[username];
                          const label = (typeof dn === "object" ? dn?.displayName : dn) || (typeof p === "object" && (p.displayName || p.name)) || username;
                          const checked = menstrualPlayers.includes(username);
                          return (
                            <button key={username} onClick={() => togglePlayer(username)} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8,
                              border: `1px solid ${checked ? "#e879f9" : COLORS.line}`,
                              background: checked ? "#2a0a2e" : "transparent", cursor: "pointer", textAlign: "left",
                            }}>
                              <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? "#e879f9" : COLORS.line}`, background: checked ? "#e879f9" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#14171c", fontWeight: 700 }}>{checked ? "✓" : ""}</span>
                              <span style={{ fontSize: 12, color: COLORS.text }}>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          {(() => { const canSave = startDate && (isSJ || endDate); return (
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
            background: canSave ? COLORS.lime : COLORS.panelRaised,
            color: canSave ? "#14171c" : COLORS.text,
            fontWeight: 700, fontSize: 14, cursor: canSave ? "pointer" : "default", opacity: saving ? 0.6 : 1,
          }}>{saving ? "Guardando..." : "Crear"}</button>
          ); })()}
        </div>
      </div>
    </div>
  );
}

/* ── Editor de mesociclo (nombre + fechas) ───────────────────────────── */
function EditMesoModal({ meso, onSave, onClose, roster = [], displayNames = {}, showMenstrual = false, showSJ = false }) {
  const [name, setName]             = useState(meso.name || "");
  const [startDate, setStart]       = useState(meso.startDate);
  const [endDate, setEnd]           = useState(meso.endDate);
  const [color, setColor]           = useState(meso.color || MESO_COLORS[0]);
  const [contenidos, setContenidos] = useState(meso.contenidos || "");
  const [isMenstrual, setIsMenstrual] = useState(meso.isMenstrual || false);
  const [isSJ, setIsSJ]             = useState(meso.isSituacionesJugadas || false);
  const [menstrualPlayers, setMenstrualPlayers] = useState(meso.menstrualPlayers || []);
  const [saving, setSaving]         = useState(false);

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  const togglePlayer = (username) => setMenstrualPlayers((prev) =>
    prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
  );

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      const newWeeks = mesoWeeks(startDate, endDate).map((w, i) => {
        const existing = meso.weeks.find((ew) => ew.weekStart === w.weekStart);
        if (isSJ) {
          const base = existing ? { ...w, ...existing } : { ...w, volume: 100, intensity: 70 };
          return { ...base, name: `Microciclo ${i + 1}`, sjDays: base.sjDays ?? 4, sjBaseMinutes: base.sjBaseMinutes ?? 100, isSituacionesJugadas: true };
        }
        if (isMenstrual) {
          const phase = MENSTRUAL_PHASES[i] || MENSTRUAL_PHASES[MENSTRUAL_PHASES.length - 1];
          const base = existing ? { ...w, ...existing } : { ...w, volume: 70, intensity: 70 };
          return { ...base, name: phase.label, type: phase.type, contenidos: phase.contenidos };
        }
        return existing ? { ...w, ...existing } : { ...w, name: "", type: "carga", volume: 70, intensity: 70 };
      });
      const updated = { ...meso, name, startDate, endDate, weeks: newWeeks, color, contenidos, isMenstrual: isSJ ? false : isMenstrual, menstrualPlayers: isSJ ? [] : menstrualPlayers, isSituacionesJugadas: isSJ };
      await saveMesocycle(updated);
      onSave(updated);
    } catch (err) {
      alert("Error: " + (err?.message || JSON.stringify(err)));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 60 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 16, color: COLORS.text }}>Editar mesociclo</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Nombre</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pretemporada..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>Color</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MESO_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? `3px solid #fff` : "3px solid transparent", cursor: "pointer", outline: "none", boxSizing: "border-box" }} />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8 }}>
            Rango de fechas
            {startDate && endDate && <span style={{ color: COLORS.lime, marginLeft: 8 }}>{fmtDateShort(startDate)} → {fmtDateShort(endDate)}</span>}
            {startDate && !endDate && <span style={{ color: COLORS.lime, marginLeft: 8 }}>Elige fecha fin</span>}
          </div>
          <RangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStart(s); setEnd(e); }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Contenidos</div>
          <textarea value={contenidos} onChange={(e) => setContenidos(e.target.value)} rows={3} placeholder="Describe los contenidos generales del mesociclo..." style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
        </div>

        {showSJ && (
          <div style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>⚽ Situaciones Jugadas</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>6 microciclos con tabla de volumen por situación</div>
              </div>
              <button onClick={() => { setIsSJ((v) => !v); if (!isSJ) setIsMenstrual(false); }} style={{
                width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
                background: isSJ ? "#38bdf8" : COLORS.line, transition: "background 0.2s",
              }}>
                <span style={{ position: "absolute", top: 3, left: isSJ ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>
            {isSJ && (
              <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#0c1e2a", border: "1px solid #38bdf844" }}>
                <div style={{ fontSize: 11, color: "#38bdf8" }}>Al guardar, los microciclos se actualizarán con la configuración de Situaciones Jugadas.</div>
              </div>
            )}
          </div>
        )}

        {/* Ciclo menstrual toggle */}
        {showMenstrual && (
        <div style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>🔴 Ciclo menstrual</div>
              <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>Semanas prefijadas según fase del ciclo</div>
            </div>
            <button onClick={() => { setIsMenstrual((v) => !v); if (!isMenstrual) setIsSJ(false); }} style={{
              width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
              background: isMenstrual ? "#e879f9" : COLORS.line, transition: "background 0.2s",
            }}>
              <span style={{ position: "absolute", top: 3, left: isMenstrual ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
          </div>

          {isMenstrual && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Fases automáticas:</div>
              {MENSTRUAL_PHASES.map((p, i) => {
                const wt = WEEK_TYPES.find((t) => t.id === p.type);
                return (
                  <div key={i} style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12 }}>{p.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>M{i + 1} · {p.label}</span>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${wt.color}22`, color: wt.color, fontWeight: 700, marginLeft: "auto" }}>{wt.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#e879f9", fontWeight: 600, marginBottom: 2 }}>{p.fase}</div>
                    <div style={{ fontSize: 10, color: COLORS.text, lineHeight: 1.4 }}>{p.metabolismo}</div>
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, padding: "6px 8px", borderRadius: 8, background: "#2a2a0a", border: "1px solid #fde68a44" }}>
                <span style={{ fontSize: 12 }}>⚡</span>
                <span style={{ fontSize: 11, color: "#fde68a" }}>Días 20–22 del ciclo (13–15 post sangrado) · Pico de relaxina</span>
                <span style={{ fontSize: 10, color: COLORS.text }}>Cuidado con estiramientos y movilidad</span>
              </div>

              {(() => {
                const femRoster = roster.filter((p) => (typeof p === "object" ? p.sexo : null) === "femenino");
                return femRoster.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6, fontWeight: 600 }}>Atletas que ven este ciclo:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                      {femRoster.map((p) => {
                        const username = typeof p === "string" ? p : p.username;
                        const dn = displayNames[username];
                        const label = (typeof dn === "object" ? dn?.displayName : dn) || (typeof p === "object" && (p.displayName || p.name)) || username;
                        const checked = menstrualPlayers.includes(username);
                        return (
                          <button key={username} onClick={() => togglePlayer(username)} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8,
                            border: `1px solid ${checked ? "#e879f9" : COLORS.line}`,
                            background: checked ? "#2a0a2e" : "transparent", cursor: "pointer", textAlign: "left",
                          }}>
                            <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? "#e879f9" : COLORS.line}`, background: checked ? "#e879f9" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#14171c", fontWeight: 700 }}>{checked ? "✓" : ""}</span>
                            <span style={{ fontSize: 12, color: COLORS.text }}>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={!startDate || !endDate || saving} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
            background: startDate && endDate ? COLORS.lime : COLORS.panelRaised,
            color: startDate && endDate ? "#14171c" : COLORS.text,
            fontWeight: 700, fontSize: 14, cursor: startDate && endDate ? "pointer" : "default", opacity: saving ? 0.6 : 1,
          }}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Vista de un mesociclo ───────────────────────────────────────────── */
function MesoDetail({ meso, onUpdate, onDelete, onBack, readOnly = false, roster = [], displayNames = {}, showSJ = false, showMenstrual = false }) {
  const [editingWeek, setEditingWeek] = useState(null);
  const [editingMeso, setEditingMeso] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sjEdits, setSjEdits] = useState({});
  const today = todayStr();
  const isActive = today >= meso.startDate && today <= meso.endDate;

  const handleWeekSave = async (weekStart, data) => {
    const weeks = meso.weeks.map((w) => w.weekStart === weekStart ? { ...w, ...data } : w);
    setSaving(true);
    try {
      await saveMesocycle({ ...meso, weeks });
      onUpdate({ ...meso, weeks });
    } finally { setSaving(false); setEditingWeek(null); }
  };

  const handleSJWeekSave = async (weekStart) => {
    const edit = sjEdits[weekStart];
    if (!edit) return;
    const weeks = meso.weeks.map((w) => w.weekStart === weekStart ? { ...w, sjDays: Number(edit.days) || w.sjDays, sjBaseMinutes: Number(edit.baseMin) || w.sjBaseMinutes } : w);
    setSaving(true);
    try {
      await saveMesocycle({ ...meso, weeks });
      onUpdate({ ...meso, weeks });
      setSjEdits((prev) => { const n = { ...prev }; delete n[weekStart]; return n; });
    } finally { setSaving(false); }
  };

  const weekColor = (type) => WEEK_TYPES.find((t) => t.id === type)?.color || COLORS.text;
  const weekDark  = (type) => WEEK_TYPES.find((t) => t.id === type)?.dark  || COLORS.panelRaised;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.text }}>{meso.name || "Mesociclo"}</div>
          <div style={{ fontSize: 11, color: COLORS.text }}>{fmtDateShort(meso.startDate)} – {fmtDateShort(meso.endDate)} · {meso.weeks.length} microciclos</div>
        </div>
        {isActive && <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.lime, background: "#1e3010", borderRadius: 6, padding: "3px 8px" }}>ACTIVO</span>}
        {!readOnly && <button onClick={() => setEditingMeso(true)} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11 }}>Editar</button>}
        {!readOnly && <button onClick={() => { if (confirm("¿Eliminar este mesociclo?")) onDelete(meso.id); }} style={{ background: "transparent", border: `1px solid ${COLORS.coral}`, color: COLORS.coral, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11 }}>Eliminar</button>}
      </div>

      {meso.isSituacionesJugadas && (
        <div style={{ background: "#0c1e2a", border: `1px solid #38bdf844`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚽</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>Mesociclo Situaciones Jugadas</div>
            <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>6 microciclos · Distribución de volumen por tipo de situación</div>
          </div>
        </div>
      )}
      {meso.isMenstrual && (
        <div style={{ background: "#1a0a1e", border: `1px solid #e879f944`, borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔴</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e879f9" }}>Ciclo Menstrual</div>
            {meso.menstrualPlayers?.length > 0 && <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>{meso.menstrualPlayers.length} atleta{meso.menstrualPlayers.length > 1 ? "s" : ""} asignada{meso.menstrualPlayers.length > 1 ? "s" : ""}</div>}
          </div>
        </div>
      )}
      {meso.contenidos && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>Contenidos del mesociclo</div>
          <div style={{ fontSize: 13, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{meso.contenidos}</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {meso.weeks.map((w, i) => {
          const col  = weekColor(w.type);
          const dark = weekDark(w.type);
          const isCurrent = today >= w.weekStart && today <= w.weekEnd;
          const phase = meso.isMenstrual ? MENSTRUAL_PHASES[i] || MENSTRUAL_PHASES[MENSTRUAL_PHASES.length - 1] : null;

          if (meso.isSituacionesJugadas) {
            const pct = SJ_PERCENTAGES[i] || SJ_PERCENTAGES[SJ_PERCENTAGES.length - 1];
            const edit = sjEdits[w.weekStart];
            const curDays = edit ? edit.days : String(w.sjDays ?? 4);
            const curBaseMin = edit ? edit.baseMin : String(w.sjBaseMinutes ?? 100);
            const totalMin = Math.round((Number(curBaseMin) || 0) * (w.volume ?? 100) / 100);
            return (
              <div key={w.weekStart} style={{ background: "#0c1520", border: `1px solid ${isCurrent ? "#38bdf8" : COLORS.line}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>Microciclo {i + 1} · {fmtDateShort(w.weekStart)} – {fmtDateShort(w.weekEnd)}</div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: "#38bdf8" }}>{w.name || `Microciclo ${i + 1}`}</div>
                  </div>
                  {!readOnly && <button onClick={() => setEditingWeek(w)} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>Editar</button>}
                </div>

                {/* Semana tipo inputs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Días semana tipo</div>
                    <input type="number" inputMode="numeric" min={1} max={7} value={curDays}
                      onChange={(e) => setSjEdits((prev) => ({ ...prev, [w.weekStart]: { days: e.target.value, baseMin: curBaseMin } }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Min. semana tipo</div>
                    <input type="number" inputMode="numeric" min={0} value={curBaseMin}
                      onChange={(e) => setSjEdits((prev) => ({ ...prev, [w.weekStart]: { days: curDays, baseMin: e.target.value } }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Volumen semana</div>
                    <div style={{ padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.lime }}>{w.volume ?? 100}%</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Min. totales</div>
                    <div style={{ padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, fontSize: 13, color: "#38bdf8", fontWeight: 700 }}>{totalMin} min</div>
                  </div>
                  {!readOnly && edit && (
                    <button onClick={() => handleSJWeekSave(w.weekStart)} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                      {saving ? "..." : "✓"}
                    </button>
                  )}
                </div>

                {/* SJ Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                    <thead>
                      <tr>
                        <th colSpan={3} style={{ fontSize: 9, fontWeight: 700, color: "#38bdf8", textAlign: "center", padding: "4px 2px", borderBottom: "2px solid #38bdf844" }}>SGJ (8x8–10x10)</th>
                        <th colSpan={3} style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", textAlign: "center", padding: "4px 2px", borderBottom: "2px solid #a78bfa44" }}>SMJ (5x5–7x7)</th>
                        <th colSpan={3} style={{ fontSize: 9, fontWeight: 700, color: "#fb923c", textAlign: "center", padding: "4px 2px", borderBottom: "2px solid #fb923c44" }}>SRJ (3x3–4x4)</th>
                      </tr>
                      <tr>
                        {SJ_COLS.map((c) => (
                          <th key={c.key} style={{ fontSize: 9, color: COLORS.text, textAlign: "center", padding: "3px 2px", fontWeight: 600 }}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {SJ_COLS.map((c) => (
                          <td key={c.key} style={{ fontSize: 11, color: c.color, textAlign: "center", padding: "4px 2px", fontWeight: 700, background: `${c.color}11`, borderBottom: `1px solid ${COLORS.line}` }}>
                            {pct[c.key]}%
                            {c.key === "srj_ep" && pct.micro > 0 && <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 400 }}>({pct.micro}% 1x1)</div>}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        {SJ_COLS.map((c) => (
                          <td key={c.key} style={{ fontSize: 10, color: COLORS.text, textAlign: "center", padding: "4px 2px" }}>
                            {Math.round(totalMin * pct[c.key] / 100)} min
                            {c.key === "srj_ep" && pct.micro > 0 && <div style={{ fontSize: 8, color: "#94a3b8" }}>({Math.round(totalMin * pct.micro / 100)} 1x1)</div>}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          return (
            <div key={w.weekStart} style={{ background: dark, border: `1px solid ${isCurrent ? col : COLORS.line}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>Microciclo {i + 1} · {fmtDateShort(w.weekStart)} – {fmtDateShort(w.weekEnd)}</div>
                  {phase && <div style={{ fontSize: 11, color: "#e879f9", fontWeight: 600, marginBottom: 3 }}>{phase.emoji} {phase.label}</div>}
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, color: col }}>{w.name || <span style={{ color: COLORS.text, fontWeight: 400, fontFamily: "inherit" }}>Sin nombre</span>}</div>
                  {w.type && <span style={{ fontSize: 10, fontWeight: 700, color: col, background: `${col}22`, borderRadius: 4, padding: "2px 6px", marginTop: 4, display: "inline-block" }}>{WEEK_TYPES.find((t) => t.id === w.type)?.label}</span>}
                </div>
                {!readOnly && <button onClick={() => setEditingWeek(w)} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>Editar</button>}
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Volumen</div>
                  <div style={{ height: 6, background: COLORS.panelRaised, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${w.volume ?? 0}%`, background: COLORS.lime, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.lime, marginTop: 2 }}>{w.volume ?? 0}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Intensidad</div>
                  <div style={{ height: 6, background: COLORS.panelRaised, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${w.intensity ?? 0}%`, background: "#ff9f40", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#ff9f40", marginTop: 2 }}>{w.intensity ?? 0}%</div>
                </div>
              </div>
              {w.contenidos && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.line}` }}>
                  <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>Contenidos</div>
                  <div style={{ fontSize: 12, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{w.contenidos}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingWeek && (
        <WeekEditor
          week={editingWeek}
          isSJ={meso.isSituacionesJugadas}
          onSave={(data) => handleWeekSave(editingWeek.weekStart, data)}
          onClose={() => setEditingWeek(null)}
        />
      )}
      {editingMeso && (
        <EditMesoModal
          meso={meso}
          roster={roster}
          displayNames={displayNames}
          showSJ={showSJ}
          showMenstrual={showMenstrual}
          onSave={(updated) => { onUpdate(updated); setEditingMeso(false); }}
          onClose={() => setEditingMeso(false)}
        />
      )}
    </div>
  );
}

/* ── Panel principal ─────────────────────────────────────────────────── */
export default function MesocyclePanel({ team, onMesocyclesChange, readOnly = false, roster = [], displayNames = {}, teamGender = "masculino" }) {
  const [mesocycles, setMesocycles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = todayStr();

  useEffect(() => {
    loadMesocycles(team.teamId).then((data) => { setMesocycles(data); setLoading(false); });
  }, [team.teamId]);

  const handleCreate = (meso) => {
    const next = [meso, ...mesocycles];
    setMesocycles(next);
    onMesocyclesChange?.(next);
    setShowCreate(false);
    setSelected(meso);
  };

  const handleUpdate = (updated) => {
    const next = mesocycles.map((m) => m.id === updated.id ? updated : m);
    setMesocycles(next);
    onMesocyclesChange?.(next);
    setSelected(updated);
  };

  const handleDelete = async (id) => {
    await deleteMesocycle(id);
    const next = mesocycles.filter((m) => m.id !== id);
    setMesocycles(next);
    onMesocyclesChange?.(next);
    setSelected(null);
  };

  if (loading) return <div style={{ color: COLORS.text, fontSize: 13, padding: "1rem 0" }}>Cargando mesociclos...</div>;

  const showSJ = (team.kind || "equipo") === "equipo";
  const showMenstrual = teamGender === "femenino" || teamGender === "mixto";

  if (selected) {
    return (
      <MesoDetail
        meso={selected}
        roster={roster}
        displayNames={displayNames}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onBack={() => setSelected(null)}
        readOnly={readOnly}
        showSJ={showSJ}
        showMenstrual={showMenstrual}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: COLORS.text }}>Mesociclos</div>
        {!readOnly && <button onClick={() => setShowCreate(true)} style={{ background: COLORS.lime, border: "none", color: "#14171c", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Nuevo</button>}
      </div>

      {mesocycles.length === 0 ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 8 }}>No hay mesociclos creados</div>
          {!readOnly && <button onClick={() => setShowCreate(true)} style={{ background: COLORS.lime, border: "none", color: "#14171c", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Crear el primero</button>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {mesocycles.map((m) => {
            const isActive = today >= m.startDate && today <= m.endDate;
            return (
              <button key={m.id} onClick={() => setSelected(m)} style={{
                background: COLORS.panel,
                border: `1px solid ${COLORS.line}`,
                borderTop: `3px solid ${m.color || (isActive ? COLORS.lime : COLORS.line)}`,
                borderRadius: 12, padding: 0, textAlign: "left", cursor: "pointer", width: "100%", overflow: "hidden",
              }}>
                <div style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      {m.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, display: "inline-block", flexShrink: 0 }} />}
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || "Sin nombre"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {isActive && <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.lime, background: "#1e3010", borderRadius: 5, padding: "2px 5px" }}>ACTIVO</span>}
                      {m.isSituacionesJugadas && <span style={{ fontSize: 9, fontWeight: 700, color: "#38bdf8", background: "#0c1e2a", borderRadius: 5, padding: "2px 5px" }}>⚽ SJ</span>}
                      {m.isMenstrual && <span style={{ fontSize: 9, fontWeight: 700, color: "#e879f9", background: "#1a0a1e", borderRadius: 5, padding: "2px 5px" }}>🔴</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.text, marginTop: 3 }}>{fmtDateShort(m.startDate)} – {fmtDateShort(m.endDate)}</div>
                  <div style={{ fontSize: 10, color: COLORS.text, opacity: 0.7 }}>{m.weeks.length} microciclos</div>
                  {m.contenidos && (
                    <div style={{ fontSize: 10, color: COLORS.text, marginTop: 5, lineHeight: 1.4, opacity: 0.8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {m.contenidos}
                    </div>
                  )}
                  {m.weeks.length > 0 && (
                    <div style={{ display: "flex", gap: 3, marginTop: 7, flexWrap: "wrap" }}>
                      {m.weeks.map((w, i) => {
                        const col = WEEK_TYPES.find((t) => t.id === w.type)?.color || COLORS.line;
                        return <div key={i} style={{ width: 16, height: 6, borderRadius: 2, background: col, opacity: 0.85 }} />;
                      })}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateMesoModal teamId={team.teamId} onSave={handleCreate} onClose={() => setShowCreate(false)} roster={roster} displayNames={displayNames} showMenstrual={showMenstrual} showSJ={showSJ} />
      )}
    </div>
  );
}
