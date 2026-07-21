"use client";
import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "@/lib/utils";
import { getTeam, saveUser, getTeamIdByCode } from "@/lib/db";
import TopBar from "./TopBar";
import Avatar from "./Avatar";

export default function StaffTeamPicker({ user, onUserUpdate, onEnterTeam, onLogout }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningCode, setJoiningCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  const teamIds = user.team_ids || user.teamIds || [];

  const loadTeams = useCallback(async () => {
    setLoading(true);
    const loaded = await Promise.all(teamIds.map((id) => getTeam(id)));
    setTeams(loaded.filter(Boolean));
    setLoading(false);
  }, [JSON.stringify(teamIds)]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const handleJoin = async () => {
    setJoinError("");
    if (!joiningCode.trim()) { setJoinError("Introduce el código del equipo."); return; }
    setJoinBusy(true);
    try {
      const teamId = await getTeamIdByCode(joiningCode.trim());
      if (!teamId) { setJoinError("Ese código no existe. Pídelo al preparador."); setJoinBusy(false); return; }
      if (teamIds.includes(teamId)) { setJoinError("Ya tienes acceso a ese equipo."); setJoinBusy(false); return; }
      const newTeamIds = [...teamIds, teamId];
      const updatedUser = { ...user, team_ids: newTeamIds, teamIds: newTeamIds, team_id: teamId };
      await saveUser(updatedUser);
      onUserUpdate(updatedUser);
      setJoiningCode("");
      setShowJoin(false);
      await loadTeams();
    } catch (e) {
      setJoinError("No se pudo unir al equipo. Inténtalo de nuevo.");
      setJoinBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem 3rem", maxWidth: 480, margin: "0 auto" }}>
      <TopBar title="Tus equipos" rightSlot={
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: COLORS.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 512 512" fill={COLORS.lime}><path d="M320 64H80C62 64 48 78 48 96v320c0 18 14 32 32 32h240c18 0 32-14 32-32v-80h-48v64H96V112h208v64h48V96c0-18-14-32-32-32z"/><path d="M456 234l-92-92-34 34 50 50H192v48h188l-50 50 34 34 92-92c9-9 9-24 0-32z"/></svg>
          Salir
        </button>
      } />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, margin: "18px 0 22px" }}>
        <Avatar name={user.display_name || user.displayName} photoUrl={user.photo_url || user.photoUrl} size={64} />
        <div style={{ fontSize: 14, color: COLORS.text }}>Hola, {user.display_name || user.displayName}</div>
      </div>

      {loading ? (
        <div style={{ color: COLORS.text, textAlign: "center", fontSize: 14 }}>Cargando equipos...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {teams.map((t) => (
            <div key={t.teamId} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
              <button onClick={() => onEnterTeam(t.teamId)} style={{ background: "none", border: "none", color: COLORS.text, textAlign: "left", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={t.name} photoUrl={t.crestUrl} size={36} square />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.text, marginTop: 3, opacity: 0.7 }}>
                    {(t.roster || []).length} jugadores
                  </div>
                </div>
              </button>
            </div>
          ))}
          {teams.length === 0 && (
            <div style={{ color: COLORS.text, textAlign: "center", fontSize: 13, opacity: 0.7 }}>No tienes equipos asignados todavía.</div>
          )}
        </div>
      )}

      {showJoin ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1.25rem" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Unirse a un equipo</div>
          <input
            placeholder="Código de equipo (ej. LOBOS-7X2K)"
            value={joiningCode}
            onChange={(e) => setJoiningCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            style={{ ...inputStyle, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", width: "100%", boxSizing: "border-box", marginBottom: 10 }}
            autoFocus
          />
          {joinError && <div style={{ color: COLORS.coral, fontSize: 13, marginBottom: 8 }}>{joinError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleJoin} disabled={joinBusy} style={{ ...primaryBtn(joinBusy), flex: 1 }}>
              {joinBusy ? "Uniéndome..." : "Unirme"}
            </button>
            <button onClick={() => { setShowJoin(false); setJoiningCode(""); setJoinError(""); }} style={{ ...ghostBtn, flex: 1 }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowJoin(true)} style={ghostBtn}>
          Unirse a un equipo con código
        </button>
      )}
    </div>
  );
}
