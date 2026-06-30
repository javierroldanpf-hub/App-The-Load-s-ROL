"use client";
import { useState, useMemo } from "react";
import { COLORS, WELLNESS_FIELDS, INTENSITY_LEVELS } from "@/lib/constants";
import { todayStr, addDays, weightedWellnessScore, rpeStatus, acwr, acwrStatus, sessionLoad } from "@/lib/utils";
import Avatar from "./Avatar";

function dotColor(acwrVal) {
  if (acwrVal === null) return COLORS.textFaint;
  if (acwrVal > 1.3) return COLORS.coral;
  if (acwrVal > 1.0) return "#f2c63c";
  return COLORS.lime;
}

export default function PlayerCard({ player, wellness, rpe, sessions, onClick, isInjured }) {
  const [open, setOpen] = useState(false);
  const today = todayStr();
  const weekAgo = addDays(today, -6);

  const weekWellness = useMemo(() => wellness.filter((e) => e.username === player.username && e.date >= weekAgo && e.date <= today), [wellness, player.username, weekAgo, today]);
  const weekRpe = useMemo(() => rpe.filter((e) => e.username === player.username && e.date >= weekAgo && e.date <= today), [rpe, player.username, weekAgo, today]);

  const avgWS = useMemo(() => weekWellness.length ? weekWellness.reduce((s, e) => s + weightedWellnessScore(e), 0) / weekWellness.length : null, [weekWellness]);
  const avgRpe = useMemo(() => weekRpe.length ? weekRpe.reduce((s, e) => s + e.rpe, 0) / weekRpe.length : null, [weekRpe]);

  const wsColor = avgWS !== null ? (avgWS >= 7.5 ? COLORS.lime : avgWS >= 5 ? "#f2c63c" : COLORS.coral) : COLORS.textFaint;
  const wsbg   = avgWS !== null ? (avgWS >= 7.5 ? COLORS.limeDark : avgWS >= 5 ? "#3a2f0c" : COLORS.coralDark) : COLORS.panelRaised;
  const rpeColor = avgRpe !== null ? (avgRpe <= 6 ? COLORS.lime : avgRpe <= 7.5 ? "#f2c63c" : COLORS.coral) : COLORS.textFaint;
  const rpebg    = avgRpe !== null ? (avgRpe <= 6 ? COLORS.limeDark : avgRpe <= 7.5 ? "#3a2f0c" : COLORS.coralDark) : COLORS.panelRaised;

  const allLoads = useMemo(() => rpe.filter((e) => e.username === player.username).map((e) => ({ date: e.date, load: sessionLoad(e) })), [rpe, player.username]);
  const acwrVal = acwr(allLoads, today);
  const acwrStat = acwrStatus(acwrVal);
  const acwrColor = acwrVal !== null ? (acwrVal > 1.5 ? COLORS.coral : acwrVal > 1.3 ? COLORS.amber : acwrVal < 0.8 ? COLORS.blue : COLORS.lime) : COLORS.textFaint;
  const acwrbg   = acwrVal !== null ? (acwrVal > 1.5 ? COLORS.coralDark : acwrVal > 1.3 ? COLORS.amberDark : acwrVal < 0.8 ? COLORS.blueDark : COLORS.limeDark) : COLORS.panelRaised;

  const todaySession = sessions.find((s) => s.date === today && !s.isRest);
  const todayWellness = wellness.find((e) => e.username === player.username && e.date === today);
  const todayRpe = todaySession ? rpe.find((e) => e.username === player.username && e.date === today && e.sessionType === todaySession.sessionType) : null;
  const srpe = todayRpe ? sessionLoad(todayRpe) : null;

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.75rem", overflow: "hidden" }}>

      {/* Cabecera */}
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
        <Avatar name={player.displayName || player.username} photoUrl={player.photoUrl} size={36} isInjured={isInjured} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {player.displayName || player.username}
          </div>
          <div style={{ fontSize: 9, marginTop: 1, fontWeight: 600, color: todaySession?.intensity ? (INTENSITY_LEVELS[todaySession.intensity]?.color || COLORS.textFaint) : COLORS.textFaint }}>
            {todaySession ? todaySession.sessionType : "Sin sesión hoy"}
          </div>
        </div>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor(acwrVal), flexShrink: 0, display: "inline-block", marginRight: 2 }} />
      </div>

      {/* WS · RPE · ACWR semana */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
        <div style={{ background: wsbg, borderRadius: 8, padding: "4px 6px" }}>
          <div style={{ fontSize: 8, color: COLORS.text }}>WS · sem.</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 17, color: wsColor }}>
            {avgWS !== null ? avgWS.toFixed(1) : "–"}
          </div>
        </div>
        <div style={{ background: rpebg, borderRadius: 8, padding: "4px 6px" }}>
          <div style={{ fontSize: 8, color: COLORS.text }}>RPE · sem.</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 17, color: rpeColor }}>
            {avgRpe !== null ? avgRpe.toFixed(1) : "–"}
          </div>
        </div>
        <div style={{ background: acwrbg, borderRadius: 8, padding: "4px 6px" }}>
          <div style={{ fontSize: 8, color: COLORS.text }}>A/C sRPE</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 17, color: acwrColor }}>
            {acwrVal !== null ? acwrVal.toFixed(2) : "–"}
          </div>
          {acwrVal !== null && <div style={{ fontSize: 7, color: acwrColor }}>{acwrStat.label}</div>}
        </div>
      </div>

      {/* Desplegable */}
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "100%", background: COLORS.panelRaised, border: "none", borderRadius: 8,
        padding: "5px 8px", fontSize: 10, fontWeight: 600, color: COLORS.blue,
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>Ver respuestas de hoy</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {todayWellness ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
              {WELLNESS_FIELDS.map((f) => {
                const v = todayWellness[f.key];
                const col = v == null ? COLORS.textFaint : v >= 4 ? COLORS.lime : v >= 3 ? "#f2c63c" : COLORS.coral;
                return (
                  <div key={f.key} style={{ background: COLORS.panelRaised, borderRadius: 7, padding: "4px 3px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: col }}>{v != null ? v : "–"}</div>
                    <div style={{ fontSize: 7, color: COLORS.text, lineHeight: 1.2 }}>{f.label.slice(0, 6)}</div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ fontSize: 10, color: COLORS.text }}>Sin wellness hoy</div>}

          {todayRpe ? (
            <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "6px 8px", display: "flex", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, color: COLORS.text }}>RPE</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: rpeStatus(todayRpe.rpe).color }}>{todayRpe.rpe}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: COLORS.text }}>Minutos</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>{todayRpe.duration}'</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: COLORS.text }}>sRPE</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>{srpe}</div>
              </div>
            </div>
          ) : <div style={{ fontSize: 10, color: COLORS.text }}>Sin RPE hoy</div>}

          {todayWellness?.comment && (
            <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "5px 8px", fontSize: 10, color: COLORS.text }}>
              <span style={{ color: COLORS.lime, fontWeight: 700, marginRight: 4 }}>W</span>{todayWellness.comment}
            </div>
          )}
          {todayRpe?.comment && (
            <div style={{ background: COLORS.panelRaised, borderRadius: 8, padding: "5px 8px", fontSize: 10, color: COLORS.text }}>
              <span style={{ color: COLORS.blue, fontWeight: 700, marginRight: 4 }}>RPE</span>{todayRpe.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
