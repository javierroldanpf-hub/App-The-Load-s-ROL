"use client";
import { useState, useEffect, useMemo } from "react";
import { COLORS, WELLNESS_FIELDS, INTENSITY_LEVELS } from "@/lib/constants";
import {
  todayStr, fmtDateLong, fmtDateShort, calculateAge,
  weightedWellnessScore, weightedWellnessStatus, rpeStatus,
  sessionLoad, acwr, acwrStatus, mondayOf, weekDates, weekNumberFrom, addDays, weekdayLabel, mean,
} from "@/lib/utils";
import { getPlayerProfile, loadPlayerWeightHistory, loadPlayerPhysicalHistory, getLatestWeight } from "@/lib/db";
import TopBar from "./TopBar";
import Avatar from "./Avatar";
import RingGauge from "./RingGauge";

/* ─── Ring metric ───────────────────────────────────────────────────── */
function RingMetric({ label, value, max, color, displayValue, size = 60 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <RingGauge value={value !== null ? value : 0} max={max} color={color} size={size} strokeWidth={5} />
      </div>
      <span style={{ fontSize: 9, color: COLORS.text, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

/* ─── Weekly chart (individual) ─────────────────────────────────────── */
function WeeklyChartPlayer({ days, sessions, dataByDate, mdTypeAvg, colorFn, fallbackColor, max, label, legendBarLabel, legendLineLabel }) {
  const bars = days.map((date) => {
    const session = sessions.find((s) => s.date === date && s.sessionType && !s.isRest);
    const mdType = session ? session.sessionType : null;
    const intensityColor = session && !session.isRest && session.intensity
      ? (INTENSITY_LEVELS[session.intensity]?.color || COLORS.textFaint)
      : COLORS.textFaint;
    const value = dataByDate[date] ?? null;
    const typeAvg = mdType && mdTypeAvg[mdType] !== undefined ? mdTypeAvg[mdType] : null;
    const barColor = value !== null ? fallbackColor : COLORS.line;
    const labelColor = value !== null && colorFn ? colorFn(value) : "#14171c";
    return { date, mdType, intensityColor, value, typeAvg, barColor, labelColor };
  });

  const w = 340, h = 160;
  const padL = 26, padR = 6, padT = 18, padB = 52;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const safeMax = max > 0 ? max : 1;
  const barW = Math.floor(plotW / 7) - 4;
  const cx = (i) => padL + i * (plotW / 7) + plotW / 14;
  const cy = (v) => padT + plotH - (v / safeMax) * plotH;

  const dotPoints = bars.map((b, i) => b.typeAvg !== null ? { x: cx(i), y: cy(b.typeAvg), val: b.typeAvg } : null);

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.75rem 0.5rem 0.4rem" }}>
      <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6, paddingLeft: 4 }}>{label}</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }}>
        {[0, 0.5, 1].map((pct) => {
          const y = padT + plotH * (1 - pct);
          return <line key={pct} x1={padL} x2={w - padR} y1={y} y2={y} stroke={COLORS.line} strokeWidth={0.5} strokeDasharray="3 3" />;
        })}
        {[0, safeMax / 2, safeMax].map((v, i) => (
          <text key={i} x={padL - 4} y={cy(v) + 3} fontSize={7} fill={COLORS.text} textAnchor="end">
            {Number.isInteger(v) ? v : v.toFixed(1)}
          </text>
        ))}

        {bars.map((b, i) => {
          const bh = b.value !== null ? (b.value / safeMax) * plotH : 0;
          const barTop = padT + plotH - bh;
          return (
            <g key={b.date}>
              <rect x={cx(i) - barW / 2} y={barTop} width={barW} height={bh} rx={3} fill={b.barColor} opacity={b.value !== null ? 0.85 : 0.2} />
              {b.value !== null && bh > 14 && (
                <g>
                  <rect x={cx(i) - 11} y={barTop + bh / 2 - 6} width={22} height={12} rx={2} fill="rgba(20,23,28,0.82)" />
                  <text x={cx(i)} y={barTop + bh / 2} fontSize={7} fill={b.labelColor} textAnchor="middle" dominantBaseline="central" fontWeight="700">{b.value.toFixed(1)}</text>
                </g>
              )}
              {b.value !== null && bh <= 14 && (
                <g>
                  <rect x={cx(i) - 11} y={barTop - 14} width={22} height={12} rx={2} fill="rgba(20,23,28,0.82)" />
                  <text x={cx(i)} y={barTop - 8} fontSize={7} fill={b.labelColor} textAnchor="middle" dominantBaseline="central" fontWeight="700">{b.value.toFixed(1)}</text>
                </g>
              )}
            </g>
          );
        })}

        {dotPoints.map((pt, i) => {
          if (!pt) return null;
          const next = dotPoints.slice(i + 1).find(Boolean);
          if (!next) return null;
          const nextIdx = dotPoints.indexOf(next, i + 1);
          return <line key={`line-${i}`} x1={pt.x} y1={pt.y} x2={dotPoints[nextIdx].x} y2={dotPoints[nextIdx].y} stroke={COLORS.coral} strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />;
        })}
        {dotPoints.map((pt, i) => pt && (
          <g key={`dot-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={3} fill={COLORS.coral} stroke={COLORS.bg} strokeWidth={1} />
            <rect x={pt.x - 11} y={pt.y - 18} width={22} height={12} rx={2} fill="rgba(220,225,230,0.92)" />
            <text x={pt.x} y={pt.y - 12} fontSize={7} fill="#14171c" textAnchor="middle" dominantBaseline="central" fontWeight="700">{pt.val.toFixed(1)}</text>
          </g>
        ))}

        {bars.map((b, i) => (
          <g key={`xlabel-${b.date}`}>
            <text x={cx(i)} y={h - padB + 10} fontSize={8} fill={COLORS.text} textAnchor="middle">{weekdayLabel(b.date).slice(0, 3)}</text>
            {b.mdType && b.mdType.split(" ").map((word, wi) => (
              <text key={wi} x={cx(i)} y={h - padB + 20 + wi * 8} fontSize={6} fill={b.intensityColor} textAnchor="middle" fontWeight="600">{word}</text>
            ))}
          </g>
        ))}
      </svg>
      {(legendBarLabel || legendLineLabel) && (
        <div style={{ display: "flex", gap: 14, paddingLeft: 4, paddingBottom: 4 }}>
          {legendBarLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: fallbackColor, opacity: 0.85 }} />
              <span style={{ fontSize: 9, color: COLORS.text }}>{legendBarLabel}</span>
            </div>
          )}
          {legendLineLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="22" height="10" style={{ flexShrink: 0 }}>
                <line x1="0" y1="5" x2="14" y2="5" stroke={COLORS.coral} strokeWidth="1.5" strokeDasharray="4 3" />
                <circle cx="18" cy="5" r="3" fill={COLORS.coral} />
              </svg>
              <span style={{ fontSize: 9, color: COLORS.text }}>{legendLineLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Week row (historical) ─────────────────────────────────────────── */
function WeekRow({ weekLabel, days, wellnessByDate, rpeByDate, sessionByDate }) {
  const [open, setOpen] = useState(false);
  const hasAny = days.some((d) => wellnessByDate[d] || rpeByDate[d]);
  if (!hasAny) return null;
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
      }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text }}>{weekLabel}</span>
        <span style={{ color: COLORS.text, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {days.map((d) => {
            const w = wellnessByDate[d];
            const r = rpeByDate[d];
            const s = sessionByDate[d];
            if (!w && !r) return null;
            const ws = w ? weightedWellnessScore(w) : null;
            const wsColor = ws !== null ? (ws >= 7.5 ? COLORS.lime : ws >= 5 ? "#f2c63c" : COLORS.coral) : COLORS.textFaint;
            return (
              <div key={d} style={{ background: COLORS.panelRaised, borderRadius: 9, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: w ? 6 : 0 }}>
                  <span style={{ fontSize: 11, color: COLORS.text }}>{fmtDateShort(d)} {s ? `· ${s.sessionType}` : ""}</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    {ws !== null && <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13, color: wsColor }}>WS {ws.toFixed(1)}</span>}
                    {r && <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13, color: r.rpe <= 6 ? COLORS.lime : r.rpe <= 7.5 ? "#f2c63c" : COLORS.coral }}>RPE {r.rpe}</span>}
                    {r && <span style={{ fontSize: 11, color: COLORS.text }}>·{sessionLoad(r)} sRPE</span>}
                  </div>
                </div>
                {w && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                    {WELLNESS_FIELDS.map((f) => {
                      const v = w[f.key];
                      const col = v == null ? COLORS.textFaint : v >= 4 ? COLORS.lime : v >= 3 ? "#f2c63c" : COLORS.coral;
                      return (
                        <div key={f.key} style={{ textAlign: "center", background: COLORS.panel, borderRadius: 6, padding: "4px 2px" }}>
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 12, color: col }}>{v ?? "–"}</div>
                          <div style={{ fontSize: 7, color: COLORS.text }}>{f.shortLabel || f.label.slice(0, 5)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {w?.comment && <div style={{ fontSize: 10, color: COLORS.text, marginTop: 4 }}>W: {w.comment}</div>}
                {r?.comment && <div style={{ fontSize: 10, color: COLORS.text, marginTop: 2 }}>RPE: {r.comment}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Checkin week row ──────────────────────────────────────────────── */
function CheckinWeekRow({ weekLabel, days, wellnessByDate, rpeByDateFull, sessionByDate, weekW, weekR, total }) {
  const [open, setOpen] = useState(false);
  // Solo contar wellness que tienen sesión real
  const weekWReal = days.filter((d) => wellnessByDate[d] && sessionByDate[d]).length;
  const pctW = total > 0 ? Math.round((weekWReal / total) * 100) : null;
  const pctR = total > 0 ? Math.round((weekR / total) * 100) : null;
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
      }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 12, color: COLORS.text }}>{weekLabel}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: COLORS.lime }}>W {weekWReal}/{total}{pctW !== null ? ` · ${pctW}%` : ""}</span>
          <span style={{ fontSize: 10, color: COLORS.blue }}>RPE {weekR}/{total}{pctR !== null ? ` · ${pctR}%` : ""}</span>
          <span style={{ color: COLORS.text, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {days.map((d) => {
            const hasW = !!wellnessByDate[d];
            const hasR = !!rpeByDateFull[d];
            const s = sessionByDate[d];
            const isNoSession = hasW && !s;
            if (!hasW && !hasR && !s) return null;
            return (
              <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelRaised, borderRadius: 8, padding: "6px 10px", opacity: isNoSession ? 0.6 : 1 }}>
                <span style={{ fontSize: 11, color: COLORS.text }}>
                  {fmtDateShort(d)}
                  {s ? ` · ${s.sessionType}` : ""}
                  {isNoSession && <span style={{ fontSize: 10, color: COLORS.textFaint, marginLeft: 6, fontStyle: "italic" }}>No MD</span>}
                </span>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: hasW ? (isNoSession ? COLORS.panelRaised : COLORS.limeDark) : COLORS.panel, color: hasW ? (isNoSession ? COLORS.textFaint : COLORS.lime) : COLORS.textFaint }}>W</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: hasR ? COLORS.blueDark : COLORS.panel, color: hasR ? COLORS.blue : COLORS.textFaint }}>RPE</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function StaffPlayerDetail({ player, wellness, rpe, sessions, team, onBack }) {
  const [profile, setProfile] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [weekMonday, setWeekMonday] = useState(mondayOf(todayStr()));

  useEffect(() => {
    const teamId = team.teamId;
    Promise.all([
      getPlayerProfile(teamId, player.username),
      getLatestWeight(teamId, player.username),
    ]).then(([p, lw]) => {
      setProfile(p);
      setLatestWeight(lw);
    });
  }, [player.username, team]);

  const today = todayStr();
  const myWellness = useMemo(() => wellness.filter((e) => e.username === player.username).sort((a, b) => new Date(b.date) - new Date(a.date)), [wellness, player.username]);
  const myRpe = useMemo(() => rpe.filter((e) => e.username === player.username).sort((a, b) => new Date(b.date) - new Date(a.date)), [rpe, player.username]);

  const todayWellness = myWellness.find((e) => e.date === today);
  const todaySession = sessions.find((s) => s.date === today && !s.isRest);
  const todayRpe = todaySession ? myRpe.find((e) => e.date === today && e.sessionType === todaySession.sessionType) : null;

  const allLoads = myRpe.map((e) => ({ date: e.date, load: sessionLoad(e) }));
  const acwrVal = acwr(allLoads, today);
  const acwrStat = acwrStatus(acwrVal);

  const wScore = todayWellness ? weightedWellnessScore(todayWellness) : null;
  const wStatus = todayWellness ? weightedWellnessStatus(todayWellness) : null;

  const displayName = profile?.displayName || player.displayName || player.username;
  const photoUrl = profile?.photoUrl || player.photoUrl;
  const position = profile?.position || player.position;
  const age = profile?.birthDate ? calculateAge(profile.birthDate) : null;

  /* Historical averages */
  const avgWS = myWellness.length ? mean(myWellness.map((e) => weightedWellnessScore(e))) : null;
  const avgRpe = myRpe.length ? mean(myRpe.map((e) => e.rpe)) : null;

  /* sRPE load comparisons */
  const weekStart = addDays(today, -6);
  const srpeToday = todayRpe ? sessionLoad(todayRpe) : null;
  const teamSrpeToday = (() => {
    const entries = rpe.filter((e) => e.date === today);
    return entries.length ? mean(entries.map((e) => sessionLoad(e))) : null;
  })();
  const playerSrpeWeek = (() => {
    const entries = myRpe.filter((e) => e.date >= weekStart && e.date <= today);
    return entries.length ? mean(entries.map((e) => sessionLoad(e))) : null;
  })();
  const teamSrpeWeek = (() => {
    const entries = rpe.filter((e) => e.date >= weekStart && e.date <= today);
    return entries.length ? mean(entries.map((e) => sessionLoad(e))) : null;
  })();
  /* WS load comparisons */
  const wsToday = wScore;
  const teamWsToday = (() => {
    const entries = wellness.filter((e) => e.date === today);
    return entries.length ? mean(entries.map((e) => weightedWellnessScore(e))) : null;
  })();
  const playerWsWeek = (() => {
    const entries = myWellness.filter((e) => e.date >= weekStart && e.date <= today);
    return entries.length ? mean(entries.map((e) => weightedWellnessScore(e))) : null;
  })();
  const teamWsWeek = (() => {
    const entries = wellness.filter((e) => e.date >= weekStart && e.date <= today);
    return entries.length ? mean(entries.map((e) => weightedWellnessScore(e))) : null;
  })();

  const month28Start = addDays(today, -27);
  const playerWs28 = (() => {
    const entries = myWellness.filter((e) => e.date >= month28Start && e.date <= today);
    return entries.length ? mean(entries.map((e) => weightedWellnessScore(e))) : null;
  })();
  const teamWs28 = (() => {
    const entries = wellness.filter((e) => e.date >= month28Start && e.date <= today);
    return entries.length ? mean(entries.map((e) => weightedWellnessScore(e))) : null;
  })();
  const playerSrpeHistoric = (() => {
    const entries = myRpe.filter((e) => e.date >= month28Start && e.date <= today);
    return entries.length ? mean(entries.map((e) => sessionLoad(e))) : null;
  })();
  const teamSrpeHistoric = (() => {
    const entries = rpe.filter((e) => e.date >= month28Start && e.date <= today);
    return entries.length ? mean(entries.map((e) => sessionLoad(e))) : null;
  })();
  const avgWsColor = avgWS !== null ? (avgWS >= 7.5 ? COLORS.lime : avgWS >= 5 ? "#f2c63c" : COLORS.coral) : COLORS.textFaint;
  const avgRpeColor = avgRpe !== null ? (avgRpe <= 6 ? COLORS.lime : avgRpe <= 7.5 ? "#f2c63c" : COLORS.coral) : COLORS.textFaint;
  const acwrColor = acwrVal !== null ? (acwrVal > 1.5 ? COLORS.coral : acwrVal > 1.3 ? COLORS.amber : acwrVal < 0.8 ? COLORS.blue : COLORS.lime) : COLORS.textFaint;

  /* 7-day charts */
  const days = weekDates(weekMonday);
  const effectiveFirstMonday = team?.firstMonday || mondayOf(today);
  const weekNum = weekNumberFrom(effectiveFirstMonday, weekMonday);

  const wsByDate = useMemo(() => {
    const m = {};
    myWellness.forEach((e) => { m[e.date] = weightedWellnessScore(e); });
    return m;
  }, [myWellness]);

  const rpeByDate = useMemo(() => {
    const m = {};
    myRpe.forEach((e) => { m[e.date] = e.rpe; });
    return m;
  }, [myRpe]);

  /* mdTypeAvg per player */
  const wsMdTypeAvg = useMemo(() => {
    const groups = {};
    sessions.forEach((s) => {
      if (s.isRest || !s.sessionType) return;
      const w = myWellness.find((e) => e.date === s.date);
      if (!w) return;
      if (!groups[s.sessionType]) groups[s.sessionType] = [];
      groups[s.sessionType].push(weightedWellnessScore(w));
    });
    const out = {};
    Object.entries(groups).forEach(([k, arr]) => { out[k] = mean(arr); });
    return out;
  }, [sessions, myWellness]);

  const rpeMdTypeAvg = useMemo(() => {
    const groups = {};
    sessions.forEach((s) => {
      if (s.isRest || !s.sessionType) return;
      const r = myRpe.find((e) => e.date === s.date);
      if (!r) return;
      if (!groups[s.sessionType]) groups[s.sessionType] = [];
      groups[s.sessionType].push(r.rpe);
    });
    const out = {};
    Object.entries(groups).forEach(([k, arr]) => { out[k] = mean(arr); });
    return out;
  }, [myRpe, sessions]);

  /* History weeks */
  const wellnessByDate = useMemo(() => {
    const m = {};
    myWellness.forEach((e) => { m[e.date] = e; });
    return m;
  }, [myWellness]);

  const rpeByDateFull = useMemo(() => {
    const m = {};
    myRpe.forEach((e) => { m[e.date] = e; });
    return m;
  }, [myRpe]);

  const sessionByDate = useMemo(() => {
    const m = {};
    // Solo sesiones con sessionType real (excluye filas solo-individual con sessionType:"")
    sessions.forEach((s) => { if (s.sessionType && !s.isRest) m[s.date] = s; });
    return m;
  }, [sessions]);

  /* Build history weeks (last 12 weeks) */
  const historyWeeks = useMemo(() => {
    const weeks = [];
    let mon = mondayOf(today);
    for (let i = 0; i < 12; i++) {
      const wd = weekDates(mon);
      const num = weekNumberFrom(effectiveFirstMonday, mon);
      weeks.push({ mon, days: wd, label: `Semana ${num} · ${fmtDateShort(wd[0])} – ${fmtDateShort(wd[6])}` });
      mon = addDays(mon, -7);
    }
    return weeks;
  }, [today, effectiveFirstMonday]);

  /* Check-in history */
  const checkinHistory = useMemo(() => {
    const dates = new Set([...myWellness.map((e) => e.date), ...myRpe.map((e) => e.date)]);
    return Array.from(dates).sort((a, b) => b.localeCompare(a)).slice(0, 60);
  }, [myWellness, myRpe]);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      <TopBar onBack={onBack} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, marginTop: 8 }}>
        <Avatar name={displayName} photoUrl={photoUrl} size={68} isInjured={(team.injuredPlayers || []).includes(player.username)} />
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22 }}>{displayName}</div>
          <div style={{ fontSize: 13, color: COLORS.text }}>{position || "Sin posición"}{age ? ` · ${age} años` : ""}</div>
          {latestWeight && <div style={{ fontSize: 12, color: COLORS.text }}>{latestWeight} kg</div>}
        </div>
      </div>

      {/* ── Círculos de hoy ───────────────────────────────────────────── */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 12 }}>Estado de hoy</div>

        {/* WS + RPE */}
        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
          <RingMetric label="Wellness Score" value={wScore} max={10} color={wScore !== null ? (wScore >= 7.5 ? COLORS.lime : wScore >= 5 ? "#f2c63c" : COLORS.coral) : COLORS.textFaint} size={72} />
          <RingMetric
            label="RPE"
            value={todayRpe ? todayRpe.rpe : null}
            max={10}
            color={todayRpe ? rpeStatus(todayRpe.rpe).color : COLORS.textFaint}
            displayValue={todayRpe ? String(todayRpe.rpe) : "–"}
            size={72}
          />
        </div>

        {/* Dimensiones wellness */}
        {todayWellness ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {WELLNESS_FIELDS.map((f) => {
              const v = todayWellness[f.key];
              const col = v == null ? COLORS.textFaint : v >= 4 ? COLORS.lime : v >= 3 ? "#f2c63c" : COLORS.coral;
              return (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ position: "relative", width: 46, height: 46 }}>
                    <RingGauge value={v ?? 0} max={5} color={col} size={46} strokeWidth={4} />
                  </div>
                  <span style={{ fontSize: 8, color: COLORS.text, textAlign: "center" }}>{f.shortLabel || f.label.slice(0, 6)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: COLORS.text, textAlign: "center" }}>Sin wellness de hoy</div>
        )}
      </div>

      {/* ── Media histórica ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 10px 8px" }}>
          <div style={{ fontSize: 9, color: COLORS.text }}>Media WS histórico</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: avgWsColor }}>
            {avgWS !== null ? avgWS.toFixed(1) : "–"}
          </div>
          <div style={{ fontSize: 8, color: COLORS.text }}>/ 10</div>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 10px 8px" }}>
          <div style={{ fontSize: 9, color: COLORS.text }}>Media RPE histórico</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: avgRpeColor }}>
            {avgRpe !== null ? avgRpe.toFixed(1) : "–"}
          </div>
          <div style={{ fontSize: 8, color: COLORS.text }}>/ 10</div>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 10px 8px" }}>
          <div style={{ fontSize: 9, color: COLORS.text }}>A/C sRPE</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: acwrColor }}>
            {acwrVal !== null ? acwrVal.toFixed(2) : "–"}
          </div>
          <div style={{ fontSize: 8, color: acwrColor }}>{acwrStat.label}</div>
        </div>
      </div>

      {/* ── Jugador vs Media del Equipo ───────────────────────────────── */}
      {(() => {
        const CompareRow = ({ rowLabel, todayVal, teamTodayVal, weekVal, teamWeekVal, val28, teamVal28, isWS }) => {
          const cols = [
            { label: "Hoy", p: todayVal, t: teamTodayVal },
            { label: "Semana", p: weekVal, t: teamWeekVal },
            { label: "28 días", p: val28, t: teamVal28 },
          ];
          return (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>{rowLabel}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {cols.map(({ label, p, t }) => {
                  const delta = p !== null && t !== null ? p - t : null;
                  const absDelta = isWS ? 0.3 : 50;
                  const deltaColor = delta === null ? COLORS.textFaint
                    : isWS
                      ? (delta > absDelta ? COLORS.text : delta < -absDelta ? COLORS.coral : "#f2c63c")
                      : (delta > absDelta ? COLORS.coral : delta < -absDelta ? COLORS.blue : COLORS.text);
                  return (
                    <div key={label} style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: COLORS.text, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: deltaColor }}>
                        {delta !== null ? (delta > 0 ? `+${isWS ? delta.toFixed(1) : delta.toFixed(0)}` : (isWS ? delta.toFixed(1) : delta.toFixed(0))) : "–"}
                      </div>
                      <div style={{ fontSize: 8, color: COLORS.text, marginTop: 2 }}>
                        {p !== null ? (isWS ? p.toFixed(1) : p.toFixed(0)) : "–"} / {t !== null ? (isWS ? t.toFixed(1) : t.toFixed(0)) : "–"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        };
        return (
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 12 }}>{(team.kind || "equipo") === "grupo" ? "Atleta vs Media del Grupo" : "Jugador vs Media del Equipo"}</div>
            <CompareRow
              rowLabel="Wellness Score"
              todayVal={wsToday} teamTodayVal={teamWsToday}
              weekVal={playerWsWeek} teamWeekVal={teamWsWeek}
              val28={playerWs28} teamVal28={teamWs28}
              isWS
            />
            <div style={{ borderTop: `1px solid ${COLORS.line}`, marginBottom: 10 }} />
            <CompareRow
              rowLabel="sRPE"
              todayVal={srpeToday} teamTodayVal={teamSrpeToday}
              weekVal={playerSrpeWeek} teamWeekVal={teamSrpeWeek}
              val28={playerSrpeHistoric} teamVal28={teamSrpeHistoric}
            />
          </div>
        );
      })()}

      {/* ── Gráficas semanales ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => setWeekMonday(addDays(weekMonday, -7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>←</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>Semana {weekNum}</div>
          <div style={{ fontSize: 10, color: COLORS.text }}>{fmtDateShort(days[0])} – {fmtDateShort(days[6])}</div>
        </div>
        <button onClick={() => setWeekMonday(addDays(weekMonday, 7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>→</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        <WeeklyChartPlayer
          days={days} sessions={sessions}
          dataByDate={wsByDate} mdTypeAvg={wsMdTypeAvg}
          colorFn={(v) => v >= 7.5 ? COLORS.lime : v >= 5 ? "#f2c63c" : COLORS.coral}
          fallbackColor={COLORS.lime} max={10} label="Wellness Score (semana)"
          legendBarLabel="Wellness del día"
          legendLineLabel="Media histórica por MD type"
        />
        <WeeklyChartPlayer
          days={days} sessions={sessions}
          dataByDate={rpeByDate} mdTypeAvg={rpeMdTypeAvg}
          colorFn={(v) => v <= 6 ? COLORS.lime : v <= 7.5 ? "#f2c63c" : COLORS.coral}
          fallbackColor={COLORS.blue} max={10} label="RPE (semana)"
          legendBarLabel="RPE del día"
          legendLineLabel="Media histórica por MD type"
        />
      </div>

      {/* ── Historial semana a semana ──────────────────────────────────── */}
      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Historial de respuestas</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {historyWeeks.map((wk) => (
          <WeekRow
            key={wk.mon}
            weekLabel={wk.label}
            days={wk.days}
            wellnessByDate={wellnessByDate}
            rpeByDate={rpeByDateFull}
            sessionByDate={sessionByDate}
          />
        ))}
      </div>

      {/* ── Historial de check-ins ─────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 8, fontWeight: 600 }}>Historial de check-ins</div>

      {/* Resumen total */}
      {(() => {
        const today = todayStr();
        const totalSessions = sessions.filter((s) => s.sessionType && !s.isRest && s.date <= today).length;
        const totalW = myWellness.filter((e) => sessionByDate[e.date]).length;
        const totalR = myRpe.length;
        const pctW = totalSessions > 0 ? Math.round((totalW / totalSessions) * 100) : null;
        const pctR = totalSessions > 0 ? Math.round((totalR / totalSessions) * 100) : null;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 4 }}>Wellness completados</div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: COLORS.lime }}>
                {totalW}<span style={{ fontSize: 13, color: COLORS.text, fontWeight: 400 }}>/{totalSessions}</span>
              </div>
              {pctW !== null && <div style={{ fontSize: 10, color: pctW >= 80 ? COLORS.lime : pctW >= 50 ? "#f2c63c" : COLORS.coral, fontWeight: 600 }}>{pctW}%</div>}
            </div>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: COLORS.text, marginBottom: 4 }}>RPE completados</div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: COLORS.blue }}>
                {totalR}<span style={{ fontSize: 13, color: COLORS.text, fontWeight: 400 }}>/{totalSessions}</span>
              </div>
              {pctR !== null && <div style={{ fontSize: 10, color: pctR >= 80 ? COLORS.lime : pctR >= 50 ? "#f2c63c" : COLORS.coral, fontWeight: 600 }}>{pctR}%</div>}
            </div>
          </div>
        );
      })()}

      {/* Semana a semana */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {historyWeeks.map((wk) => {
          const weekSessions = wk.days.map((d) => sessionByDate[d]).filter(Boolean);
          const weekW = wk.days.filter((d) => wellnessByDate[d] && sessionByDate[d]).length;
          const weekR = wk.days.filter((d) => rpeByDateFull[d]).length;
          const total = weekSessions.length;
          const hasAnyData = wk.days.some((d) => wellnessByDate[d] || rpeByDateFull[d] || sessionByDate[d]);
          if (!hasAnyData) return null;
          return (
            <CheckinWeekRow key={wk.mon} weekLabel={wk.label} days={wk.days} wellnessByDate={wellnessByDate} rpeByDateFull={rpeByDateFull} sessionByDate={sessionByDate} weekW={weekW} weekR={weekR} total={total} />
          );
        })}
        {historyWeeks.every((wk) => wk.days.every((d) => !wellnessByDate[d] && !rpeByDateFull[d] && !sessionByDate[d])) && (
          <div style={{ fontSize: 12, color: COLORS.text, textAlign: "center", padding: "1rem" }}>Sin check-ins registrados</div>
        )}
      </div>
    </div>
  );
}
