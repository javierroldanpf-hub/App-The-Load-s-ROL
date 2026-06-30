"use client";
import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { normUser, simpleHash, genTeamCode } from "@/lib/utils";
import { inputStyle, primaryBtn, ghostBtn, cardChoice } from "@/lib/utils";
import { getUser, saveUser, getTeam, saveTeam, getTeamIdByCode } from "@/lib/db";
import TopBar from "./TopBar";

export default function AuthGate({ onLogin }) {
  const [mode, setMode] = useState("landing");

  if (mode === "landing") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <img src="/logo.png" alt="The Load's Rol" style={{ width: 200, height: 200, objectFit: "contain", marginBottom: 8 }} />
          <p style={{ color: COLORS.text, marginTop: 4, fontSize: 14 }}>
            Control diario del estado del equipo
          </p>
        </div>
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => setMode("login")} style={primaryBtn(false)}>Iniciar sesión</button>
          <button onClick={() => setMode("register-role")} style={ghostBtn}>Crear cuenta</button>
        </div>
      </div>
    );
  }

  if (mode === "login") {
    return <LoginForm onBack={() => setMode("landing")} onLogin={onLogin} />;
  }

  if (mode === "register-role") {
    return (
      <div style={{ minHeight: "100vh", padding: "2rem 1.25rem", maxWidth: 420, margin: "0 auto" }}>
        <TopBar title="Crear cuenta" onBack={() => setMode("landing")} />
        <p style={{ color: COLORS.text, fontSize: 14, marginTop: 18, marginBottom: 18, textAlign: "center" }}>
          ¿Qué tipo de cuenta necesitas?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => setMode("register-player")} style={cardChoice}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Soy jugador/a o atleta</div>
            <div style={{ fontSize: 13, color: COLORS.text, marginTop: 4 }}>Me uno a un equipo o grupo con un código</div>
          </button>
          <button onClick={() => setMode("register-coach")} style={cardChoice}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Soy preparador/a físico/a</div>
            <div style={{ fontSize: 13, color: COLORS.text, marginTop: 4 }}>Creo y gestiono uno o varios equipos</div>
          </button>
          <button onClick={() => setMode("register-staff")} style={cardChoice}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Soy staff / entrenador/a lector/a</div>
            <div style={{ fontSize: 13, color: COLORS.text, marginTop: 4 }}>Veo el dashboard del equipo sin poder editarlo</div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "register-player") {
    return <RegisterPlayerForm onBack={() => setMode("register-role")} onLogin={onLogin} />;
  }
  if (mode === "register-coach") {
    return <RegisterCoachForm onBack={() => setMode("register-role")} onLogin={onLogin} />;
  }
  if (mode === "register-staff") {
    return <RegisterStaffForm onBack={() => setMode("register-role")} onLogin={onLogin} />;
  }
  return null;
}

function LoginForm({ onBack, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password) { setError("Rellena usuario y contraseña."); return; }
    setBusy(true);
    try {
      const user = await getUser(username);
      if (!user || user.pass_hash !== simpleHash(password)) {
        setError("Usuario o contraseña incorrectos.");
        setBusy(false);
        return;
      }
      onLogin(user);
    } catch (e) {
      setError(e?.message || "No se pudo conectar. Inténtalo de nuevo.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem", maxWidth: 380, margin: "0 auto" }}>
      <TopBar title="Iniciar sesión" onBack={onBack} />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} autoFocus />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={inputStyle} />
        {error && <div style={{ color: COLORS.coral, fontSize: 13 }}>{error}</div>}
        <button onClick={handleSubmit} disabled={busy} style={primaryBtn(busy)}>
          {busy ? "Comprobando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

function RegisterPlayerForm({ onBack, onLogin }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!displayName.trim() || !username.trim() || !password || !teamCode.trim()) {
      setError("Rellena todos los campos."); return;
    }
    setBusy(true);
    try {
      const existing = await getUser(username);
      if (existing) { setError("Ese nombre de usuario ya está en uso. Prueba con algo más específico."); setBusy(false); return; }

      const teamId = await getTeamIdByCode(teamCode.trim());
      if (!teamId) { setError("Ese código de equipo no existe. Revísalo con tu entrenador."); setBusy(false); return; }
      const team = await getTeam(teamId);
      if (!team) { setError("No se pudo encontrar el equipo."); setBusy(false); return; }

      const user = {
        username: normUser(username),
        pass_hash: simpleHash(password),
        role: "player",
        display_name: displayName.trim(),
        team_id: teamId,
        team_ids: [],
      };
      await saveUser(user);

      const roster = team.roster || [];
      if ((team.kind || "equipo") === "individual" && roster.length >= 1) {
        setError("Este perfil de atleta individual ya tiene un atleta asignado. Pide al preparador que cree otro."); setBusy(false); return;
      }
      if (!roster.includes(user.username)) {
        const updatedTeam = { ...team, roster: [...roster, user.username] };
        await saveTeam(updatedTeam);
      }
      onLogin(user);
    } catch (e) {
      setError("No se pudo crear la cuenta. Inténtalo de nuevo.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem", maxWidth: 380, margin: "0 auto" }}>
      <TopBar title="Cuenta de jugador" onBack={onBack} />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Tu nombre completo" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} autoFocus />
        <input placeholder="Usuario (sé específico, ej. javier.perez)" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        <input placeholder="Código de equipo (ej. LOBOS-7X2K)" value={teamCode}
          onChange={(e) => setTeamCode(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }} />
        {error && <div style={{ color: COLORS.coral, fontSize: 13 }}>{error}</div>}
        <button onClick={handleSubmit} disabled={busy} style={primaryBtn(busy)}>
          {busy ? "Creando cuenta..." : "Unirme al equipo"}
        </button>
        <p style={{ fontSize: 12, color: COLORS.text, textAlign: "center", marginTop: 4 }}>
          Pide el código a tu entrenador o preparador físico.
        </p>
      </div>
    </div>
  );
}

