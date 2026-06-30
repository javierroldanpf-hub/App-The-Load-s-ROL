"use client";
import { COLORS } from "@/lib/constants";

export default function Avatar({ name, size = 40, photoUrl, square = true, isInjured = false }) {
  const nameStr = typeof name === "string" ? name : (name?.displayName || name?.username || "??");
  const initials = (nameStr || "??").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const seed = nameStr || "x";
  const hue = (seed.charCodeAt(0) * 7 + seed.charCodeAt(seed.length - 1) * 13) % 360;
  const radius = square ? "20%" : "50%";

  const img = photoUrl ? (
    <img src={photoUrl} alt={nameStr || ""} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, border: `1.5px solid ${COLORS.line}`, display: "block" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: radius, background: `hsl(${hue}, 35%, 22%)`, color: `hsl(${hue}, 70%, 75%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: size * 0.36, flexShrink: 0, border: `1.5px solid hsl(${hue}, 35%, 30%)` }}>
      {initials || "?"}
    </div>
  );

  if (!isInjured) return img;

  const badgeSize = Math.max(12, Math.round(size * 0.38));
  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      {img}
      <span style={{
        position: "absolute", bottom: -2, right: -2,
        width: badgeSize, height: badgeSize, borderRadius: "50%",
        background: COLORS.coralDark, border: `1.5px solid ${COLORS.coral}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: badgeSize * 0.65, lineHeight: 1,
      }}>🤕</span>
    </div>
  );
}
