"use client";
import { useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { todayStr } from "@/lib/utils";
import { saveTeam } from "@/lib/db";
import DockPanel from "./DockPanel";

// Estadísticas de lesiones del equipo (ventana acoplada): incidencia, días de baja, zonas, tipos, jugador a jugador.
// Las lesiones vienen de team.playerInjuries. Sin datos GPS, la exposición no se calcula.

const dayNum = (d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / 86400000; };
const seasonOf = (d) => { const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7)); return m >= 7 ? y : y - 1; };
const seasonLabel = (y) => `${y}/${String(y + 1).slice(2)}`;
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SEVERITY = [
  { id: "min", label: "Mínima (1-3 días)", max: 3, color: COLORS.lime },
  { id: "leve", label: "Leve (4-7 días)", max: 7, color: COLORS.blue },
  { id: "mod", label: "Moderada (8-30 días)", max: 30, color: COLORS.amber },
  { id: "grave", label: "Grave (más de 1 mes)", max: Infinity, color: COLORS.coral },
];
const one = (n) => (n == null || !isFinite(n) ? "–" : (Math.round(n * 10) / 10).toLocaleString("es-ES"));

function Kpi({ label, value, sub, color = COLORS.lime }) {
  return (
    <div style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, opacity: 0.75, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 24, color, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: COLORS.text, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children, note }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 4 }}>{title}</div>
      {children}
      {note && <div style={{ fontSize: 10.5, color: COLORS.text, opacity: 0.65 }}>{note}</div>}
    </div>
  );
}

