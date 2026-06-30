"use client";
import { COLORS, RM_EXERCISES, PERFORMANCE_METRICS, EXTERNAL_LOAD_METRICS } from "@/lib/constants";
import { asymmetryDeficit, rmPercentages } from "@/lib/utils";
import { computeFormula } from "./CoachPhysicalDataTab";

function AnaerobicReserveChart({ vam, vmax, vift }) {
  const hasData = vam != null || vmax != null;
  if (!hasData) return (
    <div style={{ textAlign: "center", padding: "1.5rem 0", color: COLORS.text, fontSize: 13 }}>Sin datos de VAM / Vmax</div>
  );

  const W = 300, H = 200;
  const padL = 36, padR = 16, padT = 24, padB = 32;
  const chartH = H - padT - padB;
  const chartW = W - padL - padR;
  const maxVal = Math.ceil(Math.max(vmax || 0, vam || 0, vift || 0, 18) * 1.15);
  const toY = (v) => padT + chartH - (v / maxVal) * chartH;
  const cx = padL + chartW / 2;
  const bwWide = chartW * 0.44;
  const bwNarrow = bwWide;
  const reserve = vam != null && vmax != null ? Math.round((vmax - vam) * 10) / 10 : null;
  const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map((v) => Math.round(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {ticks.map((v) => (
        <line key={v} x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke={COLORS.line} strokeWidth={0.5} />
      ))}
      {ticks.map((v) => (
        <text key={v} x={padL - 5} y={toY(v) + 4} textAnchor="end" fontSize={9} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.text}>{v}</text>
      ))}
      {vmax != null && (
        <rect x={cx - bwWide / 2} y={toY(vmax)} width={bwWide} height={toY(0) - toY(vmax)} fill={COLORS.coral} opacity={0.55} rx={5} />
      )}
      {vam != null && (
        <rect x={cx - bwNarrow / 2} y={toY(vam)} width={bwNarrow} height={toY(0) - toY(vam)} fill={COLORS.lime} opacity={0.9} rx={4} />
      )}
      {reserve != null && reserve > 0 && (
        <>
          <line x1={cx + bwWide / 2 + 6} y1={toY(vmax)} x2={cx + bwWide / 2 + 6} y2={toY(vam)} stroke={COLORS.text} strokeWidth={1} strokeDasharray="2,2" />
          <line x1={cx + bwWide / 2 + 3} y1={toY(vmax)} x2={cx + bwWide / 2 + 9} y2={toY(vmax)} stroke={COLORS.text} strokeWidth={1} />
          <line x1={cx + bwWide / 2 + 3} y1={toY(vam)} x2={cx + bwWide / 2 + 9} y2={toY(vam)} stroke={COLORS.text} strokeWidth={1} />
          <text x={cx + bwWide / 2 + 12} y={(toY(vmax) + toY(vam)) / 2 + 4} fontSize={11} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.text}>{reserve} km/h</text>
        </>
      )}
      {vift != null && (
        <>
          <line x1={padL} y1={toY(vift)} x2={W - padR} y2={toY(vift)} stroke={COLORS.amber} strokeWidth={1.5} strokeDasharray="6,3" />
          <text x={padL + 3} y={toY(vift) - 4} fontSize={10} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.amber}>VIFT {vift}</text>
        </>
      )}
      {vmax != null && <text x={cx} y={toY(vmax) - 5} textAnchor="middle" fontSize={13} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.coral}>{vmax}</text>}
      {vam != null && <text x={cx} y={toY(vam) - 5} textAnchor="middle" fontSize={13} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.lime}>{vam}</text>}
      <text x={cx} y={H - padB + 14} textAnchor="middle" fontSize={9} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.text}>VAM / Vmax</text>
      <rect x={padL} y={H - padB + 22} width={7} height={7} fill={COLORS.lime} rx={1} />
      <text x={padL + 10} y={H - padB + 29} fontSize={8} fontFamily="Oswald, sans-serif" fill={COLORS.text}>VAM</text>
      <rect x={padL + 36} y={H - padB + 22} width={7} height={7} fill={COLORS.coral} opacity={0.7} rx={1} />
      <text x={padL + 46} y={H - padB + 29} fontSize={8} fontFamily="Oswald, sans-serif" fill={COLORS.text}>Vmax</text>
      <line x1={padL + 82} y1={H - padB + 25} x2={padL + 96} y2={H - padB + 25} stroke={COLORS.amber} strokeWidth={1.5} strokeDasharray="4,2" />
      <text x={padL + 100} y={H - padB + 29} fontSize={8} fontFamily="Oswald, sans-serif" fill={COLORS.text}>VIFT</text>
      {reserve != null && <text x={cx + bwWide / 2 + 12} y={H - padB + 29} fontSize={8} fontFamily="Oswald, sans-serif" fontWeight="600" fill={COLORS.text}>Reserva: {reserve} km/h</text>}
    </svg>
  );
}

