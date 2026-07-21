"use client";
import { useMemo, useState } from "react";
import { COLORS, WELLNESS_FIELDS, INTENSITY_LEVELS } from "@/lib/constants";
import { todayStr, mondayOf, addDays, weekDates, weekNumberFrom, fmtDateShort, weekdayLabel, weightedWellnessScore, rpeStatus, mean } from "@/lib/utils";

function MetricCard({ label, value, color, subtitle }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "0.9rem 1rem" }}>
      <div style={{ fontSize: 11, color: COLORS.text }}>{label}</div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 26, color: color || COLORS.text, marginTop: 4 }}>
        {value !== null && value !== undefined ? (typeof value === "number" ? value.toFixed(1) : value) : "–"}
      </div>
      {subtitle && <div style={{ fontSize: 11, color: COLORS.text, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function wsBarColor(v) {
  if (v === null) return COLORS.line;
  if (v >= 7.5) return COLORS.lime;
  if (v >= 5) return "#f2c63c";
  return COLORS.coral;
}
function rpeBarColor(v) {
  if (v === null) return COLORS.line;
  if (v <= 6) return COLORS.lime;
  if (v <= 7.5) return "#f2c63c";
  return COLORS.coral;
}

export function ColorLegend() {
  const row = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 5 };
  const label = { fontSize: 10, color: COLORS.text, fontWeight: 600, minWidth: 72 };
  const dot = (c) => ({ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" });
  return (
    <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
      <span style={{ fontSize: 10, color: COLORS.text, fontWeight: 600, display: "block", marginBottom: 6 }}>Rangos de color</span>
      <div style={row}>
        <span style={label}>Wellness:</span>
        {[{ c: COLORS.lime, t: "≥7.5 Óptimo" }, { c: "#f2c63c", t: "5–7.4 Normal" }, { c: COLORS.coral, t: "<5 Alerta" }].map(({ c, t }) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: COLORS.text }}>
            <span style={dot(c)} />{t}
          </span>
        ))}
      </div>
      <div style={row}>
        <span style={label}>RPE:</span>
        {[{ c: COLORS.lime, t: "≤6 Bajo" }, { c: "#f2c63c", t: "6–7.5 Medio" }, { c: COLORS.coral, t: ">7.5 Alto" }].map(({ c, t }) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: COLORS.text }}>
            <span style={dot(c)} />{t}
          </span>
        ))}
      </div>
      <div style={{ ...row, marginBottom: 0 }}>
        <span style={label}>Intensidad MD:</span>
        {[{ c: "#f2c63c", t: "Media-Baja" }, { c: "#ff9f40", t: "Media-Alta" }, { c: "#ff5a5f", t: "Alta" }].map(({ c, t }) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: COLORS.text }}>
            <span style={dot(c)} />{t}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeeklyChart({ days, sessions, dataByDate, mdTypeAvg, colorFn, fallbackColor, max, label, isEquipo = true }) {
  const bars = days.map((date) => {
    const session = sessions.find((s) => s.date === date);
    const mdType = session && !session.isRest ? session.sessionType : null;
    const intensityColor = session && !session.isRest && session.intensity ? (INTENSITY_LEVELS[session.intensity]?.color || COLORS.textFaint) : COLORS.textFaint;
    const value = dataByDate[date] ?? null;
    const typeAvg = mdType && mdTypeAvg[mdType] !== undefined ? mdTypeAvg[mdType] : null;
    const barColor = value !== null ? fallbackColor : COLORS.line;
    const labelColor = value !== null && colorFn ? colorFn(value) : "#eef1f4";
    return { date, mdType, intensityColor, value, typeAvg, barColor, labelColor };
  });

  const w = 340, h = 170;
  const padL = 28, padR = 8, padT = 20, padB = 48;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const safeMax = max > 0 ? max : 1;

  const barW = Math.floor(plotW / 7) - 4;
  const cx = (i) => padL + i * (plotW / 7) + plotW / 14;
  const cy = (v) => padT + plotH - (v / safeMax) * plotH;

  const dotPoints = bars.map((b, i) => b.typeAvg !== null ? { x: cx(i), y: cy(b.typeAvg), val: b.typeAvg } : null);

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem 0.75rem 0.5rem" }}>
      <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8, paddingLeft: 4 }}>{label}</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }}>
        {[0, 0.5, 1].map((pct) => {
          const y = padT + plotH * (1 - pct);
          return <line key={pct} x1={padL} x2={w - padR} y1={y} y2={y} stroke={COLORS.line} strokeWidth={0.5} strokeDasharray="3 3" />;
        })}
        {[0, safeMax / 2, safeMax].map((v, i) => (
          <text key={i} x={padL - 4} y={cy(v) + 3} fontSize={7} fill={COLORS.text} textAnchor="end" fontFamily="'Oswald', sans-serif" fontWeight="600">
            {Number.isInteger(v) ? v : v.toFixed(1)}
          </text>
        ))}

        {/* Barras con color dinámico + etiqueta dentro */}
        {bars.map((b, i) => {
          const bh = b.value !== null ? (b.value / safeMax) * plotH : 0;
          const barTop = padT + plotH - bh;
          return (
            <g key={b.date}>
              <rect
                x={cx(i) - barW / 2} y={barTop}
                width={barW} height={bh}
                rx={3}
                fill={b.barColor}
                opacity={b.value !== null ? 0.85 : 0.2}
              />
              {b.value !== null && bh > 14 && (
                <g>
                  <rect x={cx(i) - 11} y={barTop + bh / 2 - 6} width={22} height={12} rx={2} fill="rgba(20,23,28,0.82)" />
                  <text x={cx(i)} y={barTop + bh / 2} fontSize={7} fill={b.labelColor} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="'Oswald', sans-serif">
                    {b.value.toFixed(1)}
                  </text>
                </g>
              )}
              {b.value !== null && bh <= 14 && (
                <g>
                  <rect x={cx(i) - 11} y={barTop - 14} width={22} height={12} rx={2} fill="rgba(20,23,28,0.82)" />
                  <text x={cx(i)} y={barTop - 8} fontSize={7} fill={b.labelColor} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="'Oswald', sans-serif">
                    {b.value.toFixed(1)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Línea de rayas */}
        {dotPoints.map((pt, i) => {
          if (!pt) return null;
          const next = dotPoints.slice(i + 1).find(Boolean);
          if (!next) return null;
          const nextIdx = dotPoints.indexOf(next, i + 1);
          return (
            <line key={`line-${i}`}
              x1={pt.x} y1={pt.y} x2={dotPoints[nextIdx].x} y2={dotPoints[nextIdx].y}
              stroke={COLORS.coral} strokeWidth={1} strokeDasharray="4 3" opacity={0.8}
            />
          );
        })}

        {/* Puntos con etiqueta de datos */}
        {dotPoints.map((pt, i) => pt && (
          <g key={`dot-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={3.5} fill={COLORS.coral} stroke={COLORS.bg} strokeWidth={1} />
            <rect x={pt.x - 11} y={pt.y - 19} width={22} height={12} rx={2} fill="rgba(220,225,230,0.92)" />
            <text x={pt.x} y={pt.y - 13} fontSize={7} fill="#14171c" textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="'Oswald', sans-serif">
              {pt.val.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Eje X */}
        {bars.map((b, i) => (
          <g key={`xlabel-${b.date}`}>
            <text x={cx(i)} y={h - padB + 12} fontSize={8} fill={COLORS.text} textAnchor="middle">
              {weekdayLabel(b.date).slice(0, 3)}
            </text>
            {b.mdType && (
              <text x={cx(i)} y={h - padB + 22} fontSize={7} fill={b.intensityColor} textAnchor="middle" fontWeight="600">
                {b.mdType}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, paddingLeft: 4, marginTop: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: COLORS.text }}>
          <span style={{ width: 10, height: 8, borderRadius: 2, background: fallbackColor, display: "inline-block", opacity: 0.85 }} />
          Promedio equipo (día)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: COLORS.text }}>
          <span style={{ width: 14, borderTop: `1px dashed ${COLORS.coral}`, display: "inline-block", opacity: 0.8 }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.coral, display: "inline-block" }} />
          {isEquipo ? "Promedio histórico por MD type" : "Promedio histórico por Nº de Sesión"}
        </span>
      </div>
    </div>
  );
}

export default function TeamAveragesPanel({ team, wellness, rpe, sessions, displayNames = {}, isEquipo = true }) {
  const today = todayStr();
  const roster = (team.roster || []).map((u) => typeof u === "string" ? u : u.username);

  const effectiveFirstMonday = team?.firstMonday || mondayOf(today);

  const [wWeekMonday, setWWeekMonday] = useState(mondayOf(today));
  const wWeekNum = weekNumberFrom(effectiveFirstMonday, wWeekMonday);
  const wDays = weekDates(wWeekMonday);

  const [rWeekMonday, setRWeekMonday] = useState(mondayOf(today));
  const rWeekNum = weekNumberFrom(effectiveFirstMonday, rWeekMonday);
  const rDays = weekDates(rWeekMonday);

  const [metricPeriod, setMetricPeriod] = useState("today");

  const periodStart = useMemo(() => {
    if (metricPeriod === "week") return addDays(today, -6);
    if (metricPeriod === "month") return addDays(today, -27);
    return today;
  }, [metricPeriod, today]);

  // --- Métricas de hoy (para check-in y pending) ---
  const todaySession = sessions.find((s) => s.date === today && !s.isRest);
  const todayWellness = wellness.filter((e) => e.date === today);
  const todayRpe = todaySession ? rpe.filter((e) => e.date === today && e.sessionType === todaySession.sessionType) : [];

  // --- Métricas según período seleccionado ---
  const periodWellness = useMemo(() => wellness.filter((e) => e.date >= periodStart && e.date <= today), [wellness, periodStart, today]);
  const periodRpe = useMemo(() => rpe.filter((e) => e.date >= periodStart && e.date <= today), [rpe, periodStart, today]);

  const avgWellness = useMemo(() => {
    if (!periodWellness.length) return null;
    return periodWellness.reduce((s, e) => s + weightedWellnessScore(e), 0) / periodWellness.length;
  }, [periodWellness]);

  const avgRpe = useMemo(() => {
    if (!periodRpe.length) return null;
    return periodRpe.reduce((s, e) => s + e.rpe, 0) / periodRpe.length;
  }, [periodRpe]);

  // Jugadores que han completado AMBOS formularios hoy
  const completedBothToday = useMemo(() => {
    if (!todaySession) return 0;
    return roster.filter((username) => {
      const hasW = todayWellness.some((e) => e.username === username);
      const hasR = todayRpe.some((e) => e.username === username);
      return hasW && hasR;
    }).length;
  }, [roster, todayWellness, todayRpe, todaySession]);

  // Jugadores que NO han hecho check-in completo hoy
  const pendingCheckin = useMemo(() => {
    return roster
      .filter((username) => {
        const hasW = todayWellness.some((e) => e.username === username);
        const hasR = todaySession ? todayRpe.some((e) => e.username === username) : true;
        return !hasW || !hasR;
      })
      .map((username) => {
        const displayName = displayNames[username]?.displayName || wellness.find((e) => e.username === username)?.displayName || rpe.find((e) => e.username === username)?.displayName || username;
        return { username, displayName };
      });
  }, [roster, todayWellness, todayRpe, todaySession, wellness]);

  // --- Datos por día para cada semana ---
  const wellnessByDate = useMemo(() => {
    const map = {};
    wDays.forEach((date) => {
      const entries = wellness.filter((e) => e.date === date);
      map[date] = entries.length ? entries.reduce((s, e) => s + weightedWellnessScore(e), 0) / entries.length : null;
    });
    return map;
  }, [wellness, wDays]);

  const rpeByDate = useMemo(() => {
    const map = {};
    rDays.forEach((date) => {
      const entries = rpe.filter((e) => e.date === date);
      map[date] = entries.length ? entries.reduce((s, e) => s + e.rpe, 0) / entries.length : null;
    });
    return map;
  }, [rpe, rDays]);

  // --- Promedio histórico por match day type ---
  const wellnessByMdType = useMemo(() => {
    const grouped = {};
    sessions.filter((s) => !s.isRest && s.sessionType).forEach((s) => {
      const dayW = wellness.filter((e) => e.date === s.date);
      if (!dayW.length) return;
      const avg = dayW.reduce((sum, e) => sum + weightedWellnessScore(e), 0) / dayW.length;
      if (!grouped[s.sessionType]) grouped[s.sessionType] = [];
      grouped[s.sessionType].push(avg);
    });
    const result = {};
    Object.entries(grouped).forEach(([type, vals]) => {
      result[type] = mean(vals);
    });
    return result;
  }, [sessions, wellness]);

  const rpeByMdType = useMemo(() => {
    const grouped = {};
    sessions.forEach((s) => {
      if (s.isRest || !s.sessionType) return;
      const dayR = rpe.filter((e) => e.date === s.date);
      if (!dayR.length) return;
      const avg = dayR.reduce((sum, e) => sum + e.rpe, 0) / dayR.length;
      if (!grouped[s.sessionType]) grouped[s.sessionType] = [];
      grouped[s.sessionType].push(avg);
    });
    const result = {};
    Object.entries(grouped).forEach(([type, vals]) => {
      result[type] = mean(vals);
    });
    return result;
  }, [sessions, rpe]);

  // --- Wellness por dimensión (semana seleccionada en gráfica wellness) ---
  const wWeekWellness = useMemo(() => wellness.filter((e) => wDays.includes(e.date)), [wellness, wDays]);
  const dimensionAverages = useMemo(() => {
    return WELLNESS_FIELDS.map((f) => {
      const vals = wWeekWellness.map((e) => e[f.key]).filter((v) => v != null);
      return { ...f, avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null };
    });
  }, [wWeekWellness]);

  const maxWellness = 10;
  const maxRpe = 10;

  const wellnessColor = avgWellness !== null
    ? (avgWellness >= 7.5 ? COLORS.lime : avgWellness >= 5 ? "#f2c63c" : COLORS.coral)
    : COLORS.textFaint;

  const rpeColor = avgRpe !== null
    ? (avgRpe <= 6 ? COLORS.lime : avgRpe <= 7.5 ? "#f2c63c" : COLORS.coral)
    : COLORS.textFaint;

  const PERIOD_LABELS = { today: "Hoy", week: "Última semana", month: "Últimos 28 días" };

  const currentWeekMonday = mondayOf(today);
  const currentWeekNum = weekNumberFrom(effectiveFirstMonday, currentWeekMonday);
  const currentWeekSunday = addDays(currentWeekMonday, 6);
  const periodSubtitle = useMemo(() => {
    if (metricPeriod === "today") {
      return todaySession ? `${todaySession.sessionType} · ${fmtDateShort(today)}` : `Sin sesión · ${fmtDateShort(today)}`;
    }
    if (metricPeriod === "week") {
      return `Semana ${currentWeekNum} · ${fmtDateShort(currentWeekMonday)} – ${fmtDateShort(currentWeekSunday)}`;
    }
    if (metricPeriod === "month") {
      return `${fmtDateShort(addDays(today, -27))} – ${fmtDateShort(today)}`;
    }
    return "";
  }, [metricPeriod, today, todaySession, currentWeekNum, currentWeekMonday, currentWeekSunday]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <ColorLegend />

      {/* Métricas según período */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <select
            value={metricPeriod}
            onChange={(e) => setMetricPeriod(e.target.value)}
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "'Oswald', sans-serif" }}
          >
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <option key={key} value={key} style={{ background: COLORS.panel, color: COLORS.text }}>{label}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: COLORS.text }}>· {periodSubtitle}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <MetricCard
            label="Wellness Score"
            value={avgWellness}
            color={wellnessColor}
            subtitle={`${periodWellness.length} registros`}
          />
          <MetricCard
            label="RPE medio"
            value={avgRpe}
            color={rpeColor}
            subtitle={`${periodRpe.length} registros`}
          />
          <MetricCard
            label="Check-in hoy"
            value={`${completedBothToday}/${roster.length}`}
            color={COLORS.text}
            subtitle="wellness + RPE"
          />
        </div>
      </div>

      {/* Jugadores pendientes de check-in */}
      {pendingCheckin.length > 0 && (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: 11, color: COLORS.coral, fontWeight: 600, marginBottom: 8 }}>
            Sin check-in hoy ({pendingCheckin.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pendingCheckin.map(({ username, displayName }) => (
              <span key={username} style={{ fontSize: 11, color: COLORS.text, background: COLORS.panelRaised, borderRadius: 6, padding: "3px 8px" }}>
                {displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gráfica Wellness con su navegador */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setWWeekMonday(addDays(wWeekMonday, -7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>←</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>Semana {wWeekNum}</div>
            <div style={{ fontSize: 10, color: COLORS.text }}>{fmtDateShort(wDays[0])} – {fmtDateShort(wDays[6])}</div>
          </div>
          <button onClick={() => setWWeekMonday(addDays(wWeekMonday, 7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>→</button>
        </div>

        <WeeklyChart
          days={wDays}
          sessions={sessions}
          dataByDate={wellnessByDate}
          mdTypeAvg={wellnessByMdType}
          colorFn={wsBarColor}
          fallbackColor={COLORS.lime}
          max={maxWellness}
          label="Wellness Score medio (0-10)"
          isEquipo={isEquipo}
        />

        {/* Wellness por dimensión — se mueve con el navegador de wellness */}
        {wWeekWellness.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6 }}>Por dimensión · Semana {wWeekNum}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {dimensionAverages.map((f) => (
                <div key={f.key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "0.6rem 0.4rem", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: f.avg === null ? COLORS.textFaint : f.avg >= 4 ? COLORS.lime : f.avg >= 3 ? "#f2c63c" : COLORS.coral }}>
                    {f.avg !== null ? f.avg.toFixed(1) : "–"}
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.text, marginTop: 2 }}>{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gráfica RPE con su propio navegador */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setRWeekMonday(addDays(rWeekMonday, -7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>←</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>Semana {rWeekNum}</div>
            <div style={{ fontSize: 10, color: COLORS.text }}>{fmtDateShort(rDays[0])} – {fmtDateShort(rDays[6])}</div>
          </div>
          <button onClick={() => setRWeekMonday(addDays(rWeekMonday, 7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>→</button>
        </div>

        <WeeklyChart
          days={rDays}
          sessions={sessions}
          dataByDate={rpeByDate}
          mdTypeAvg={rpeByMdType}
          colorFn={rpeBarColor}
          fallbackColor={COLORS.blue}
          max={maxRpe}
          label="RPE medio (0-10)"
          isEquipo={isEquipo}
        />
      </div>
    </div>
  );
}
