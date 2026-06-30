"use client";
import { COLORS } from "@/lib/constants";

export default function RingGauge({ value, max = 5, size = 88, color }) {
  const pct = Math.max(0, Math.min(1, (value || 0) / max));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.line} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: size * 0.26, color: COLORS.text }}>
          {typeof value === "number" ? value.toFixed(1) : "–"}
        </span>
      </div>
    </div>
  );
}
