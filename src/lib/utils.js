import { WELLNESS_FIELDS, WELLNESS_WEIGHTS, COLORS, RM_EXERCISES, PERFORMANCE_METRICS } from "./constants";

export function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function todayStr(d = new Date()) { return toDateKey(d); }
export function fmtDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}
export function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}
export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}
export function weekDates(weekMonday) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
}
export function addWeeks(dateStr, n) {
  return addDays(dateStr, n * 7);
}
export function weekNumberFrom(firstMonday, targetMonday) {
  if (!firstMonday) return 1;
  const a = new Date(firstMonday + "T12:00:00");
  const b = new Date(targetMonday + "T12:00:00");
  const diffDays = Math.round((b - a) / 86400000);
  const diffWeeks = Math.round(diffDays / 7);
  // No week 0: before week 1 goes directly to -1
  return diffWeeks >= 0 ? diffWeeks + 1 : diffWeeks;
}
export function fmtDateLong(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
export function calculateAge(birthDateStr) {
  const birth = new Date(birthDateStr + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthdayThisYear = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthdayThisYear) age -= 1;
  return age;
}
export function weekdayLabel(dateStr) {
  const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  return WEEKDAY_LABELS[dow === 0 ? 6 : dow - 1];
}
export function firstOfMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(1);
  return toDateKey(d);
}
export function addMonths(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return toDateKey(d);
}
export function monthLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}
export function monthGridDates(dateStr) {
  const first = firstOfMonth(dateStr);
  const gridStart = mondayOf(first);
  const targetMonth = new Date(dateStr + "T00:00:00").getMonth();
  const cells = [];
  let cursor = gridStart;
  for (let i = 0; i < 42; i++) {
    const d = new Date(cursor + "T00:00:00");
    const inMonth = d.getMonth() === targetMonth;
    cells.push({ date: cursor, inMonth });
    cursor = addDays(cursor, 1);
  }
  const lastDayIdx = cells.map((c) => c.inMonth).lastIndexOf(true);
  const rowsNeeded = Math.ceil((lastDayIdx + 1) / 7);
  return cells.slice(0, rowsNeeded * 7);
}

export function fileToCompressedDataUrl(file, maxSide = 480, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSide) { height = Math.round((height * maxSide) / width); width = maxSide; }
        else if (height > maxSide) { width = Math.round((width * maxSide) / height); height = maxSide; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function genTeamCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code.slice(0, 3) + "-" + code.slice(3);
}

export function normUser(u) { return u.trim().toLowerCase(); }

export function simpleHash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

