"use client";
import { useState, useMemo } from "react";
import { COLORS } from "@/lib/constants";
import { physicalQuadrantMetricOptions, extractPhysicalMetricValue } from "@/lib/utils";
import { saveTeam } from "@/lib/db";

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4", fontSize: 13, outline: "none", boxSizing: "border-box" };

const DEFAULT_QUADRANT_COLORS = { tr: COLORS.lime, tl: COLORS.blue, br: COLORS.amber, bl: COLORS.coral };

const COLOR_PRESETS = ["#a3e635", "#60a5fa", "#fbbf24", "#f87171", "#c084fc", "#34d399", "#fb923c", "#e879f9", "#38bdf8", "#f472b6"];

function QuadrantChart({ points, xLabel, yLabel, xMid, yMid, colors, onSelectPoint, selectedPoint }) {
  const svgSize = 300;
  const pad = 44;
  const plotW = svgSize - pad * 2;
  const plotH = svgSize - pad * 2;
  const allX = points.map((p) => p.x).filter((v) => v != null);
  const allY = points.map((p) => p.y).filter((v) => v != null);
  const dataMinX = allX.length ? Math.min(...allX) : 0;
  const dataMaxX = allX.length ? Math.max(...allX) : 10;
  const dataMinY = allY.length ? Math.min(...allY) : 0;
  const dataMaxY = allY.length ? Math.max(...allY) : 10;
  // Center axis around cut point so the divider always appears in the middle
  const centerX = xMid != null ? xMid : (dataMinX + dataMaxX) / 2;
  const centerY = yMid != null ? yMid : (dataMinY + dataMaxY) / 2;
  const halfX = Math.max(Math.abs(dataMaxX - centerX), Math.abs(dataMinX - centerX)) * 1.25 || 5;
  const halfY = Math.max(Math.abs(dataMaxY - centerY), Math.abs(dataMinY - centerY)) * 1.25 || 5;
  const minX = centerX - halfX, maxX = centerX + halfX;
  const minY = centerY - halfY, maxY = centerY + halfY;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const toSvgX = (v) => pad + ((v - minX) / rangeX) * plotW;
  const toSvgY = (v) => svgSize - pad - ((v - minY) / rangeY) * plotH;
  const midX = centerX;
  const midY = centerY;
  const midSvgX = toSvgX(midX);
  const midSvgY = toSvgY(midY);
  const col = {
    tr: colors?.tr || DEFAULT_QUADRANT_COLORS.tr,
    tl: colors?.tl || DEFAULT_QUADRANT_COLORS.tl,
    br: colors?.br || DEFAULT_QUADRANT_COLORS.br,
    bl: colors?.bl || DEFAULT_QUADRANT_COLORS.bl,
  };

  const quadrantColor = (p) => {
    if (p.x == null || p.y == null) return COLORS.line;
    if (p.x >= midX && p.y >= midY) return col.tr;
    if (p.x <  midX && p.y >= midY) return col.tl;
    if (p.x >= midX && p.y <  midY) return col.br;
    return col.bl;
  };

  // Axis ticks
  const nTicks = 4;
  const xTicks = Array.from({ length: nTicks + 1 }, (_, i) => minX + (i / nTicks) * (maxX - minX));
  const yTicks = Array.from({ length: nTicks + 1 }, (_, i) => minY + (i / nTicks) * (maxY - minY));
  const fmt = (v) => Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;

  return (
    <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ display: "block" }} onClick={() => onSelectPoint && onSelectPoint(null)}>
      <defs>
        {points.map((p, i) => {
          if (!p.photoUrl || p.x == null || p.y == null) return null;
          const clipCx = toSvgX(p.x), clipCy = toSvgY(p.y);
          return (
            <clipPath key={`clip-${i}`} id={`clip-${i}`}>
              <circle cx={clipCx} cy={clipCy} r={10} />
            </clipPath>
          );
        })}
      </defs>
      <rect width={svgSize} height={svgSize} fill="transparent" />
      {/* Axis lines */}
      <line x1={pad} y1={pad} x2={pad} y2={svgSize - pad} stroke="#4a5568" strokeWidth={1.5} />
      <line x1={pad} y1={svgSize - pad} x2={svgSize - pad} y2={svgSize - pad} stroke="#4a5568" strokeWidth={1.5} />
      {/* X ticks */}
      {xTicks.map((v, i) => (
        <g key={`xt-${i}`}>
          <line x1={toSvgX(v)} y1={svgSize - pad} x2={toSvgX(v)} y2={svgSize - pad + 4} stroke="#4a5568" strokeWidth={1} />
          <text x={toSvgX(v)} y={svgSize - pad + 13} textAnchor="middle" fontSize={8} fontFamily="'Oswald', sans-serif" fill={COLORS.text}>{fmt(v)}</text>
        </g>
      ))}
      {/* Y ticks */}
      {yTicks.map((v, i) => (
        <g key={`yt-${i}`}>
          <line x1={pad - 4} y1={toSvgY(v)} x2={pad} y2={toSvgY(v)} stroke="#4a5568" strokeWidth={1} />
          <text x={pad - 6} y={toSvgY(v) + 3} textAnchor="end" fontSize={8} fontFamily="'Oswald', sans-serif" fill={COLORS.text}>{fmt(v)}</text>
        </g>
      ))}
      {/* Axis labels */}
      <text x={svgSize / 2} y={svgSize - 1} fill={COLORS.text} fontSize={9} textAnchor="middle" fontFamily="'Oswald', sans-serif">{xLabel}</text>
      <text x={9} y={svgSize / 2} fill={COLORS.text} fontSize={9} textAnchor="middle" fontFamily="'Oswald', sans-serif" transform={`rotate(-90, 9, ${svgSize / 2})`}>{yLabel}</text>
      {/* Quadrant backgrounds */}
      <rect x={midSvgX} y={pad}          width={svgSize - pad - midSvgX} height={midSvgY - pad}          fill={col.tr} fillOpacity={0.10} />
      <rect x={pad}     y={pad}          width={midSvgX - pad}            height={midSvgY - pad}          fill={col.tl} fillOpacity={0.10} />
      <rect x={midSvgX} y={midSvgY}     width={svgSize - pad - midSvgX} height={svgSize - pad - midSvgY} fill={col.br} fillOpacity={0.10} />
      <rect x={pad}     y={midSvgY}     width={midSvgX - pad}            height={svgSize - pad - midSvgY} fill={col.bl} fillOpacity={0.10} />
      {/* Dividers */}
      <line x1={midSvgX} y1={pad} x2={midSvgX} y2={svgSize - pad} stroke="#5a6a7a" strokeWidth={1.2} strokeDasharray="5,3" />
      <line x1={pad} y1={midSvgY} x2={svgSize - pad} y2={midSvgY} stroke="#5a6a7a" strokeWidth={1.2} strokeDasharray="5,3" />
      {/* Points */}
      {points.map((p, i) => {
        if (p.x == null || p.y == null) return null;
        const cx = toSvgX(p.x);
        const cy = toSvgY(p.y);
        const c = quadrantColor(p);
        const isSel = selectedPoint === i;
        return (
          <g key={i} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onSelectPoint && onSelectPoint(isSel ? null : i); }}>
            {p.photoUrl ? (
              <>
                <circle cx={cx} cy={cy} r={11} fill={c} fillOpacity={0.9} />
                <image href={p.photoUrl} x={cx - 10} y={cy - 10} width={20} height={20} clipPath={`url(#clip-${i})`} preserveAspectRatio="xMidYMid slice" />
                <circle cx={cx} cy={cy} r={11} fill="none" stroke={c} strokeWidth={isSel ? 2.5 : 1.5} />
              </>
            ) : (() => {
              const initials = (p.label || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <>
                  <circle cx={cx} cy={cy} r={11} fill={c} fillOpacity={0.85} stroke={isSel ? COLORS.text : "none"} strokeWidth={isSel ? 2 : 0} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fontFamily="'Oswald', sans-serif" fontWeight="700" fill="#14171c" style={{ pointerEvents: "none" }}>{initials}</text>
                </>
              );
            })()}
            {isSel && (
              <text x={cx} y={cy - 15} textAnchor="middle" fill={COLORS.text} fontSize={9} fontFamily="'Oswald', sans-serif" fontWeight="700">{(p.label || "").slice(0, 14)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function QuadrantLists({ points, xMid, yMid, xLabel, yLabel, quadrantNames, colors }) {
  const allX = points.map((p) => p.x).filter((v) => v != null);
  const allY = points.map((p) => p.y).filter((v) => v != null);
  const autoMidX = allX.length ? (Math.min(...allX) + Math.max(...allX)) / 2 : 0;
  const autoMidY = allY.length ? (Math.min(...allY) + Math.max(...allY)) / 2 : 0;
  const mx = xMid != null ? xMid : autoMidX;
  const my = yMid != null ? yMid : autoMidY;
  const col = {
    tr: colors?.tr || DEFAULT_QUADRANT_COLORS.tr,
    tl: colors?.tl || DEFAULT_QUADRANT_COLORS.tl,
    br: colors?.br || DEFAULT_QUADRANT_COLORS.br,
    bl: colors?.bl || DEFAULT_QUADRANT_COLORS.bl,
  };

  const q = [
    { key: "tr", list: points.filter((p) => p.x != null && p.y != null && p.x >= mx && p.y >= my), color: col.tr,   label: quadrantNames?.tr || `Alto ${xLabel} + Alto ${yLabel}` },
    { key: "tl", list: points.filter((p) => p.x != null && p.y != null && p.x <  mx && p.y >= my), color: col.tl,   label: quadrantNames?.tl || `Bajo ${xLabel} + Alto ${yLabel}` },
    { key: "br", list: points.filter((p) => p.x != null && p.y != null && p.x >= mx && p.y <  my), color: col.br,   label: quadrantNames?.br || `Alto ${xLabel} + Bajo ${yLabel}` },
    { key: "bl", list: points.filter((p) => p.x != null && p.y != null && p.x <  mx && p.y <  my), color: col.bl,   label: quadrantNames?.bl || `Bajo ${xLabel} + Bajo ${yLabel}` },
    { key: "nd", list: points.filter((p) => p.x == null || p.y == null),                             color: COLORS.line, label: "Sin datos" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
      {q.filter((s) => s.list.length > 0).map((s) => (
        <div key={s.key}>
          <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 5 }}>{s.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {s.list.map((p) => (
              <div key={p.label} style={{ background: COLORS.panelRaised, border: `1px solid ${s.color}`, borderRadius: 10, padding: "4px 10px", fontSize: 11, color: COLORS.text }}>
                {p.label}
                {p.x != null && p.y != null && (
                  <span style={{ fontSize: 10, color: COLORS.text, display: "block" }}>{xLabel}: {p.x.toFixed(1)} · {yLabel}: {p.y.toFixed(1)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorSwatch({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {COLOR_PRESETS.map((c) => (
          <button key={c} onClick={() => onChange(c)} style={{
            width: 20, height: 20, borderRadius: "50%", background: c, border: `2px solid ${value === c ? COLORS.text : "transparent"}`,
            cursor: "pointer", padding: 0, flexShrink: 0,
          }} />
        ))}
      </div>
      <input type="color" value={value || "#a3e635"} onChange={(e) => onChange(e.target.value)}
        style={{ width: 28, height: 28, padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }} />
    </div>
  );
}

function QuadrantConfigModal({ cfg, metricOptions, onSave, onClose }) {
  const [name,  setName]  = useState(cfg.name  || "");
  const [xKey,  setXKey]  = useState(cfg.xKey  || metricOptions[0]?.key || "");
  const [yKey,  setYKey]  = useState(cfg.yKey  || metricOptions[1]?.key || "");
  const [xMid,  setXMid]  = useState(cfg.xMid  != null ? String(cfg.xMid)  : "");
  const [yMid,  setYMid]  = useState(cfg.yMid  != null ? String(cfg.yMid)  : "");
  const [namesTR, setNamesTR] = useState(cfg.quadrantNames?.tr || "");
  const [namesTL, setNamesTL] = useState(cfg.quadrantNames?.tl || "");
  const [namesBR, setNamesBR] = useState(cfg.quadrantNames?.br || "");
  const [namesBL, setNamesBL] = useState(cfg.quadrantNames?.bl || "");
  const [colorTR, setColorTR] = useState(cfg.quadrantColors?.tr || DEFAULT_QUADRANT_COLORS.tr);
  const [colorTL, setColorTL] = useState(cfg.quadrantColors?.tl || DEFAULT_QUADRANT_COLORS.tl);
  const [colorBR, setColorBR] = useState(cfg.quadrantColors?.br || DEFAULT_QUADRANT_COLORS.br);
  const [colorBL, setColorBL] = useState(cfg.quadrantColors?.bl || DEFAULT_QUADRANT_COLORS.bl);

  const handleSave = () => onSave({
    ...cfg, name, xKey, yKey,
    xMid: xMid !== "" ? parseFloat(xMid) : null,
    yMid: yMid !== "" ? parseFloat(yMid) : null,
    quadrantNames: { tr: namesTR, tl: namesTL, br: namesBR, bl: namesBL },
    quadrantColors: { tr: colorTR, tl: colorTL, br: colorBR, bl: colorBL },
  });

  const quadrants = [
    { label: "↗ Superior derecho", name: namesTR, setName: setNamesTR, color: colorTR, setColor: setColorTR },
    { label: "↖ Superior izquierdo", name: namesTL, setName: setNamesTL, color: colorTL, setColor: setColorTL },
    { label: "↘ Inferior derecho", name: namesBR, setName: setNamesBR, color: colorBR, setColor: setColorBR },
    { label: "↙ Inferior izquierdo", name: namesBL, setName: setNamesBL, color: colorBL, setColor: setColorBL },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", zIndex: 50, overflowY: "auto" }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 420, marginTop: "1rem" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 16, color: COLORS.text }}>Configurar cuadrante</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Nombre del cuadrante</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Fuerza-Velocidad" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Eje X</div>
            <select value={xKey} onChange={(e) => setXKey(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {metricOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Eje Y</div>
            <select value={yKey} onChange={(e) => setYKey(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {metricOptions.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Corte X (opcional)</div>
            <input type="text" inputMode="decimal" value={xMid} onChange={(e) => setXMid(e.target.value)} placeholder="Automático" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>Corte Y (opcional)</div>
            <input type="text" inputMode="decimal" value={yMid} onChange={(e) => setYMid(e.target.value)} placeholder="Automático" style={inputStyle} />
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>Nombre y color de cada cuadrante</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          {quadrants.map(({ label, name: qn, setName: sqn, color, setColor }) => (
            <div key={label} style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 6 }}>{label}</div>
              <input value={qn} onChange={(e) => sqn(e.target.value)} placeholder="Nombre del cuadrante" style={{ ...inputStyle, marginBottom: 8 }} />
              <ColorSwatch value={color} onChange={setColor} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_QUADRANT = { name: "Cuadrante 1", xKey: "", yKey: "", xMid: null, yMid: null, quadrantNames: {}, quadrantColors: {} };

export default function PhysicalQuadrantSection({ team, physicalEntries, onTeamUpdate }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [editingIdx, setEditingIdx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  const metricOptions = useMemo(() => physicalQuadrantMetricOptions(team.customTestDefs || [], team.customGpsDefs || []), [team.customTestDefs, team.customGpsDefs]);

  const quadrants = useMemo(() => {
    if (team.quadrantConfigs?.length) return team.quadrantConfigs;
    const firstX = metricOptions[0]?.key || "";
    const firstY = metricOptions[1]?.key || "";
    return [{ ...DEFAULT_QUADRANT, name: "Cuadrante 1", xKey: firstX, yKey: firstY }];
  }, [team.quadrantConfigs, metricOptions]);

  const latestByPlayer = useMemo(() => {
    const map = {};
    physicalEntries.forEach((e) => { if (!map[e.username] || e.date > map[e.username].date) map[e.username] = e; });
    return map;
  }, [physicalEntries]);

  const roster = team.roster || [];

  const getPoints = (cfg) => roster.map((player) => {
    const entry = latestByPlayer[player.username];
    return {
      label: player.displayName || player.username,
      photoUrl: player.photoUrl || null,
      x: entry ? extractPhysicalMetricValue(entry, cfg.xKey) : null,
      y: entry ? extractPhysicalMetricValue(entry, cfg.yKey) : null,
    };
  });

  const saveQuadrants = async (newQuadrants) => {
    setSaving(true);
    try {
      const updated = { ...team, quadrantConfigs: newQuadrants };
      await saveTeam(updated);
      if (onTeamUpdate) onTeamUpdate(updated);
    } finally { setSaving(false); }
  };

  const handleSaveCfg = async (newCfg) => {
    const next = quadrants.map((q, i) => i === editingIdx ? newCfg : q);
    await saveQuadrants(next);
    setEditingIdx(null);
  };

  const handleAdd = async () => {
    const firstX = metricOptions[0]?.key || "";
    const firstY = metricOptions[1]?.key || "";
    const next = [...quadrants, { ...DEFAULT_QUADRANT, name: `Cuadrante ${quadrants.length + 1}`, xKey: firstX, yKey: firstY }];
    await saveQuadrants(next);
    setActiveIdx(next.length - 1);
  };

  const handleDelete = async (idx) => {
    if (quadrants.length <= 1) return;
    if (!confirm("¿Eliminar este cuadrante?")) return;
    const next = quadrants.filter((_, i) => i !== idx);
    await saveQuadrants(next);
    setActiveIdx(Math.min(activeIdx, next.length - 1));
  };

  const safeIdx = Math.min(activeIdx, quadrants.length - 1);
  const cfg = quadrants[safeIdx];
  const xDef = metricOptions.find((m) => m.key === cfg?.xKey) || metricOptions[0];
  const yDef = metricOptions.find((m) => m.key === cfg?.yKey) || metricOptions[1];
  const points = cfg ? getPoints(cfg) : [];
  const noData = points.every((p) => p.x == null && p.y == null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
          {quadrants.map((q, i) => (
            <button key={i} onClick={() => { setActiveIdx(i); setSelectedPoint(null); }} style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${safeIdx === i ? COLORS.lime : COLORS.line}`,
              background: safeIdx === i ? COLORS.panelRaised : "transparent",
              color: COLORS.text, fontSize: 12, fontWeight: safeIdx === i ? 700 : 400, cursor: "pointer",
            }}>{q.name || `C${i + 1}`}</button>
          ))}
        </div>
        {onTeamUpdate && <button onClick={handleAdd} disabled={saving} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>+ Añadir</button>}
      </div>

      {cfg && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setEditingIdx(safeIdx)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Configurar cuadrante</button>
          {quadrants.length > 1 && (
            <button onClick={() => handleDelete(safeIdx)} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.coral}`, background: "transparent", color: COLORS.coral, fontSize: 12, cursor: "pointer" }}>Eliminar</button>
          )}
        </div>
      )}

      {noData ? (
        <div style={{ color: COLORS.text, fontSize: 13, textAlign: "center", padding: "2rem 0" }}>Sin datos físicos para mostrar.</div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: COLORS.text, textAlign: "center", marginBottom: 6 }}>
            X: {xDef?.label || cfg.xKey} · Y: {yDef?.label || cfg.yKey}
          </div>
          <QuadrantChart
            points={points}
            xLabel={xDef?.label || cfg.xKey}
            yLabel={yDef?.label || cfg.yKey}
            xMid={cfg.xMid}
            yMid={cfg.yMid}
            colors={cfg.quadrantColors}
            selectedPoint={selectedPoint}
            onSelectPoint={setSelectedPoint}
          />
          <QuadrantLists
            points={points}
            xMid={cfg.xMid}
            yMid={cfg.yMid}
            xLabel={xDef?.label || cfg.xKey}
            yLabel={yDef?.label || cfg.yKey}
            quadrantNames={cfg.quadrantNames}
            colors={cfg.quadrantColors}
          />
        </>
      )}

      {editingIdx !== null && (
        <QuadrantConfigModal
          cfg={quadrants[editingIdx]}
          metricOptions={metricOptions}
          onSave={handleSaveCfg}
          onClose={() => setEditingIdx(null)}
        />
      )}
    </div>
  );
}
