// Menstrual cycle utilities — week-based, matching the mesocycle menstrual system

// Same order as MENSTRUAL_PHASES_CAL / MENSTRUAL_PHASES_FULL in PlayerDashboard
// Week index from cycleDay1: week 0 = Sangrado (days 1-7), week 1 = Post Sangrado, etc.
export const CYCLE_WEEKS = [
  { emoji: "🔴",   label: "Semana de Sangrado",       type: "carga",      color: "#ef4444", bg: "#450a0a" },
  { emoji: "🔥💪", label: "Semana Post Sangrado",      type: "sobrecarga", color: "#f97316", bg: "#431407" },
  { emoji: "💙",   label: "Semana 2ª Post Sangrado",   type: "descarga",   color: "#60a5fa", bg: "#172554" },
  { emoji: "🌕",   label: "Semana Previa al Sangrado", type: "carga",      color: "#fbbf24", bg: "#422006" },
];

export const LOAD_COLORS = { carga: "#f97316", sobrecarga: "#ef4444", descarga: "#60a5fa" };

/**
 * Given cycleDay1 (YYYY-MM-DD) and a target date, returns { weekIdx, week } or null.
 * cycleLength defaults to 28. Week index 0 = Sangrado (day 1), 1 = Post Sangrado, etc.
 */
export function getCycleWeek(cycleDay1, targetDate, cycleLength = 28) {
  if (!cycleDay1) return null;
  const start = new Date(cycleDay1 + "T00:00:00");
  const target = new Date(targetDate + "T00:00:00");
  const diffDays = Math.floor((target - start) / 86400000);
  if (diffDays < 0) return null;
  const dayInCycle = (diffDays % cycleLength) + 1; // 1-based
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
