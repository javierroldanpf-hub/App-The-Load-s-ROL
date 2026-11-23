// Clasifica una posición en una línea del campo y orden izq-der.
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sideOf = (p) => (/izq|left/.test(p) ? "l" : /der|right/.test(p) ? "r" : null);
const SIDE = (o) => (o < 0.95 ? " izq." : o > 1.05 ? " der." : "");
const wideSlot = (o) => o <= 0.1 || o >= 1.9;
const idxOf = (lines) => Object.fromEntries(lines.map((l, i) => [l, i]));
const mkF = (lines) => (id, ...orders) => ({
  id,
  lines: lines.map((l, i) => [l, orders[i] || []]).filter(([, o]) => o.length).map(([line, orders]) => ({ line, orders })),
});

export function pitchSlot(position) {
  const p = norm(position);
  if (!p.trim()) return null;
  let line = null;
  if (/portero|guardameta|\bgk\b/.test(p)) line = "gk";
  else if (/mediapunta|media punta|enganche|segundo delantero/.test(p)) line = "mp";
  else if (/pivote|defensivo|\bmcd\b/.test(p)) line = "mcd";
  else if (/medio|centrocamp|interior|volante|\bmc\b/.test(p)) line = "mc";
  else if (/extremo|delantero|punta|atacante|banda|\bdc\b/.test(p)) line = "att";
  else if (/defensa|central|lateral|carrilero|libero|\bdfc\b/.test(p)) line = "def";
  if (!line) return null;
  const side = /izq|left/.test(p) ? "l" : /der|right/.test(p) ? "r" : null;
  const wide = /lateral|extremo|carrilero|banda/.test(p);
  const order = side === "l" ? (wide ? 0 : 0.8) : side === "r" ? (wide ? 2 : 1.2) : 1;
  return { line, order };
}

export function groupByPitchLine(players) {
  const LINES = ["att", "mp", "mc", "mcd", "def", "gk"];
  const lines = Object.fromEntries(LINES.map((l) => [l, []]));
  const rest = [];
  for (const pl of players) {
    const slot = pitchSlot(pl.position);
    if (slot) lines[slot.line].push({ pl, order: slot.order });
    else rest.push(pl);
  }
  for (const id of Object.keys(lines)) {
    lines[id] = lines[id].sort((a, b) => a.order - b.order || String(a.pl.displayName).localeCompare(String(b.pl.displayName))).map((x) => x.pl);
  }
  return { lines, rest };
}

// ─── Deportes ────────────────────────────────────────────────────────────────
const FOOTBALL_LINES = ["att", "mp", "mc", "mcd", "def", "gk"];
const FB = (id, att, mp, mc, mcd, def) => mkF(FOOTBALL_LINES)(id, att, mp, mc, mcd, def, [1]);
const FORMATIONS = [
  FB("4-4-2", [0.8, 1.2], [], [0, 0.8, 1.2, 2], [], [0, 0.8, 1.2, 2]),
  FB("4-3-3", [0, 1, 2], [], [0.8, 1, 1.2], [], [0, 0.8, 1.2, 2]),
  FB("4-2-3-1", [1], [0, 1, 2], [], [0.8, 1.2], [0, 0.8, 1.2, 2]),
  FB("4-1-4-1", [1], [], [0, 0.8, 1.2, 2], [1], [0, 0.8, 1.2, 2]),
  FB("3-5-2", [0.8, 1.2], [], [0, 0.8, 1, 1.2, 2], [], [0.8, 1, 1.2]),
  FB("3-4-3", [0, 1, 2], [], [0, 0.8, 1.2, 2], [], [0.8, 1, 1.2]),
  FB("5-3-2", [0.8, 1.2], [], [0.8, 1, 1.2], [], [0, 0.8, 1, 1.2, 2]),
];

const FOOTBALL = {
  id: "football", field: "football", lines: FOOTBALL_LINES, gkLine: "gk", defLine: "def", defaultFormation: "4-3-3",
  classify: pitchSlot, formations: FORMATIONS,
  slotLabel: (slot) => {
    const base = { gk: "Portero", def: wideSlot(slot.order) ? "Lateral" : "Central", mcd: "Pivote", mc: wideSlot(slot.order) ? "Interior" : "Mediocentro", mp: "Mediapunta", att: wideSlot(slot.order) ? "Extremo" : "Delantero" }[slot.line];
    return slot.line === "gk" ? base : base + SIDE(slot.order);
  },
  positions: ["Portero", "Defensa central", "Lateral derecho", "Lateral izquierdo", "Mediocentro defensivo", "Mediocentro", "Mediapunta", "Extremo derecho", "Extremo izquierdo", "Delantero"],
};

