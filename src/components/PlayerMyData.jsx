"use client";
import { useState, useEffect, useCallback } from "react";
import { COLORS, DEFAULT_POSITIONS, LATERALITY_OPTIONS } from "@/lib/constants";
import { calculateAge, fmtDateLong, todayStr } from "@/lib/utils";
import { getPlayerProfile, savePlayerProfile, loadPlayerWeightHistory, saveWeightEntry, loadPlayerPhysicalHistory, getLatestWeight, getTeam, saveTeam } from "@/lib/db";
import TopBar from "./TopBar";
import Avatar from "./Avatar";
import ImageUploadButton from "./ImageUploadButton";
import PhysicalDataView from "./PhysicalDataView";

export default function PlayerMyData({ user, team, onProfileUpdate }) {
  const [subTab, setSubTab] = useState("fisicos");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, background: COLORS.panelRaised, borderRadius: 10, padding: 4 }}>
        {[{ id: "fisicos", label: "Datos físicos" }, { id: "personales", label: "Datos personales" }].map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: "7px 0", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600,
            background: subTab === t.id ? COLORS.panel : "transparent",
            color: subTab === t.id ? COLORS.text : COLORS.textDim, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>
      {subTab === "fisicos"
        ? <PlayerPhysicalData teamId={user.team_id || user.teamId} username={user.username} />
        : <PlayerPersonalData user={user} team={team} onProfileUpdate={onProfileUpdate} />}
    </div>
  );
}

function PlayerPhysicalData({ teamId, username }) {
  const [history, setHistory] = useState([]);
  const [bodyWeight, setBodyWeight] = useState(null);
  const [customTestDefs, setCustomTestDefs] = useState([]);
  const [customGpsDefs, setCustomGpsDefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [h, w, t] = await Promise.all([loadPlayerPhysicalHistory(teamId, username), getLatestWeight(teamId, username), getTeam(teamId)]);
      setHistory(h);
      setBodyWeight(w);
      setCustomTestDefs((t && t.customTestDefs) || []);
      setCustomGpsDefs((t && t.customGpsDefs) || []);
      setLoading(false);
    })();
  }, [teamId, username]);

  if (loading) return <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "2rem 0" }}>Cargando...</div>;

  const latest = history[0] || null;

  if (!latest) {
    return (
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 14, color: COLORS.text, marginBottom: 6 }}>Tu preparador todavía no ha registrado tus datos físicos</div>
        <div style={{ fontSize: 13, color: COLORS.text }}>Cuando lo haga, aparecerán aquí.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 16 }}>Última medición: {fmtDateLong(latest.date)}</div>
      {!bodyWeight && (
        <div style={{ background: COLORS.amberDark, border: `1px solid ${COLORS.amber}`, borderRadius: 12, padding: "0.8rem 1rem", marginBottom: 16, fontSize: 12, color: COLORS.amber }}>
          Añade tu peso corporal en "Datos personales" para ver los ratios BW de tu RM.
        </div>
      )}
      <PhysicalDataView entry={latest} bodyWeight={bodyWeight} customTestDefs={customTestDefs} customGpsDefs={customGpsDefs} />
    </div>
  );
}