const BUILT_IN_CATS = ["Fuerza", "Rendimiento", "Carga externa"];
const BUILT_IN_KEYS = {
  "Fuerza": RM_EXERCISES.map((e) => e.key),
  "Rendimiento": [...PERFORMANCE_METRICS.map((m) => m.key), "cod505Right", "cod505Left"],
  "Carga externa": EXTERNAL_LOAD_METRICS.map((m) => m.key),
};

export default function PhysicalDataView({ entry, bodyWeight, customTestDefs, customGpsDefs, sectionOrder, itemOrder }) {
  const deficit = asymmetryDeficit(entry.cod505Right, entry.cod505Left);
  const defById = Object.fromEntries((customTestDefs || []).map((d) => [d.id, d]));
  const gpsById = Object.fromEntries((customGpsDefs || []).map((d) => [d.id, d]));

  const getEntryVal = (key) => {
    if (defById[key]) return entry.customTestValues?.[key] ?? null;
    return entry[key] ?? null;
  };

  const extraCats = [...new Set((customTestDefs || []).map((d) => d.category).filter((c) => c && !BUILT_IN_CATS.includes(c)))];
  const allCats = [...BUILT_IN_CATS, ...extraCats];
  const effectiveSectionOrder = sectionOrder
    ? [...sectionOrder.filter((c) => allCats.includes(c)), ...allCats.filter((c) => !sectionOrder.includes(c))]
    : allCats;

  const renderCustomVal = (d, color) => {
    if (d.formula) {
      const val = computeFormula(d.formula, getEntryVal);
      return (
        <div key={d.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
          <div style={{ fontSize: 11, color: COLORS.text }}>{d.name} <span style={{ color: COLORS.lime, fontSize: 9 }}>⟨op⟩</span></div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: color || COLORS.blue, marginTop: 4 }}>
            {val != null ? `${val}${d.unit ? " " + d.unit : ""}` : "–"}
          </div>
        </div>
      );
    }
    const val = entry.customTestValues?.[d.id] ?? entry.customGpsValues?.[d.id];
    return (
      <div key={d.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
        <div style={{ fontSize: 11, color: COLORS.text }}>{d.name}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: color || COLORS.blue, marginTop: 4 }}>
          {val != null ? `${val}${d.unit ? " " + d.unit : ""}` : "–"}
        </div>
      </div>
    );
  };

  const getItemKeys = (cat) => {
    const builtinKeys = BUILT_IN_KEYS[cat] || [];
    const customIds = (customTestDefs || [])
      .filter((d) => d.category === cat || (cat === "Carga externa" && d.category === "Carga externa/GPS"))
      .map((d) => d.id);
    const all = [...builtinKeys, ...customIds];
    if (itemOrder && itemOrder[cat] && itemOrder[cat].length) {
      const stored = itemOrder[cat];
      return [...stored.filter((k) => all.includes(k)), ...all.filter((k) => !stored.includes(k))];
    }
    return all;
  };

  const renderFuerzaKey = (key) => {
    const rmEx = RM_EXERCISES.find((e) => e.key === key);
    const customDef = !rmEx ? defById[key] : null;
    if (customDef?.formula) return renderCustomVal(customDef, COLORS.lime);
    const val80 = rmEx ? entry[key] : entry.customTestValues?.[key];
    const label = rmEx ? rmEx.label : customDef?.name;
    if (!label) return null;
    const pcts = rmPercentages(val80, bodyWeight);
    return (
      <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: val80 ? 10 : 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.lime }}>
            {val80 ? `1RM ${Math.round((val80 / 0.8) * 10) / 10} kg` : "Sin dato"}
          </span>
        </div>
        {pcts && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {pcts.map((p) => (
              <div key={p.pct} style={{ background: p.pct === 80 ? COLORS.limeDark : COLORS.panelRaised, borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: p.pct === 80 ? COLORS.lime : COLORS.textFaint }}>{p.pct}%</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.value} kg</div>
                {p.bw !== null && <div style={{ fontSize: 9, color: COLORS.text, marginTop: 1 }}>{p.bw} BW</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRendimientoKey = (key) => {
    const perfM = PERFORMANCE_METRICS.find((m) => m.key === key);
    if (perfM) return (
      <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
        <div style={{ fontSize: 11, color: COLORS.text }}>{perfM.label}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.blue, marginTop: 4 }}>
          {entry[key] != null ? `${entry[key]} ${perfM.unit}` : "–"}
        </div>
      </div>
    );
    if (key === "cod505Right") return (
      <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
        <div style={{ fontSize: 11, color: COLORS.text }}>COD 5-0-5 Dcha.</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.blue, marginTop: 4 }}>{entry.cod505Right != null ? `${entry.cod505Right} s` : "–"}</div>
      </div>
    );
    if (key === "cod505Left") return [
      <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
        <div style={{ fontSize: 11, color: COLORS.text }}>COD 5-0-5 Izq.</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.blue, marginTop: 4 }}>{entry.cod505Left != null ? `${entry.cod505Left} s` : "–"}</div>
      </div>,
      deficit !== null && (
        <div key="deficit" style={{ background: COLORS.panel, border: `1px solid ${deficit > 10 ? COLORS.amber : COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
          <div style={{ fontSize: 11, color: COLORS.text }}>Déficit Asimetría 5-0-5</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: deficit > 10 ? COLORS.amber : COLORS.text, marginTop: 4 }}>{deficit}%</div>
        </div>
      ),
    ];
    const d = defById[key];
    if (!d) return null;
    return renderCustomVal(d, COLORS.blue);
  };

  const renderCargaKey = (key) => {
    const extM = EXTERNAL_LOAD_METRICS.find((m) => m.key === key);
    if (extM) return (
      <div key={key} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
        <div style={{ fontSize: 11, color: COLORS.text }}>{extM.label}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.amber, marginTop: 4 }}>
          {entry[key] != null ? `${entry[key]}${extM.unit ? " " + extM.unit : ""}` : "–"}
        </div>
      </div>
    );
    const d = defById[key] || gpsById[key];
    if (!d) return null;
    return renderCustomVal(d, COLORS.amber);
  };

  const renderSection = (cat) => {
    const keys = getItemKeys(cat);

    if (cat === "Fuerza") return (
      <div key={cat} style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Repetición máxima (RM)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {keys.map((k) => renderFuerzaKey(k))}
        </div>
      </div>
    );

    if (cat === "Rendimiento") return (
      <div key={cat}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Rendimiento</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: (entry.vam != null || entry.vmax != null) ? 12 : 24 }}>
          {keys.map((k) => renderRendimientoKey(k))}
        </div>
        {(entry.vam != null || entry.vmax != null) && (
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Reserva anaeróbica</div>
            {entry.vam != null && entry.vmax != null && (
              <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 10 }}>
                Vmax − VAM = <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, color: COLORS.coral }}>{Math.round((entry.vmax - entry.vam) * 10) / 10} km/h</span>
              </div>
            )}
            <AnaerobicReserveChart vam={entry.vam} vmax={entry.vmax} vift={entry.vift} />
          </div>
        )}
      </div>
    );

    if (cat === "Carga externa") return (
      <div key={cat} style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Carga externa</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {keys.map((k) => renderCargaKey(k))}
        </div>
      </div>
    );

    // Extra custom section
    const defs = (customTestDefs || []).filter((d) => (d.category || "Tests del equipo") === cat);
    if (defs.length === 0) return null;
    const orderedIds = itemOrder && itemOrder[cat] ? itemOrder[cat] : defs.map((d) => d.id);
    const orderedDefs = [...orderedIds.map((id) => defs.find((d) => d.id === id)).filter(Boolean), ...defs.filter((d) => !orderedIds.includes(d.id))];
    return (
      <div key={cat} style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{cat}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {orderedDefs.map((d) => renderCustomVal(d, COLORS.blue))}
        </div>
      </div>
    );
  };

  return <div>{effectiveSectionOrder.map((cat) => renderSection(cat))}</div>;
}
