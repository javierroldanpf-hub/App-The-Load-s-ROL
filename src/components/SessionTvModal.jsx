"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "@/lib/constants";
import { fmtDateLong } from "@/lib/utils";

// Plantilla TV de la sesión del día:
//  · Izquierda: bloques con ejercicios, vídeo YouTube en bucle automático.
//  · Derecha: grupos de trabajo automáticos (3 grupos, reorganizables) + leyenda de cargas.
// Se escala entera para caber en la pantalla sin scroll.

const PAGE_BG      = "#14171c";
const HEAD_BG      = "#1e2530";
const CARD_BG      = "#1a2030";
const LABEL_BG     = "#111620";
const MEDIA_BG     = "#0d1017";
const GROUP_COLORS = [COLORS.lime, "#ff9f40", "#4fb3ff"];
const GROUP_NAMES  = ["GRUPO 1", "GRUPO 2", "GRUPO 3"];
const NO_GROUP     = 99;
const DESIGN_W     = 1600;
const T            = COLORS.text;

const LIFT_KEYS = [
  { key: "sentadilla",  label: "Sentadilla",  color: "#ff7a90" },
  { key: "cargada",     label: "Cargada",     color: COLORS.lime },
  { key: "press banca", label: "Press banca", color: "#5eead4" },
  { key: "hip thrust",  label: "Hip thrust",  color: "#fde047" },
];

const lsGet = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const lsSet = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ── Media helpers ────────────────────────────────────────────────────────────
// Detecta todos los formatos habituales de YouTube, Vimeo y vídeo directo.
function parseMedia(url) {
  if (!url) return null;
  const s = url.trim();
  // YouTube: watch, youtu.be, shorts, embed, music
  const yt = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  if (yt) return { kind: "youtube", id: yt[1] };
  // Vimeo
  const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", id: vm[1] };
  // Vídeo directo
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(s)) return { kind: "video", url: s };
  // Imagen
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|#|$)/i.test(s)) return { kind: "image", url: s };
  return { kind: "link", url: s };
}

function loopEmbedUrl(media) {
  if (!media) return "";
  if (media.kind === "youtube")
    return `https://www.youtube-nocookie.com/embed/${media.id}?autoplay=1&mute=1&loop=1&playlist=${media.id}&controls=0&modestbranding=1&rel=0`;
  if (media.kind === "vimeo")
    return `https://player.vimeo.com/video/${media.id}?autoplay=1&muted=1&loop=1&background=1`;
  return "";
}

function thumbUrl(media) {
  if (!media) return null;
  if (media.kind === "youtube") return `https://img.youtube.com/vi/${media.id}/hqdefault.jpg`;
  return null;
}

const fillImg = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
const ph      = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T, fontSize: 13, textAlign: "center", padding: 8, opacity: 0.5 };

function MediaTile({ ex, still, pref, onTogglePref }) {
  const media   = parseMedia(ex.videoUrl);
  const loopable = media && ["youtube", "vimeo", "video"].includes(media.kind);
  const thumb   = thumbUrl(media);
  const showLive = !still && loopable && pref !== "imagen";

  let content;
  if (ex.imageBase64 && (!showLive || !loopable))
    content = <img src={ex.imageBase64} alt="" style={fillImg} />;
  else if (media?.kind === "image")
    content = <img src={media.url} alt="" style={fillImg} />;
  else if (showLive && media?.kind === "video")
    content = <video src={media.url} autoPlay loop muted playsInline style={{ ...fillImg, objectFit: "contain" }} />;
  else if (showLive && loopable)
    content = (
      <iframe
        src={loopEmbedUrl(media)}
        title={ex.name || "Ejercicio"}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, pointerEvents: "none" }}
      />
    );
  else if (thumb)
    content = <img src={thumb} alt="" style={fillImg} />;
  else if (ex.imageBase64)
    content = <img src={ex.imageBase64} alt="" style={fillImg} />;
  else
    content = <div style={ph}>Sin vídeo ni imagen</div>;

  const canToggle = !still && onTogglePref && loopable && (thumb || ex.imageBase64);
  return (
    <div style={{ position: "relative", aspectRatio: "16 / 9", background: MEDIA_BG, overflow: "hidden" }}>
      {content}
      {canToggle && (
        <button onClick={onTogglePref} title={pref === "imagen" ? "Ver vídeo en bucle" : "Ver imagen fija"}
          style={{ position: "absolute", top: 6, right: 6, padding: "3px 7px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.75)", color: T, fontSize: 11, cursor: "pointer" }}>
          {pref === "imagen" ? "🎞" : "🖼"}
        </button>
      )}
    </div>
  );
}

