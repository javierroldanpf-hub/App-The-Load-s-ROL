"use client";
const W = "rgba(255,255,255,0.78)";

const FIELDS = {
  football: {
    bg: "repeating-linear-gradient(180deg, #2d7a38 0px, #2d7a38 60px, #27702f 60px, #27702f 120px)",
    vb: "0 0 68 105",
    draw: (
      <>
        <rect x="2" y="2" width="64" height="101" />
        <line x1="2" y1="52.5" x2="66" y2="52.5" />
        <ellipse cx="34" cy="52.5" rx="9.15" ry="9.15" />
        <rect x="13.84" y="2" width="40.32" height="16.5" />
        <rect x="24.84" y="2" width="18.32" height="5.5" />
        <rect x="13.84" y="86.5" width="40.32" height="16.5" />
        <rect x="24.84" y="97.5" width="18.32" height="5.5" />
        <path d="M 26.7 18.5 A 9.15 9.15 0 0 0 41.3 18.5" />
        <path d="M 26.7 86.5 A 9.15 9.15 0 0 1 41.3 86.5" />
      </>
    ),
  },
  hockey: {
    bg: "repeating-linear-gradient(180deg, #2a78a0 0px, #2a78a0 60px, #256e94 60px, #256e94 120px)",
    vb: "0 0 60 96",
    draw: (
      <>
        <rect x="2" y="2" width="56" height="92" />
        <line x1="2" y1="48" x2="58" y2="48" />
        <line x1="2" y1="25.2" x2="58" y2="25.2" strokeDasharray="3 2" />
        <line x1="2" y1="70.8" x2="58" y2="70.8" strokeDasharray="3 2" />
        <path d="M 15.3 2 A 14.7 14.7 0 0 0 44.7 2" />
        <path d="M 10.2 2 A 19.8 19.8 0 0 0 49.8 2" strokeDasharray="3 2" />
        <path d="M 15.3 94 A 14.7 14.7 0 0 1 44.7 94" />
        <path d="M 10.2 94 A 19.8 19.8 0 0 1 49.8 94" strokeDasharray="3 2" />
        <rect x="27.2" y="0.5" width="5.6" height="1.5" />
        <rect x="27.2" y="94" width="5.6" height="1.5" />
      </>
    ),
  },
  futsal: {
    bg: "#2f6fb5",
    vb: "0 0 20 40",
    draw: (
      <>
        <rect x="2" y="2" width="16" height="36" />
        <line x1="2" y1="20" x2="18" y2="20" />
        <ellipse cx="10" cy="20" rx="3" ry="3" />
        <path d="M 2.5 2 A 6 6 0 0 0 8.5 8 L 11.5 8 A 6 6 0 0 0 17.5 2" />
        <path d="M 2.5 38 A 6 6 0 0 1 8.5 32 L 11.5 32 A 6 6 0 0 1 17.5 38" />
        <rect x="8.5" y="0.6" width="3" height="1.4" />
        <rect x="8.5" y="38" width="3" height="1.4" />
      </>
    ),
  },
  basketball: {
    bg: "#c68a4b",
    vb: "0 0 50 47",
    draw: (
      <>
        <rect x="2" y="2" width="46" height="43" />
        <rect x="17" y="2" width="16" height="19.5" />
        <ellipse cx="25" cy="21.5" rx="6" ry="6" />
        <path d="M 5 2 L 5 16.5 A 22.5 22.5 0 0 0 45 16.5 L 45 2" />
        <line x1="22" y1="4.2" x2="28" y2="4.2" />
        <ellipse cx="25" cy="6.2" rx="1.3" ry="1.3" />
        <path d="M 19 45 A 6 6 0 0 1 31 45" />
      </>
    ),
  },
  handball: {
    bg: "#3a78b8",
    vb: "0 0 24 24",
    draw: (
      <>
        <rect x="2" y="2" width="20" height="20" />
        <path d="M 4.5 2 A 6 6 0 0 0 10.5 8 L 13.5 8 A 6 6 0 0 0 19.5 2" />
        <path d="M 2 4.5 A 9 9 0 0 0 10.5 11 L 13.5 11 A 9 9 0 0 0 22 4.5" strokeDasharray="2 1.5" />
        <line x1="11.4" y1="9" x2="12.6" y2="9" />
        <rect x="10.5" y="0.5" width="3" height="1.5" />
        <ellipse cx="12" cy="22" rx="3" ry="3" />
      </>
    ),
  },
  volleyball: {
    bg: "#2c6fa8",
    vb: "0 0 22 20",
    draw: (
      <>
        <rect x="3" y="2" width="16" height="16" fill="#d98f4e" stroke={W} />
        <line x1="1" y1="2" x2="21" y2="2" strokeWidth="4" />
        <line x1="3" y1="7.3" x2="19" y2="7.3" />
      </>
    ),
  },
  rugby: {
    bg: "repeating-linear-gradient(180deg, #2d7a38 0px, #2d7a38 50px, #27702f 50px, #27702f 100px)",
    vb: "0 0 70 112",
    draw: (
      <>
        <rect x="2" y="2" width="66" height="108" />
        <line x1="2" y1="10" x2="68" y2="10" />
        <line x1="2" y1="102" x2="68" y2="102" />
        <line x1="2" y1="30.2" x2="68" y2="30.2" strokeDasharray="4 3" />
        <line x1="2" y1="81.8" x2="68" y2="81.8" strokeDasharray="4 3" />
        <line x1="2" y1="56" x2="68" y2="56" />
        <line x1="2" y1="46.8" x2="68" y2="46.8" strokeDasharray="2 3" />
        <line x1="2" y1="65.2" x2="68" y2="65.2" strokeDasharray="2 3" />
        <path d="M 31 10 L 31 4 M 39 10 L 39 4 M 31 8 L 39 8" />
        <path d="M 31 102 L 31 108 M 39 102 L 39 108 M 31 104 L 39 104" />
      </>
    ),
  },
};

export default function PitchField({ field = "football" }) {
  const f = FIELDS[field] || FIELDS.football;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: f.bg, pointerEvents: "none" }} />
      <svg viewBox={f.vb} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        fill="none" stroke={W} strokeWidth="2">
        {f.draw}
      </svg>
    </>
  );
}
