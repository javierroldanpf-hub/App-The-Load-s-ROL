"use client";
import { COLORS } from "@/lib/constants";

export default function SliderField({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{field.label}</span>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20, color: COLORS.lime }}>{value}</span>
      </div>
      <input type="range" min={1} max={5} step={1} value={value}
        onChange={(e) => onChange(field.key, Number(e.target.value))} style={{ width: "100%" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: COLORS.text }}>{field.lowText}</span>
        <span style={{ fontSize: 11, color: COLORS.text }}>{field.highText}</span>
      </div>
    </div>
  );
}
