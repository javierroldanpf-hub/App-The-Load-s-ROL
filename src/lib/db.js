/**
 * db.js — All data access functions using Supabase instead of window.storage.
 * Auth strategy: username/password stored in profiles table (no Supabase Auth).
 * This preserves 100% parity with the prototype's auth system.
 */
import { createClient } from "./supabase";
import { normUser, simpleHash, genTeamCode } from "./utils";

function getSupabase() {
  return createClient();
}

// ─── USERS / PROFILES ────────────────────────────────────────────────────────

export async function getUser(username) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("username", normUser(username))
      .single();
    if (error || !data) return null;
    return data;
  } catch { return null; }
}

export async function getUsersDisplayNames(usernames, teamId) {
  if (!usernames || usernames.length === 0) return {};
  try {
    const sb = getSupabase();
    const map = {};

    // Start with global profiles for fallback display names
    const profilesRes = await sb.from("profiles").select("username, display_name, photo_url, joined_at").in("username", usernames);
    (profilesRes.data || []).forEach((r) => {
      map[r.username] = { displayName: r.display_name || r.username, photoUrl: r.photo_url || null, position: null, joinedAt: r.joined_at || null };
    });

    // player_profiles is authoritative: has team-specific name, photo, and position
    if (teamId) {
      const ppRes = await sb.from("player_profiles").select("*").eq("team_id", teamId).in("username", usernames);
      (ppRes.data || []).forEach((r) => {
        if (!map[r.username]) map[r.username] = { displayName: r.username, photoUrl: null, position: null };
        if (r.display_name) map[r.username].displayName = r.display_name;
        if (r.photo_url) map[r.username].photoUrl = r.photo_url;
        if (r.position) map[r.username].position = r.position;
        if (map[r.username].joinedAt === undefined) map[r.username].joinedAt = null;
      });
    }

    return map;
  } catch { return {}; }
}

export async function saveUser(user) {
  const sb = getSupabase();
  const record = {
    username: normUser(user.username),
    pass_hash: user.passHash || user.pass_hash,
    role: user.role,
    display_name: user.displayName || user.display_name,
    team_id: user.teamId || user.team_id || null,
    team_ids: user.teamIds || user.team_ids || [],
    photo_url: user.photoUrl || user.photo_url || null,
    ...(user.joinedAt ? { joined_at: user.joinedAt } : {}),
  };
  console.log("saveUser → enviando a Supabase:", record);
  const { data, error } = await sb
    .from("profiles")
    .upsert(record, { onConflict: "username" })
    .select();
  console.log("saveUser ← respuesta de Supabase:", { data, error });
  if (error) throw new Error(error.message || JSON.stringify(error));
  if (!data || data.length === 0) throw new Error("El usuario no se guardó. Revisa las políticas RLS de la tabla 'profiles' en Supabase.");
}

// ─── TEAMS ───────────────────────────────────────────────────────────────────

export async function getTeamsByCoach(coachUsername) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from("teams").select("*").eq("coach_username", coachUsername).order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map(dbTeamToApp);
  } catch { return []; }
}

export async function transferPlayerData(username, fromTeamId, toTeamId) {
  const sb = getSupabase();
  const tables = ["wellness", "rpe_entries", "physical_entries"];
  for (const table of tables) {
    await sb.from(table).update({ team_id: toTeamId }).eq("team_id", fromTeamId).eq("username", username);
  }
  // Player profile
  const { data: prof } = await sb.from("player_profiles").select("*").eq("team_id", fromTeamId).eq("username", username).single();
  if (prof) {
    await sb.from("player_profiles").upsert({ ...prof, team_id: toTeamId }, { onConflict: "team_id,username" });
    await sb.from("player_profiles").delete().eq("team_id", fromTeamId).eq("username", username);
  }
}

export async function setPlayerTeam(username, teamId) {
  const sb = getSupabase();
  const { error } = await sb
    .from("profiles")
    .update({ team_id: teamId })
    .eq("username", normUser(username));
  if (error) throw new Error(error.message || JSON.stringify(error));
}

