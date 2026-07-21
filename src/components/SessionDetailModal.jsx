"use client";
import { useState } from "react";
import { COLORS, INTENSITY_LEVELS } from "@/lib/constants";
import { weekdayLabel, fmtDateLong, primaryBtn } from "@/lib/utils";
import { saveSession } from "@/lib/db";
import StatusPill from "./StatusPill";

const ATHLETE_NOTE_BLOCK_NAME = "Nota del atleta";

function getBlocks(description) {
  try {
    const p = JSON.parse(description || "{}");
    if (p.blocks) return p.blocks;
  } catch {}
  return [];
}

export default function SessionDetailModal({ date, session, onClose, user, refreshData, isEquipo = false }) {
  const intensity = session.isRest ? INTENSITY_LEVELS["descanso"] : (INTENSITY_LEVELS[session.intensity] || INTENSITY_LEVELS["amarillo"]);

  const existingBlocks = getBlocks(session.description);
  const existingNoteBlock = existingBlocks.find((b) => b.name === ATHLETE_NOTE_BLOCK_NAME);
  const [note, setNote] = useState(existingNoteBlock?.content || "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const otherBlocks = existingBlocks.filter((b) => b.name !== ATHLETE_NOTE_BLOCK_NAME);
      const newBlocks = note.trim()
        ? [...otherBlocks, { name: ATHLETE_NOTE_BLOCK_NAME, duration: "", content: note.trim() }]
        : otherBlocks;
      const newDescription = JSON.stringify({ blocks: newBlocks });
      await saveSession({ ...session, description: newDescription });
      if (refreshData) await refreshData();
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSavingNote(false); }
  };

  const renderContent = () => {
    if (!session.description) return null;
    let parsed = null;
    try { parsed = JSON.parse(session.description); } catch {}

    // Partido / competición: texto plano (legacy) o JSON con rivalText/rivalPhoto
    if (!parsed || typeof parsed !== "object") {
      return (
        <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: COLORS.text, marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>Rival</div>
          <div>{session.description}</div>
        </div>
      );
    }
    if (parsed.rivalText !== undefined || parsed.rivalPhoto !== undefined) {
      return (
        <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          {parsed.rivalPhoto && <img src={parsed.rivalPhoto} alt="Escudo rival" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, background: COLORS.panel, padding: 4, flexShrink: 0 }} />}
          <div>
            <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>Rival</div>
            {parsed.rivalText && <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{parsed.rivalText}</div>}
          </div>
        </div>
      );
    }

    // Nuevo formato con bloques
    if (parsed.blocks) {
      const blocks = parsed.blocks.filter((b) => b.name || b.content);
      if (blocks.length === 0) return null;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: b.content ? 8 : 0 }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.text }}>{b.name || `Bloque ${i + 1}`}</div>
                {b.duration && <div style={{ fontSize: 11, color: COLORS.lime, fontWeight: 600 }}>{b.duration} min</div>}
              </div>
              {b.content && <div style={{ fontSize: 13, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{b.content}</div>}
              {isEquipo && b.tasks?.length > 0 && (
                <div style={{ marginTop: 10, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: COLORS.bg || "#14171c" }}>
                        {["#", "Nombre", "T. trabajo", "T. descanso", "Espacio", "Área rel."].map((h) => (
                          <th key={h} style={{ padding: "4px 7px", textAlign: "left", color: COLORS.text, fontWeight: 700, borderBottom: `1px solid ${COLORS.line}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.tasks.map((t, ti) => (
                        <>
                          <tr key={t.id || ti} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                            <td style={{ padding: "4px 7px", color: COLORS.lime, fontWeight: 700 }}>T{ti + 1}</td>
                            <td style={{ padding: "4px 7px", color: COLORS.text }}>{t.name}</td>
                            <td style={{ padding: "4px 7px", color: COLORS.text }}>{t.workTime}</td>
                            <td style={{ padding: "4px 7px", color: COLORS.text }}>{t.restTime}</td>
                            <td style={{ padding: "4px 7px", color: COLORS.text }}>{t.space}</td>
                            <td style={{ padding: "4px 7px", color: COLORS.text }}>{t.relativeArea}</td>
                          </tr>
                          {t.imageBase64 && (
                            <tr key={`${t.id || ti}-img`} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                              <td colSpan={6} style={{ padding: "6px 7px" }}>
                                <img src={t.imageBase64} alt={`Tarea ${ti + 1}`} style={{ maxWidth: 200, maxHeight: 120, objectFit: "contain", borderRadius: 6 }} />
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Formato antiguo gimnasio/campo
    if (parsed.g !== undefined || parsed.c !== undefined) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {parsed.g && (
            <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Gimnasio</div>
              <div style={{ fontSize: 13, color: COLORS.text }}>{parsed.g}</div>
            </div>
          )}
          {parsed.c && (
            <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Entreno de campo</div>
              <div style={{ fontSize: 13, color: COLORS.text }}>{parsed.c}</div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 50,
    }}>
      <div style={{
        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16,
        padding: "1.5rem", width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 4 }}>{weekdayLabel(date)}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 14 }}>{fmtDateLong(date)}</div>
        <div style={{
          background: intensity.dark, borderRadius: 10, padding: "12px 14px", marginBottom: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: intensity.color }}>{session.isRest ? "Descanso" : session.sessionType}</span>
          <StatusPill label={intensity.label} color={intensity.color} bg="transparent" />
        </div>
        {!session.isRest && session.duration > 0 && (
          <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 14 }}>Duración total: <strong style={{ color: COLORS.text }}>{session.duration} min</strong></div>
        )}
        {renderContent()}
        {session.allowPlayerNote && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Nota del entreno</div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8 }}>Tu preparador/a te pide que añadas información sobre esta sesión.</div>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
              placeholder="Escribe aquí tus sensaciones u observaciones..."
              rows={4}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: COLORS.panelRaised, border: `1px solid ${COLORS.lime}`, color: COLORS.text, fontSize: 14, fontFamily: "'Inter', sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={handleSaveNote} disabled={savingNote} style={{ marginTop: 8, width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: noteSaved ? COLORS.limeDark : COLORS.lime, color: noteSaved ? COLORS.lime : "#14171c", fontWeight: 700, fontSize: 14, cursor: savingNote ? "default" : "pointer" }}>
              {savingNote ? "Guardando..." : noteSaved ? "✓ Guardado" : "Guardar nota"}
            </button>
          </div>
        )}
        <button onClick={onClose} style={primaryBtn(false)}>Cerrar</button>
      </div>
    </div>
  );
}
