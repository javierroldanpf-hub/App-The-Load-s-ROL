"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { COLORS, TEAM_KINDS, INTENSITY_LEVELS, WEEKDAY_LABELS } from "@/lib/constants";
import { todayStr, addDays, mondayOf, weekDates, weekNumberFrom, fmtDateLong, fmtDateShort, weekdayLabel, firstOfMonth, addMonths, monthLabel, monthGridDates } from "@/lib/utils";
import { getTeam, getPlayerProfile, loadTeamWellness, loadTeamRpe, loadTeamSessions, getReminderSettings, saveReminderSettings, loadMesocycles, getPlayerAlertsForPlayer, dismissPlayerAlert } from "@/lib/db";
import TopBar from "./TopBar";
import Avatar from "./Avatar";
import WellnessForm from "./WellnessForm";
import RpeForm from "./RpeForm";
import SessionDetailModal from "./SessionDetailModal";
import PlayerMyData from "./PlayerMyData";

export default function PlayerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("today");
  const [team, setTeam] = useState(null);
  const [profile, setProfile] = useState(null);
  const [wellness, setWellness] = useState([]);
  const [rpe, setRpe] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const teamId = user.team_id || user.teamId;

  const refreshAlerts = useCallback(async () => {
    const a = await getPlayerAlertsForPlayer(user.username);
    setAlerts(a);
  }, [user.username]);

  const refreshData = useCallback(async () => {
    const [t, p, w, r, s] = await Promise.all([
      getTeam(teamId), getPlayerProfile(teamId, user.username),
      loadTeamWellness(teamId), loadTeamRpe(teamId), loadTeamSessions(teamId),
    ]);
    setTeam(t);
    setProfile(p);
    setWellness(w);
    setRpe(r);
    setSessions(s);
  }, [teamId, user.username]);

  useEffect(() => { refreshAlerts(); }, [refreshAlerts]);

  useEffect(() => { (async () => { await refreshData(); setLoading(false); })(); }, [refreshData]);

  const myWellness = wellness.filter((e) => e.username === user.username).sort((a, b) => new Date(b.date) - new Date(a.date));
  const myRpe = rpe.filter((e) => e.username === user.username).sort((a, b) => new Date(b.date) - new Date(a.date));
  const todaySession = sessions.find((s) => s.date === todayStr());
  const todayWellnessDone = myWellness.some((e) => e.date === todayStr());
  const todayRpeDone = myRpe.some((e) => e.date === todayStr() && e.sessionType === (todaySession && todaySession.sessionType));

  if (loading || !team) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.text }}>Cargando...</div>;
  }

  const kindDef = TEAM_KINDS[team.kind || "equipo"];
  const displayName = profile ? profile.displayName : (user.display_name || user.displayName);
  const photoUrl = profile ? profile.photoUrl : null;

  const isMatchDay = todaySession && !todaySession.isRest && todaySession.sessionType && (todaySession.sessionType.includes("MD(H)") || todaySession.sessionType.includes("MD(A)"));
  const statusLabel = !todaySession
    ? "Sin sesión planificada hoy"
    : todaySession.isRest
      ? "Hoy es día de descanso"
      : !todayWellnessDone
        ? `Pendiente: wellness ${isMatchDay ? "antes de jugar" : "antes de entrenar"}`
        : !todayRpeDone
          ? "Pendiente: RPE después de la sesión"
          : "Hoy ya está completo";

  return (
    <div style={{ minHeight: "100vh", padding: "1.5rem 1.25rem 3rem", maxWidth: 480, margin: "0 auto" }}>
      <TopBar rightSlot={
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="14" height="14" viewBox="0 0 512 512" fill={COLORS.lime}><path d="M320 64H80C62 64 48 78 48 96v320c0 18 14 32 32 32h240c18 0 32-14 32-32v-80h-48v64H96V112h208v64h48V96c0-18-14-32-32-32z"/><path d="M456 234l-92-92-34 34 50 50H192v48h188l-50 50 34 34 92-92c9-9 9-24 0-32z"/></svg> Salir</button>
      } />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 20 }}>
        <Avatar name={displayName} photoUrl={photoUrl} size={48} isInjured={(team.injuredPlayers || []).includes(user.username)} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{displayName}</div>
          <div style={{ fontSize: 11, color: COLORS.text, marginTop: -1 }}>{team.name} · {kindDef.label}</div>
          <div style={{ fontSize: 12, color: COLORS.text }}>{statusLabel}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: COLORS.panel, borderRadius: 12, padding: 4 }}>
        {[{ id: "today", label: "Hoy" }, { id: "calendar", label: "Calendario" }, { id: "mydata", label: "Mis datos" }, { id: "settings", label: "Notificaciones" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "8px 0", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 600,
            background: tab === t.id ? COLORS.panelRaised : "transparent",
            color: tab === t.id ? COLORS.text : COLORS.textDim, cursor: "pointer",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <ReminderBanner username={user.username} todaySession={todaySession} onGoToForm={() => setTab("today")} />

      {tab === "today" && (
        <PlayerToday
          user={user}
          team={team}
          session={todaySession}
          wellnessDone={todayWellnessDone}
          rpeDone={todayRpeDone}
          existingWellness={myWellness.find((e) => e.date === todayStr())}
          existingRpe={myRpe.find((e) => e.date === todayStr())}
          refreshData={refreshData}
          alerts={alerts}
          onDismissAlert={async (id) => { await dismissPlayerAlert(id); refreshAlerts(); }}
        />
      )}
      {tab === "calendar" && <PlayerCalendar sessions={sessions} team={team} user={user} rpe={rpe} refreshData={refreshData} />}
      {tab === "mydata" && <PlayerMyData user={user} team={team} onProfileUpdate={(p) => { setProfile(p); refreshData(); }} />}
      {tab === "settings" && <ReminderSettings username={user.username} />}
    </div>
  );
}

function ReminderSettings({ username }) {
  const [wellnessEnabled, setWellnessEnabled] = useState(false);
  const [wellnessTime, setWellnessTime] = useState("09:00");
  const [rpeEnabled, setRpeEnabled] = useState(false);
  const [rpeTime, setRpeTime] = useState("18:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getReminderSettings(username);
      if (settings) {
        setWellnessEnabled(!!settings.wellnessEnabled);
        setWellnessTime(settings.wellnessTime || "09:00");
        setRpeEnabled(!!settings.rpeEnabled);
        setRpeTime(settings.rpeTime || "18:00");
      }
      setLoading(false);
    })();
  }, [username]);

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4", fontSize: 15, outline: "none" };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveReminderSettings(username, { wellnessEnabled, wellnessTime, rpeEnabled, rpeTime });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "2rem 0" }}>Cargando...</div>;

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Notificaciones</div>
      <p style={{ fontSize: 12, color: COLORS.text, marginTop: 0, marginBottom: 16 }}>
        Te mostraremos un aviso en la app a la hora que elijas. Solo funciona si tienes la app abierta en ese momento.
      </p>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: wellnessEnabled ? 14 : 0 }}>
          <span style={{ fontSize: 14 }}>Recordatorio de Wellness</span>
          <button onClick={() => setWellnessEnabled((e) => !e)} style={{
            width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
            background: wellnessEnabled ? COLORS.lime : COLORS.panelRaised, transition: "background 0.2s",
          }}>
            <span style={{ position: "absolute", top: 3, left: wellnessEnabled ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: wellnessEnabled ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
          </button>
        </div>
        {wellnessEnabled && (
          <div>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Hora del recordatorio</div>
            <input type="time" value={wellnessTime} onChange={(e) => setWellnessTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
        )}
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rpeEnabled ? 14 : 0 }}>
          <span style={{ fontSize: 14 }}>Recordatorio de RPE</span>
          <button onClick={() => setRpeEnabled((e) => !e)} style={{
            width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
            background: rpeEnabled ? COLORS.lime : COLORS.panelRaised, transition: "background 0.2s",
          }}>
            <span style={{ position: "absolute", top: 3, left: rpeEnabled ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: rpeEnabled ? "#14171c" : COLORS.textFaint, transition: "left 0.2s" }} />
          </button>
        </div>
        {rpeEnabled && (
          <div>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Hora del recordatorio</div>
            <input type="time" value={rpeTime} onChange={(e) => setRpeTime(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Guardando..." : savedMsg ? "✓ Guardado" : "Guardar ajustes"}
      </button>
    </div>
  );
}

function ReminderBanner({ username, todaySession, onGoToForm }) {
  const [settings, setSettings] = useState(null);
  const [showWellness, setShowWellness] = useState(false);
  const [showRpe, setShowRpe] = useState(false);
  const [dismissedWellness, setDismissedWellness] = useState(false);
  const [dismissedRpe, setDismissedRpe] = useState(false);

  useEffect(() => {
    (async () => { const s = await getReminderSettings(username); setSettings(s); })();
  }, [username]);

  useEffect(() => {
    if (!settings) return;
    const check = () => {
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (settings.wellnessEnabled && nowStr === settings.wellnessTime && !dismissedWellness) setShowWellness(true);
      if (settings.rpeEnabled && nowStr === settings.rpeTime && !dismissedRpe) setShowRpe(true);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [settings, dismissedWellness, dismissedRpe]);

  if (!todaySession || todaySession.isRest) return null;
  if (!showWellness && !showRpe) return null;

  const label = showWellness ? "Es la hora de tu wellness de hoy" : "Es la hora de tu RPE de hoy";
  const handleDismiss = () => {
    if (showWellness) { setShowWellness(false); setDismissedWellness(true); }
    if (showRpe) { setShowRpe(false); setDismissedRpe(true); }
  };
  const handleGo = () => { handleDismiss(); onGoToForm(); };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: COLORS.limeDark, border: `1px solid ${COLORS.lime}`, borderRadius: 14, padding: "0.8rem 1rem", marginBottom: 18 }}>
      <span style={{ fontSize: 13, color: COLORS.lime }}>⏰ {label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleDismiss} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 12, cursor: "pointer" }}>Ahora no</button>
        <button onClick={handleGo} style={{ background: COLORS.lime, border: "none", color: "#14171c", fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Ir al formulario</button>
      </div>
    </div>
  );
}

const ALERT_LABELS = {
  custom:             { emoji: "📢", label: null },
  reminder_forms:     { emoji: "📋", label: "Recuerda completar tus formularios de hoy" },
  individual_session: { emoji: "🏋️", label: "Tu preparador físico te ha añadido una sesión individual" },
};

function AlertBanner({ alert, onDismiss }) {
  const meta = ALERT_LABELS[alert.type] || ALERT_LABELS.custom;
  return (
    <button onClick={onDismiss} style={{
      display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left",
      background: "#1a2a1a", border: `1px solid ${COLORS.lime}`, borderRadius: 12,
      padding: "12px 14px", cursor: "pointer", marginBottom: 10,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.lime, marginBottom: 2 }}>Aviso del preparador</div>
        <div style={{ fontSize: 13, color: COLORS.text }}>{alert.message || meta.label}</div>
      </div>
      <span style={{ fontSize: 16, color: COLORS.text, opacity: 0.4, flexShrink: 0 }}>✕</span>
    </button>
  );
}

function PlayerToday({ user, team, session, wellnessDone, rpeDone, existingWellness, existingRpe, refreshData, alerts = [], onDismissAlert }) {
  const [showDetail, setShowDetail] = useState(false);

  const alertBanners = alerts.length > 0 ? (
    <div style={{ marginBottom: 6 }}>
      {alerts.map((a) => <AlertBanner key={a.id} alert={a} onDismiss={() => onDismissAlert(a.id)} />)}
    </div>
  ) : null;

  if (!session || (!session.sessionType && !session.isRest)) {
    return (
      <div>
        {alertBanners}
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div style={{ fontSize: 13, color: COLORS.text }}>Hoy no hay sesión planificada — puedes registrar tu wellness igualmente.</div>
        </div>
        <PlayerStepCard stepNumber={1} title="Estado del día" subtitle="Cuestionario de wellness" done={wellnessDone}>
          <WellnessForm user={user} existing={existingWellness} refreshData={refreshData} />
        </PlayerStepCard>
      </div>
    );
  }

  if (session.isRest) {
    return (
      <div>
        {alertBanners}
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: COLORS.text, marginBottom: 6 }}>Hoy es día de descanso</div>
          <div style={{ fontSize: 13, color: COLORS.text }}>No tienes que completar wellness ni RPE.</div>
        </div>
      </div>
    );
  }

  const intensity = INTENSITY_LEVELS[session.intensity];

  return (
    <div>
      {alertBanners}
      <button onClick={() => setShowDetail(true)} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
        background: intensity.dark, border: `1px solid ${intensity.color}`, borderRadius: 14,
        padding: "1rem 1.25rem", marginBottom: 22, cursor: "pointer", textAlign: "left",
      }}>
        <div>
          <div style={{ fontSize: 12, color: intensity.color, opacity: 0.85 }}>Sesión de hoy · toca para ver detalle</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 22, color: intensity.color }}>{session.sessionType}</div>
        </div>
      </button>

      {showDetail && <SessionDetailModal date={session.date} session={session} onClose={() => setShowDetail(false)} />}

      {(() => {
        const isMatch = session.sessionType && (session.sessionType.includes("MD(H)") || session.sessionType.includes("MD(A)"));

        // Resolve duration: convocatoria minutes → defaultMatchDuration → session.duration
        const squadEntry = (team.matchSquads || {})[session.date]?.[user.username];
        const effectiveDuration = squadEntry?.convocado && squadEntry?.minutesPlayed !== "" && squadEntry?.minutesPlayed != null
          ? Number(squadEntry.minutesPlayed)
          : isMatch && team.defaultMatchDuration
            ? team.defaultMatchDuration
            : session.duration;
        const effectiveSession = { ...session, duration: effectiveDuration };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <PlayerStepCard stepNumber={1} title={isMatch ? "Antes de jugar" : "Antes de entrenar"} subtitle="Cuestionario de wellness" done={wellnessDone}>
              <WellnessForm user={user} existing={existingWellness} refreshData={refreshData} />
            </PlayerStepCard>

            <PlayerStepCard stepNumber={2} title={isMatch ? "Después de jugar" : "Después de entrenar"} subtitle={`Esfuerzo percibido de ${session.sessionType}`}
              done={rpeDone} locked={!wellnessDone} lockedMessage={`Completa primero el wellness de hoy`}>
              <RpeForm user={user} session={effectiveSession} existing={existingRpe} refreshData={refreshData} />
            </PlayerStepCard>
          </div>
        );
      })()}
    </div>
  );
}

