export const WELLNESS_FIELDS = [
  { key: "fatiga", label: "Fatiga", lowText: "Exhausto", highText: "Muy fresco" },
  { key: "sueno", label: "Calidad del sueño", shortLabel: "Sueño", lowText: "Muy mala", highText: "Excelente" },
  { key: "estres", label: "Estrés", lowText: "Muy estresado", highText: "Muy relajado" },
  { key: "animo", label: "Estado de ánimo", shortLabel: "Ánimo", lowText: "Muy bajo", highText: "Muy positivo" },
  { key: "dolor", label: "Dolor muscular", lowText: "Mucho dolor", highText: "Sin dolor" },
];

export const RPE_ANCHORS = [
  { v: 0, t: "Reposo" }, { v: 1, t: "Muy muy leve" }, { v: 2, t: "Leve" },
  { v: 3, t: "Moderado" }, { v: 4, t: "Algo duro" }, { v: 5, t: "Duro" },
  { v: 6, t: "Duro+" }, { v: 7, t: "Muy duro" }, { v: 8, t: "Muy duro+" },
  { v: 9, t: "Muy muy duro" }, { v: 10, t: "Máximo" },
];

export const SESSION_TYPES = [
  { id: "MD-5", label: "MD-5" },
  { id: "MD-4", label: "MD-4" },
  { id: "MD-3", label: "MD-3" },
  { id: "MD-2", label: "MD-2" },
  { id: "MD-1", label: "MD-1" },
  { id: "MD+1", label: "MD+1" },
  { id: "MD+2", label: "MD+2" },
  { id: "MD+3", label: "MD+3" },
  { id: "MD(H)", label: "MD (H) · Partido en casa", isMatch: true },
  { id: "MD(A)", label: "MD (A) · Partido fuera", isMatch: true },
  { id: "DESCANSO", label: "Descanso", isRest: true },
];

export const MATCH_DEFAULT_DURATION = 80;

export const GROUP_SESSION_TYPES = [
  { id: "Sesión 1", label: "Sesión 1" },
  { id: "Sesión 2", label: "Sesión 2" },
  { id: "Sesión 3", label: "Sesión 3" },
  { id: "Sesión 4", label: "Sesión 4" },
  { id: "Sesión 5", label: "Sesión 5" },
  { id: "Sesión 6", label: "Sesión 6" },
  { id: "Sesión 7", label: "Sesión 7" },
  { id: "Competición", label: "Competición", isMatch: true },
];

export const INTENSITY_LEVELS = {
  amarillo: { label: "Amarillo", color: "#f2c63c", dark: "#3a2f0c", text: "#1a1604" },
  naranja: { label: "Naranja", color: "#ff9f40", dark: "#3a2710", text: "#1f1206" },
  rojo: { label: "Rojo", color: "#ff5a5f", dark: "#3a1517", text: "#1f0a0b" },
  "rojo+": { label: "Rojo+ (partido)", color: "#c01f3c", dark: "#330c14", text: "#fce8eb" },
  descanso: { label: "Descanso", color: "#5a6470", dark: "transparent", text: "#8a939e" },
};

export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const RM_EXERCISES = [
  { key: "sentadilla", label: "Sentadilla" },
  { key: "cargada", label: "Cargada" },
  { key: "pressBanca", label: "Press de banca" },
  { key: "hipThrust", label: "Hip Thrust" },
];

export const RM_PERCENTAGES = [50, 60, 70, 80, 90, 100, 110, 120, 130];

export const PERFORMANCE_METRICS = [
  { key: "cmj", label: "Altura del CMJ", unit: "cm" },
  { key: "vam", label: "VAM", unit: "km/h" },
  { key: "vift", label: "Vift", unit: "km/h" },
  { key: "vmax", label: "V. Máx.", unit: "km/h" },
  { key: "acc10", label: "Tiempo de ACC 10m", unit: "s" },
  { key: "acc30", label: "Tiempo de ACC 30m", unit: "s" },
];

export const EXTERNAL_LOAD_METRICS = [
  { key: "totalDistance", label: "Distancia total", unit: "m" },
  { key: "hsr", label: "High Speed Running", unit: "m" },
  { key: "sprintDistance", label: "Distancia Sprint", unit: "m" },
  { key: "accelerations", label: "Nº de aceleraciones", unit: "" },
  { key: "decelerations", label: "Nº de deceleraciones", unit: "" },
  { key: "sprints", label: "Nº de sprints", unit: "" },
  { key: "hmld", label: "High Metabolic Load Distance", unit: "m" },
];

export const DEFAULT_POSITIONS = [
  "Portero", "Defensa central", "Lateral derecho", "Lateral izquierdo",
  "Mediocentro defensivo", "Mediocentro", "Mediapunta",
  "Extremo derecho", "Extremo izquierdo", "Delantero",
];

export const LATERALITY_OPTIONS = ["Derecha", "Izquierda", "Ambidiestro"];

export const COLORS = {
  bg: "#14171c", panel: "#1c2128", panelRaised: "#232a33", line: "#2e3640",
  text: "#eef1f4", textDim: "#8a939e", textFaint: "#5a6470",
  lime: "#b6e000", limeDark: "#27310a",
  amber: "#ff9f40", amberDark: "#3a2710",
  coral: "#ff5a5f", coralDark: "#3a1517",
  blue: "#4fb3ff", blueDark: "#102733",
};

export const TEAM_KINDS = {
  equipo: { label: "Equipo", memberLabel: "jugador", memberLabelPlural: "jugadores" },
  grupo: { label: "Grupo de entrenamiento", memberLabel: "atleta", memberLabelPlural: "atletas" },
  individual: { label: "Atleta Individual", memberLabel: "atleta", memberLabelPlural: "atletas" },
};

export const WELLNESS_WEIGHTS = { fatiga: 0.30, sueno: 0.20, estres: 0.05, animo: 0.05, dolor: 0.40 };

export const DEFAULT_QUADRANT_CONFIG = {
  xKey: "rm:sentadilla",
  yKey: "perf:vmax",
  xMid: null,
  yMid: null,
  labelTopRight: "Mantener Foco en Velocidad y Fuerza",
  labelTopLeft: "Priorizar Velocidad",
  labelBottomRight: "Priorizar Fuerza",
  labelBottomLeft: "Priorizar Velocidad y Fuerza",
};