const HOCKEY = {
  ...FOOTBALL, id: "hockey", field: "hockey", defaultFormation: "4-3-3",
  formations: FORMATIONS.filter((f) => ["4-3-3", "3-4-3", "4-4-2", "3-5-2", "5-3-2"].includes(f.id)),
  positions: ["Portero", "Defensa central", "Lateral derecho", "Lateral izquierdo", "Medio defensivo", "Interior", "Extremo derecho", "Extremo izquierdo", "Delantero"],
};

const FUTSAL_LINES = ["att", "mc", "def", "gk"];
const FS = mkF(FUTSAL_LINES);
const FUTSAL = {
  id: "futsal", field: "futsal", lines: FUTSAL_LINES, gkLine: "gk", defLine: null, defaultFormation: "1-2-1",
  classify: (position) => {
    const p = norm(position);
    if (!p.trim()) return null;
    if (/portero|guardameta/.test(p)) return { line: "gk", order: 1 };
    if (/pivot|delantero|punta/.test(p)) return { line: "att", order: 1 };
    if (/\bala\b|alero|banda|extremo/.test(p)) { const s = sideOf(p); return { line: "mc", order: s === "l" ? 0 : s === "r" ? 2 : 1 }; }
    if (/cierre|ultimo|defensa|central|zaguero/.test(p)) return { line: "def", order: 1 };
    return null;
  },
  formations: [FS("1-2-1", [1], [0, 2], [1], [1]), FS("2-2", [0.8, 1.2], [], [0.8, 1.2], [1]), FS("3-1", [1], [0, 1, 2], [], [1])],
  slotLabel: (slot) => (slot.line === "gk" ? "Portero" : slot.line === "def" ? "Cierre" : slot.line === "att" ? "Pívot" : "Ala" + SIDE(slot.order)),
  positions: ["Portero", "Cierre", "Ala derecho", "Ala izquierdo", "Pívot"],
};

const BASKET_LINES = ["piv", "wing", "base"];
const BK = mkF(BASKET_LINES);
const BASKETBALL = {
  id: "basketball", field: "basketball", lines: BASKET_LINES, gkLine: null, defLine: null, defaultFormation: "Quinteto clásico",
  classify: (position) => {
    const p = norm(position);
    if (!p.trim()) return null;
    if (/ala.?pivot|power|\bpf\b/.test(p)) return { line: "piv", order: 0.8 };
    if (/pivot|center|centro|\bc\b/.test(p)) return { line: "piv", order: 1.2 };
    if (/escolta|shooting|\bsg\b/.test(p)) return { line: "wing", order: 0 };
    if (/alero|small|\bsf\b/.test(p)) return { line: "wing", order: 2 };
    if (/base|point|\bpg\b|director/.test(p)) return { line: "base", order: 1 };
    return null;
  },
  formations: [BK("Quinteto clásico", [0.8, 1.2], [0, 2], [1])],
  slotLabel: (slot) => (slot.line === "base" ? "Base" : slot.line === "wing" ? (slot.order < 1 ? "Escolta" : "Alero") : slot.order < 1 ? "Ala-pívot" : "Pívot"),
  positions: ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"],
};

const HB_LINES = ["front", "back", "gk"];
const HB = mkF(HB_LINES);
const HANDBALL = {
  id: "handball", field: "handball", lines: HB_LINES, gkLine: "gk", defLine: null, defaultFormation: "Ataque 3-3",
  classify: (position) => {
    const p = norm(position);
    if (!p.trim()) return null;
    if (/portero|guardameta/.test(p)) return { line: "gk", order: 1 };
    if (/pivote|pivot/.test(p)) return { line: "front", order: 1 };
    if (/extremo|ala\b/.test(p)) { const s = sideOf(p); return { line: "front", order: s === "r" ? 2 : 0 }; }
    if (/lateral/.test(p)) { const s = sideOf(p); return { line: "back", order: s === "r" ? 1.6 : 0.4 }; }
    if (/central|armador|mediocentro/.test(p)) return { line: "back", order: 1 };
    return null;
  },
  formations: [HB("Ataque 3-3", [0, 1, 2], [0.4, 1, 1.6], [1])],
  slotLabel: (slot) => (slot.line === "gk" ? "Portero" : slot.line === "front" ? (slot.order === 1 ? "Pivote" : "Extremo" + SIDE(slot.order)) : slot.order > 0.7 && slot.order < 1.3 ? "Central" : "Lateral" + SIDE(slot.order)),
  positions: ["Portero", "Extremo izquierdo", "Extremo derecho", "Lateral izquierdo", "Lateral derecho", "Central", "Pivote"],
};

