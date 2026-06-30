"use client";
import { useState, useEffect } from "react";
import { COLORS, WELLNESS_FIELDS, INTENSITY_LEVELS } from "@/lib/constants";
import { weightedWellnessScore, weekNumberFrom, mondayOf } from "@/lib/utils";
import { loadMesocycles } from "@/lib/db";
import * as XLSX from "xlsx";

const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 10, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

function getMesocycleInfo(date, mesocycles) {
  const meso = mesocycles.find((m) => m.startDate && m.endDate && date >= m.startDate && date <= m.endDate);
  if (!meso) return { name: "", week: "" };
  const mesoMonday = mondayOf(meso.startDate);
  const dateMonday = mondayOf(date);
  const diffMs = new Date(dateMonday + "T12:00:00") - new Date(mesoMonday + "T12:00:00");
  const weekInMeso = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { name: meso.name || "Mesociclo", week: weekInMeso };
}

function buildRows(roster, wellness, rpe, sessions, mesocycles, team, fromDate, toDate) {
  const sessionByDate = {};
  sessions.forEach((s) => { sessionByDate[s.date] = s; });

  // Keep only the latest entry per player+date (last submitted wins)
  const welByKey = {};
  wellness.forEach((e) => {
    const k = `${e.username}_${e.date}`;
    if (!welByKey[k] || (e.createdAt || e.created_at || 0) >= (welByKey[k].createdAt || welByKey[k].created_at || 0)) {
      welByKey[k] = e;
    }
  });
  const rpeByKey = {};
  rpe.forEach((e) => {
    const k = `${e.username}_${e.date}`;
    if (!rpeByKey[k] || (e.createdAt || e.created_at || 0) >= (rpeByKey[k].createdAt || rpeByKey[k].created_at || 0)) {
      rpeByKey[k] = e;
    }
  });

  const allDates = [...new Set([
    ...wellness.map((e) => e.date),
    ...rpe.map((e) => e.date),
  ])].filter((d) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate)).sort();

  const rows = [];
  roster.forEach((playerOrStr) => {
    const username = typeof playerOrStr === "string" ? playerOrStr : playerOrStr.username;
    const displayName = typeof playerOrStr === "string" ? playerOrStr : (playerOrStr.displayName || playerOrStr.username);
    allDates.forEach((date) => {
      const w = welByKey[`${username}_${date}`];
      const r = rpeByKey[`${username}_${date}`];
      if (!w && !r) return;

      const session = sessionByDate[date];
      const weekNum = weekNumberFrom(team.firstMonday, mondayOf(date));
      const { name: mesoName, week: mesoWeek } = getMesocycleInfo(date, mesocycles);
      const intensityLabel = session?.intensity ? (INTENSITY_LEVELS[session.intensity]?.label || session.intensity) : "";
      const sRpe = r?.rpe != null && r?.duration != null ? r.rpe * r.duration : null;
      const wScore = w ? Math.round(weightedWellnessScore(w) * 100) / 100 : null;
      const n = (v) => v == null ? "" : String(v).replace(".", ",");

      const row = {
        "Fecha": date,
        "Nº Semana": weekNum,
        "Mesociclo": mesoName,
        "Semana Mesociclo": mesoWeek,
        "Jugador": w?.displayName || r?.displayName || displayName,
        "MD Type": session?.sessionType || "",
        "Intensidad MD": intensityLabel,
      };
      WELLNESS_FIELDS.forEach((f) => { row[f.label] = w ? (w[f.key] ?? "") : ""; });
      row["Wellness Score"] = n(wScore);
      row["RPE"] = n(r?.rpe);
      row["Tiempo sesión (min)"] = n(r?.duration);
      row["sRPE"] = n(sRpe);
      row["Comentario wellness"] = w?.comment || "";
      row["Comentario RPE"] = r?.comment || "";
      rows.push(row);
    });
  });
  return rows;
}

function exportAsExcel(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos Carga");
  XLSX.writeFile(wb, filename + ".xlsx");
}

function exportAsCsv(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => { const s = v == null ? "" : String(v); return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function ExportDataModal({ team, wellness, rpe, sessions, onClose }) {
  const [format, setFormat] = useState("excel");
  const [exporting, setExporting] = useState(false);
  const [mesocycles, setMesocycles] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (team?.teamId) loadMesocycles(team.teamId).then(setMesocycles).catch(() => {});
  }, [team?.teamId]);

  const handleExport = () => {
    setExporting(true);
    const rows = buildRows(team.roster || [], wellness, rpe, sessions, mesocycles, team, fromDate || null, toDate || null);
    if (!rows.length) { alert("No hay datos en el rango seleccionado."); setExporting(false); return; }
    const filename = `${(team.name || "equipo").replace(/\s+/g, "_")}_datos_carga`;
    try {
      if (format === "excel") exportAsExcel(rows, filename);
      else exportAsCsv(rows, filename);
      setTimeout(() => { setExporting(false); onClose(); }, 600);
    } catch (e) { console.error(e); setExporting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 50 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 400 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 4, color: COLORS.text }}>Exportar datos Carga</div>
        <p style={{ fontSize: 12, color: COLORS.text, marginTop: 0, marginBottom: 18 }}>Wellness, RPE y carga de sesión · {team.name}</p>

        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6 }}>Rango de fechas (opcional)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Desde</div>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 4 }}>Hasta</div>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 6 }}>Formato</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {[{ id: "excel", label: "Excel (.xlsx)" }, { id: "csv", label: "CSV" }].map((f) => (
            <button key={f.id} onClick={() => setFormat(f.id)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              border: `1px solid ${format === f.id ? COLORS.lime : COLORS.line}`,
              background: format === f.id ? COLORS.limeDark : "transparent",
              color: format === f.id ? COLORS.lime : COLORS.text,
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleExport} disabled={exporting} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.7 : 1 }}>
            {exporting ? "Exportando..." : "Descargar"}
          </button>
        </div>
      </div>
    </div>
  );
}
