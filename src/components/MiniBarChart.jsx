"use client";
import { COLORS } from "@/lib/constants";

export default function MiniBarChart({ data, color, max, height = 140 }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, padding: "0 2px" }}>
      {data.map((d, i) => {
        const h = d.value === null ? 2 : Math.max(4, (d.value / max) * (height - 24));
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ width: "100%", maxWidth: 18, height: h, borderRadius: 3, background: d.value === null ? COLORS.line : color, opacity: d.value === null ? 0.4 : 1 }} />
            <span style={{ fontSize: 9, color: COLORS.text, marginTop: 6, whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