export async function expelPlayer(username) {
  const sb = getSupabase();
  const { error } = await sb
    .from("profiles")
    .update({ team_id: null })
    .eq("username", normUser(username));
  if (error) throw new Error(error.message || JSON.stringify(error));
}

export async function deletePlayerData(username, teamId) {
  const sb = getSupabase();
  for (const table of ["wellness", "rpe_entries", "physical_entries"]) {
    await sb.from(table).delete().eq("team_id", teamId).eq("username", username);
  }
  await sb.from("player_profiles").delete().eq("team_id", teamId).eq("username", username);
}

export async function deleteTeam(teamId) {
  const sb = getSupabase();
  for (const table of ["wellness", "rpe_entries", "physical_entries", "player_profiles", "sessions", "mesocycles", "player_alerts"]) {
    const { error } = await sb.from(table).delete().eq("team_id", teamId);
    if (error) throw new Error(`Error borrando ${table}: ${error.message}`);
  }
  const { error } = await sb.from("teams").delete().eq("team_id", teamId);
  if (error) throw new Error(`Error borrando equipo: ${error.message}`);
}

export async function getTeam(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("teams")
      .select("*")
      .eq("team_id", teamId)
      .single();
    if (error || !data) return null;
    // Normalize snake_case → camelCase for prototype compat
    return dbTeamToApp(data);
  } catch { return null; }
}

export async function saveTeam(team) {
  const sb = getSupabase();
  const record = appTeamToDb(team);
  const { error } = await sb
    .from("teams")
    .upsert(record, { onConflict: "team_id" });
  if (error) throw error;
}

export async function getTeamIdByCode(code) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("teams")
      .select("team_id")
      .eq("code", code.toUpperCase())
      .single();
    if (error || !data) return null;
    return data.team_id;
  } catch { return null; }
}

export async function saveTeamCode(code, teamId) {
  // code is already stored in the teams table, no separate action needed
}

export async function ensureCustomTestDef(teamId, name, unit) {
  const team = await getTeam(teamId);
  if (!team) return null;
  const defs = team.customTestDefs || [];
  const trimmedName = name.trim();
  const existing = defs.find((d) => d.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) return existing.id;
  const newDef = { id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: trimmedName, unit: (unit || "").trim() };
  await saveTeam({ ...team, customTestDefs: [...defs, newDef] });
  return newDef.id;
}