function PlayerPersonalData({ user, team, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [injuryHistory, setInjuryHistory] = useState((team?.playerInjuryHistories || {})[user.username] || "");
  const [injurySaved, setInjurySaved] = useState(false);
  const [injurySaving, setInjurySaving] = useState(false);
  const teamId = user.team_id || user.teamId;

  const refresh = useCallback(async () => {
    const [p, w] = await Promise.all([getPlayerProfile(teamId, user.username), loadPlayerWeightHistory(teamId, user.username)]);
    setProfile(p);
    setWeightHistory(w);
  }, [teamId, user.username]);

  useEffect(() => { (async () => { await refresh(); setLoading(false); })(); }, [refresh]);

  const latestWeight = weightHistory[0] ? weightHistory[0].weight : null;

  const handleSave = async (values, photoDataUrl) => {
    setSaving(true);
    try {
      const updatedProfile = {
        teamId, username: user.username,
        displayName: values.displayName, height: values.height,
        position: values.position, dominantLeg: values.dominantLeg, dominantArm: values.dominantArm,
        birthDate: values.birthDate,
        photoUrl: photoDataUrl !== undefined ? photoDataUrl : (profile ? profile.photoUrl : null),
        ts: Date.now(),
      };
      await savePlayerProfile(updatedProfile);
      if (values.weight) {
        await saveWeightEntry({ teamId, username: user.username, date: todayStr(), weight: values.weight });
      }
      if (values.specificTest !== undefined) {
        const updatedTeam = { ...team, playerSpecificTests: { ...(team.playerSpecificTests || {}), [user.username]: values.specificTest || null } };
        await saveTeam(updatedTeam);
      }
      await refresh();
      setEditing(false);
      if (onProfileUpdate) onProfileUpdate(updatedProfile);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const saveInjuryHistory = async () => {
    setInjurySaving(true);
    try {
      const updated = { ...team, playerInjuryHistories: { ...(team.playerInjuryHistories || {}), [user.username]: injuryHistory } };
      await saveTeam(updated);
      setInjurySaved(true);
      setTimeout(() => setInjurySaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setInjurySaving(false); }
  };

  if (loading) return <div style={{ color: COLORS.text, fontSize: 14, textAlign: "center", padding: "2rem 0" }}>Cargando...</div>;

  if (editing) {
    return (
      <PersonalDataForm
        profile={profile} currentWeight={latestWeight}
        positions={team.positions || DEFAULT_POSITIONS}
        isTrainingGroup={team.isTrainingGroup || false}
        currentSpecificTest={(team.playerSpecificTests || {})[user.username] || ""}
        onCancel={() => setEditing(false)} onSave={handleSave} saving={saving}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Avatar name={profile ? profile.displayName : (user.display_name || user.displayName)} photoUrl={profile ? profile.photoUrl : null} size={88} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{profile ? profile.displayName : (user.display_name || user.displayName)}</div>
          {team.isTrainingGroup
            ? (team.playerSpecificTests || {})[user.username] && <div style={{ fontSize: 13, color: COLORS.text }}>{(team.playerSpecificTests || {})[user.username]}</div>
            : profile && profile.position && <div style={{ fontSize: 13, color: COLORS.text }}>{profile.position}</div>}
        </div>
        <button onClick={() => setEditing(true)} style={{ width: "auto", padding: "9px 14px", fontSize: 13, borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, cursor: "pointer" }}>
          Editar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <PersonalDataField label="Edad" value={profile && profile.birthDate ? `${calculateAge(profile.birthDate)} años` : "–"} />
        <PersonalDataField label="Fecha de nacimiento" value={profile && profile.birthDate ? fmtDateLong(profile.birthDate) : "–"} />
        <PersonalDataField label="Altura" value={profile && profile.height ? `${profile.height} cm` : "–"} />
        <PersonalDataField label="Peso actual" value={latestWeight ? `${latestWeight} kg` : "–"} />
        {!team.isTrainingGroup && <>
          <PersonalDataField label="Pierna dominante" value={profile && profile.dominantLeg ? profile.dominantLeg : "–"} />
          <PersonalDataField label="Brazo dominante" value={profile && profile.dominantArm ? profile.dominantArm : "–"} />
        </>}
      </div>

      {weightHistory.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 8 }}>Historial de peso</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {weightHistory.map((w) => (
              <div key={w.date} style={{ display: "flex", justifyContent: "space-between", background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: COLORS.text }}>
                <span>{fmtDateLong(w.date)}</span>
                <span style={{ color: COLORS.text, fontWeight: 500 }}>{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lesiones temporada actual — escritas por el entrenador */}
      <InjurySeasonList injuries={(team?.playerInjuries || {})[user.username] || []} />

      {/* Historial lesivo — texto libre editado por el jugador */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>Historial lesivo</div>
        <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 8, opacity: 0.7 }}>Anota aquí tus antecedentes: lesiones pasadas, cirugías, limitaciones. Tu preparador puede consultarlo.</div>
        <textarea
          value={injuryHistory}
          onChange={(e) => { setInjuryHistory(e.target.value); setInjurySaved(false); }}
          placeholder="Ej: Rotura de LCA rodilla derecha (2022), esguince tobillo izquierdo (2023)..."
          rows={5}
          style={{ width: "100%", background: "#1c2128", border: `1px solid ${COLORS.line}`, borderRadius: 10, color: COLORS.text, fontSize: 13, padding: "10px 12px", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          {injuryHistory && (
            <button onClick={() => { setInjuryHistory(""); setInjurySaved(false); }} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.text, fontSize: 13, cursor: "pointer" }}>Limpiar</button>
          )}
          <button onClick={saveInjuryHistory} disabled={injurySaving} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: injurySaved ? COLORS.limeDark : COLORS.lime, color: injurySaved ? COLORS.lime : "#14171c", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: injurySaving ? 0.7 : 1 }}>
            {injurySaved ? "Guardado ✓" : injurySaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDateShort(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function InjurySeasonList({ injuries }) {
  if (!injuries.length) return null;
  const active = injuries.filter((i) => !i.endDate);
  const closed = injuries.filter((i) => i.endDate);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Lesiones temporada actual</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {active.map((inj) => (
          <div key={inj.id} style={{ background: COLORS.coralDark, border: `1px solid ${COLORS.coral}`, borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>🤕</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.coral }}>{inj.type} · {inj.zone}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.coral, background: "rgba(255,90,95,0.15)", borderRadius: 6, padding: "2px 8px" }}>En curso</span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.text }}>
              {inj.laterality} · Desde {fmtDateShort(inj.startDate)}
            </div>
          </div>
        ))}
        {closed.map((inj) => (
          <div key={inj.id} style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text, marginBottom: 4 }}>{inj.type} · {inj.zone}</div>
            <div style={{ fontSize: 11, color: COLORS.text }}>
              {inj.laterality} · {fmtDateShort(inj.startDate)} → {fmtDateShort(inj.endDate)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonalDataField({ label, value }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "0.8rem" }}>
      <div style={{ fontSize: 11, color: COLORS.text }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function PersonalDataForm({ profile, currentWeight, positions, isTrainingGroup, currentSpecificTest, onCancel, onSave, saving }) {
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#1c2128", border: "1px solid #2e3640", color: "#eef1f4", fontSize: 15, outline: "none" };
  const [displayName, setDisplayName] = useState(profile ? profile.displayName : "");
  const [height, setHeight] = useState(profile && profile.height ? String(profile.height) : "");
  const [weight, setWeight] = useState(currentWeight ? String(currentWeight) : "");
  const [position, setPosition] = useState(profile ? profile.position || "" : "");
  const [specificTest, setSpecificTest] = useState(currentSpecificTest || "");
  const [dominantLeg, setDominantLeg] = useState(profile ? profile.dominantLeg || "" : "");
  const [dominantArm, setDominantArm] = useState(profile ? profile.dominantArm || "" : "");
  const [birthDate, setBirthDate] = useState(profile && profile.birthDate ? profile.birthDate : "");
  const [photoDataUrl, setPhotoDataUrl] = useState(undefined);
  const [error, setError] = useState("");

  const previewPhoto = photoDataUrl !== undefined ? photoDataUrl : (profile ? profile.photoUrl : null);
  const computedAge = birthDate ? calculateAge(birthDate) : null;

  const handleSubmit = () => {
    if (!displayName.trim()) { setError("El nombre no puede estar vacío."); return; }
    setError("");
    onSave({ displayName: displayName.trim(), height: height ? parseFloat(height) : null, weight: weight ? parseFloat(weight) : null, position: isTrainingGroup ? null : (position || null), specificTest: isTrainingGroup ? (specificTest || null) : null, dominantLeg: dominantLeg || null, dominantArm: dominantArm || null, birthDate: birthDate || null }, photoDataUrl);
  };

  return (
    <div>
      <TopBar title="Datos personales" onBack={onCancel} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 18, marginBottom: 22 }}>
        <Avatar name={displayName} photoUrl={previewPhoto} size={120} />
        <ImageUploadButton label="Cambiar foto" onUploaded={(dataUrl) => setPhotoDataUrl(dataUrl)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
        <input placeholder="Nombre completo" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        <div>
          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Fecha de nacimiento {computedAge !== null && <span style={{ color: COLORS.lime }}>· {computedAge} años</span>}</div>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Altura (cm)</div>
            <input type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Peso (kg)</div>
            <input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>
        <p style={{ fontSize: 11, color: COLORS.text, margin: 0 }}>Cada vez que cambies el peso se guarda con la fecha de hoy en tu historial.</p>
        {isTrainingGroup ? (
          <div>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Modalidad Deportiva</div>
            <input value={specificTest} onChange={(e) => setSpecificTest(e.target.value)} placeholder="Ej: Atletismo, Natación, Ciclismo..." style={inputStyle} />
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Posición</div>
            <select value={position} onChange={(e) => setPosition(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Sin especificar</option>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Pierna dominante</div>
            <select value={dominantLeg} onChange={(e) => setDominantLeg(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Sin especificar</option>
              {LATERALITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 6 }}>Brazo dominante</div>
            <select value={dominantArm} onChange={(e) => setDominantArm(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Sin especificar</option>
              {LATERALITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ color: COLORS.coral, fontSize: 13 }}>{error}</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "13px 0", borderRadius: 12, fontWeight: 600, fontSize: 14, background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text, cursor: "pointer" }}>Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 15, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
