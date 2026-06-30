"use client";
import { useState, useEffect, useCallback } from "react";
import { COLORS, TEAM_KINDS, DEFAULT_POSITIONS } from "@/lib/constants";
import { genTeamCode } from "@/lib/utils";
import { inputStyle, primaryBtn, ghostBtn } from "@/lib/utils";
import { getTeam, saveTeam, getTeamIdByCode, saveUser } from "@/lib/db";
import TopBar from "./TopBar";
import Avatar from "./Avatar";
import ImageUploadButton from "./ImageUploadButton";

export default function CoachTeamPicker({ user, onUserUpdate, onEnterTeam, onLogout }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingPositionsTeamId, setEditingPositionsTeamId] = useState(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamKind, setNewTeamKind] = useState("equipo");
  const [error, setError] = useState("");

  const teamIds = user.team_ids || user.teamIds || [];

  const loadTeams = useCallback(async () => {
    setLoading(true);
    const loaded = await Promise.all(teamIds.map((id) => getTeam(id)));
    setTeams(loaded.filter(Boolean));
    setLoading(false);
  }, [JSON.stringify(teamIds)]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) { setError("Ponle un nombre a tu equipo o grupo."); return; }
    setError("");
    try {
      let code = genTeamCode();
      for (let i = 0; i < 5; i++) {
        const exists = await getTeamIdByCode(code);
        if (!exists) break;
        code = genTeamCode();
      }
      const teamId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const team = { teamId, code, name: newTeamName.trim(), kind: newTeamKind, coachUsername: user.username, createdAt: Date.now(), roster: [] };
      await saveTeam(team);
      const newTeamIds = [...teamIds, teamId];
      const updatedUser = { ...user, team_ids: newTeamIds, teamIds: newTeamIds };
      await saveUser(updatedUser);
      onUserUpdate(updatedUser);
      setNewTeamName("");
      setNewTeamKind("equipo");
      setCreating(false);
      await loadTeams();
    } catch (e) {
      setError(e?.message || "No se pudo crear el equipo. Revisa la conexión con Supabase.");
    }
  };

  const handleUpdateKind = async (teamId, kind) => {
    const team = await getTeam(teamId);
    if (!team) return;
    await saveTeam({ ...team, kind });
    setEditingTeamId(null);
    await loadTeams();
  };

  const handleUpdateCrest = async (teamId, crestUrl) => {
    const team = await getTeam(teamId);
    if (!team) return;
    await saveTeam({ ...team, crestUrl });
    await loadTeams();
  };

  const handleSavePositions = async (teamId, positions) => {
    const team = await getTeam(teamId);
    if (!team) return;
    await saveTeam({ ...team, positions });
    setEditingPositionsTeamId(null);
    await loadTeams();
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem 3rem", maxWidth: 480, margin: "0 auto" }}>
      <TopBar title="Tus equipos" rightSlot={
        <button onClick={onLogout} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 13, cursor: "pointer" }}>Salir</button>
      } />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, margin: "18px 0 22px" }}>
        <Avatar name={user.display_name || user.displayName} photoUrl={user.photo_url || user.photoUrl} size={64} />
        <div style={{ fontSize: 14, color: COLORS.text }}>Hola, {user.display_name || user.displayName}</div>
        <ImageUploadButton label="Cambiar mi foto" onUploaded={async (dataUrl) => {
          const updated = { ...user, photo_url: dataUrl, photoUrl: dataUrl };
          await saveUser(updated);
          onUserUpdate(updated);
        }} />
      </div>

      {loading ? (
        <div style={{ color: COLORS.text, textAlign: "center", fontSize: 14 }}>Cargando equipos...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {teams.map((t) => {
            const kindDef = TEAM_KINDS[t.kind || "equipo"];
            return (
              <div key={t.teamId} style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => onEnterTeam(t.teamId)} style={{ background: "none", border: "none", color: COLORS.text, textAlign: "left", cursor: "pointer", flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={t.name} photoUrl={t.crestUrl} size={36} square />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.text, marginTop: 3 }}>
                        {kindDef.label} · {(t.roster || []).length} {(t.roster || []).length === 1 ? kindDef.memberLabel : kindDef.memberLabelPlural}
                      </div>
                    </div>
                  </button>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: COLORS.lime, letterSpacing: "0.05em" }}>{t.code}</div>
                    <button onClick={() => setEditingTeamId(editingTeamId === t.teamId ? null : t.teamId)} style={{ background: "none", border: "none", color: COLORS.text, fontSize: 11, cursor: "pointer", marginTop: 2 }}>Editar</button>
                  </div>
                </div>
                {editingTeamId === t.teamId && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {Object.entries(TEAM_KINDS).map(([key, def]) => (
                        <button key={key} onClick={() => handleUpdateKind(t.teamId, key)} style={{
                          flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: (t.kind || "equipo") === key ? COLORS.panelRaised : "transparent",
                          border: `1px solid ${(t.kind || "equipo") === key ? COLORS.lime : COLORS.line}`,
                          color: (t.kind || "equipo") === key ? COLORS.text : COLORS.textDim,
                        }}>{def.label}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <ImageUploadButton label={(t.kind || "equipo") === "equipo" ? "Cambiar escudo" : "Cambiar foto"} onUploaded={(dataUrl) => handleUpdateCrest(t.teamId, dataUrl)} />
                      {(t.kind || "equipo") === "equipo" && (
                        <button onClick={() => setEditingPositionsTeamId(t.teamId)} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Editar posiciones
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {teams.length === 0 && (
            <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "1rem 0" }}>Aún no tienes ningún equipo creado.</div>
          )}
        </div>
      )}

      {creating ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1.1rem" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {Object.entries(TEAM_KINDS).map(([key, def]) => (
              <button key={key} onClick={() => setNewTeamKind(key)} style={{
                flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: newTeamKind === key ? COLORS.panelRaised : "transparent",
                border: `1px solid ${newTeamKind === key ? COLORS.lime : COLORS.line}`,
                color: newTeamKind === key ? COLORS.text : COLORS.textDim,
              }}>{def.label}</button>
            ))}
          </div>
          <input placeholder={newTeamKind === "grupo" ? "Nombre del grupo (ej. Fondo Élite)" : newTeamKind === "individual" ? "Nombre del atleta (ej. Carlos López)" : "Nombre del equipo (ej. Lobos Sub-19)"} value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)} style={inputStyle} autoFocus />
          {error && <div style={{ color: COLORS.coral, fontSize: 13, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setCreating(false); setError(""); }} style={{ ...ghostBtn, flex: 1 }}>Cancelar</button>
            <button onClick={handleCreateTeam} style={{ ...primaryBtn(false), flex: 1 }}>Crear</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} style={ghostBtn}>+ Crear nuevo equipo o grupo</button>
      )}

      {editingPositionsTeamId && (
        <PositionsEditorModal
          team={teams.find((t) => t.teamId === editingPositionsTeamId)}
          onClose={() => setEditingPositionsTeamId(null)}
          onSave={(positions) => handleSavePositions(editingPositionsTeamId, positions)}
        />
      )}
    </div>
  );
}

