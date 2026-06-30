"use client";
import { COLORS } from "@/lib/constants";

export default function TopBar({ title, onBack, rightSlot }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: "none", border: "none", color: COLORS.text,
          display: "flex", alignItems: "center", gap: 6, fontSize: 14, padding: "6px 0",
          position: "absolute", left: 0, cursor: "pointer",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.lime} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg> <span style={{ color: COLORS.text }}>Atrás</span>
        </button>
      )}
      {title && (
        <h2 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20, margin: 0, color: COLORS.text }}>
          {title}
        </h2>
      )}
      {rightSlot && <div style={{ position: "absolute", right: 0 }}>{rightSlot}</div>}
    </div>
  );
}
