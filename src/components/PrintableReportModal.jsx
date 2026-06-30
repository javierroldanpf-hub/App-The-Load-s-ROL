"use client";
import { useRef, useState } from "react";
import { COLORS, WELLNESS_FIELDS } from "@/lib/constants";
import { todayStr, fmtDateLong, fmtDateShort, weightedWellnessScore, sessionLoad, acwr, acwrStatus, latestEntryForPlayer, weightedWellnessStatus } from "@/lib/utils";
import Avatar from "./Avatar";
import StatusPill from "./StatusPill";

export default function PrintableReportModal({ team, wellness, rpe, sessions, onClose }) {
  const reportRef = useRef();
  const [downloading, setDownloading] = useState(false);
  const today = todayStr();
  const roster = team.roster || [];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#14171c", useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`informe-equipo-${today}.pdf`);
    } catch (e) { console.error(e); }
    finally { setDownloading(false); }
  };

  const playerRows = roster.map((player) => {
    const myRpe = rpe.filter((e) => e.username === player.username);
    const allLoads = myRpe.map((e) => ({ date: e.date, load: sessionLoad(e) }));
    const acwrVal = acwr(allLoads, today);
    const acwrStat = acwrStatus(acwrVal);
    const latestW = latestEntryForPlayer(wellness, player.username, today);
    const wScore = latestW ? weightedWellnessScore(latestW) : null;
    const wStatus = latestW ? weightedWellnessStatus(latestW) : null;
    const todayWellness = wellness.find((e) => e.username === player.username && e.date === today);
    const todaySession = sessions.find((s) => s.date === today && !s.isRest);
    const todayRpe = todaySession ? myRpe.find((e) => e.date === today) : null;
    return { player, acwrVal, acwrStat, wScore, wStatus, todayWellness, todayRpe, todayLoad: todayRpe ? sessionLoad(todayRpe) : null };
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", zIndex: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1.5rem", background: COLORS.panel, borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17 }}>Informe del equipo</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleDownload} disabled={downloading} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: downloading ? "#5a8a1a" : COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 13, cursor: downloading ? "default" : "pointer" }}>{downloading ? "Generando..." : "Descargar PDF"}</button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        <div ref={reportRef} style={{ background: "#1a1e25", borderRadius: 16, padding: "1.5rem", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${COLORS.line}` }}>
            <Avatar name={team.name} photoUrl={team.crestUrl} size={52} square />
            <div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22 }}>{team.name}</div>
              <div style={{ fontSize: 13, color: COLORS.text }}>Informe · {fmtDateLong(today)}</div>
            </div>
          </div>

          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.lime}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: COLORS.text, fontWeight: 600 }}>Jugador</th>
                  {WELLNESS_FIELDS.map((f) => (
                    <th key={f.key} style={{ textAlign: "center", padding: "8px 6px", color: COLORS.text, fontWeight: 600 }} title={f.label}>{f.emoji}</th>
                  ))}
                  <th style={{ textAlign: "center", padding: "8px 6px", color: COLORS.text, fontWeight: 600 }}>W</th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: COLORS.text, fontWeight: 600 }}>RPE</th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: COLORS.text, fontWeight: 600 }}>Carga</th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: COLORS.text, fontWeight: 600 }}>ACWR</th>
                </tr>
              </thead>
              <tbody>
                {playerRows.map(({ player, acwrVal, acwrStat, wScore, wStatus, todayWellness, todayRpe, todayLoad }) => (
                  <tr key={player.username} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={player.displayName || player.username} photoUrl={player.photoUrl} size={28} isInjured={(team.injuredPlayers || []).includes(player.username)} />
                        <span>{player.displayName || player.username}</span>
                      </div>
                    </td>
                    {WELLNESS_FIELDS.map((f) => (
                      <td key={f.key} style={{ textAlign: "center", padding: "8px 6px", color: COLORS.text }}>
                        {todayWellness ? todayWellness[f.key] || "–" : "–"}
                      </td>
                    ))}
                    <td style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600, color: wStatus ? wStatus.color : COLORS.textFaint }}>{wScore !== null ? wScore.toFixed(1) : "–"}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px" }}>{todayRpe ? todayRpe.rpe : "–"}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", color: COLORS.amber }}>{todayLoad !== null ? todayLoad : "–"}</td>
                    <td style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600, color: acwrStat.color }}>{acwrVal !== null ? acwrVal.toFixed(2) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, fontSize: 11, color: COLORS.text, textAlign: "right" }}>
            Generado por Wellness RPE · {fmtDateLong(today)}
          </div>
        </div>
      </div>
    </div>
  );
}
