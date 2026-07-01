"use client";
import { useState, useEffect } from "react";
import { COLORS, RPE_ANCHORS } from "@/lib/constants";
import { rpeStatus, todayStr } from "@/lib/utils";
import { saveRpe } from "@/lib/db";

export default function RpeForm({ user, session, existing, refreshData }) {
  const [rpe, setRpe] = useState(existing ? existing.rpe : 5);
  const [comment, setComment] = useState(existing ? existing.comment || "" : "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (existing && !dirty) {
      setRpe(existing.rpe);
      setComment(existing.comment || "");
    }
  }, [existing, dirty]);

  const isSaved = !!existing && !dirty;
  const duration = session.duration || 60;
  const anchor = RPE_ANCHORS.find((a) => a.v === rpe);
  const status = rpeStatus(rpe);
  const load = rpe * duration;

  const handleRpeChange = (v) => { setRpe(v); setDirty(true); };
  const handleCommentChange = (v) => { setComment(v); setDirty(true); };

  const handleSubmit = async () => {
    setSaving(true);
    const entry = {
      teamId: user.team_id || user.teamId,
      username: user.username,
      displayName: user.display_name || user.displayName,
      date: todayStr(), rpe, duration, sessionType: session.sessionType, plannedIntensity: session.intensity,
      comment: comment.trim(),
      commentRead: existing ? (comment.trim() !== (existing.comment || "").trim() ? false : existing.commentRead || false) : false,
      id: existing ? existing.id : undefined, ts: Date.now(),
    };
    try { await saveRpe(entry); await refreshData(); setDirty(false); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ background: COLORS.panel, borderRadius: 14, padding: "1.25rem", marginBottom: 20, border: `1px solid ${COLORS.line}`, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 6 }}>Esfuerzo percibido (RPE) de {session.sessionType}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 48, color: status.color, lineHeight: 1 }}>{rpe}</div>
        <div style={{ fontSize: 14, color: COLORS.text, marginTop: 4 }}>{anchor ? anchor.t : ""}</div>
        <input type="range" min={0} max={10} step={1} value={rpe}
          onChange={(e) => handleRpeChange(Number(e.target.value))} style={{ marginTop: 16, width: "100%" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: COLORS.text }}>0 · Reposo</span>
          <span style={{ fontSize: 11, color: COLORS.text }}>10 · Máximo</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelRaised, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: COLORS.text }}>Duración de la sesión (fijada por tu preparador)</span>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.blue }}>{duration} min</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelRaised, borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
        <span style={{ fontSize: 13, color: COLORS.text }}>Carga de sesión (RPE × min)</span>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20, color: COLORS.text }}>{load}</span>
      </div>


      <button onClick={handleSubmit} disabled={saving} style={{
        width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
        background: isSaved ? COLORS.limeDark : COLORS.lime, color: isSaved ? COLORS.lime : "#14171c",
        fontWeight: 700, fontSize: 15, cursor: "pointer",
      }}>
        {saving ? "Guardando..." : isSaved ? "✓ RPE registrado · pulsa para actualizar" : "Registrar RPE"}
      </button>
    </div>
  );
}
