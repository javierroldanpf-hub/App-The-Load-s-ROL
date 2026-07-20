"use client";
import { useState, useEffect, useMemo } from "react";
import { COLORS } from "@/lib/constants";
import { todayStr, mondayOf, addDays, fmtDateShort, fmtDateLong, monthLabel, firstOfMonth, addMonths, monthGridDates } from "@/lib/utils";
import { loadMesocycles, saveMesocycle, deleteMesocycle } from "@/lib/db";
import SpacesCalculatorModal from "./SpacesCalculatorModal";

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
  { sgj_eg: 10, sgj_em: 15, sgj_ep: 10, smj_eg: 0,  smj_em: 5,  smj_ep: 10, srj_eg: 5,  srj_em: 15, srj_ep: 30, micro: 10 },
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

const SJ_DAYS = [
  { key: "mon", label: "L" },
  { key: "tue", label: "M" },
  { key: "wed", label: "X" },
  { key: "thu", label: "J" },
  { key: "fri", label: "V" },
  { key: "sat", label: "S" },
  { key: "sun", label: "D" },
];

const SJ_ROWS = [
  { key: "sgj_eg", groupLabel: "8x8-10x10", subLabel: "EG",           color: "#38bdf8", isGroupStart: true },
  { key: "sgj_em", groupLabel: "",           subLabel: "EM",           color: "#38bdf8" },
  { key: "sgj_ep", groupLabel: "",           subLabel: "EP",           color: "#38bdf8" },
  { key: "smj_eg", groupLabel: "5x5-7x7",   subLabel: "EG",           color: "#a78bfa", isGroupStart: true },
  { key: "smj_em", groupLabel: "",           subLabel: "EM",           color: "#a78bfa" },
  { key: "smj_ep", groupLabel: "",           subLabel: "EP",           color: "#a78bfa" },
  { key: "srj_eg", groupLabel: "3x3-4x4",   subLabel: "EG",           color: "#fb923c", isGroupStart: true },
  { key: "srj_em", groupLabel: "",           subLabel: "EM",           color: "#fb923c" },
  { key: "srj_ep", groupLabel: "",           subLabel: "EP",           color: "#fb923c" },
  { key: "micro",  groupLabel: "1x1 / 2x2", subLabel: "Ac. Analít.",  color: "#ff5a5f", isGroupStart: true },
  { key: "topup",  groupLabel: "TOP UP",     subLabel: "Compensatorio",color: "#94a3b8", isGroupStart: true },
];

