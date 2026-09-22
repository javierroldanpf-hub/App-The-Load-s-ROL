// Menstrual cycle utilities — week-based, matching the mesocycle menstrual system

// Cycle weeks — internal day 1 = start of Semana Previa al Sangrado.
// The coach inputs the first bleeding day, which maps to internal day 8.
export const CYCLE_WEEKS = [
  { emoji: "🌕",   label: "Semana Previa al Sangrado", type: "carga",      color: "#fbbf24", bg: "#422006", fase: "Fase Lútea Tardía",          metabolismo: "Predominancia de Progesterona (Metabolismo de Ácidos Grasos)" },
  { emoji: "🔴",   label: "Semana de Sangrado",         type: "carga",      color: "#ef4444", bg: "#450a0a", fase: "Fase Folicular Temprana",     metabolismo: "Bajada de Progesterona y Subida del Estrógeno (No hay predominancia de ninguna vía metabólica)" },
  { emoji: "🔥💪", label: "Semana Post Sangrado",        type: "sobrecarga", color: "#f97316", bg: "#431407", fase: "Fase Folicular Tardía",       metabolismo: "Predominancia del Estrógeno (Síntesis y Almacenamiento de Glucógeno)" },
  { emoji: "💙",   label: "Semana 2ª Post Sangrado",    type: "descarga",   color: "#60a5fa", bg: "#172554", fase: "Fase Lútea Temprana",         metabolismo: "Bajada del Estrógeno y Subida de la Progesterona (Aumento del Metabolismo de Ácidos Grasos)" },
];

export const LOAD_COLORS = { carga: "#f97316", sobrecarga: "#ef4444", descarga: "#60a5fa" };

/**
 * Given cycleDay1 (YYYY-MM-DD) and a target date, returns { weekIdx, week } or null.
 * cycleLength defaults to 28. Week index 0 = Sangrado (day 1), 1 = Post Sangrado, etc.
 */
/**
 * bleedingDay1: first day of bleeding entered by coach (= internal day 8 of the cycle).
 * Internally the cycle starts 7 days earlier (Semana Previa al Sangrado = days 1-7).
 */
export function getCycleWeek(bleedingDay1, targetDate, cycleLength = 28) {
  if (!bleedingDay1) return null;
  // Internal cycle start = bleedingDay1 - 7 days
  const cycleStart = new Date(bleedingDay1 + "T00:00:00");
  cycleStart.setDate(cycleStart.getDate() - 7);
  const target = new Date(targetDate + "T00:00:00");
  const diffDays = Math.floor((target - cycleStart) / 86400000);
  if (diffDays < 0) return null;
  const dayInCycle = (diffDays % cycleLength) + 1; // 1-based, 1 = first day of Previa
  const weekIdx = Math.min(Math.floor((dayInCycle - 1) / 7), 3);
  return { weekIdx, week: CYCLE_WEEKS[weekIdx], dayInCycle };
}

// Relaxin peak: days 20-22 of cycle (middle of 3rd week)
export function isCycleRelaxin(cycleDay1, targetDate, cycleLength = 28) {
  const info = getCycleWeek(cycleDay1, targetDate, cycleLength);
  if (!info) return false;
  return info.dayInCycle === 20 || info.dayInCycle === 21 || info.dayInCycle === 22;
}

/**
 * Returns effective sexo for a player, falling back to team sexo.
 */
export function effectiveSexo(profile, team) {
  return profile?.sexo || team?.sexo || null;
}

/**
 * Returns true if the player/team should show cycle features.
 */
export function showCycle(profile, team) {
  return effectiveSexo(profile, team) === "femenino";
}

/**
 * Get cycle data for a player from team.playerCycles map.
 */
export function getPlayerCycle(team, username) {
  return team?.playerCycles?.[username] || null;
}

/**
 * Build updated playerCycles map for saving to team.
 */
export function setPlayerCycle(team, username, cycleDay1, cycleLength) {
  const current = team?.playerCycles || {};
  return { ...current, [username]: { cycleDay1, cycleLength: cycleLength || 28 } };
}