function RegisterCoachForm({ onBack, onLogin }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!displayName.trim() || !username.trim() || !password) { setError("Rellena todos los campos."); return; }
    setBusy(true);
    try {
      const existing = await getUser(username);
      if (existing) { setError("Ese nombre de usuario ya está en uso. Prueba con algo más específico."); setBusy(false); return; }
      const user = {
        username: normUser(username),
        pass_hash: simpleHash(password),
        role: "coach",
        display_name: displayName.trim(),
        team_ids: [],
        team_id: null,
      };
      await saveUser(user);
      onLogin(user);
    } catch (e) {
      setError(e?.message || "No se pudo crear la cuenta. Inténtalo de nuevo.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem", maxWidth: 380, margin: "0 auto" }}>
      <TopBar title="Cuenta de preparador" onBack={onBack} />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Tu nombre completo" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} autoFocus />
        <input placeholder="Usuario (sé específico, ej. javier.perez)" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        {error && <div style={{ color: COLORS.coral, fontSize: 13 }}>{error}</div>}
        <button onClick={handleSubmit} disabled={busy} style={primaryBtn(busy)}>
          {busy ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <p style={{ fontSize: 12, color: COLORS.text, textAlign: "center", marginTop: 4 }}>
          Después de crear tu cuenta podrás crear uno o varios equipos.
        </p>
      </div>
    </div>
  );
}

function RegisterStaffForm({ onBack, onLogin }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!displayName.trim() || !username.trim() || !password || !teamCode.trim()) {
      setError("Rellena todos los campos."); return;
    }
    setBusy(true);
    try {
      const existing = await getUser(username);
      if (existing) { setError("Ese nombre de usuario ya está en uso."); setBusy(false); return; }
      const teamId = await getTeamIdByCode(teamCode.trim());
      if (!teamId) { setError("Ese código de equipo no existe. Revísalo con el preparador."); setBusy(false); return; }
      const user = {
        username: normUser(username),
        pass_hash: simpleHash(password),
        role: "staff_viewer",
        display_name: displayName.trim(),
        team_id: teamId,
        team_ids: [],
      };
      await saveUser(user);
      onLogin(user);
    } catch (e) {
      console.error("RegisterStaffForm error:", e);
      setError(e?.message || e?.toString() || "Error desconocido");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1.25rem", maxWidth: 380, margin: "0 auto" }}>
      <TopBar title="Cuenta de staff / lector" onBack={onBack} />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Tu nombre completo" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} autoFocus />
        <input placeholder="Usuario (ej. carlos.ayudante)" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        <input placeholder="Código de equipo (ej. LOBOS-7X2K)" value={teamCode}
          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
          style={{ ...inputStyle, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em" }} />
        {error && <div style={{ color: COLORS.coral, fontSize: 13 }}>{error}</div>}
        <button onClick={handleSubmit} disabled={busy} style={primaryBtn(busy)}>
          {busy ? "Creando cuenta..." : "Acceder al equipo"}
        </button>
        <p style={{ fontSize: 12, color: COLORS.text, textAlign: "center", marginTop: 4 }}>
          Tendrás acceso de solo lectura al dashboard del equipo.
        </p>
      </div>
    </div>
  );
}
