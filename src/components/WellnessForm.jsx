"use client";
import { useState, useEffect } from "react";
import { COLORS, WELLNESS_FIELDS } from "@/lib/constants";
import { wellnessScore, wellnessStatus, todayStr } from "@/lib/utils";
import { saveWellness } from "@/lib/db";
import SliderField from "./SliderField";

export default function WellnessForm({ user, existing, refreshData }) {
  const [values, setValues] = useState(
    existing ? Object.fromEntries(WELLNESS_FIELDS.map((f) => [f.key, existing[f.key]]))
      : Object.fromEntries(WELLNESS_FIELDS.map((f) => [f.key, 3]))
  );
  const [comment, setComment] = useState(existing ? existing.comment || "" : "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (existing && !dirty) {
      setValues(Object.fromEntries(WELLNESS_FIELDS.map((f) => [f.key, existing[f.key]])));
      setComment(existing.comment || "");
    }
  }, [existing, dirty]);

  const isSaved = !!existing && !dirty;
  const handleChange = (key, val) => { setValues((v) => ({ ...v, [key]: val })); setDirty(true); };
  const handleCommentChange = (val) => { setComment(val); setDirty(true); };

  const handleSubmit = async () => {
    setSaving(true);
    const entry = {
      teamId: user.team_id || user.teamId,
      username: user.username,
      displayName: user.display_name || user.displayName,
      date: todayStr(),
      ...values, comment: comment.trim(),
      commentRead: existing ? (comment.trim() !== (existing.comment || "").trim() ? false : existing.commentRead || false) : false,
      id: existing ? existing.id : undefined, ts: Date.now(),
    };
    try { await saveWellness(entry); await refreshData(); setDirty(false); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const score = wellnessScore(values);

  return (
    <div>
      <div style={{ background: COLORS.panel, borderRadius: 14, padding: "1.25rem", marginBottom: 18, border: `1px solid ${COLORS.line}` }}>
        <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 4 }}>Índice de bienestar</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 32, color: COLORS.lime }}>{score.toFixed(1)} / 5</div>
      </div>
      {WELLNESS_FIELDS.map((f) => <SliderField key={f.key} field={f} value={values[f.key]} onChange={handleChange} />)}

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Comentario para el preparador (opcional)</div>
        <textarea value={comment} onChange={(e) => handleCommentChange(e.target.value)}
          placeholder="Escribe aquí cualquier cosa que quieras contarle a tu preparador..." rows={3}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 10,
            background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text,
            fontSize: 14, fontFamily: "'Inter', sans-serif", resize: "vertical", outline: "none",
          }} />
      </div>

      <button onClick={handleSubmit} disabled={saving} style={{
        width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
        background: isSaved ? COLORS.limeDark : COLORS.lime, color: isSaved ? COLORS.lime : "#14171c",
        fontWeight: 700, fontSize: 15, marginTop: 8, cursor: "pointer",
      }}>
        {saving ? "Guardando..." : isSaved ? "✓ Check-in guardado · pulsa para actualizar" : "Guardar check-in"}
      </button>
      <p style={{ fontSize: 12, color: COLORS.text, textAlign: "center", marginTop: 10 }}>
        Puedes volver a editar tu check-in de hoy en cualquier momento.
      </p>
    </div>
  );
}
