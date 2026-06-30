"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";
import AuthGate from "@/components/AuthGate";
import PlayerDashboard from "@/components/PlayerDashboard";
import CoachTeamPicker from "@/components/CoachTeamPicker";
import StaffTeamDashboard from "@/components/StaffTeamDashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeTeamId, setActiveTeamId] = useState(null);

  const handleLogin = (u) => {
    setUser(u);
    if (u.role === "player" || u.role === "staff_viewer") setActiveTeamId(u.team_id || u.teamId);
  };
  const handleLogout = () => { setUser(null); setActiveTeamId(null); };
  const handleUserUpdate = (u) => setUser(u);

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
        <CoachTeamPicker user={user} onUserUpdate={handleUserUpdate} onEnterTeam={setActiveTeamId} onLogout={handleLogout} />
      ) : user.role === "coach" && activeTeamId ? (
        <StaffTeamDashboard user={user} teamId={activeTeamId} onBack={() => setActiveTeamId(null)} onLogout={handleLogout} />
      ) : user.role === "staff_viewer" && activeTeamId ? (
        <StaffTeamDashboard user={user} teamId={activeTeamId} onBack={handleLogout} onLogout={handleLogout} readOnly />
      ) : null}
    </div>
  );
}
