"use client";
import { useState, useEffect, useCallback } from "react";
import { COLORS, TEAM_KINDS, INTENSITY_LEVELS } from "@/lib/constants";
import { todayStr, latestEntryForPlayer, addDays, weightedWellnessScore, acwr, acwrStatus, sessionLoad, fmtDateLong } from "@/lib/utils";
import { getTeam, saveTeam, loadTeamWellness, loadTeamRpe, loadTeamSessions, loadPlayerPhysicalHistory, getUsersDisplayNames, getAllPlayerProfiles } from "@/lib/db";
import TopBar from "./TopBar";
import Avatar from "./Avatar";
import PlayerCard from "./PlayerCard";
import StaffPlayerDetail from "./StaffPlayerDetail";
import CoachCalendarEditor from "./CoachCalendarEditor";
import MessagesTab from "./MessagesTab";
import CoachPhysicalDataTab, { CustomMetricEditor } from "./CoachPhysicalDataTab";
import PhysicalQuadrantSection from "./PhysicalQuadrantSection";
import LoadControlPanel from "./LoadControlPanel";
import TeamAveragesPanel, { ColorLegend } from "./TeamAveragesPanel";
import SessionDetailModal from "./SessionDetailModal";
import ExportDataModal from "./ExportDataModal";
import PrintableReportModal from "./PrintableReportModal";
import SettingsPanel from "./SettingsPanel";