function ExerciseCard({ ex, index, still, pref, onTogglePref }) {
  const rows = [["Series", ex.series], ["Reps", ex.repeticiones], ["Carga", ex.intensidad], ["Descanso", ex.recuperacion]].filter(([, v]) => v);
  return (
    <div style={{ background: CARD_BG, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, overflow: "hidden", color: T }}>
      <div style={{ background: HEAD_BG, padding: "6px 10px", fontWeight: 700, fontSize: 14, textAlign: "center", lineHeight: 1.2, minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ opacity: 0.6, fontSize: 11 }}>E{index + 1}</span>
        <span>{ex.name || "Ejercicio"}</span>
      </div>
      <MediaTile ex={ex} still={still} pref={pref} onTogglePref={onTogglePref} />
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "40% 1fr", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12.5 }}>
          <div style={{ background: LABEL_BG, padding: "4px 8px", fontWeight: 700 }}>{label}</div>
          <div style={{ padding: "4px 8px", textAlign: "center" }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Grupos ───────────────────────────────────────────────────────────────────
function autoGroups(usernames) {
  const sorted = [...usernames].sort((a, b) => a.localeCompare(b));
  const n = sorted.length;
  const size = Math.ceil(n / 3);
  return { 0: sorted.slice(0, size), 1: sorted.slice(size, size * 2), 2: sorted.slice(size * 2) };
}

function applyOverrides(auto, overrides, all) {
  const groups = { 0: [], 1: [], 2: [], [NO_GROUP]: [] };
  all.forEach((u) => {
    const g = overrides[u] !== undefined ? overrides[u] : Object.entries(auto).find(([, arr]) => arr.includes(u))?.[0];
    const gi = g === undefined ? NO_GROUP : Number(g);
    (groups[gi] || groups[NO_GROUP]).push(u);
  });
  return groups;
}

function PlayerCard({ player, group, onMove }) {
  const initials = (player.displayName || player.username || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const photoSz = { width: 56, height: 68, borderRadius: 5, border: "2px solid rgba(255,255,255,0.85)", flexShrink: 0, objectFit: "cover", display: "block" };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
      {player.photoUrl
        ? <img src={player.photoUrl} alt="" style={photoSz} />
        : <div style={{ ...photoSz, background: LABEL_BG, color: T, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>{initials}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, marginBottom: 5 }}>
          {player.displayName || player.username}
        </div>
        <select value={group} onChange={(e) => onMove(Number(e.target.value))} aria-label={`Grupo de ${player.displayName}`}
          style={{ background: LABEL_BG, color: T, border: "1px solid rgba(255,255,255,0.25)", borderRadius: 5, padding: "2px 4px", fontSize: 11, opacity: 0.75 }}>
          {GROUP_NAMES.map((n, i) => <option key={n} value={i}>G{i + 1}</option>)}
          <option value={NO_GROUP}>–</option>
        </select>
      </div>
    </div>
  );
}

function detectLifts(blocks) {
  const found = [];
  for (const lk of LIFT_KEYS) {
    for (const b of blocks) {
      for (const ex of (b.exercises || [])) {
        if ((ex.name || "").toLowerCase().includes(lk.key) && ex.intensidad) {
          found.push({ ...lk, intensidad: ex.intensidad });
          break;
        }
      }
      if (found.some((f) => f.key === lk.key)) break;
    }
  }
  return found;
}

// ── Documento ────────────────────────────────────────────────────────────────
// La columna de grupos usa columnas internas: cada grupo = una columna vertical de tarjetas.
// Si hay muchos jugadores, las tarjetas se hacen más compactas automáticamente.
function TemplateDocument({ side, teamName, date, sessionType, blocks, roster, byGroup, lifts, still, prefs, onTogglePref, onMove }) {
  const rosterBy   = (u) => roster.find((p) => p.username === u);
  const nEx        = blocks.reduce((n, b) => n + (b.exercises || []).length, 0);
  const exCols     = side
    ? `repeat(${nEx <= 1 ? 1 : nEx <= 4 ? 2 : nEx <= 9 ? 3 : 4}, minmax(0, 1fr))`
    : "repeat(auto-fill, minmax(200px, 1fr))";
  const groupIds   = [0, 1, 2, NO_GROUP].filter((g) => g !== NO_GROUP || (byGroup[g] || []).length > 0);
  // Total jugadores → ajusta tamaño de tarjeta
  const totalP     = roster.length;
  const playerCols = side ? `repeat(${groupIds.length}, minmax(0, 1fr))` : "1fr";

  return (
    <div style={{ background: PAGE_BG, color: T, padding: side ? "20px 26px 26px" : "14px 12px 20px", width: side ? DESIGN_W : "100%", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}>
      {/* Cabecera */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 16, borderBottom: "2px solid rgba(255,255,255,0.2)", paddingBottom: 10 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: side ? 30 : 22, letterSpacing: 1, textTransform: "uppercase" }}>
          {sessionType || "Sesión"}
        </div>
        <div style={{ fontSize: side ? 16 : 13, fontWeight: 600, opacity: 0.8 }}>{teamName} · {fmtDateLong(date)}</div>
      </div>

      {/* Dos columnas: ejercicios | grupos */}
      <div style={{ display: "grid", gridTemplateColumns: side ? "1fr 1fr" : "1fr", gap: side ? 28 : 18, alignItems: "start" }}>

        {/* ── Ejercicios ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {blocks.length === 0 && <div style={{ fontSize: 13, opacity: 0.5 }}>Sin ejercicios.</div>}
          {blocks.map((b, bi) => (
            <div key={bi}>
              {(b.name || b.blockType) && (
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.6, color: T }}>
                  <span>{b.name || b.blockType}</span>
                  {b.duration ? <span style={{ opacity: 0.7 }}>{b.duration} MIN</span> : null}
                </div>
              )}
              {b.content && (
                <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: "pre-wrap", lineHeight: 1.5, opacity: 0.85, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px" }}>
                  {b.content}
                </div>
              )}
              {(b.exercises || []).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: exCols, gap: 10 }}>
                  {(b.exercises || []).map((ex, i) => {
                    const k = String(ex.id ?? `${bi}-${i}`);
                    return <ExerciseCard key={k} ex={ex} index={i} still={still} pref={prefs[k]} onTogglePref={() => onTogglePref(k)} />;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Grupos de trabajo ── */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: side ? 28 : 22, textAlign: "center", letterSpacing: 2, lineHeight: 1, marginBottom: 10 }}>
            GRUPOS DE TRABAJO
          </div>

          {/* Leyenda de cargas */}
          {lifts.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "5px 16px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {lifts.map((lk) => (
                <span key={lk.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 22, height: 11, borderRadius: 6, background: `${lk.color}44`, border: `2px solid ${lk.color}`, display: "inline-block" }} />
                  {lk.label}: <strong style={{ color: lk.color }}>{lk.intensidad}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Grupos: 3 columnas en wide. Dentro de cada grupo, 2 columnas si >6 jugadores */}
          <div style={{ display: "grid", gridTemplateColumns: playerCols, gap: 14, alignItems: "start" }}>
            {groupIds.map((g) => {
              const list = byGroup[g] || [];
              const innerCols = side && list.length > 3 ? "1fr 1fr" : "1fr";
              return (
                <div key={g}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `6px solid ${GROUP_COLORS[g] || "#888"}`, background: HEAD_BG, padding: "6px 10px", fontWeight: 700, fontSize: 15, marginBottom: 10, borderRadius: "0 6px 6px 0" }}>
                    <span>{g === NO_GROUP ? "SIN GRUPO" : GROUP_NAMES[g]}</span>
                    <span style={{ opacity: 0.6, fontSize: 13 }}>{list.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: innerCols, gap: 8 }}>
                    {list.map((u) => {
                      const p = rosterBy(u);
                      if (!p) return null;
                      return <PlayerCard key={u} player={p} group={g} onMove={(ng) => onMove(u, ng)} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export default function SessionTvModal({ teamId, teamName = "", date, sessionType = "", blocks = [], roster = [], onClose }) {
  const [overrides, setOverrides] = useState(() => lsGet(`tvTpl:groups:${teamId}`, {}));
  const [prefs,     setPrefs]     = useState(() => lsGet(`tvTpl:media:${teamId}`,  {}));
  const [allStill,  setAllStill]  = useState(false);
  const [wide,      setWide]      = useState(true);
  const [fit,       setFit]       = useState({ w: 0, h: 0 });
  const [docH,      setDocH]      = useState(0);
  const bodyRef = useRef(null);
  const docRef  = useRef(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => { setWide(el.clientWidth >= 900); setFit({ w: el.clientWidth, h: el.clientHeight }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = docRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setDocH(el.offsetHeight));
    ro.observe(el);
    setDocH(el.offsetHeight);
    return () => ro.disconnect();
  }, [wide]);

  // Escala para caber en pantalla (tele): ajuste basado en ancho Y alto del documento
  const scale = wide && fit.w > 0 && docH > 0
    ? Math.min(fit.w / DESIGN_W, fit.h / docH, 3)
    : 1;

  const usernames = roster.map((p) => p.username);
  const auto      = autoGroups(usernames);
  const byGroup   = applyOverrides(auto, overrides, usernames);
  const lifts     = detectLifts(blocks);

  const move        = (u, g) => { const next = { ...overrides, [u]: g }; setOverrides(next); lsSet(`tvTpl:groups:${teamId}`, next); };
  const resetGroups = () => { setOverrides({}); lsSet(`tvTpl:groups:${teamId}`, {}); };
  const togglePref  = (k) => { const next = { ...prefs, [k]: prefs[k] === "imagen" ? "video" : "imagen" }; setPrefs(next); lsSet(`tvTpl:media:${teamId}`, next); };
  const hasOverrides = Object.keys(overrides).length > 0;

  const btn = { padding: "7px 11px", borderRadius: 9, border: `1px solid ${COLORS.line}`, background: COLORS.panelRaised, color: T, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
  const docProps = { side: wide, teamName, date, sessionType, blocks, roster, byGroup, lifts, prefs, still: allStill, onTogglePref: togglePref, onMove: move };

  const modal = (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200, display: "flex", flexDirection: "column" }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "9px 14px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.line}`, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15, color: T, marginRight: "auto" }}>📺 Plantilla TV</div>
        <button onClick={() => setAllStill((v) => !v)} style={btn} title={allStill ? "Ver vídeos en bucle" : "Ver imágenes fijas"}>
          {allStill ? "🎞" : "🖼"}<span style={{ marginLeft: 4 }}>{allStill ? "Ver vídeos" : "Ver imágenes"}</span>
        </button>
        {hasOverrides && (
          <button onClick={resetGroups} style={btn}>↺ Grupos automáticos</button>
        )}
        <button onClick={onClose} style={{ ...btn, padding: "7px 11px" }}>✕</button>
      </div>

      {/* Documento escalado */}
      <div ref={bodyRef} style={{ flex: 1, overflow: wide ? "hidden" : "auto", background: PAGE_BG, display: "flex", justifyContent: "center", alignItems: wide ? "flex-start" : "stretch" }}>
        {wide ? (
          <div style={{ width: DESIGN_W * scale, height: docH > 0 ? docH * scale : "100%", flexShrink: 0 }}>
            <div ref={docRef} style={{ width: DESIGN_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <TemplateDocument {...docProps} />
            </div>
          </div>
        ) : (
          <div style={{ width: "100%" }} ref={docRef}>
            <TemplateDocument {...docProps} />
          </div>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