const RUGBY_LINES = ["fr", "sl", "tr", "hv", "tq", "fb"];
const RG = mkF(RUGBY_LINES);
const RUGBY = {
  id: "rugby", field: "rugby", lines: RUGBY_LINES, gkLine: null, defLine: null, defaultFormation: "Rugby 15",
  classify: (position) => {
    const p = norm(position);
    if (!p.trim()) return null;
    const s = sideOf(p);
    if (/talonador|hooker/.test(p)) return { line: "fr", order: 1 };
    if (/pilier|prop/.test(p)) return { line: "fr", order: s === "r" ? 1.4 : 0.6 };
    if (/segunda|lock|cerrojo/.test(p)) return { line: "sl", order: s === "r" ? 1.2 : s === "l" ? 0.8 : 1 };
    if (/flanker|tercera|numero 8|n.?8|octavo|\b8\b/.test(p)) return { line: "tr", order: /8|octavo/.test(p) ? 1 : s === "r" ? 2 : 0 };
    if (/medio mele|mediomele|scrum|\b9\b/.test(p)) return { line: "hv", order: 1.2 };
    if (/apertura|abertura|fly|\b10\b/.test(p)) return { line: "hv", order: 0.8 };
    if (/centro|center/.test(p)) return { line: "tq", order: s === "r" ? 1.2 : s === "l" ? 0.8 : 1 };
    if (/\bala\b|wing|extremo/.test(p)) return { line: "tq", order: s === "r" ? 2 : 0 };
    if (/zaguero|fullback|full back|\b15\b/.test(p)) return { line: "fb", order: 1 };
    return null;
  },
  formations: [RG("Rugby 15", [0.6, 1, 1.4], [0.8, 1.2], [0, 1, 2], [0.8, 1.2], [0, 0.8, 1.2, 2], [1])],
  slotLabel: (slot) => ({ fr: slot.order < 0.8 ? "Pilier izq." : slot.order > 1.2 ? "Pilier der." : "Talonador", sl: "Segunda línea", tr: slot.order === 1 ? "Número 8" : "Flanker" + SIDE(slot.order), hv: slot.order < 1 ? "Apertura" : "Medio melé", tq: wideSlot(slot.order) ? "Ala" + SIDE(slot.order) : "Centro", fb: "Zaguero" }[slot.line]),
  positions: ["Pilier izquierdo", "Talonador", "Pilier derecho", "Segunda línea", "Flanker", "Número 8", "Medio melé", "Apertura", "Centro", "Ala", "Zaguero"],
};

const VB_LINES = ["front", "back"];
const VB = mkF(VB_LINES);
const VOLLEY = {
  id: "volleyball", field: "volleyball", lines: VB_LINES, gkLine: null, defLine: null, defaultFormation: "6 en pista",
  classify: (position) => {
    const p = norm(position);
    if (!p.trim()) return null;
    if (/libero/.test(p)) return { line: "back", order: 1 };
    if (/colocador|pasador|armador/.test(p)) return { line: "back", order: 2 };
    if (/central|medio/.test(p)) return { line: "front", order: 1 };
    if (/opuesto|diagonal/.test(p)) return { line: "front", order: 2 };
    if (/receptor|atacante|punta|banda|\bala\b/.test(p)) return { line: "front", order: 0 };
    return null;
  },
  formations: [VB("6 en pista", [0, 1, 2], [0, 1, 2])],
  slotLabel: (slot) => (slot.line === "front" ? ["Receptor", "Central", "Opuesto"][Math.round(slot.order)] : ["Receptor", "Líbero", "Colocador"][Math.round(slot.order)]),
  positions: ["Colocador", "Opuesto", "Receptor", "Central", "Líbero"],
};

const GPS_APP = {
  id: "gps", field: null, lines: [], gkLine: null, defLine: null, defaultFormation: null,
  classify: () => null,
  formations: [],
  slotLabel: () => "",
  positions: [],
};

const PROFILE_BY_SPORT = { "Fútbol": FOOTBALL, "Hockey": HOCKEY, "Fútbol sala": FUTSAL, "Baloncesto": BASKETBALL, "Balonmano": HANDBALL, "Rugby": RUGBY, "Voleibol": VOLLEY, "GPS/App": GPS_APP };
for (const pr of Object.values(PROFILE_BY_SPORT)) pr.lineIdx = idxOf(pr.lines);

export const SPORT_EMOJIS = { "Fútbol": "⚽", "Hockey": "🏑", "Fútbol sala": "🏃", "Baloncesto": "🏀", "Balonmano": "🤾", "Rugby": "🏉", "Voleibol": "🏐", "GPS/App": "📡" };

export const SPORTS = Object.keys(PROFILE_BY_SPORT);

export function pitchProfile(team) {
  return PROFILE_BY_SPORT[team?.sport] || FOOTBALL;
}