function PhysicalTab({ teamWithPhotos, allPhysical, onTeamUpdate, playerProfiles, readOnly = false }) {
  const [physTab, setPhysTab] = useState("datos");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, background: COLORS.panelRaised, borderRadius: 10, padding: 4 }}>
        {[{ id: "datos", label: "Datos físicos" }, { id: "cuadrante", label: "Cuadrante" }].map((t) => (
          <button key={t.id} onClick={() => setPhysTab(t.id)} style={{
            flex: 1, padding: "8px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
            background: physTab === t.id ? COLORS.panel : "transparent",
            color: COLORS.text, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>
      {physTab === "datos" && <CoachPhysicalDataTab team={teamWithPhotos} onTeamUpdate={readOnly ? null : onTeamUpdate} playerProfiles={playerProfiles} selectedPlayer={selectedPlayer} onSelectPlayer={setSelectedPlayer} allPhysical={allPhysical} readOnly={readOnly} />}
      {physTab === "cuadrante" && <PhysicalQuadrantSection team={teamWithPhotos} physicalEntries={allPhysical} onTeamUpdate={readOnly ? null : onTeamUpdate} />}
    </div>
  );
}

export default function StaffTeamDashboard({ user, teamId, onBack, onLogout, readOnly = false }) {
  const [team, setTeam] = useState(null);
  const [wellness, setWellness] = useState([]);
  const [rpe, setRpe] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allPhysical, setAllPhysical] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumen");
  const [resumenSubTab, setResumenSubTab] = useState("medias");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [displayNames, setDisplayNames] = useState({});
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [playerSort, setPlayerSort] = useState("nombre");
  const [showSessionDetail, setShowSessionDetail] = useState(false);

  const refreshData = useCallback(async () => {
    const [t, w, r, s] = await Promise.all([getTeam(teamId), loadTeamWellness(teamId), loadTeamRpe(teamId), loadTeamSessions(teamId)]);
    setTeam(t);
    setWellness(w);
    setRpe(r);
    setSessions(s);
    setUnreadCount([...w, ...r].filter((e) => e.comment && !e.commentRead).length);
    const [names, profiles] = await Promise.all([
      t?.roster?.length ? getUsersDisplayNames(t.roster, teamId) : Promise.resolve({}),
      getAllPlayerProfiles(teamId),
    ]);
    setDisplayNames(names);
    setPlayerProfiles(profiles);
    if (t && t.roster) {
      const physicals = await Promise.all(t.roster.map((username) => loadPlayerPhysicalHistory(teamId, username)));
      setAllPhysical(physicals.flat());
    }
  }, [teamId]);

  useEffect(() => { (async () => { await refreshData(); setLoading(false); })(); }, [refreshData]);

  const handleTeamUpdate = useCallback(async (updated) => {
    const safeRoster = (updated.roster || []).map((u) => typeof u === "string" ? u : u.username);
    setTeam({ ...updated, roster: safeRoster });
    await saveTeam(updated);
    await refreshData();
  }, [refreshData]);

  if (loading || !team) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.text }}>Cargando equipo...</div>;
  }

  const kindDef = TEAM_KINDS[team.kind || "equipo"];
  const roster = (team.roster || []).map((u) => typeof u === "string" ? u : u.username);
  const enrichedRosterForTeam = roster.map((username) => {
    const prof = playerProfiles[username];
    const dn = displayNames[username];
    const latestW = latestEntryForPlayer(wellness, username);
    const latestR = latestEntryForPlayer(rpe, username);
    const nameFromEntries = latestW?.displayName || latestR?.displayName;
    return {
      username,
      displayName: nameFromEntries || prof?.displayName || dn?.displayName || username,
      photoUrl: prof?.photoUrl || dn?.photoUrl || null,
      position: prof?.position || dn?.position || null,
    };
  });
  const teamWithPhotos = { ...team, roster: enrichedRosterForTeam };
  const todaySession = sessions.find((s) => s.date === todayStr() && !s.isRest);

  const mainTabs = [
    { id: "resumen", label: "Resumen Carga" },
    { id: "calendario", label: "Calendario" },
    ...(!readOnly ? [{ id: "mensajes", label: unreadCount > 0 ? `Avisos (${unreadCount})` : "Avisos" }] : []),
    { id: "fisicos", label: "Datos Físicos" },
    ...(!readOnly ? [{ id: "ajustes", label: "Ajustes" }] : []),
  ];

  const resumenSubTabs = [
    { id: "medias", label: `Datos medios del ${ (team.kind || "equipo") === "individual" ? "atleta" : (team.kind || "equipo") === "grupo" ? "grupo" : "equipo"}` },
    { id: "individual", label: "Estado individual" },
    { id: "carga", label: "Control de carga" },
  ];

  if (selectedPlayer) {
    return (
      <div style={{ minHeight: "100vh", padding: "0 1.25rem 4rem", maxWidth: 640, margin: "0 auto" }}>
        <StaffPlayerDetail
          player={selectedPlayer}
          wellness={wellness}
          rpe={rpe}
          sessions={sessions}
          team={team}
          onBack={() => setSelectedPlayer(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "1.5rem 1.25rem 4rem", maxWidth: 640, margin: "0 auto" }}>
      <TopBar
        onBack={onBack}
        title={null}
        rightSlot={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowExport(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="14" height="14" viewBox="0 0 512 512" fill="none" stroke={COLORS.lime} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round"><path d="M320 48H80a32 32 0 0 0-32 32v352a32 32 0 0 0 32 32h352a32 32 0 0 0 32-32V192z"/><path d="M320 48v144h144"/><line x1="176" y1="320" x2="400" y2="320"/><polyline points="336,256 400,320 336,384"/></svg> Exportar</button>
            <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><svg width="14" height="14" viewBox="0 0 512 512" fill={COLORS.lime}><path d="M320 64H80C62 64 48 78 48 96v320c0 18 14 32 32 32h240c18 0 32-14 32-32v-80h-48v64H96V112h208v64h48V96c0-18-14-32-32-32z"/><path d="M456 234l-92-92-34 34 50 50H192v48h188l-50 50 34 34 92-92c9-9 9-24 0-32z"/></svg> Salir</button>
          </div>
        }
      />

      {readOnly && (
        <div style={{ background: COLORS.amberDark, border: `1px solid ${COLORS.amber}`, borderRadius: 10, padding: "8px 14px", marginBottom: 14, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>👁️</span>
          <span style={{ fontSize: 12, color: COLORS.amber, fontWeight: 600 }}>Modo solo lectura — no puedes editar ni enviar cambios</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 20px" }}>
        <Avatar name={team.name} photoUrl={team.crestUrl} size={44} square />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 20 }}>{team.name}</div>
          <div style={{ fontSize: 12, color: COLORS.text }}>
            {kindDef.label} · Código: <span style={{ color: COLORS.lime, fontWeight: 600 }}>{team.code}</span> · {roster.length} {roster.length === 1 ? kindDef.memberLabel : kindDef.memberLabelPlural}
          </div>
        </div>
        {todaySession && (() => {
          const intensity = INTENSITY_LEVELS[todaySession.intensity];
          return (
            <button onClick={() => setShowSessionDetail(true)} style={{
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              background: intensity ? intensity.dark : COLORS.panelRaised,
              border: `1px solid ${intensity ? intensity.color : COLORS.line}`,
              borderRadius: 10, padding: "6px 12px", cursor: "pointer", flexShrink: 0,
            }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 22, color: intensity ? intensity.color : COLORS.textDim, lineHeight: 1 }}>
                {todaySession.sessionType}
              </div>
              <div style={{ fontSize: 10, color: COLORS.text, marginTop: 2, textTransform: "capitalize" }}>
                {fmtDateLong(todayStr())}
              </div>
            </button>
          );
        })()}
      </div>

      {/* Tabs principales */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4, background: COLORS.panel, borderRadius: 12, padding: 4, overflowX: "auto", scrollbarWidth: "none" }}>
          {mainTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flexShrink: 0, padding: "8px 10px", borderRadius: 9, border: "none", fontSize: 11, fontWeight: 600,
              background: tab === t.id ? COLORS.panelRaised : "transparent",
              color: tab === t.id ? COLORS.text : COLORS.textDim, cursor: "pointer", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ height: 3, background: COLORS.panelRaised, borderRadius: 2, margin: "4px 30% 0" }} />
      </div>

      {tab === "resumen" && (
        <>
          {/* Sub-tabs de Resumen */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 4, background: COLORS.panelRaised, borderRadius: 10, padding: 4, overflowX: "auto", scrollbarWidth: "none" }}>
              {resumenSubTabs.map((t) => (
                <button key={t.id} onClick={() => setResumenSubTab(t.id)} style={{
                  flexShrink: 0, padding: "7px 10px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 600,
                  background: resumenSubTab === t.id ? COLORS.panel : "transparent",
                  color: resumenSubTab === t.id ? COLORS.text : COLORS.textDim, cursor: "pointer", whiteSpace: "nowrap",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ height: 3, background: COLORS.panel, borderRadius: 2, margin: "4px 30% 0" }} />
          </div>

          {resumenSubTab === "medias" && (
            <TeamAveragesPanel team={team} wellness={wellness} rpe={rpe} sessions={sessions} displayNames={displayNames} />
          )}

          {resumenSubTab === "individual" && (() => {
            const today2 = todayStr();
            const weekAgo = addDays(today2, -6);
            const todaySession = sessions.find((s) => s.date === today2 && !s.isRest);

            const enriched = roster.map((username) => {
              const prof = playerProfiles[username];
              const dn = displayNames[username];
              const latestW = latestEntryForPlayer(wellness, username);
              const player = { username, displayName: prof?.displayName || dn?.displayName || latestW?.displayName || username, photoUrl: prof?.photoUrl || dn?.photoUrl || null };
              const wEntries = wellness.filter((e) => e.username === username && e.date >= weekAgo && e.date <= today2);
              const rEntries = rpe.filter((e) => e.username === username && e.date >= weekAgo && e.date <= today2);
              const avgWS = wEntries.length ? wEntries.reduce((s, e) => s + weightedWellnessScore(e), 0) / wEntries.length : null;
              const avgRpe = rEntries.length ? rEntries.reduce((s, e) => s + e.rpe, 0) / rEntries.length : null;
              const loads = rpe.filter((e) => e.username === username).map((e) => ({ date: e.date, load: sessionLoad(e) }));
              const acwrVal = acwr(loads, today2);
              const todayW = wellness.find((e) => e.username === username && e.date === today2);
              const todayR = todaySession ? rpe.find((e) => e.username === username && e.date === today2 && e.sessionType === todaySession.sessionType) : null;
              const ALARM_KEYS = ["fatiga", "sueno", "estres", "animo", "dolor"];
              const hasAlarm = todayW && ALARM_KEYS.some((k) => todayW[k] === 1 || todayW[k] === 2);
              return { player, avgWS, avgRpe, acwrVal, hasAlarm };
            });

            const sorted = [...enriched].sort((a, b) => {
              if (playerSort === "buen_estado") return (b.avgWS ?? -1) - (a.avgWS ?? -1);
              if (playerSort === "alta_fatiga") return (b.avgRpe ?? -1) - (a.avgRpe ?? -1);
              if (playerSort === "riesgo") return (b.acwrVal ?? -1) - (a.acwrVal ?? -1);
              if (playerSort === "alarma") return (b.hasAlarm ? 1 : 0) - (a.hasAlarm ? 1 : 0);
              return (a.player.displayName || a.player.username).localeCompare(b.player.displayName || b.player.username);
            });

            const SORT_OPTS = [
              { id: "nombre", label: "Nombre" },
              { id: "buen_estado", label: "Buen estado (WS alto)" },
              { id: "alta_fatiga", label: "Alta fatiga (RPE alto)" },
              { id: "riesgo", label: "En riesgo (ACWR alto)" },
              { id: "alarma", label: "Alarma hoy (Marcador WS <2)" },
            ];

            return (
              <div>
                <ColorLegend />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <select
                    value={playerSort}
                    onChange={(e) => setPlayerSort(e.target.value)}
                    style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 8, padding: "5px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "'Oswald', sans-serif" }}
                  >
                    {SORT_OPTS.map((o) => <option key={o.id} value={o.id} style={{ background: COLORS.panel, color: COLORS.text }}>{o.label}</option>)}
                  </select>
                </div>
                {roster.length === 0 && (
                  <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "1.5rem 0" }}>
                    Aún no hay jugadores. Comparte el código <span style={{ color: COLORS.lime, fontWeight: 700 }}>{team.code}</span>.
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {sorted.map(({ player }) => (
                    <PlayerCard
                      key={player.username}
                      player={player}
                      isInjured={(team.injuredPlayers || []).includes(player.username)}
                      wellness={wellness}
                      rpe={rpe}
                      sessions={sessions}
                      onClick={() => setSelectedPlayer(player)}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {resumenSubTab === "carga" && (
            <LoadControlPanel
              team={teamWithPhotos}
              wellness={wellness}
              rpe={rpe}
              sessions={sessions}
              onPlayerClick={(player) => setSelectedPlayer(player)}
            />
          )}
        </>
      )}

      {tab === "calendario" && (
        <CoachCalendarEditor team={team} sessions={sessions} onSessionsChange={refreshData} readOnly={readOnly} displayNames={displayNames} coachName={user?.display_name || user?.displayName || user?.username || ""} />
      )}

      {tab === "mensajes" && (
        <MessagesTab team={teamWithPhotos} wellness={wellness} rpe={rpe} onDataRefresh={refreshData} />
      )}

      {tab === "fisicos" && (
        <PhysicalTab teamWithPhotos={teamWithPhotos} allPhysical={allPhysical} onTeamUpdate={handleTeamUpdate} playerProfiles={playerProfiles} readOnly={readOnly} />
      )}

      {tab === "ajustes" && (
        <SettingsPanel team={team} teamWithPhotos={teamWithPhotos} onTeamUpdate={handleTeamUpdate} sessions={sessions} rpe={rpe} coachTeamIds={user?.teamIds || user?.team_ids || []} coachUsername={user?.username || ""} onTeamDeleted={onBack} />
      )}

      {showExport && (
        <ExportDataModal team={team} wellness={wellness} rpe={rpe} sessions={sessions} onClose={() => setShowExport(false)} />
      )}
      {showPrint && (
        <PrintableReportModal team={teamWithPhotos} wellness={wellness} rpe={rpe} sessions={sessions} onClose={() => setShowPrint(false)} />
      )}
      {showSessionDetail && todaySession && (
        <SessionDetailModal date={todayStr()} session={todaySession} onClose={() => setShowSessionDetail(false)} />
      )}
    </div>
  );
}