export function wellnessScore(entry) {
  const vals = WELLNESS_FIELDS.map((f) => entry[f.key]);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
export function weightedWellnessScore(entry) {
  let sum = 0;
  for (const key in WELLNESS_WEIGHTS) {
    sum += (entry[key] || 0) * WELLNESS_WEIGHTS[key];
  }
  return ((sum - 1) / 4) * 10;
}
// weightedWellnessStatus accepts either a numeric score or a wellness entry object
export function weightedWellnessStatus(scoreOrEntry) {
  const score = typeof scoreOrEntry === "number" ? scoreOrEntry : weightedWellnessScore(scoreOrEntry);
  if (score >= 7.5) return { label: "Óptimo", color: COLORS.lime, bg: COLORS.limeDark };
  if (score >= 5.5) return { label: "Normal", color: COLORS.blue, bg: COLORS.blueDark };
  if (score >= 3.5) return { label: "Atención", color: COLORS.amber, bg: COLORS.amberDark };
  return { label: "Alerta", color: COLORS.coral, bg: COLORS.coralDark };
}
export function wellnessStatus(score) {
  if (score >= 4) return { label: "Óptimo", color: COLORS.lime, bg: COLORS.limeDark };
  if (score >= 3) return { label: "Normal", color: COLORS.blue, bg: COLORS.blueDark };
  if (score >= 2.2) return { label: "Atención", color: COLORS.amber, bg: COLORS.amberDark };
  return { label: "Alerta", color: COLORS.coral, bg: COLORS.coralDark };
}
export function rpeStatus(rpe) {
  if (rpe >= 8) return { label: "Carga muy alta", color: COLORS.coral, bg: COLORS.coralDark };
  if (rpe >= 6) return { label: "Carga alta", color: COLORS.amber, bg: COLORS.amberDark };
  if (rpe >= 3) return { label: "Carga moderada", color: COLORS.lime, bg: COLORS.limeDark };
  return { label: "Carga baja", color: COLORS.blue, bg: COLORS.blueDark };
}
export function sessionLoad(entry) { return entry.rpe * entry.duration; }
// acwr accepts either:
// - raw rpe entries: [{date, rpe, duration}, ...] — calls sessionLoad internally
// - precomputed load entries: [{date, load}, ...] — uses .load directly
// Optional second arg: reference date string (default: today)
export function acwr(playerRpeEntries, referenceDate) {
  const refDate = referenceDate ? new Date(referenceDate + "T00:00:00") : new Date();
  const getLoad = (e) => (e.load != null ? e.load : sessionLoad(e));
  const sorted = [...playerRpeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const within = (days) => sorted.filter((e) => (refDate - new Date(e.date + "T00:00:00")) / 86400000 <= days);
  const acute7 = within(7);
  const chronic28 = within(28);
  if (chronic28.length === 0) return null;
  const acuteAvg = acute7.reduce((s, e) => s + getLoad(e), 0) / 7;
  const chronicAvg = chronic28.reduce((s, e) => s + getLoad(e), 0) / 28;
  if (chronicAvg === 0) return null;
  return acuteAvg / chronicAvg;
}
export function acwrStatus(ratio) {
  if (ratio === null) return { label: "Sin datos", color: COLORS.textFaint };
  if (ratio > 1.5) return { label: "Riesgo alto", color: COLORS.coral };
  if (ratio > 1.3) return { label: "Riesgo elevado", color: COLORS.amber };
  if (ratio < 0.8) return { label: "Carga baja", color: COLORS.blue };
  return { label: "Zona óptima", color: COLORS.lime };
}
// latestEntryForPlayer: optional third arg (today/reference date) is accepted but unused — here for API compat
export function latestEntryForPlayer(entries, username, _referenceDate) {
  const mine = entries.filter((e) => e.username === username);
  if (mine.length === 0) return null;
  return mine.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

export function mean(values) {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
export function stdDev(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
export function monotony(values) {
  const m = mean(values);
  const sd = stdDev(values);
  if (m === null || sd === null || sd === 0) return null;
  return m / sd;
}
export function trainingStress(values) {
  const m = mean(values);
  const mono = monotony(values);
  if (m === null || mono === null) return null;
  return m * mono;
}
export function variability(values) {
  return stdDev(values);
}
export function acuteChronicRatio(dated, recentDays = 7, priorDays = 21) {
  if (!dated.length) return null;
  const recentDates = new Set(Array.from({ length: recentDays }, (_, i) => daysAgo(i)));
  const priorDates = new Set(Array.from({ length: priorDays }, (_, i) => daysAgo(i + recentDays)));
  const recentVals = dated.filter((d) => recentDates.has(d.date)).map((d) => d.value);
  const priorVals = dated.filter((d) => priorDates.has(d.date)).map((d) => d.value);
  const recentAvg = mean(recentVals);
  const priorAvg = mean(priorVals);
  if (recentAvg === null || priorAvg === null || priorAvg === 0) return null;
  return recentAvg / priorAvg;
}

export function asymmetryDeficit(right, left) {
  if (!right || !left) return null;
  const slower = Math.max(right, left);
  const faster = Math.min(right, left);
  return Math.round(((slower - faster) / faster) * 1000) / 10;
}

export function rmPercentages(val80, bodyWeight) {
  const RM_PERCENTAGES = [50, 60, 70, 80, 90, 100, 110, 120, 130];
  if (!val80) return null;
  const oneRM = val80 / 0.8;
  return RM_PERCENTAGES.map((pct) => {
    const value = Math.round(oneRM * (pct / 100) * 10) / 10;
    const bw = bodyWeight ? Math.round((value / bodyWeight) * 100) / 100 : null;
    return { pct, value, bw };
  });
}

export function physicalQuadrantMetricOptions(customTestDefs, customGpsDefs) {
  const options = [];
  RM_EXERCISES.forEach((ex) => options.push({ key: `rm:${ex.key}`, label: `1RM ${ex.label}`, unit: "kg" }));
  (customTestDefs || []).filter((d) => d.category === "Fuerza").forEach((d) => options.push({ key: `custom:${d.id}`, label: d.name, unit: d.unit }));
  PERFORMANCE_METRICS.forEach((m) => options.push({ key: `perf:${m.key}`, label: m.label, unit: m.unit }));
  options.push({ key: "perf:cod505Right", label: "COD 5-0-5 Dcha.", unit: "s" });
  options.push({ key: "perf:cod505Left", label: "COD 5-0-5 Izq.", unit: "s" });
  (customTestDefs || []).filter((d) => d.category === "Rendimiento").forEach((d) => options.push({ key: `custom:${d.id}`, label: d.name, unit: d.unit }));
  (customTestDefs || []).filter((d) => d.category === "Carga externa" || d.category === "Carga externa/GPS").forEach((d) => options.push({ key: `custom:${d.id}`, label: d.name, unit: d.unit }));
  (customGpsDefs || []).forEach((d) => options.push({ key: `gps:${d.id}`, label: d.name, unit: d.unit }));
  (customTestDefs || []).filter((d) => !["Fuerza", "Rendimiento", "Carga externa", "Carga externa/GPS"].includes(d.category)).forEach((d) => options.push({ key: `custom:${d.id}`, label: `${d.category ? d.category + ": " : ""}${d.name}`, unit: d.unit }));
  return options;
}

export function extractPhysicalMetricValue(entry, metricId) {
  if (!entry || !metricId) return null;
  const [kind, key] = metricId.split(":");
  if (kind === "rm") return entry[key] != null ? entry[key] / 0.8 : null;
  if (kind === "perf") return entry[key] != null ? entry[key] : null;
  if (kind === "custom") return entry.customTestValues ? (entry.customTestValues[key] != null ? entry.customTestValues[key] : null) : null;
  if (kind === "gps") return entry.customGpsValues ? (entry.customGpsValues[key] != null ? entry.customGpsValues[key] : null) : null;
  return null;
}

// Shared styles
export const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4",
  fontSize: 15, outline: "none",
};
export const primaryBtn = (disabled) => ({
  width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
  background: "#b6e000", color: "#14171c", fontWeight: 700, fontSize: 15,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
});
export const ghostBtn = {
  width: "100%", padding: "13px 0", borderRadius: 12, fontWeight: 600, fontSize: 14,
  background: "transparent", border: "1px solid #2e3640", color: "#8a939e", cursor: "pointer",
};
export const cardChoice = {
  background: "#1c2128", border: "1px solid #2e3640", borderRadius: 14,
  padding: "1.1rem 1.25rem", color: "#eef1f4", textAlign: "left", cursor: "pointer",
};
