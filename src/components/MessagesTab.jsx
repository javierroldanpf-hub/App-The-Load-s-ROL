"use client";
import { useState, useMemo, useEffect } from "react";
import { COLORS, WELLNESS_FIELDS } from "@/lib/constants";
import { fmtDateLong, weekdayLabel } from "@/lib/utils";
import { markWellnessCommentRead, markRpeCommentRead, sendPlayerAlert, getSentAlerts } from "@/lib/db";
import Avatar from "./Avatar";

const ALERT_TYPES = [
  { id: "custom",             label: "Aviso personalizado",           emoji: "📢" },
  { id: "reminder_forms",     label: "Recordatorio de formularios",   emoji: "📋" },
  { id: "individual_session", label: "Sesión individual añadida",     emoji: "🏋️" },
];

function alertLabel(type) {
  return ALERT_TYPES.find((t) => t.id === type)?.label || type;
}
function alertEmoji(type) {
  return ALERT_TYPES.find((t) => t.id === type)?.emoji || "📢";
}
function fmtTs(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CommentModal({ entry, type, onClose, onMarkRead }) {
  const isWellness = type === "wellness";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 50 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 380 }}>
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 2 }}>{weekdayLabel(entry.date)} · {fmtDateLong(entry.date)}</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 17, marginBottom: 14, color: COLORS.text }}>
          {entry.displayName} · {isWellness ? "Wellness" : "RPE"}
        </div>
        {isWellness && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 14 }}>
            {WELLNESS_FIELDS.map((f) => (
              <div key={f.key} style={{ textAlign: "center", background: COLORS.panelRaised, borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontSize: 14 }}>{f.emoji}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: COLORS.text }}>{entry[f.key] || "–"}</div>
                <div style={{ fontSize: 9, color: COLORS.text }}>{f.shortLabel}</div>
              </div>
            ))}
          </div>
        )}
        {!isWellness && (
          <div style={{ fontSize: 14, color: COLORS.text, marginBottom: 14 }}>
            RPE: <strong style={{ color: COLORS.text }}>{entry.rpe}</strong> · Duración: <strong style={{ color: COLORS.text }}>{entry.duration} min</strong>
          </div>
        )}
        <div style={{ background: COLORS.panelRaised, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: COLORS.text, marginBottom: 18, lineHeight: 1.5 }}>
          {entry.comment}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cerrar</button>
          {!entry.commentRead && (
            <button onClick={onMarkRead} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Marcar leído</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Send alert panel ──────────────────────────────────────────────────────────
function SendAlertPanel({ team, onSent }) {
  const roster = team.roster || [];
  const [toUsername, setToUsername] = useState("all");
  const [alertType, setAlertType] = useState("custom");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState("");

  const handleSend = async () => {
    const targets = toUsername === "all" ? roster.map((p) => p.username) : [toUsername];
    setSending(true);
    setError("");
    try {
      await Promise.all(targets.map((u) => sendPlayerAlert({
        teamId: team.teamId,
        fromUsername: team.coachUsername || "",
        toUsername: u,
        type: alertType,
        message: alertType === "custom" ? message : "",
      })));
      setSent(true);
      setMessage("");
      setTimeout(() => setSent(false), 2000);
      onSent();
    } catch (e) {
      setError(e?.message || e?.error_description || "Error al enviar. ¿Está creada la tabla player_alerts en Supabase?");
    } finally { setSending(false); }
  };

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 10, background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.2rem", display: "flex", flexDirection: "column", gap: 14, minWidth: 260 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: COLORS.text }}>Enviar aviso</div>

      <div>
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Destinatario</div>
        <select value={toUsername} onChange={(e) => setToUsername(e.target.value)} style={{ ...inputStyle }}>
          <option value="all">Todos los jugadores</option>
          {roster.map((p) => (
            <option key={p.username} value={p.username}>{p.displayName || p.username}</option>
          ))}
        </select>
      </div>

      <div>
        <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Tipo de aviso</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ALERT_TYPES.map((t) => (
            <button key={t.id} onClick={() => setAlertType(t.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
              border: `1px solid ${alertType === t.id ? COLORS.lime : COLORS.line}`,
              background: alertType === t.id ? COLORS.limeDark : "transparent",
              color: alertType === t.id ? COLORS.lime : COLORS.text,
              cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: alertType === t.id ? 700 : 400,
            }}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {alertType === "custom" && (
        <div>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Mensaje</div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Escribe el aviso..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "#ff5a5f", background: "#2a1015", border: "1px solid #5a2525", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
      <button onClick={handleSend} disabled={sending || (alertType === "custom" && !message.trim())} style={{
        padding: "11px 0", borderRadius: 12, border: "none",
        background: sent ? "#2a4a0a" : COLORS.lime, color: sent ? COLORS.lime : "#14171c",
        fontWeight: 700, fontSize: 14, cursor: sending ? "default" : "pointer",
        opacity: (alertType === "custom" && !message.trim()) ? 0.5 : 1,
      }}>
        {sent ? "✓ Enviado" : sending ? "Enviando..." : "Enviar aviso"}
      </button>
    </div>
  );
}

// ── Sent alerts list ──────────────────────────────────────────────────────────
function SentAlertsList({ team }) {
  const [alerts, setAlerts] = useState([]);
  const roster = team.roster || [];

  useEffect(() => {
    getSentAlerts(team.teamId).then(setAlerts);
  }, [team.teamId]);

  const getDisplayName = (username) => {
    const p = roster.find((r) => r.username === username);
    return p?.displayName || username;
  };

  if (alerts.length === 0) return <div style={{ fontSize: 13, color: COLORS.text, textAlign: "center", padding: "1.5rem 0" }}>No hay avisos enviados aún.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map((a) => (
        <div key={a.id} style={{ background: COLORS.panel, border: `1px solid ${a.dismissedAt ? COLORS.line : COLORS.lime + "55"}`, borderRadius: 12, padding: "10px 14px", opacity: a.dismissedAt ? 0.55 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{alertEmoji(a.type)}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{getDisplayName(a.toUsername)}</div>
                <div style={{ fontSize: 11, color: COLORS.text, opacity: 0.6 }}>{alertLabel(a.type)}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: COLORS.text, opacity: 0.5, textAlign: "right", flexShrink: 0 }}>
              {fmtTs(a.createdAt)}
              {a.dismissedAt && <div style={{ color: COLORS.lime, opacity: 0.7 }}>Leído</div>}
            </div>
          </div>
          {a.message && <div style={{ fontSize: 12, color: COLORS.text, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${COLORS.line}` }}>{a.message}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function MessagesTab({ team, wellness, rpe, onDataRefresh }) {
  const [filter, setFilter] = useState("avisos");
  const [activeComment, setActiveComment] = useState(null);
  const [localRead, setLocalRead] = useState(new Set());
  const [sentKey, setSentKey] = useState(0);

  const getRosterPlayer = (username) => {
    const r = (team.roster || []).find((p) => p.username === username);
    return r || { username, displayName: username, photoUrl: null };
  };

  const withComments = useMemo(() => {
    const all = [
      ...wellness.filter((e) => e.comment && e.comment.trim()).map((e) => ({ ...e, type: "wellness" })),
      ...rpe.filter((e) => e.comment && e.comment.trim()).map((e) => ({ ...e, type: "rpe" })),
    ]
      .map((e) => {
        const p = getRosterPlayer(e.username);
        return { ...e, displayName: e.displayName || p.displayName || e.username, photoUrl: p.photoUrl || e.photoUrl || null };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date) || (b.ts || 0) - (a.ts || 0));

    if (filter === "comentarios_unread") return all.filter((e) => !e.commentRead && !localRead.has(`${e.type}_${e.username}_${e.date}`));
    return all.map((e) => ({ ...e, commentRead: e.commentRead || localRead.has(`${e.type}_${e.username}_${e.date}`) }));
  }, [wellness, rpe, filter, localRead]);

  const handleMarkRead = async () => {
    if (!activeComment) return;
    const key = `${activeComment.type}_${activeComment.username}_${activeComment.date}`;
    if (activeComment.type === "wellness") await markWellnessCommentRead(activeComment);
    else await markRpeCommentRead(activeComment);
    setLocalRead((prev) => new Set([...prev, key]));
    setActiveComment(null);
    onDataRefresh();
  };

  const unreadComments = useMemo(() => wellness.filter((e) => e.comment && !e.commentRead).length + rpe.filter((e) => e.comment && !e.commentRead).length, [wellness, rpe]);

  const TABS = [
    { id: "enviar",             label: "Enviar aviso" },
    { id: "avisos",             label: "Avisos enviados" },
    { id: "comentarios_unread", label: `Sin leer${unreadComments > 0 ? ` (${unreadComments})` : ""}` },
    { id: "comentarios_all",    label: "Todos" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: COLORS.panelRaised, borderRadius: 10, padding: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
            background: filter === t.id ? COLORS.panel : "transparent",
            color: filter === t.id ? COLORS.lime : COLORS.text, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {filter === "enviar" && <SendAlertPanel team={team} onSent={() => { setSentKey((k) => k + 1); setFilter("avisos"); }} />}
      {filter === "avisos" && <SentAlertsList key={sentKey} team={team} />}
      {(filter === "comentarios_unread" || filter === "comentarios_all") && (
        withComments.length === 0 ? (
          <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "2rem 0" }}>
            {filter === "comentarios_unread" ? "No hay comentarios sin leer." : "Aún no hay comentarios registrados."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {withComments.map((entry, i) => {
              const isRead = entry.commentRead || localRead.has(`${entry.type}_${entry.username}_${entry.date}`);
              return (
                <button key={`${entry.type}_${entry.username}_${entry.date}_${i}`} onClick={() => setActiveComment(entry)} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, background: COLORS.panel,
                  border: `1px solid ${isRead ? COLORS.line : COLORS.lime}`,
                  borderRadius: 14, padding: "0.9rem 1rem", textAlign: "left", cursor: "pointer", width: "100%",
                }}>
                  <Avatar name={entry.displayName} photoUrl={entry.photoUrl} size={40} isInjured={(team.injuredPlayers || []).includes(entry.username)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{entry.displayName}</span>
                      {!isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.lime, flexShrink: 0, marginTop: 3 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 5 }}>
                      {weekdayLabel(entry.date)} · {fmtDateLong(entry.date)}
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: entry.type === "wellness" ? "#1e3010" : "#0e1f3a", color: entry.type === "wellness" ? COLORS.lime : COLORS.blue }}>
                        {entry.type === "wellness" ? "Wellness" : "RPE"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {entry.comment}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {activeComment && (
        <CommentModal entry={activeComment} type={activeComment.type} onClose={() => setActiveComment(null)} onMarkRead={handleMarkRead} />
      )}
    </div>
  );
}