function PlayerStepCard({ stepNumber, title, subtitle, done, locked, lockedMessage, children }) {
  const [open, setOpen] = useState(!done && !locked);
  useEffect(() => { if (!locked && !done) setOpen(true); }, [locked, done]);

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => !locked && setOpen((o) => !o)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1rem 1.25rem", background: "none", border: "none", cursor: locked ? "default" : "pointer", color: COLORS.text,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: done ? COLORS.limeDark : COLORS.panelRaised, color: done ? COLORS.lime : COLORS.textDim,
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {done ? "✓" : stepNumber}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
            <div style={{ fontSize: 12, color: COLORS.text }}>{locked ? lockedMessage : subtitle}</div>
          </div>
        </div>
        {!locked && <span style={{ color: COLORS.text, fontSize: 13 }}>{open ? "▲" : "▼"}</span>}
      </button>
      {open && !locked && <div style={{ padding: "0 1.25rem 1.25rem" }}>{children}</div>}
    </div>
  );
}

const WEEK_TYPE_COLORS = { carga: "#ff9f40", sobrecarga: "#ff5a5f", descarga: "#60a5fa" };
const WEEK_TYPE_LABELS = { carga: "Carga", sobrecarga: "Sobrecarga", descarga: "Descarga" };
const MENSTRUAL_PHASES_FULL = [
  { emoji: "🌕", label: "Semana Previa al Sangrado", fase: "Fase Lútea Tardía", metabolismo: "Predominancia de Progesterona (Metabolismo de Ácidos Grasos)", type: "carga" },
  { emoji: "🔴", label: "Semana de Sangrado", fase: "Fase Folicular Temprana", metabolismo: "Bajada de Progesterona y Subida del Estrógeno (No hay predominancia de ninguna vía metabólica)", type: "carga" },
  { emoji: "🔥💪", label: "Semana Post Sangrado", fase: "Fase Folicular Tardía", metabolismo: "Predominancia del Estrógeno (Síntesis y Almacenamiento de Glucógeno)", type: "sobrecarga" },
  { emoji: "💙", label: "Semana 2ª Post Sangrado", fase: "Fase Lútea Temprana", metabolismo: "Bajada del Estrógeno y Subida de la Progesterona (Aumento del Metabolismo de Ácidos Grasos)", type: "descarga" },
];