/* ── Planificador semanal SJ ─────────────────────────────────────────── */
function SJWeekPlanner({ week, pct, totalMin, onSave, readOnly = false, matchLabel = "MD" }) {
  const initPlan = () => week.sjWeekPlan || { days: {}, cells: {} };
  const [plan, setPlan] = useState(initPlan);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setPlan(initPlan()); setDirty(false); }, [week.weekStart, week.sjWeekPlan]);

  const getDayType = (dk) => plan.days?.[dk] || "entreno";
  const cycleDayType = (dk) => {
    if (readOnly) return;
    const order = ["entreno", "descanso", "partido"];
    const next = order[(order.indexOf(getDayType(dk)) + 1) % order.length];
    setPlan((p) => ({ ...p, days: { ...p.days, [dk]: next } }));
    setDirty(true);
  };
  const getCell = (dk, rk) => plan.cells?.[dk]?.[rk] ?? "";
  const setCell = (dk, rk, val) => {
    setPlan((p) => ({ ...p, cells: { ...p.cells, [dk]: { ...(p.cells?.[dk] || {}), [rk]: val === "" ? "" : Number(val) || 0 } } }));
    setDirty(true);
  };

  const allocated = (key) => {
    if (key === "topup") return null;
    const base = Math.round(totalMin * (pct[key] ?? 0) / 100);
    if (key === "srj_ep") return base - sumDays("micro");
    return base;
  };
  const sumDays   = (key) => SJ_DAYS.reduce((acc, d) => getDayType(d.key) === "entreno" ? acc + (Number(plan.cells?.[d.key]?.[key]) || 0) : acc, 0);
  const remaining = (key) => {
    const a = allocated(key);
    if (a === null) return null;
    // Los minutos de 1x1/2x2 también se descuentan del contador de SRJ EP
    if (key === "srj_ep") return a - sumDays("srj_ep") - sumDays("micro");
    return a - sumDays(key);
  };

  // Totals for summary row
  const totalSJ    = SJ_ROWS.filter((r) => r.key !== "topup").reduce((acc, r) => acc + sumDays(r.key), 0);
  const totalTopup = sumDays("topup");

  const dayBg    = { entreno: "transparent", descanso: "#0c204088", partido: "#2a101088" };
  const dayColor = { entreno: COLORS.text, descanso: "#60a5fa", partido: "#ff5a5f" };
  const dayShort = { entreno: "", descanso: "REST", partido: matchLabel };

  const cellInputStyle = {
    width: 36, padding: "3px 1px", borderRadius: 4, border: `1px solid ${COLORS.line}`,
    background: "#1c2128", color: COLORS.text, fontSize: 10, textAlign: "center",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {[
          { label: "Tiempo SJ", val: totalSJ, color: "#38bdf8" },
          { label: "TOP UP", val: totalTopup, color: "#94a3b8" },
          { label: "Tiempo total", val: totalSJ + totalTopup, color: COLORS.lime },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ flex: 1, minWidth: 80, background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: COLORS.text, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 14, color, fontWeight: 700 }}>{val} <span style={{ fontSize: 9 }}>min</span></div>
          </div>
        ))}
      </div>

      {/* Main table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 460, width: "100%", fontSize: 10 }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ padding: "4px 6px", textAlign: "left", color: COLORS.text, borderBottom: `1px solid ${COLORS.line}`, fontSize: 9 }}>Situación</th>
              {SJ_DAYS.map((d) => {
                const type = getDayType(d.key);
                return (
                  <th key={d.key} style={{ padding: "2px", textAlign: "center", borderBottom: `1px solid ${COLORS.line}`, minWidth: 40 }}>
                    <button onClick={() => cycleDayType(d.key)} style={{
                      width: "100%", padding: "4px 2px", borderRadius: 6,
                      border: `1px solid ${type !== "entreno" ? dayColor[type] : COLORS.line}`,
                      background: dayBg[type], color: dayColor[type],
                      fontSize: 9, fontWeight: 700, cursor: readOnly ? "default" : "pointer",
                      lineHeight: 1.3,
                    }}>
                      {d.label}{dayShort[type] ? `\n${dayShort[type]}` : ""}
                    </button>
                  </th>
                );
              })}
              <th style={{ padding: "4px 4px", textAlign: "center", color: COLORS.text, borderBottom: `1px solid ${COLORS.line}`, fontSize: 9, whiteSpace: "nowrap" }}>Asig.</th>
              <th style={{ padding: "4px 4px", textAlign: "center", color: COLORS.text, borderBottom: `1px solid ${COLORS.line}`, fontSize: 9, whiteSpace: "nowrap" }}>Rest.</th>
            </tr>
          </thead>
          <tbody>
            {SJ_ROWS.map((row) => {
              const rem   = remaining(row.key);
              const alloc = allocated(row.key);
              const remColor = rem === null ? COLORS.text : rem < 0 ? "#ff5a5f" : rem === 0 ? COLORS.lime : COLORS.text;
              return (
                <tr key={row.key} style={{ borderBottom: `1px solid ${COLORS.line}22`, background: row.isGroupStart ? `${row.color}08` : "transparent" }}>
                  <td style={{ fontSize: 9, color: row.color, fontWeight: row.isGroupStart ? 700 : 400, padding: "2px 6px", whiteSpace: "nowrap", borderRight: `1px solid ${COLORS.line}22`, borderTop: row.isGroupStart ? `1px solid ${COLORS.line}44` : "none" }}>
                    {row.groupLabel}
                  </td>
                  <td style={{ fontSize: 9, color: row.color, padding: "2px 6px", whiteSpace: "nowrap", borderRight: `1px solid ${COLORS.line}`, borderTop: row.isGroupStart ? `1px solid ${COLORS.line}44` : "none" }}>
                    {row.subLabel}
                  </td>
                  {SJ_DAYS.map((d) => {
                    const type = getDayType(d.key);
                    const isBlocked = type !== "entreno";
                    const val = getCell(d.key, row.key);
                    return (
                      <td key={d.key} style={{ padding: "2px", textAlign: "center", background: isBlocked ? dayBg[type] : "transparent", borderTop: row.isGroupStart ? `1px solid ${COLORS.line}44` : "none" }}>
                        {isBlocked ? (
                          <div style={{ fontSize: 9, color: dayColor[type], padding: "4px 0", fontWeight: 700 }}>—</div>
                        ) : (
                          <input
                            type="number" min={0} value={val === "" ? "" : val}
                            onChange={(e) => !readOnly && setCell(d.key, row.key, e.target.value)}
                            readOnly={readOnly}
                            className="no-arrows"
                            style={{ ...cellInputStyle, borderColor: val ? `${row.color}66` : COLORS.line, color: val ? row.color : COLORS.text }}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td style={{ fontSize: 10, color: row.color, textAlign: "center", padding: "2px 4px", fontWeight: 600, borderTop: row.isGroupStart ? `1px solid ${COLORS.line}44` : "none" }}>
                    {alloc !== null ? `${alloc}` : "—"}
                  </td>
                  <td style={{ fontSize: 10, color: remColor, textAlign: "center", padding: "2px 4px", fontWeight: 700, borderTop: row.isGroupStart ? `1px solid ${COLORS.line}44` : "none" }}>
                    {rem !== null ? rem : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && dirty && (
        <button onClick={() => { onSave(plan); setDirty(false); }} style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          Guardar planificación semanal ✓
        </button>
      )}
    </div>
  );
}

/* ── Planificador semanal para plantillas personalizadas ─────────────── */
const TPL_DAYS = [
  { key: "mon", label: "L" }, { key: "tue", label: "M" }, { key: "wed", label: "X" },
  { key: "thu", label: "J" }, { key: "fri", label: "V" }, { key: "sat", label: "S" }, { key: "sun", label: "D" },
];

function CustomWeekPlanner({ week, template, totalMin, onSave, readOnly = false, matchLabel = "MD" }) {
  const initPlan = () => week.customWeekPlan || { days: {}, cells: {} };
  const [plan, setPlan] = useState(initPlan);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setPlan(initPlan()); setDirty(false); }, [week.weekStart, week.customWeekPlan]);

  const cols = (template?.types || []).flatMap((t) =>
    t.subtypes?.length
      ? t.subtypes.map((s) => ({ key: `${t.id}_${s.id}`, typeLabel: t.label, subLabel: s.label, color: t.color }))
      : [{ key: t.id, typeLabel: t.label, subLabel: null, color: t.color }]
  );

  // weekIndex from template percentages — look for the week index by weekStart
  const weekIdx = Number(week.customWeekIndex ?? 0);
  const pctRow  = template?.percentages?.[weekIdx] || {};

  const getDayType = (dk) => plan.days?.[dk] || "entreno";
  const cycleDayType = (dk) => {
    if (readOnly) return;
    const order = ["entreno", "descanso", "partido"];
    const next = order[(order.indexOf(getDayType(dk)) + 1) % order.length];
    setPlan((p) => ({ ...p, days: { ...p.days, [dk]: next } }));
    setDirty(true);
  };
  const getCell = (dk, ck) => plan.cells?.[dk]?.[ck] ?? "";
  const setCell = (dk, ck, val) => {
    setPlan((p) => ({ ...p, cells: { ...p.cells, [dk]: { ...(p.cells?.[dk] || {}), [ck]: val === "" ? "" : Number(val) || 0 } } }));
    setDirty(true);
  };

  const sumDays = (ck) => TPL_DAYS.reduce((acc, d) => getDayType(d.key) === "entreno" ? acc + (Number(plan.cells?.[d.key]?.[ck]) || 0) : acc, 0);
  const allocated = (ck) => Math.round(totalMin * (Number(pctRow[ck]) || 0) / 100);
  const remaining = (ck) => allocated(ck) - sumDays(ck);

  const totalUsed = cols.reduce((acc, c) => acc + sumDays(c.key), 0);

  const dayBg    = { entreno: "transparent", descanso: "#0c204088", partido: "#2a101088" };
  const dayColor = { entreno: COLORS.text, descanso: "#60a5fa", partido: "#ff5a5f" };
  const dayShort = { entreno: "", descanso: "REST", partido: matchLabel };

  const cellInputStyle = { width: 36, padding: "3px 1px", borderRadius: 4, border: `1px solid ${COLORS.line}`, background: "#1c2128", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 80, background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: COLORS.text, fontWeight: 600 }}>Tiempo total</div>
          <div style={{ fontSize: 14, color: COLORS.lime, fontWeight: 700 }}>{totalUsed} <span style={{ fontSize: 9 }}>min</span></div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 460, width: "100%", fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 6px", textAlign: "left", color: COLORS.text, borderBottom: `1px solid ${COLORS.line}`, fontSize: 9 }}>Tipo</th>
              {TPL_DAYS.map((d) => {
                const type = getDayType(d.key);
                return (
                  <th key={d.key} style={{ padding: "2px", textAlign: "center", borderBottom: `1px solid ${COLORS.line}`, minWidth: 40 }}>
                    <button onClick={() => cycleDayType(d.key)} style={{ width: "100%", padding: "4px 2px", borderRadius: 6, border: `1px solid ${type !== "entreno" ? dayColor[type] : COLORS.line}`, background: dayBg[type], color: dayColor[type], fontSize: 9, fontWeight: 700, cursor: readOnly ? "default" : "pointer", lineHeight: 1.3 }}>
                      {d.label}{dayShort[type] ? `\n${dayShort[type]}` : ""}
                    </button>
                  </th>
                );
              })}
              <th style={{ padding: "4px 4px", textAlign: "center", color: COLORS.text, borderBottom: `1px solid ${COLORS.line}`, fontSize: 9, whiteSpace: "nowrap" }}>Asig.</th>
              <th style={{ padding: "4px 4px", textAlign: "center", color: COLORS.text, borderBottom: `1px solid ${COLORS.line}`, fontSize: 9, whiteSpace: "nowrap" }}>Rest.</th>
            </tr>
          </thead>
          <tbody>
            {cols.map((col) => {
              const rem = remaining(col.key);
              const remColor = rem < 0 ? "#ff5a5f" : rem === 0 ? COLORS.lime : COLORS.text;
              return (
                <tr key={col.key} style={{ borderBottom: `1px solid ${COLORS.line}22` }}>
                  <td style={{ fontSize: 9, color: col.color, fontWeight: 600, padding: "2px 6px", whiteSpace: "nowrap", borderRight: `1px solid ${COLORS.line}` }}>
                    {col.subLabel ? `${col.typeLabel} · ${col.subLabel}` : col.typeLabel}
                  </td>
                  {TPL_DAYS.map((d) => {
                    const type = getDayType(d.key);
                    const isBlocked = type !== "entreno";
                    const val = getCell(d.key, col.key);
                    return (
                      <td key={d.key} style={{ padding: "2px", textAlign: "center", background: isBlocked ? dayBg[type] : "transparent" }}>
                        {isBlocked ? <div style={{ fontSize: 9, color: dayColor[type], padding: "4px 0", fontWeight: 700 }}>—</div> : (
                          <input type="number" min={0} value={val === "" ? "" : val} onChange={(e) => !readOnly && setCell(d.key, col.key, e.target.value)} readOnly={readOnly} className="no-arrows" style={{ ...cellInputStyle, borderColor: val ? `${col.color}66` : COLORS.line, color: val ? col.color : COLORS.text }} />
                        )}
                      </td>
                    );
                  })}
                  <td style={{ fontSize: 10, color: col.color, textAlign: "center", padding: "2px 4px", fontWeight: 600 }}>{allocated(col.key)}</td>
                  <td style={{ fontSize: 10, color: remColor, textAlign: "center", padding: "2px 4px", fontWeight: 700 }}>{rem}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && dirty && (
        <button onClick={() => { onSave(plan); setDirty(false); }} style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          Guardar planificación semanal ✓
        </button>
      )}
    </div>
  );
}

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
function CreateMesoModal({ teamId, onSave, onClose, roster = [], displayNames = {}, showMenstrual = false, showSJ = false, showCustomTemplates = false, customTemplates = [] }) {
  const [name, setName]               = useState("");
  const [startDate, setStart]         = useState(null);
  const [endDate, setEnd]             = useState(null);
  const [color, setColor]             = useState(MESO_COLORS[0]);
  const [isMenstrual, setIsMenstrual] = useState(false);
  const [menstrualPlayers, setMenstrualPlayers] = useState([]);
  const [isSJ, setIsSJ]               = useState(false);
  const [activeCustomTpl, setActiveCustomTpl] = useState(null); // template id
  const [saving, setSaving]           = useState(false);

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  const togglePlayer = (username) => setMenstrualPlayers((prev) =>
    prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
  );

  const handleSave = async () => {
    if (!startDate) return;
    const activeTpl = activeCustomTpl ? customTemplates.find((t) => t.id === activeCustomTpl) : null;
    if (!isSJ && !activeTpl && !endDate) return;
    setSaving(true);
    try {
      const numWeeks = activeTpl ? Number(activeTpl.weeks) || 6 : isSJ ? 6 : null;
      const sjEndDate = (isSJ || activeTpl) ? addDays(mondayOf(startDate), numWeeks * 7 - 1) : null;
      const effectiveEnd = (isSJ || activeTpl) ? sjEndDate : endDate;
      const weeks = (isSJ || activeTpl
        ? Array.from({ length: numWeeks }, (_, i) => {
            const ws = addDays(mondayOf(startDate), i * 7);
            return { weekStart: ws, weekEnd: addDays(ws, 6) };
          })
        : mesoWeeks(startDate, effectiveEnd)
      ).map((w, i) => {
        const SJ_NAMES = ["FOCO EXTENSIVO SGJ EM", "FOCO EXTENSIVO SGJ EM", "FOCO VELOCIDAD SMJ EG", "FOCO VELOCIDAD SMJ EG", "FOCO INTENSIVO SRJ EP", "FOCO INTENSIVO SRJ EP"];
        if (isSJ) return { ...w, name: SJ_NAMES[i] || `Microciclo ${i + 1}`, type: "carga", volume: 100, intensity: 70, sjDays: 4, sjBaseMinutes: 100 };
        if (activeTpl) return { ...w, name: `Microciclo ${i + 1}`, type: "carga", volume: 100, intensity: 70 };
        if (isMenstrual) {
          const phase = MENSTRUAL_PHASES[i] || MENSTRUAL_PHASES[MENSTRUAL_PHASES.length - 1];
          return { ...w, name: phase.label, type: phase.type, volume: 70, intensity: 70, contenidos: phase.contenidos };
        }
        return { ...w, name: "", type: "carga", volume: 70, intensity: 70 };
      });
      const id = await saveMesocycle({ teamId, name, startDate, endDate: effectiveEnd, weeks, color, isMenstrual: (isSJ || activeTpl) ? false : isMenstrual, menstrualPlayers: (isSJ || activeTpl) ? [] : menstrualPlayers, isSituacionesJugadas: isSJ, customTemplateId: activeTpl?.id || null });
      onSave({ id, teamId, name, startDate, endDate: effectiveEnd, weeks, color, isMenstrual: (isSJ || activeTpl) ? false : isMenstrual, menstrualPlayers: (isSJ || activeTpl) ? [] : menstrualPlayers, isSituacionesJugadas: isSJ, customTemplateId: activeTpl?.id || null });
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
                <div style={{ fontSize: 10, color: "#fb923c", marginTop: 2, fontWeight: 600 }}>Específico de fútbol</div>
              </div>
              <button onClick={() => { setIsSJ((v) => !v); if (!isSJ) { setIsMenstrual(false); setActiveCustomTpl(null); } }} style={{
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

        {showCustomTemplates && customTemplates.length > 0 && customTemplates.map((tpl) => {
          const isActive = activeCustomTpl === tpl.id;
          const tplColor = tpl.types?.[0]?.color || COLORS.lime;
          return (
            <div key={tpl.id} style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>📋 {tpl.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>{tpl.weeks} microciclos · {tpl.types?.map((t) => t.label).join(" / ")}</div>
                </div>
                <button onClick={() => { setActiveCustomTpl(isActive ? null : tpl.id); if (!isActive) { setIsSJ(false); setIsMenstrual(false); } }} style={{
                  width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
                  background: isActive ? tplColor : COLORS.line, transition: "background 0.2s",
                }}>
                  <span style={{ position: "absolute", top: 3, left: isActive ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </div>
              {isActive && (
                <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: `${tplColor}18`, border: `1px solid ${tplColor}44` }}>
                  <div style={{ fontSize: 11, color: tplColor }}>Se crearán automáticamente {tpl.weeks} microciclos desde la fecha de inicio seleccionada.</div>
                </div>
              )}
            </div>
          );
        })}

        {showMenstrual && (
          <div style={{ marginBottom: 14, background: COLORS.panelRaised, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>🔴 Ciclo menstrual</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>Semanas prefijadas según fase del ciclo</div>
              </div>
              <button onClick={() => { setIsMenstrual((v) => !v); if (!isMenstrual) { setIsSJ(false); setActiveCustomTpl(null); } }} style={{
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
          {(() => { const canSave = startDate && (isSJ || activeCustomTpl || endDate); return (
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
        const SJ_NAMES = ["FOCO EXTENSIVO SGJ EM", "FOCO EXTENSIVO SGJ EM", "FOCO VELOCIDAD SMJ EG", "FOCO VELOCIDAD SMJ EG", "FOCO INTENSIVO SRJ EP", "FOCO INTENSIVO SRJ EP"];
        if (isSJ) {
          const base = existing ? { ...w, ...existing } : { ...w, volume: 100, intensity: 70 };
          return { ...base, name: base.name || SJ_NAMES[i] || `Microciclo ${i + 1}`, sjDays: base.sjDays ?? 4, sjBaseMinutes: base.sjBaseMinutes ?? 100, isSituacionesJugadas: true };
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
                <div style={{ fontSize: 10, color: "#fb923c", marginTop: 2, fontWeight: 600 }}>Específico de fútbol</div>
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
function MesoDetail({ meso, onUpdate, onDelete, onBack, readOnly = false, roster = [], displayNames = {}, showSJ = false, showMenstrual = false, customTemplates = [], isGrupo = false }) {
  const [editingWeek, setEditingWeek] = useState(null);
  const [editingMeso, setEditingMeso] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sjEdits, setSjEdits] = useState({});
  const today = todayStr();
  const activeTpl = meso.customTemplateId ? customTemplates.find((t) => t.id === meso.customTemplateId) : null;
  const matchLabel = isGrupo ? "COMP" : "MD";
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

  const handleSJPlanSave = async (weekStart, plan) => {
    const weeks = meso.weeks.map((w) => w.weekStart === weekStart ? { ...w, sjWeekPlan: plan } : w);
    setSaving(true);
    try {
      await saveMesocycle({ ...meso, weeks });
      onUpdate({ ...meso, weeks });
    } finally { setSaving(false); }
  };

  const handleCustomPlanSave = async (weekStart, plan) => {
    const weeks = meso.weeks.map((w) => w.weekStart === weekStart ? { ...w, customWeekPlan: plan } : w);
    setSaving(true);
    try {
      await saveMesocycle({ ...meso, weeks });
      onUpdate({ ...meso, weeks });
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

                {/* SJ Summary Table (% / min / restantes) */}
                <div style={{ overflowX: "auto", marginBottom: 4 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: 9, color: COLORS.text, textAlign: "left", padding: "3px 4px", borderBottom: `1px solid ${COLORS.line}` }}></th>
                        <th colSpan={3} style={{ fontSize: 9, fontWeight: 700, color: "#38bdf8", textAlign: "center", padding: "4px 2px", borderBottom: "2px solid #38bdf844" }}>SGJ</th>
                        <th colSpan={3} style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", textAlign: "center", padding: "4px 2px", borderBottom: "2px solid #a78bfa44" }}>SMJ</th>
                        <th colSpan={3} style={{ fontSize: 9, fontWeight: 700, color: "#fb923c", textAlign: "center", padding: "4px 2px", borderBottom: "2px solid #fb923c44" }}>SRJ</th>
                      </tr>
                      <tr>
                        <th style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px" }}></th>
                        {SJ_COLS.map((c) => (
                          <th key={c.key} style={{ fontSize: 9, color: COLORS.text, textAlign: "center", padding: "3px 2px", fontWeight: 600 }}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", whiteSpace: "nowrap", fontWeight: 600 }}>%</td>
                        {SJ_COLS.map((c) => (
                          <td key={c.key} style={{ fontSize: 11, color: c.color, textAlign: "center", padding: "4px 2px", fontWeight: 700, background: `${c.color}11`, borderBottom: `1px solid ${COLORS.line}` }}>
                            {pct[c.key]}%
                            {c.key === "srj_ep" && pct.micro > 0 && <div style={{ fontSize: 9, color: "#ff5a5f", fontWeight: 700 }}>({pct.micro}% 1x1)</div>}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", whiteSpace: "nowrap", fontWeight: 600 }}>Min.</td>
                        {SJ_COLS.map((c) => (
                          <td key={c.key} style={{ fontSize: 10, color: COLORS.text, textAlign: "center", padding: "4px 2px", borderBottom: `1px solid ${COLORS.line}` }}>
                            {Math.round(totalMin * pct[c.key] / 100)}
                            {c.key === "srj_ep" && pct.micro > 0 && <div style={{ fontSize: 9, color: "#ff5a5f", fontWeight: 700 }}>({Math.round(totalMin * pct.micro / 100)})</div>}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", whiteSpace: "nowrap", fontWeight: 600 }}>Rest.</td>
                        {SJ_COLS.map((c) => {
                          const plan = w.sjWeekPlan || { days: {}, cells: {} };
                          const sumKey = (k) => SJ_DAYS.reduce((acc, d) => {
                            const dtype = plan.days?.[d.key] || "entreno";
                            return dtype === "entreno" ? acc + (Number(plan.cells?.[d.key]?.[k]) || 0) : acc;
                          }, 0);
                          const alloc = Math.round(totalMin * pct[c.key] / 100);
                          const rem = alloc - sumKey(c.key) - (c.key === "srj_ep" ? sumKey("micro") : 0);
                          const rc = rem < 0 ? "#ff5a5f" : rem === 0 ? COLORS.lime : COLORS.text;
                          return (
                            <td key={c.key} style={{ fontSize: 10, color: rc, textAlign: "center", padding: "4px 2px", fontWeight: 700 }}>
                              {rem}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Planificador semanal */}
                <SJWeekPlanner
                  week={w}
                  pct={pct}
                  totalMin={totalMin}
                  onSave={(plan) => handleSJPlanSave(w.weekStart, plan)}
                  readOnly={readOnly}
                  matchLabel={matchLabel}
                />
              </div>
            );
          }

          if (activeTpl) {
            const tplColor = activeTpl.types?.[0]?.color || COLORS.lime;
            const totalMin = Math.round((Number(w.sjBaseMinutes ?? 100)) * (w.volume ?? 100) / 100);
            return (
              <div key={w.weekStart} style={{ background: "#0c1520", border: `1px solid ${isCurrent ? tplColor : COLORS.line}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>Microciclo {i + 1} · {fmtDateShort(w.weekStart)} – {fmtDateShort(w.weekEnd)}</div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: tplColor }}>{w.name || `Microciclo ${i + 1}`}</div>
                    <div style={{ fontSize: 10, color: tplColor, marginTop: 2, opacity: 0.8 }}>📋 {activeTpl.name}</div>
                  </div>
                  {!readOnly && <button onClick={() => setEditingWeek(w)} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>Editar</button>}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Min. semana tipo</div>
                    <input type="number" inputMode="numeric" min={0} value={sjEdits[w.weekStart]?.baseMin ?? String(w.sjBaseMinutes ?? 100)}
                      onChange={(e) => setSjEdits((prev) => ({ ...prev, [w.weekStart]: { ...prev[w.weekStart], baseMin: e.target.value } }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Volumen semana</div>
                    <div style={{ padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.lime }}>{w.volume ?? 100}%</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Min. totales</div>
                    <div style={{ padding: "7px 10px", borderRadius: 8, background: "#1c2128", border: `1px solid ${COLORS.line}`, fontSize: 13, color: tplColor, fontWeight: 700 }}>{totalMin} min</div>
                  </div>
                  {!readOnly && sjEdits[w.weekStart]?.baseMin !== undefined && (
                    <button onClick={async () => {
                      const weeks = meso.weeks.map((ww) => ww.weekStart === w.weekStart ? { ...ww, sjBaseMinutes: Number(sjEdits[w.weekStart].baseMin) || 100 } : ww);
                      setSaving(true);
                      try { await saveMesocycle({ ...meso, weeks }); onUpdate({ ...meso, weeks }); } finally { setSaving(false); setSjEdits((p) => { const n = { ...p }; delete n[w.weekStart]; return n; }); }
                    }} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                      {saving ? "..." : "✓"}
                    </button>
                  )}
                </div>
                {/* Tabla resumen % / Min. / Rest. */}
                {(() => {
                  const cols = (activeTpl.types || []).flatMap((t) =>
                    t.subtypes?.length
                      ? t.subtypes.map((s) => ({ key: `${t.id}_${s.id}`, typeLabel: t.label, subLabel: s.label, color: t.color }))
                      : [{ key: t.id, typeLabel: t.label, subLabel: null, color: t.color }]
                  );
                  const pctRow = activeTpl.percentages?.[i] || {};
                  const plan = w.customWeekPlan || { days: {}, cells: {} };
                  const sumDaysFn = (ck) => TPL_DAYS.reduce((acc, d) => {
                    const dtype = plan.days?.[d.key] || "entreno";
                    return dtype === "entreno" ? acc + (Number(plan.cells?.[d.key]?.[ck]) || 0) : acc;
                  }, 0);
                  // Group by type for colspan headers
                  const typeGroups = (activeTpl.types || []).map((t) => ({
                    t,
                    subCols: t.subtypes?.length
                      ? t.subtypes.map((s) => ({ key: `${t.id}_${s.id}`, subLabel: s.label, color: t.color }))
                      : [{ key: t.id, subLabel: null, color: t.color }],
                  }));
                  return (
                    <div style={{ overflowX: "auto", marginBottom: 4 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
                        <thead>
                          <tr>
                            <th style={{ fontSize: 9, color: COLORS.text, textAlign: "left", padding: "3px 4px", borderBottom: `1px solid ${COLORS.line}` }}></th>
                            {typeGroups.map(({ t, subCols }) => (
                              <th key={t.id} colSpan={subCols.length} style={{ fontSize: 9, fontWeight: 700, color: t.color, textAlign: "center", padding: "4px 2px", borderBottom: `2px solid ${t.color}44` }}>{t.label}</th>
                            ))}
                          </tr>
                          {typeGroups.some(({ t }) => t.subtypes?.length > 0) && (
                            <tr>
                              <th style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px" }}></th>
                              {cols.map((c) => (
                                <th key={c.key} style={{ fontSize: 9, color: COLORS.text, textAlign: "center", padding: "3px 2px", fontWeight: 600 }}>{c.subLabel || ""}</th>
                              ))}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", fontWeight: 600 }}>%</td>
                            {cols.map((c) => (
                              <td key={c.key} style={{ fontSize: 11, color: c.color, textAlign: "center", padding: "4px 2px", fontWeight: 700, background: `${c.color}11`, borderBottom: `1px solid ${COLORS.line}` }}>
                                {Number(pctRow[c.key]) || 0}%
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", fontWeight: 600 }}>Min.</td>
                            {cols.map((c) => (
                              <td key={c.key} style={{ fontSize: 10, color: COLORS.text, textAlign: "center", padding: "4px 2px", borderBottom: `1px solid ${COLORS.line}` }}>
                                {Math.round(totalMin * (Number(pctRow[c.key]) || 0) / 100)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td style={{ fontSize: 9, color: COLORS.text, padding: "3px 4px", fontWeight: 600 }}>Rest.</td>
                            {cols.map((c) => {
                              const alloc = Math.round(totalMin * (Number(pctRow[c.key]) || 0) / 100);
                              const rem = alloc - sumDaysFn(c.key);
                              const rc = rem < 0 ? "#ff5a5f" : rem === 0 ? COLORS.lime : COLORS.text;
                              return (
                                <td key={c.key} style={{ fontSize: 10, color: rc, textAlign: "center", padding: "4px 2px", fontWeight: 700 }}>{rem}</td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                <CustomWeekPlanner
                  week={{ ...w, customWeekIndex: i }}
                  template={activeTpl}
                  totalMin={totalMin}
                  onSave={(plan) => handleCustomPlanSave(w.weekStart, plan)}
                  readOnly={readOnly}
                  matchLabel={matchLabel}
                />
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
  const [showSpaces, setShowSpaces] = useState(false);
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
  const isGrupo = team.kind === "grupo";
  const showCustomTemplates = showSJ || isGrupo;
  const showMenstrual = teamGender === "femenino" || teamGender === "mixto";
  const customTemplates = team.customMesoTemplates || [];

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
        customTemplates={customTemplates}
        isGrupo={isGrupo}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: COLORS.text }}>Mesociclos</div>
        <div style={{ display: "flex", gap: 8 }}>
          {showSJ && (
            <button onClick={() => setShowSpaces(true)} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 10, padding: "8px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>📐 Calc. espacios</button>
          )}
          {!readOnly && <button onClick={() => setShowCreate(true)} style={{ background: COLORS.lime, border: "none", color: "#14171c", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Nuevo</button>}
        </div>
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
        <CreateMesoModal teamId={team.teamId} onSave={handleCreate} onClose={() => setShowCreate(false)} roster={roster} displayNames={displayNames} showMenstrual={showMenstrual} showSJ={showSJ} showCustomTemplates={showCustomTemplates} customTemplates={customTemplates} />
      )}
      {showSpaces && <SpacesCalculatorModal onClose={() => setShowSpaces(false)} />}
    </div>
  );
}
