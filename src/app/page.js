"use client";
import { useState, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import AuthGate from "@/components/AuthGate";
import PlayerDashboard from "@/components/PlayerDashboard";
import CoachTeamPicker from "@/components/CoachTeamPicker";
import StaffTeamDashboard from "@/components/StaffTeamDashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tlr_session");
      if (saved) {
        const { user: u, teamId } = JSON.parse(saved);
        if (u) { setUser(u); setActiveTeamId(teamId || null); }
      }
    } catch {}
    setReady(true);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    const teamId = u.role === "player" || u.role === "staff_viewer" ? (u.team_id || u.teamId) : null;
    setActiveTeamId(teamId);
    localStorage.setItem("tlr_session", JSON.stringify({ user: u, teamId }));
  };
  const handleLogout = () => {
    setUser(null); setActiveTeamId(null);
    localStorage.removeItem("tlr_session");
  };
  const handleUserUpdate = (u) => {
    setUser(u);
    const saved = localStorage.getItem("tlr_session");
    const teamId = saved ? JSON.parse(saved).teamId : null;
    localStorage.setItem("tlr_session", JSON.stringify({ user: u, teamId }));
  };
  const handleEnterTeam = (teamId) => {
    setActiveTeamId(teamId);
    const saved = localStorage.getItem("tlr_session");
    const u = saved ? JSON.parse(saved).user : user;
    localStorage.setItem("tlr_session", JSON.stringify({ user: u, teamId }));
  };

  if (!ready) return null;

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: COLORS.bg, color: COLORS.text, minHeight: "100vh", width: "100%",
    }}>
      {!user ? (
        <AuthGate onLogin={handleLogin} />
      ) : user.role === "player" ? (
        <PlayerDashboard user={user} onLogout={handleLogout} />
      ) : user.role === "coach" && !activeTeamId ? (
        <CoachTeamPicker user={user} onUserUpdate={handleUserUpdate} onEnterTeam={handleEnterTeam} onLogout={handleLogout} />
      ) : user.role === "coach" && activeTeamId ? (
        <StaffTeamDashboard user={user} teamId={activeTeamId} onBack={() => { setActiveTeamId(null); handleEnterTeam(null); }} onLogout={handleLogout} />
      ) : user.role === "staff_viewer" && activeTeamId ? (
        <StaffTeamDashboard user={user} teamId={activeTeamId} onBack={handleLogout} onLogout={handleLogout} readOnly />
      ) : null}
    </div>
  );
}
