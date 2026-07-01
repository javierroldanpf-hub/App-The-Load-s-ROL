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
function WeekEditor({ week, onSave, onClose }) {
  const [name, setName]           = useState(week.name || "");
  const [type, setType]           = useState(week.type || "carga");
  const [volume, setVolume]       = useState(week.volume ?? 70);
  const [intensity, setIntensity] = useState(week.intensity ?? 70);
  const [contenidos, setContenidos] = useState(week.contenidos || "");

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

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: COLORS.text }}>Volumen</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.lime }}>{volume}%</span>
          </div>
          <input type="range" min={0} max={130} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: "100%", accentColor: COLORS.lime }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: COLORS.text }}>Intensidad</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ff9f40" }}>{intensity}%</span>
          </div>
          <input type="range" min={0} max={100} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor: "#ff9f40" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Contenidos</div>
          <textarea value={contenidos} onChange={(e) => setContenidos(e.target.value)} rows={4} placeholder="Describe los contenidos del microciclo..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave({ name, type, volume, intensity, contenidos })} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Creador de mesociclo ────────────────────────────────────────────── */
function CreateMesoModal({ teamId, onSave, onClose }) {
  const [name, setName]         = useState("");
  const [startDate, setStart]   = useState(null);
  const [endDate, setEnd]       = useState(null);
  const [color, setColor]       = useState(MESO_COLORS[0]);
  const [saving, setSaving]     = useState(false);

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      const weeks = mesoWeeks(startDate, endDate).map((w) => ({ ...w, name: "", type: "carga", volume: 70, intensity: 70 }));
      const id = await saveMesocycle({ teamId, name, startDate, endDate, weeks, color });
      onSave({ id, teamId, name, startDate, endDate, weeks, color });
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

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={!startDate || !endDate || saving} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
            background: startDate && endDate ? COLORS.lime : COLORS.panelRaised,
            color: startDate && endDate ? "#14171c" : COLORS.text,
            fontWeight: 700, fontSize: 14, cursor: startDate && endDate ? "pointer" : "default", opacity: saving ? 0.6 : 1,
          }}>{saving ? "Guardando..." : "Crear"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Editor de mesociclo (nombre + fechas) ───────────────────────────── */
function EditMesoModal({ meso, onSave, onClose, roster = [], displayNames = {} }) {
  const [name, setName]             = useState(meso.name || "");
  const [startDate, setStart]       = useState(meso.startDate);
  const [endDate, setEnd]           = useState(meso.endDate);
  const [color, setColor]           = useState(meso.color || MESO_COLORS[0]);
  const [contenidos, setContenidos] = useState(meso.contenidos || "");
  const [isMenstrual, setIsMenstrual] = useState(meso.isMenstrual || false);
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
        if (isMenstrual) {
          const phase = MENSTRUAL_PHASES[i] || MENSTRUAL_PHASES[MENSTRUAL_PHASES.length - 1];
          const base = existing ? { ...w, ...existing } : { ...w, volume: 70, intensity: 70 };
          return { ...base, name: phase.label, type: phase.type, contenidos: phase.contenidos };
        }
        return existing ? { ...w, ...existing } : { ...w, name: "", type: "carga", volume: 70, intensity: 70 };
      });
      const updated = { ...meso, name, startDate, endDate, weeks: newWeeks, color, contenidos, isMenstrual, menstrualPlayers };
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

        {/* Ciclo menstrual toggle */}
        <div style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>🔴 Ciclo menstrual</div>
              <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>Semanas prefijadas según fase del ciclo</div>
            </div>
            <button onClick={() => setIsMenstrual((v) => !v)} style={{
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

              {roster.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6, fontWeight: 600 }}>Atletas que ven este ciclo:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                    {roster.map((p) => {
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
              )}
            </div>
          )}
        </div>

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
function MesoDetail({ meso, onUpdate, onDelete, onBack, readOnly = false, roster = [], displayNames = {} }) {
  const [editingWeek, setEditingWeek] = useState(null);
  const [editingMeso, setEditingMeso] = useState(false);
  const [saving, setSaving] = useState(false);
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
          onSave={(data) => handleWeekSave(editingWeek.weekStart, data)}
          onClose={() => setEditingWeek(null)}
        />
      )}
      {editingMeso && (
        <EditMesoModal
          meso={meso}
          roster={roster}
          displayNames={displayNames}
          onSave={(updated) => { onUpdate(updated); setEditingMeso(false); }}
          onClose={() => setEditingMeso(false)}
        />
      )}
    </div>
  );
}

/* ── Panel principal ─────────────────────────────────────────────────── */
export default function MesocyclePanel({ team, onMesocyclesChange, readOnly = false, roster = [], displayNames = {} }) {
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
                    {isActive && <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.lime, background: "#1e3010", borderRadius: 5, padding: "2px 5px", flexShrink: 0 }}>ACTIVO</span>}
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
        <CreateMesoModal teamId={team.teamId} onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