function Bars({ rows, color = COLORS.coral, empty = "Sin datos." }) {
  if (!rows.length) return <div style={{ fontSize: 12, color: COLORS.text, opacity: 0.6 }}>{empty}</div>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 150px) 1fr", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 11.5, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.label}>{r.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ height: 14, width: `${Math.max(3, (r.value / max) * 100)}%`, background: r.color || color, borderRadius: 4, minWidth: 4 }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.text, whiteSpace: "nowrap" }}>{r.value}{r.sub ? <span style={{ fontWeight: 500, opacity: 0.7 }}> · {r.sub}</span> : null}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InjuryIndexPanel({ team, roster, onClose, onTeamUpdate, canEdit = false }) {
  const [season, setSeason] = useState(String(seasonOf(todayStr())));
  const [sort, setSort] = useState({ key: "n", dir: -1 });
  const [saving, setSaving] = useState(false);
  const today = todayStr();

  const nameOf = useMemo(() => Object.fromEntries(roster.map((p) => [p.username, p.displayName || p.username])), [roster]);
  const allInjuries = useMemo(() => {
    const out = [];
    for (const p of roster) for (const inj of (team.playerInjuries || {})[p.username] || []) if (inj.startDate) out.push({ ...inj, username: p.username });
    return out;
  }, [team.playerInjuries, roster]);

  const seasons = useMemo(() => {
    const set = new Set([seasonOf(today)]);
    allInjuries.forEach((i) => set.add(seasonOf(i.startDate)));
    return [...set].sort((a, b) => b - a);
  }, [allInjuries, today]);

  const data = useMemo(() => {
    const all = season === "all";
    const from = all ? "0000-00-00" : `${season}-07-01`;
    const to = all ? "9999-99-99" : `${Number(season) + 1}-06-30`;
    const inSeason = (d) => d >= from && d <= to;

    const injuries = allInjuries.filter((i) => inSeason(i.startDate)).map((i) => {
      const end = i.endDate || today;
      return { ...i, days: Math.max(0, dayNum(end) - dayNum(i.startDate)), active: !i.endDate };
    });
    const daysLost = injuries.reduce((s, i) => s + i.days, 0);

    const count = (keyFn) => {
      const m = new Map();
      for (const i of injuries) { const k = keyFn(i) || "Sin indicar"; const e = m.get(k) || { value: 0, days: 0 }; e.value++; e.days += i.days; m.set(k, e); }
      return [...m.entries()].map(([label, e]) => ({ label, value: e.value, sub: `${e.days} d de baja` })).sort((a, b) => b.value - a.value);
    };

    const byKey = new Map();
    let recurrences = 0;
    for (const i of [...allInjuries].sort((a, b) => (a.startDate < b.startDate ? -1 : 1))) {
      const k = `${i.username}|${i.zone}|${i.laterality}`;
      const seen = byKey.get(k) || 0;
      if (seen > 0 && inSeason(i.startDate)) recurrences++;
      byKey.set(k, seen + 1);
    }

    const months = new Map();
    injuries.forEach((i) => { const k = i.startDate.slice(0, 7); months.set(k, (months.get(k) || 0) + 1); });
    let monthRows;
    if (!all) {
      monthRows = Array.from({ length: 12 }, (_, k) => { const m = ((6 + k) % 12) + 1; const y = Number(season) + (m >= 7 ? 0 : 1); const key = `${y}-${String(m).padStart(2, "0")}`; return { key, label: MONTHS[m - 1], value: months.get(key) || 0 }; });
    } else {
      monthRows = [...months.entries()].sort().map(([key, value]) => ({ key, label: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(2, 4)}`, value }));
    }

    const severity = SEVERITY.map((s, idx) => {
      const n = injuries.filter((i) => i.days > (SEVERITY[idx - 1]?.max ?? 0) && i.days <= s.max).length;
      return { label: s.label, color: s.color, value: n, sub: injuries.length ? `${Math.round((n / injuries.length) * 100)}%` : "0%" };
    });
    const zeroDays = injuries.filter((i) => i.days === 0).length;
    severity[0].value += zeroDays;
    severity[0].sub = injuries.length ? `${Math.round((severity[0].value / injuries.length) * 100)}%` : "0%";
    const longest = [...injuries].sort((a, b) => b.days - a.days).slice(0, 12);

    const rosterSet = new Set(roster.map((p) => p.username));
    const players = roster.map((p) => {
      const mine = injuries.filter((i) => i.username === p.username);
      return {
        username: p.username, name: nameOf[p.username], n: mine.length,
        days: mine.reduce((s, i) => s + i.days, 0),
        avg: mine.length ? mine.reduce((s, i) => s + i.days, 0) / mine.length : null,
        zones: [...new Set(mine.map((i) => i.zone))].join(", "),
        last: mine.map((i) => i.startDate).sort().pop() || null,
        injured: (team.injuredPlayers || []).includes(p.username),
      };
    });

    return {
      injuries, daysLost,
      zones: count((i) => i.zone), types: count((i) => i.type), sides: count((i) => i.laterality),
      severity, longest, monthRows, recurrences,
      injuredNow: (team.injuredPlayers || []).filter((u) => rosterSet.has(u)).length,
      playersHurt: players.filter((p) => p.n > 0).length,
      repeaters: players.filter((p) => p.n >= 2).length,
      players,
    };
  }, [season, allInjuries, roster, nameOf, today, team.injuredPlayers]);

  const setContext = async (inj, context) => {
    setSaving(true);
    try {
      const list = (team.playerInjuries || {})[inj.username] || [];
      const next = { ...(team.playerInjuries || {}), [inj.username]: list.map((x) => (x.id === inj.id ? { ...x, context } : x)) };
      await saveTeam({ ...team, playerInjuries: next });
      onTeamUpdate?.();
    } finally { setSaving(false); }
  };

  const sortedPlayers = useMemo(() => {
    const { key, dir } = sort;
    return [...data.players].sort((a, b) => {
      const va = key === "name" ? a.name.toLowerCase() : a[key] ?? -1, vb = key === "name" ? b.name.toLowerCase() : b[key] ?? -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || a.name.localeCompare(b.name);
    });
  }, [data, sort]);

  const th = (key, label, align = "right") => (
    <th onClick={() => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "name" ? 1 : -1 }))} style={{ padding: "6px 8px", textAlign: align, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap", background: COLORS.panelRaised, color: COLORS.text, cursor: "pointer", borderBottom: `2px solid ${COLORS.line}` }}>
      {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
  const td = { padding: "6px 8px", fontSize: 12, color: COLORS.text, textAlign: "right", whiteSpace: "nowrap" };

  const nUnknown = data.injuries.filter((i) => !i.context).length;

  return (
    <DockPanel id="injury" title="Índice lesional" order={2} width={680} pct={0.44} minWidth={360} zIndex={55}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.text }}>🩹 Índice lesional</div>
          <select value={season} onChange={(e) => setSeason(e.target.value)} style={{ flex: 1, background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", fontSize: 13, outline: "none" }}>
            {seasons.map((y) => <option key={y} value={String(y)}>Temporada {seasonLabel(y)}</option>)}
            <option value="all">Todo el histórico</option>
          </select>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
          <Kpi label="Lesiones" value={data.injuries.length} sub={`${data.playersHurt} jugador${data.playersHurt === 1 ? "" : "es"} afectado${data.playersHurt === 1 ? "" : "s"}`} color={COLORS.coral} />
          <Kpi label="Días de baja" value={data.daysLost} sub={`media ${one(data.injuries.length ? data.daysLost / data.injuries.length : null)} d por lesión`} color={COLORS.coral} />
          <Kpi label="Lesionados hoy" value={data.injuredNow} sub={roster.length ? `${Math.round((data.injuredNow / roster.length) * 100)}% de la plantilla` : ""} color={data.injuredNow ? COLORS.coral : COLORS.lime} />
          <Kpi label="Recidivas" value={data.recurrences} sub={`${data.repeaters} jugador${data.repeaters === 1 ? "" : "es"} con 2+ lesiones`} color={COLORS.amber} />
        </div>

        {nUnknown > 0 && canEdit && (
          <div style={{ fontSize: 11.5, color: COLORS.text, background: COLORS.amberDark, border: `1px solid ${COLORS.amber}55`, borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div>{nUnknown} lesión{nUnknown === 1 ? "" : "es"} sin indicar contexto (entreno/partido). Márcalas aquí:</div>
            {data.injuries.filter((i) => !i.context).map((i) => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${COLORS.amber}33`, paddingTop: 5 }}>
                <span style={{ fontWeight: 700 }}>{nameOf[i.username]}</span>
                <span style={{ opacity: 0.85, flex: 1, minWidth: 120 }}>{i.zone} · {i.startDate.split("-").reverse().join("/")}</span>
                {[["entrenamiento", "Entrenamiento"], ["partido", "Partido"]].map(([id, label]) => (
                  <button key={id} disabled={saving} onClick={() => setContext(i, id)} style={{ padding: "3px 10px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: COLORS.text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
            ))}
          </div>
        )}

        <Section title="Lesiones por zona"><Bars rows={data.zones} /></Section>
        <Section title="Lesiones por tipo"><Bars rows={data.types} color={COLORS.amber} /></Section>
        <Section title="Gravedad: tiempo de baja" note="Grave = más de 1 mes de baja.">
          <Bars rows={data.severity} />
          {data.longest.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, opacity: 0.8 }}>De más a menos tiempo de baja</div>
              {data.longest.map((i) => (
                <div key={i.id} style={{ display: "flex", gap: 8, fontSize: 11.5, color: COLORS.text, alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, minWidth: 130, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameOf[i.username]}</span>
                  <span style={{ flex: 1, opacity: 0.85 }}>{i.zone}{i.laterality ? ` ${String(i.laterality).toLowerCase()}` : ""}</span>
                  <span style={{ fontWeight: 700, color: i.days > 30 ? COLORS.coral : i.days > 7 ? COLORS.amber : COLORS.lime, whiteSpace: "nowrap" }}>{i.days} d{i.active ? " · sigue de baja" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Lado">
          <Bars rows={data.sides} color={COLORS.blue} />
        </Section>

        <Section title="Lesiones por mes">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90, overflowX: "auto" }}>
            {(() => { const max = Math.max(...data.monthRows.map((m) => m.value), 1); return data.monthRows.map((m) => (
              <div key={m.key} style={{ flex: "1 0 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.text }}>{m.value || ""}</span>
                <div style={{ width: "70%", height: `${(m.value / max) * 60}%`, minHeight: m.value ? 4 : 1, background: m.value ? COLORS.coral : COLORS.line, borderRadius: 3 }} />
                <span style={{ fontSize: 9.5, color: COLORS.text, opacity: 0.75 }}>{m.label}</span>
              </div>
            )); })()}
          </div>
        </Section>

        <Section title="Estadísticas individuales" note="Toca una cabecera para ordenar.">
          <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${COLORS.line}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {th("name", "Jugador/a", "left")}{th("n", "Lesiones")}{th("days", "Días baja")}{th("avg", "Media d")}
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, textTransform: "uppercase", background: COLORS.panelRaised, color: COLORS.text, borderBottom: `2px solid ${COLORS.line}` }}>Zonas</th>
                  {th("last", "Última", "left")}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr key={p.username} style={{ background: i % 2 === 0 ? COLORS.panelRaised : "transparent" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{p.name}{p.injured ? " 🤕" : ""}</td>
                    <td style={{ ...td, fontWeight: 700, color: p.n ? COLORS.coral : COLORS.text }}>{p.n}</td>
                    <td style={td}>{p.days || "–"}</td>
                    <td style={td}>{one(p.avg)}</td>
                    <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 120, fontSize: 11 }}>{p.zones || "–"}</td>
                    <td style={{ ...td, textAlign: "left" }}>{p.last ? p.last.split("-").reverse().join("/") : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </DockPanel>
  );
}