function PlayerCalendar({ sessions, team, user, rpe = [], refreshData }) {
  const tStr = todayStr;
  const wdLabel = weekdayLabel;

  const [viewMode, setViewMode] = useState("week");
  const [weekMonday, setWeekMonday] = useState(mondayOf(tStr()));
  const [monthAnchor, setMonthAnchor] = useState(firstOfMonth(tStr()));
  const [detailDate, setDetailDate] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [showMenstrualPanel, setShowMenstrualPanel] = useState(false);
  const openDetail = (date, session) => { setDetailDate(date); setDetailSession(session); };
  const [mesocycles, setMesocycles] = useState([]);

  useEffect(() => {
    if (team?.teamId) loadMesocycles(team.teamId).then((all) => {
      // Solo mesociclos normales + menstruales donde la jugadora está asignada
      setMesocycles(all.filter((m) => !m.isMenstrual || (m.menstrualPlayers || []).includes(user?.username)));
    }).catch(() => {});
  }, [team?.teamId, user?.username]);

  const MENSTRUAL_PHASES_CAL = [
    { emoji: "🌕", label: "Semana Previa al Sangrado" },
    { emoji: "🔴", label: "Semana de Sangrado" },
    { emoji: "🔥💪", label: "Semana Post Sangrado" },
    { emoji: "💙", label: "Semana 2ª Post Sangrado" },
  ];
  const getMesoColors = (date) => mesocycles.filter((m) => m.color && date >= m.startDate && date <= m.endDate).map((m) => m.color);
  const getWeekTypeColor = (date) => {
    for (const m of mesocycles) {
      if (date < m.startDate || date > m.endDate) continue;
      const week = (m.weeks || []).find((w) => date >= w.weekStart && date <= w.weekEnd);
      if (week?.type) return WEEK_TYPE_COLORS[week.type] || null;
    }
    return null;
  };
  const getMenstrualPhase = (date) => {
    for (const m of mesocycles) {
      if (!m.isMenstrual || date < m.startDate || date > m.endDate) continue;
      const idx = (m.weeks || []).findIndex((w) => date >= w.weekStart && date <= w.weekEnd);
      if (idx >= 0) return MENSTRUAL_PHASES_CAL[Math.min(idx, 3)];
    }
    return null;
  };
  const isRelaxin = (date) => mesocycles.some((m) => {
    if (!m.isMenstrual || date < m.startDate || date > m.endDate) return false;
    const diff = Math.round((new Date(date + "T00:00:00") - new Date(m.startDate + "T00:00:00")) / 86400000) + 1;
    return diff === 20 || diff === 21 || diff === 22;
  });

  const days = weekDates(weekMonday);
  const effectiveFirstMonday = (team && team.firstMonday) || mondayOf(tStr());
  const weekNum = weekNumberFrom(effectiveFirstMonday, weekMonday);
  const monthCells = useMemo(() => monthGridDates(monthAnchor), [monthAnchor]);
  const sessionByDate = useMemo(() => {
    const map = {};
    sessions.forEach((s) => { map[s.date] = s; });
    return map;
  }, [sessions]);

  // Devuelve { group, individual } para el día — group es la sesión de grupo, individual la asignada al jugador (o null)
  const getDaySessions = (date) => {
    const s = sessionByDate[date];
    if (!s) return { group: null, individuals: [] };
    const myInds = (s.individualSessions || []).filter((is) => is.players?.includes(user?.username));
    const individuals = myInds.map((ind) => ({
      teamId: s.teamId, date: s.date, createdAt: s.createdAt,
      sessionType: ind.title || "Sesión ind.",
      intensity: ind.intensity || "amarillo",
      duration: ind.duration || 0,
      description: JSON.stringify({ blocks: ind.blocks || [] }),
      isRest: false, isMatch: false, _isIndividual: true,
    }));
    const group = (s.sessionType || s.isRest) ? s : null;
    return { group, individuals };
  };

  const getPlayerSession = (date) => {
    const { group, individuals } = getDaySessions(date);
    return individuals[0] || group;
  };

  const visibleDates = viewMode === "week" ? weekDates(weekMonday) : monthGridDates(monthAnchor).map((c) => c.date);
  const activeMesos = mesocycles.filter((m) => visibleDates.some((d) => d >= m.startDate && d <= m.endDate));
  const activeWeekTypes = [...new Set(visibleDates.map(getWeekTypeColor).filter(Boolean))];
  const weekTypeEntries = Object.entries(WEEK_TYPE_COLORS).filter(([, c]) => activeWeekTypes.includes(c));
  const visibleMenstrualIdxs = new Set(visibleDates.flatMap((d) => {
    const p = getMenstrualPhase(d);
    return p ? [MENSTRUAL_PHASES_CAL.indexOf(p)] : [];
  }));
  const visibleMenstrual = MENSTRUAL_PHASES_CAL.filter((_, i) => visibleMenstrualIdxs.has(i));
  const hasRelaxin = visibleDates.some(isRelaxin);
  const hasLegend = activeMesos.length > 0 || weekTypeEntries.length > 0 || visibleMenstrual.length > 0 || hasRelaxin;
  const today = tStr();
  const activeMenstrualMeso = mesocycles.find((m) => m.isMenstrual && today >= m.startDate && today <= m.endDate);

  return (
    <div>
      {hasLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, padding: "8px 10px", background: COLORS.panel, borderRadius: 10 }}>
          {activeMesos.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.text }}>{m.name || "Mesociclo"}</span>
            </div>
          ))}
          {weekTypeEntries.map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 22, height: 5, borderRadius: 3, background: color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: COLORS.text }}>{WEEK_TYPE_LABELS[type]}</span>
            </div>
          ))}
          {visibleMenstrual.length > 0 && visibleMenstrual.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11 }}>{p.emoji}</span>
              <span style={{ fontSize: 11, color: "#e879f9" }}>{p.label}</span>
            </div>
          ))}
          {hasRelaxin && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11 }}>⚡</span>
              <span style={{ fontSize: 11, color: "#fde68a" }}>Pico relaxina</span>
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, background: COLORS.panel, borderRadius: 12, padding: 5, flex: 1 }}>
          {[{ id: "week", label: "Semana" }, { id: "month", label: "Mes" }].map((v) => (
            <button key={v.id} onClick={() => setViewMode(v.id)} style={{
              flex: 1, padding: "10px 0", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700,
              background: viewMode === v.id ? COLORS.panelRaised : "transparent",
              color: viewMode === v.id ? COLORS.text : COLORS.textDim, cursor: "pointer",
            }}>{v.label}</button>
          ))}
        </div>
        {activeMenstrualMeso && (
          <button onClick={() => setShowMenstrualPanel((v) => !v)} style={{
            padding: "10px 14px", borderRadius: 12, border: `1px solid #e879f944`,
            background: showMenstrualPanel ? "#2a0a2e" : "#1a0a1e", color: "#e879f9", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0,
          }}>🔴 Ciclo</button>
        )}
      </div>

      {/* Panel Ciclo Menstrual */}
      {showMenstrualPanel && activeMenstrualMeso && (
        <div style={{ background: "#1a0a1e", border: `1px solid #e879f944`, borderRadius: 14, padding: "1.2rem", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16, color: "#e879f9" }}>🔴 Ciclo Menstrual</div>
            <button onClick={() => setShowMenstrualPanel(false)} style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 13, color: COLORS.text, marginBottom: 12 }}>{activeMenstrualMeso.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(activeMenstrualMeso.weeks || []).map((w, i) => {
              const phase = MENSTRUAL_PHASES_FULL[i] || MENSTRUAL_PHASES_FULL[MENSTRUAL_PHASES_FULL.length - 1];
              const wt = WEEK_TYPE_COLORS[w.type || phase.type];
              const isCurrent = today >= w.weekStart && today <= w.weekEnd;
              const hasRelaxinDays = [20, 21, 22].some((day) => {
                const d = new Date(activeMenstrualMeso.startDate + "T00:00:00");
                d.setDate(d.getDate() + day - 1);
                const dStr = d.toISOString().slice(0, 10);
                return dStr >= w.weekStart && dStr <= w.weekEnd;
              });
              return (
                <div key={w.weekStart} style={{ background: COLORS.panelRaised, border: `1px solid ${isCurrent ? "#e879f9" : COLORS.line}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>
                        Microciclo {i + 1} · {fmtDateShort(w.weekStart)} – {fmtDateShort(w.weekEnd)}
                        {isCurrent && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: "#e879f9", background: "#2a0a2e", borderRadius: 4, padding: "2px 6px" }}>ACTUAL</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>{phase.emoji}</span>
                        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.text }}>{phase.label}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${wt}22`, color: wt, fontWeight: 700, flexShrink: 0 }}>{WEEK_TYPE_LABELS[w.type || phase.type]}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#e879f9", fontWeight: 600, marginBottom: 3 }}>{phase.fase}</div>
                  <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.5, marginBottom: w.contenidos ? 8 : 0 }}>{phase.metabolismo}</div>
                  {(() => {
                    if (!w.contenidos) return null;
                    const lines = w.contenidos.split("\n");
                    const firstBlank = lines.findIndex((l, i) => i > 0 && l.trim() === "");
                    const stripped = (firstBlank >= 0 ? lines.slice(firstBlank) : lines).join("\n").replace(/^\n+/, "");
                    if (!stripped) return null;
                    return (
                      <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{stripped}</div>
                      </div>
                    );
                  })()}
                  {hasRelaxinDays && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "5px 8px", borderRadius: 8, background: "#2a2a0a", border: "1px solid #fde68a44" }}>
                      <span>⚡</span>
                      <span style={{ fontSize: 11, color: "#fde68a" }}>Días 20–22 del ciclo (13–15 post sangrado): Pico de relaxina — precaución con estiramientos y movilidad</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "week" ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => setWeekMonday(addDays(weekMonday, -7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}>←</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.lime }}>
              Semana {weekNum}
            </div>
            <div style={{ fontSize: 11, color: COLORS.text }}>{fmtDateLong(days[0])} – {fmtDateLong(days[6])}</div>
          </div>
          <button onClick={() => setWeekMonday(addDays(weekMonday, 7))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}>→</button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}>←</button>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.lime, textTransform: "capitalize" }}>{monthLabel(monthAnchor)}</div>
          <button onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}>→</button>
        </div>
      )}

      {viewMode === "week" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
          {days.map((date) => {
            const { group, individuals } = getDaySessions(date);
            const isToday = date === tStr();
            const mesoColors = getMesoColors(date);
            const weekTypeColor = getWeekTypeColor(date);
            const menstrualPhase = getMenstrualPhase(date);
            const relaxin = isRelaxin(date);
            const intensity = group && !group.isRest ? INTENSITY_LEVELS[group.intensity] : null;
            return (
              <div key={date} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: COLORS.panel, border: `1px solid ${isToday ? COLORS.lime : COLORS.line}`,
                borderRadius: 10, padding: "0.6rem 0.3rem", minWidth: 0, overflow: "hidden",
              }}>
                <div style={{ display: "flex", gap: 2, minHeight: 6, alignItems: "center" }}>
                  {mesoColors.map((c, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />)}
                  {menstrualPhase && <span style={{ fontSize: 8, lineHeight: 1 }}>{menstrualPhase.emoji}</span>}
                  {relaxin && <span style={{ fontSize: 8, lineHeight: 1 }}>⚡</span>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? COLORS.lime : COLORS.text }}>{wdLabel(date).slice(0, 3)}</div>
                  <div style={{ fontSize: 9, color: COLORS.text }}>{fmtDateShort(date)}</div>
                </div>
                {group ? (
                  <div onClick={() => openDetail(date, group)} style={{ borderRadius: 6, padding: "5px 3px", textAlign: "center", width: "100%", background: intensity ? intensity.dark : COLORS.panelRaised, cursor: "pointer" }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 600, color: intensity ? intensity.color : COLORS.text }}>{group.isRest ? "Descanso" : group.sessionType}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: COLORS.text, padding: "8px 0" }}>—</div>
                )}
                {individuals.map((ind, i) => (
                  <div key={i} onClick={() => openDetail(date, ind)} style={{ borderRadius: 6, padding: "4px 3px", textAlign: "center", width: "100%", background: COLORS.panelRaised, border: `1px solid ${COLORS.blue}`, cursor: "pointer" }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, fontWeight: 700, color: COLORS.blue, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ind.sessionType}</div>
                  </div>
                ))}
                {weekTypeColor && <div style={{ height: 3, width: "100%", background: weekTypeColor, borderRadius: 2, marginTop: "auto" }} />}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ textAlign: "center", fontSize: 10, color: COLORS.text, fontWeight: 600 }}>{label.slice(0, 3)}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
            {monthCells.map(({ date, inMonth }) => {
              const { group, individuals } = getDaySessions(date);
              const isToday = date === tStr();
              const dayNum = new Date(date + "T00:00:00").getDate();
              const mesoColors = getMesoColors(date);
              const weekTypeColor = getWeekTypeColor(date);
              const menstrualPhaseM = getMenstrualPhase(date);
              const relaxinM = isRelaxin(date);
              const intensity = group && !group.isRest ? INTENSITY_LEVELS[group.intensity] : null;
              return (
                <div key={date} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  background: COLORS.panel, border: `1px solid ${isToday ? COLORS.lime : COLORS.line}`,
                  borderRadius: 8, padding: "0.4rem 0.2rem", minHeight: 56,
                  opacity: inMonth ? 1 : 0.35, overflow: "hidden",
                }}>
                  <div style={{ display: "flex", gap: 2, minHeight: 5, alignItems: "center" }}>
                    {mesoColors.map((c, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c, display: "inline-block" }} />)}
                    {menstrualPhaseM && <span style={{ fontSize: 7, lineHeight: 1 }}>{menstrualPhaseM.emoji}</span>}
                    {relaxinM && <span style={{ fontSize: 7, lineHeight: 1 }}>⚡</span>}
                  </div>
                  <span style={{ fontSize: 11, color: isToday ? COLORS.lime : COLORS.text, fontWeight: 600 }}>{dayNum}</span>
                  {group ? (
                    <span onClick={() => openDetail(date, group)} style={{ fontSize: 9, fontWeight: 600, padding: "2px 4px", borderRadius: 5, width: "100%", textAlign: "center", background: intensity ? intensity.dark : COLORS.panelRaised, color: intensity ? intensity.color : COLORS.text, cursor: "pointer" }}>
                      {group.isRest ? "Desc." : group.sessionType}
                    </span>
                  ) : <span style={{ fontSize: 9, color: COLORS.text }}>—</span>}
                  {individuals.map((ind, i) => (
                    <span key={i} onClick={() => openDetail(date, ind)} style={{ fontSize: 9, fontWeight: 700, padding: "2px 4px", borderRadius: 5, width: "100%", textAlign: "center", background: COLORS.panelRaised, color: COLORS.blue, border: `1px solid ${COLORS.blue}`, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ind.sessionType}
                    </span>
                  ))}
                  {weekTypeColor && <div style={{ height: 3, width: "100%", background: weekTypeColor, borderRadius: 2, marginTop: "auto" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detailDate && detailSession && (
        <SessionDetailModal
          date={detailDate}
          session={detailSession}
          onClose={() => { setDetailDate(null); setDetailSession(null); }}
          refreshData={refreshData}
        />
      )}
    </div>
  );
}