function PositionsEditorModal({ team, onClose, onSave }) {
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4", fontSize: 15, outline: "none" };
  const [positions, setPositions] = useState(team && team.positions ? team.positions : DEFAULT_POSITIONS);
  const [newPosition, setNewPosition] = useState("");

  const handleAdd = () => {
    const trimmed = newPosition.trim();
    if (!trimmed || positions.includes(trimmed)) return;
    setPositions((p) => [...p, trimmed]);
    setNewPosition("");
  };
  const handleRemove = (pos) => setPositions((p) => p.filter((x) => x !== pos));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 50 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 400, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 6 }}>Posiciones de {team ? team.name : ""}</div>
        <p style={{ fontSize: 12, color: COLORS.text, marginTop: 0, marginBottom: 16 }}>Ajusta la lista según el deporte de este equipo.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {positions.map((pos) => (
            <div key={pos} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.panelRaised, borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 14 }}>{pos}</span>
              <button onClick={() => handleRemove(pos)} style={{ background: "none", border: "none", color: COLORS.coral, fontSize: 12, cursor: "pointer" }}>Quitar</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          <input placeholder="Nueva posición (ej. Base, Ala-pívot...)" value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            style={{ ...inputStyle, flex: 1 }} />
          <button onClick={handleAdd} style={{ width: "auto", padding: "10px 16px", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Añadir</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 12, fontWeight: 600, fontSize: 14, background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave(positions)} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
