"use client";

export default function StatusPill({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 20,
      background: bg || "transparent", color, fontSize: 12, fontWeight: 600,
      border: bg ? "none" : `1px solid ${color}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}
