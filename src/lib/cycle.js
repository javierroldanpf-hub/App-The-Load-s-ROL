// Menstrual cycle utilities

export const CYCLE_PHASES = [
  { name: "Menstruación", emoji: "🔴", days: [1, 5], color: "#ef4444", bg: "#450a0a" },
  { name: "Folicular", emoji: "🌱", days: [6, 13], color: "#22c55e", bg: "#052e16" },
  { name: "Ovulación", emoji: "⚡", days: [14, 14], color: "#facc15", bg: "#422006" },
  { name: "Lútea", emoji: "🌙", days: [15, 28], color: "#818cf8", bg: "#1e1b4b" },
];

export const LOAD_RECS = {
  "Menstruación": { label: "Descarga", color: "#818cf8" },
  "Folicular":    { label: "Carga",    color: "#22c55e" },
  "Ovulación":    { label: "Pico",     color: "#facc15" },
  "Lútea":        { label: "Sobrecarga → Descarga", color: "#f97316" },
};

/**
 * Returns the phase object for a given day number (1–28+).
 */
export function getPhaseForDay(dayNum, cycleLength = 28) {
  // Normalize to 1-based within cycle
  const d = ((dayNum - 1) % cycleLength) + 1;
  // Scale phase boundaries if cycleLength != 28
  const ratio = cycleLength / 28;
  if (d <= Math.round(5 * ratio)) return CYCLE_PHASES[0];
  if (d <= Math.round(13 * ratio)) return CYCLE_PHASES[1];
  if (d <= Math.round(14 * ratio)) return CYCLE_PHASES[2];
  return CYCLE_PHASES[3];
}

/**
 * Given a cycle_day1 date string (YYYY-MM-DD) and a target date string,
 * returns { dayNum, phase } or null if no cycle data.
 */
export function getCycleInfo(cycleDay1, targetDate, cycleLength = 28) {
  if (!cycleDay1) return null;
  const start = new Date(cycleDay1 + "T00:00:00");
  const target = new Date(targetDate + "T00:00:00");
  const diffDays = Math.floor((target - start) / 86400000);
  if (diffDays < 0) return null;
  const dayNum = (diffDays % cycleLength) + 1;
  const phase = getPhaseForDay(dayNum, cycleLength);
  return { dayNum, phase };
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