export async function ensureCustomGpsDef(teamId, name, unit) {
  const team = await getTeam(teamId);
  if (!team) return null;
  const defs = team.customGpsDefs || [];
  const trimmedName = name.trim();
  const existing = defs.find((d) => d.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) return existing.id;
  const newDef = { id: `gps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: trimmedName, unit: (unit || "").trim() };
  await saveTeam({ ...team, customGpsDefs: [...defs, newDef] });
  return newDef.id;
}

export async function ensureFirstMonday(team, weekMonday) {
  if (team.firstMonday) return team;
  const updated = { ...team, firstMonday: weekMonday };
  await saveTeam(updated);
  return updated;
}

// ─── WELLNESS ────────────────────────────────────────────────────────────────

export async function saveWellness(entry) {
  const sb = getSupabase();
  const record = {
    team_id: entry.teamId,
    username: entry.username,
    date: entry.date,
    sueno: entry.sueno,
    fatiga: entry.fatiga,
    estres: entry.estres,
    dolor: entry.dolor,
    animo: entry.animo,
    comment: entry.comment || null,
    comment_read: entry.commentRead || false,
    display_name: entry.displayName || entry.username,
    ts: entry.ts || Date.now(),
  };
  if (entry.id && typeof entry.id === "string") {
    const { error } = await sb.from("wellness").update(record).eq("id", entry.id);
    if (error) throw error;
    return;
  }
  const { error } = await sb
    .from("wellness")
    .upsert(record, { onConflict: "team_id,username,date" });
  if (error) throw error;
}

export async function loadTeamWellness(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("wellness")
      .select("*")
      .eq("team_id", teamId);
    if (error || !data) return [];
    return data.map(dbWellnessToApp);
  } catch { return []; }
}

export async function markWellnessCommentRead(entry) {
  const sb = getSupabase();
  const { error } = await sb
    .from("wellness")
    .update({ comment_read: true })
    .eq("team_id", entry.teamId)
    .eq("username", entry.username)
    .eq("date", entry.date);
  if (error) throw error;
}

// ─── RPE ─────────────────────────────────────────────────────────────────────

export async function saveRpe(entry) {
  const sb = getSupabase();
  const record = {
    team_id: entry.teamId,
    username: entry.username,
    date: entry.date,
    rpe: entry.rpe,
    duration: entry.duration,
    session_type: entry.sessionType,
    planned_intensity: entry.plannedIntensity,
    comment: entry.comment || null,
    comment_read: entry.commentRead || false,
    display_name: entry.displayName || entry.username,
    ts: entry.ts || Date.now(),
  };
  if (entry.id && typeof entry.id === "string") {
    const { error } = await sb.from("rpe_entries").update(record).eq("id", entry.id);
    if (error) throw error;
    return;
  }
  const { error } = await sb
    .from("rpe_entries")
    .upsert(record, { onConflict: "team_id,username,date" });
  if (error) throw error;
}

export async function updateRpeDurationForMatch(teamId, date, playerMinutes) {
  // playerMinutes: { [username]: number }
  const sb = getSupabase();
  await Promise.all(
    Object.entries(playerMinutes).map(async ([username, minutes]) => {
      if (minutes == null) return;
      const { data } = await sb.from("rpe_entries").select("id").eq("team_id", teamId).eq("username", username).eq("date", date).single();
      if (data?.id) {
        await sb.from("rpe_entries").update({ duration: minutes }).eq("id", data.id);
      }
    })
  );
}

export async function loadTeamRpe(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("rpe_entries")
      .select("*")
      .eq("team_id", teamId);
    if (error || !data) return [];
    return data.map(dbRpeToApp);
  } catch { return []; }
}

export async function markRpeCommentRead(entry) {
  const sb = getSupabase();
  const { error } = await sb
    .from("rpe_entries")
    .update({ comment_read: true })
    .eq("team_id", entry.teamId)
    .eq("username", entry.username)
    .eq("date", entry.date);
  if (error) throw error;
}

// ─── SESSIONS ────────────────────────────────────────────────────────────────

export async function getSession(teamId, date) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("sessions")
      .select("*")
      .eq("team_id", teamId)
      .eq("date", date)
      .single();
    if (error || !data) return null;
    return dbSessionToApp(data);
  } catch { return null; }
}

export async function saveSession(session) {
  const sb = getSupabase();
  const record = {
    team_id: session.teamId,
    date: session.date,
    session_type: session.sessionType,
    intensity: session.intensity,
    is_match: session.isMatch || false,
    is_rest: session.isRest || false,
    duration: session.duration || 0,
    description: session.description || null,
    allow_player_note: session.allowPlayerNote || false,
    individual_sessions: session.individualSessions || [],
    created_at: session.createdAt || Date.now(),
  };
  const { error } = await sb
    .from("sessions")
    .upsert(record, { onConflict: "team_id,date" });
  if (error) throw error;
}

export async function updateRpeDurationForSession(teamId, date, duration) {
  const sb = getSupabase();
  const { error } = await sb
    .from("rpe_entries")
    .update({ duration })
    .eq("team_id", teamId)
    .eq("date", date);
  if (error) throw error;
}

/* ── Mesociclos ──────────────────────────────────────────────────────── */
export async function loadMesocycles(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("mesocycles")
      .select("*")
      .eq("team_id", teamId)
      .order("start_date", { ascending: true });
    if (error || !data) return [];
    return data.map((m) => ({ id: m.id, teamId: m.team_id, name: m.name || "", startDate: m.start_date, endDate: m.end_date, weeks: m.weeks || [], color: m.color || null, contenidos: m.contenidos || "", isMenstrual: m.is_menstrual || false, menstrualPlayers: m.menstrual_players || [], isSituacionesJugadas: m.is_situaciones_jugadas || false, customTemplateId: m.custom_template_id || null, unit: m.unit || 'min', createdAt: m.created_at }));
  } catch { return []; }
}

export async function saveMesocycle(meso) {
  const sb = getSupabase();
  const record = { team_id: meso.teamId, name: meso.name || null, start_date: meso.startDate, end_date: meso.endDate, weeks: meso.weeks || [], color: meso.color || null, contenidos: meso.contenidos || null, is_menstrual: meso.isMenstrual || false, menstrual_players: meso.menstrualPlayers || [], is_situaciones_jugadas: meso.isSituacionesJugadas || false, custom_template_id: meso.customTemplateId || null, unit: meso.unit || 'min', created_at: meso.createdAt || Date.now() };
  if (meso.id) {
    const { error } = await sb.from("mesocycles").update(record).eq("id", meso.id);
    if (error) throw error;
    return meso.id;
  }
  const { data, error } = await sb.from("mesocycles").insert(record).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteMesocycle(id) {
  const sb = getSupabase();
  const { error } = await sb.from("mesocycles").delete().eq("id", id);
  if (error) throw error;
}

export async function updateRpeSessionTypeForSession(teamId, date, sessionType) {
  const sb = getSupabase();
  const { error } = await sb
    .from("rpe_entries")
    .update({ session_type: sessionType })
    .eq("team_id", teamId)
    .eq("date", date);
  if (error) throw error;
}

export async function deleteGroupSessionResponses(teamId, date) {
  const sb = getSupabase();
  const { error: e1 } = await sb.from("rpe_entries").delete().eq("team_id", teamId).eq("date", date);
  if (e1) console.error("deleteGroupSessionResponses rpe_entries:", e1);
  const { error: e2 } = await sb.from("wellness").delete().eq("team_id", teamId).eq("date", date);
  if (e2) console.error("deleteGroupSessionResponses wellness:", e2);
}

export async function deleteSession(teamId, date) {
  const sb = getSupabase();
  await deleteGroupSessionResponses(teamId, date);
  const { error } = await sb
    .from("sessions")
    .delete()
    .eq("team_id", teamId)
    .eq("date", date);
  if (error) throw error;
}

export async function loadTeamSessions(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("sessions")
      .select("*")
      .eq("team_id", teamId);
    if (error || !data) return [];
    return data.map(dbSessionToApp);
  } catch { return []; }
}

// ─── PHYSICAL ENTRIES ────────────────────────────────────────────────────────

export async function savePhysicalEntry(entry) {
  const sb = getSupabase();
  const record = {
    team_id: entry.teamId,
    username: entry.username,
    date: entry.date,
    sentadilla: entry.sentadilla || null,
    cargada: entry.cargada || null,
    press_banca: entry.pressBanca || null,
    hip_thrust: entry.hipThrust || null,
    cmj: entry.cmj || null,
    vam: entry.vam || null,
    vift: entry.vift || null,
    vmax: entry.vmax || null,
    acc10: entry.acc10 || null,
    acc30: entry.acc30 || null,
    cod505_right: entry.cod505Right || null,
    cod505_left: entry.cod505Left || null,
    total_distance: entry.totalDistance || null,
    hsr: entry.hsr || null,
    sprint_distance: entry.sprintDistance || null,
    accelerations: entry.accelerations || null,
    decelerations: entry.decelerations || null,
    sprints: entry.sprints || null,
    hmld: entry.hmld || null,
    custom_test_values: entry.customTestValues || null,
    custom_gps_values: entry.customGpsValues || null,
    ts: entry.ts || Date.now(),
  };
  const { error } = await sb
    .from("physical_entries")
    .upsert(record, { onConflict: "team_id,username,date" });
  if (error) throw error;
}

export async function loadPlayerPhysicalHistory(teamId, username) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("physical_entries")
      .select("*")
      .eq("team_id", teamId)
      .eq("username", username)
      .order("date", { ascending: false });
    if (error || !data) return [];
    return data.map(dbPhysicalToApp);
  } catch { return []; }
}

// ─── PLAYER PROFILES ─────────────────────────────────────────────────────────

export async function getAllPlayerProfiles(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from("player_profiles").select("*").eq("team_id", teamId);
    if (error || !data) return {};
    const map = {};
    data.forEach((r) => { map[r.username] = dbProfileToApp(r); });
    return map;
  } catch { return {}; }
}

export async function getPlayerProfile(teamId, username) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("player_profiles")
      .select("*")
      .eq("team_id", teamId)
      .eq("username", username)
      .single();
    if (error || !data) return null;
    return dbProfileToApp(data);
  } catch { return null; }
}

export async function savePlayerProfile(profile) {
  const sb = getSupabase();
  const record = {
    team_id: profile.teamId,
    username: profile.username,
    display_name: profile.displayName || profile.username,
    photo_url: profile.photoUrl || null,
    birth_date: profile.birthDate || null,
    height: profile.height || null,
    position: profile.position || null,
    dominant_leg: profile.dominantLeg || null,
    dominant_arm: profile.dominantArm || null,
    sexo: profile.sexo || null,
    ts: profile.ts || Date.now(),
  };
  const { error } = await sb
    .from("player_profiles")
    .upsert(record, { onConflict: "team_id,username" });
  if (error) throw error;
}

// ─── WEIGHT ENTRIES ──────────────────────────────────────────────────────────

export async function saveWeightEntry(entry) {
  const sb = getSupabase();
  const record = {
    team_id: entry.teamId,
    username: entry.username,
    date: entry.date,
    weight: entry.weight,
  };
  const { error } = await sb
    .from("weight_entries")
    .upsert(record, { onConflict: "team_id,username,date" });
  if (error) throw error;
}

export async function loadPlayerWeightHistory(teamId, username) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("weight_entries")
      .select("*")
      .eq("team_id", teamId)
      .eq("username", username)
      .order("date", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({ teamId: r.team_id, username: r.username, date: r.date, weight: r.weight }));
  } catch { return []; }
}

export async function getLatestWeight(teamId, username) {
  const history = await loadPlayerWeightHistory(teamId, username);
  return history.length ? history[0].weight : null;
}

// ─── REMINDER SETTINGS ───────────────────────────────────────────────────────

export async function getReminderSettings(username) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("reminder_settings")
      .select("*")
      .eq("username", normUser(username))
      .single();
    if (error || !data) return null;
    return {
      wellnessEnabled: data.wellness_enabled,
      wellnessTime: data.wellness_time,
      rpeEnabled: data.rpe_enabled,
      rpeTime: data.rpe_time,
    };
  } catch { return null; }
}

export async function saveReminderSettings(username, settings) {
  const sb = getSupabase();
  const record = {
    username: normUser(username),
    wellness_enabled: settings.wellnessEnabled,
    wellness_time: settings.wellnessTime,
    rpe_enabled: settings.rpeEnabled,
    rpe_time: settings.rpeTime,
  };
  const { error } = await sb
    .from("reminder_settings")
    .upsert(record, { onConflict: "username" });
  if (error) throw error;
}

export async function getCoachNotifSettings(username) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("reminder_settings")
      .select("coach_alert_wellness, coach_alert_acwr, coach_alert_aviso")
      .eq("username", normUser(username))
      .single();
    if (error || !data) return { alertWellness: false, alertAcwr: false, alertAviso: false };
    return {
      alertWellness: !!data.coach_alert_wellness,
      alertAcwr: !!data.coach_alert_acwr,
      alertAviso: !!data.coach_alert_aviso,
    };
  } catch { return { alertWellness: false, alertAcwr: false, alertAviso: false }; }
}

export async function saveCoachNotifSettings(username, settings) {
  const sb = getSupabase();
  const { error } = await sb
    .from("reminder_settings")
    .upsert({
      username: normUser(username),
      coach_alert_wellness: settings.alertWellness,
      coach_alert_acwr: settings.alertAcwr,
      coach_alert_aviso: settings.alertAviso,
    }, { onConflict: "username" });
  if (error) throw error;
}

// ─── PLAYER ALERTS ───────────────────────────────────────────────────────────

export async function sendPlayerAlert(alert) {
  const sb = getSupabase();
  const { error } = await sb.from("player_alerts").insert({
    team_id: alert.teamId,
    from_username: normUser(alert.fromUsername),
    to_username: normUser(alert.toUsername),
    type: alert.type || "custom",
    message: alert.message || null,
    created_at: Date.now(),
  });
  if (error) throw error;
}

export async function getPlayerAlertsForPlayer(toUsername) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("player_alerts")
      .select("*")
      .eq("to_username", normUser(toUsername))
      .is("dismissed_at", null)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({ id: r.id, teamId: r.team_id, fromUsername: r.from_username, toUsername: r.to_username, type: r.type, message: r.message, createdAt: r.created_at }));
  } catch { return []; }
}

export async function getSentAlerts(teamId) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("player_alerts")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map((r) => ({ id: r.id, teamId: r.team_id, fromUsername: r.from_username, toUsername: r.to_username, type: r.type, message: r.message, createdAt: r.created_at, dismissedAt: r.dismissed_at }));
  } catch { return []; }
}

export async function dismissPlayerAlert(alertId) {
  const sb = getSupabase();
  const { error } = await sb
    .from("player_alerts")
    .update({ dismissed_at: Date.now() })
    .eq("id", alertId);
  if (error) throw error;
}

// ─── FIELD MAPPERS ───────────────────────────────────────────────────────────

function dbTeamToApp(r) {
  const raw = r.physical_quadrant_config || null;
  let quadrantConfigs = null;
  let customTestSectionOrder = null;
  let customTestItemOrder = null;
  if (raw) {
    if (raw.quadrantConfigs) {
      quadrantConfigs = raw.quadrantConfigs;
      customTestSectionOrder = raw.customTestSectionOrder || null;
      customTestItemOrder = raw.customTestItemOrder || null;
    } else if (raw.xKey) {
      quadrantConfigs = [{ name: "Cuadrante 1", xMid: null, yMid: null, quadrantNames: {}, quadrantColors: {}, ...raw }];
    }
  }
  return {
    teamId: r.team_id,
    code: r.code,
    name: r.name,
    kind: r.kind,
    coachUsername: r.coach_username,
    createdAt: r.created_at,
    roster: (r.roster || []).map((u) => typeof u === "string" ? u : u.username).filter(Boolean),
    firstMonday: r.first_monday || null,
    positions: r.positions || null,
    customTestDefs: r.custom_test_defs || [],
    customGpsDefs: r.custom_gps_defs || [],
    quadrantConfigs,
    customTestSectionOrder,
    customTestItemOrder,
    injuredPlayers: raw?.injuredPlayers || [],
    playerInjuryHistories: raw?.playerInjuryHistories || {},
    playerInjuries: raw?.playerInjuries || {},
    matchSquads: raw?.matchSquads || {},
    pdfSettings: raw?.pdfSettings || {},
    formDeadlineWellness: raw?.formDeadlineWellness || raw?.formDeadline || null,
    formDeadlineRpe: raw?.formDeadlineRpe || null,
    formDeadlineRpeDay: raw?.formDeadlineRpeDay || "same",
    isTrainingGroup: raw?.isTrainingGroup || r.kind === "grupo" || r.kind === "individual" || false,
    playerSpecificTests: raw?.playerSpecificTests || {},
    defaultMatchDuration: raw?.defaultMatchDuration ?? null,
    sexo: raw?.sexo || null,
    customMesoTemplates: raw?.customMesoTemplates || [],
    sjDayMinutes: raw?.sjDayMinutes || null,
    sjPercentages: raw?.sjPercentages || null,
    allowViewerEditCalendar: raw?.allowViewerEditCalendar || false,
    crestUrl: r.crest_url || null,
  };
}

function appTeamToDb(team) {
  return {
    team_id: team.teamId,
    code: team.code,
    name: team.name,
    kind: team.kind || "equipo",
    coach_username: team.coachUsername,
    created_at: team.createdAt || Date.now(),
    roster: (team.roster || []).map((u) => typeof u === "string" ? u : u.username).filter(Boolean),
    first_monday: team.firstMonday || null,
    positions: team.positions || null,
    custom_test_defs: team.customTestDefs || [],
    custom_gps_defs: team.customGpsDefs || [],
    physical_quadrant_config: {
      quadrantConfigs: team.quadrantConfigs || [],
      customTestSectionOrder: team.customTestSectionOrder || null,
      customTestItemOrder: team.customTestItemOrder || null,
      injuredPlayers: team.injuredPlayers || [],
      playerInjuryHistories: team.playerInjuryHistories || {},
      playerInjuries: team.playerInjuries || {},
      matchSquads: team.matchSquads || {},
      pdfSettings: team.pdfSettings || {},
      formDeadlineWellness: team.formDeadlineWellness || null,
      formDeadlineRpe: team.formDeadlineRpe || null,
      formDeadlineRpeDay: team.formDeadlineRpeDay || "same",
      isTrainingGroup: team.isTrainingGroup || false,
      playerSpecificTests: team.playerSpecificTests || {},
      defaultMatchDuration: team.defaultMatchDuration ?? null,
      sexo: team.sexo || null,
      customMesoTemplates: team.customMesoTemplates || [],
      sjDayMinutes: team.sjDayMinutes || null,
      sjPercentages: team.sjPercentages || null,
      allowViewerEditCalendar: team.allowViewerEditCalendar || false,
    },
    crest_url: team.crestUrl || null,
  };
}

function dbWellnessToApp(r) {
  return {
    teamId: r.team_id,
    username: r.username,
    date: r.date,
    sueno: r.sueno,
    fatiga: r.fatiga,
    estres: r.estres,
    dolor: r.dolor,
    animo: r.animo,
    comment: r.comment || "",
    commentRead: r.comment_read || false,
    displayName: r.display_name || r.username,
    id: r.id,
    ts: r.ts,
  };
}

function dbRpeToApp(r) {
  return {
    teamId: r.team_id,
    username: r.username,
    date: r.date,
    rpe: r.rpe,
    duration: r.duration,
    sessionType: r.session_type,
    plannedIntensity: r.planned_intensity,
    comment: r.comment || "",
    commentRead: r.comment_read || false,
    displayName: r.display_name || r.username,
    id: r.id,
    ts: r.ts,
  };
}

function dbSessionToApp(r) {
  return {
    teamId: r.team_id,
    date: r.date,
    sessionType: r.session_type,
    intensity: r.intensity,
    isMatch: r.is_match || false,
    isRest: r.is_rest || false,
    duration: r.duration || 0,
    description: r.description || "",
    allowPlayerNote: r.allow_player_note || false,
    individualSessions: r.individual_sessions || [],
    createdAt: r.created_at,
  };
}

function dbPhysicalToApp(r) {
  return {
    teamId: r.team_id,
    username: r.username,
    date: r.date,
    sentadilla: r.sentadilla,
    cargada: r.cargada,
    pressBanca: r.press_banca,
    hipThrust: r.hip_thrust,
    cmj: r.cmj,
    vam: r.vam,
    vift: r.vift,
    vmax: r.vmax,
    acc10: r.acc10,
    acc30: r.acc30,
    cod505Right: r.cod505_right,
    cod505Left: r.cod505_left,
    totalDistance: r.total_distance,
    hsr: r.hsr,
    sprintDistance: r.sprint_distance,
    accelerations: r.accelerations,
    decelerations: r.decelerations,
    sprints: r.sprints,
    hmld: r.hmld,
    customTestValues: r.custom_test_values || {},
    customGpsValues: r.custom_gps_values || {},
    ts: r.ts,
  };
}

function dbProfileToApp(r) {
  return {
    teamId: r.team_id,
    username: r.username,
    displayName: r.display_name || r.username,
    photoUrl: r.photo_url || null,
    birthDate: r.birth_date || null,
    height: r.height || null,
    position: r.position || null,
    dominantLeg: r.dominant_leg || null,
    dominantArm: r.dominant_arm || null,
    sexo: r.sexo || null,
    ts: r.ts,
  };
}
