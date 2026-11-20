"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/constants";
import { getExercises, saveExercise, deleteExercise } from "@/lib/db";
import ImageUploadButton from "./ImageUploadButton";

// Batería global de ejercicios del coach.
// Dos modos de uso:
//   1. Panel completo (pickerMode=false): gestión desde la vista de equipo / configuración.
//   2. Modo picker (pickerMode=true): abre desde dentro del editor de sesión para elegir
//      un ejercicio y añadirlo al bloque activo.

const BLOCK_TYPES = ["FUERZA", "HIIT", "EMOM", "AMRAP", "MOVEMENT PREP", "CALENTAMIENTO", "CAMPO", "PISTA", "CARRERA", "METABÓLICO", "OTRO"];
const T = COLORS.text;

function parseMediaThumb(videoUrl) {
  if (!videoUrl) return null;
  const yt = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`;
  return null;
}

function ExerciseCard({ ex, onSelect, onEdit, onDelete, pickerMode, inputStyle }) {
  const thumb = parseMediaThumb(ex.videoUrl);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{ background: COLORS.panelRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Miniatura */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0d1017", flexShrink: 0 }}>
        {ex.imageBase64
          ? <img src={ex.imageBase64} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          : thumb
            ? <img src={thumb} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, opacity: 0.3 }}>🏋️</div>}
        {ex.videoUrl && (
          <a href={ex.videoUrl} target="_blank" rel="noreferrer" title="Ver vídeo"
            style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(0,0,0,0.75)", borderRadius: 5, padding: "3px 7px", fontSize: 11, color: T, textDecoration: "none" }}>▶</a>
        )}
        <span style={{ position: "absolute", top: 5, left: 5, background: "rgba(0,0,0,0.7)", borderRadius: 5, padding: "2px 6px", fontSize: 10, color: T, fontWeight: 700 }}>
          {ex.blockType}
        </span>
      </div>
      {/* Info */}
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: T, lineHeight: 1.2 }}>{ex.name}</div>
        {ex.notes && <div style={{ fontSize: 11, color: T, opacity: 0.7, lineHeight: 1.3 }}>{ex.notes}</div>}
      </div>
      {/* Acciones */}
      <div style={{ padding: "6px 10px 10px", display: "flex", gap: 6 }}>
        {pickerMode
          ? <button onClick={() => onSelect(ex)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Añadir</button>
          : <>
              <button onClick={() => onEdit(ex)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: `1px solid ${COLORS.line}`, background: "transparent", color: T, fontSize: 12, cursor: "pointer" }}>Editar</button>
              {confirmDelete
                ? <>
                    <button onClick={() => onDelete(ex.id)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: COLORS.coral, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>¿Borrar?</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${COLORS.line}`, background: "transparent", color: T, fontSize: 11, cursor: "pointer" }}>✕</button>
                  </>
                : <button onClick={() => setConfirmDelete(true)} style={{ padding: "6px 9px", borderRadius: 7, border: `1px solid ${COLORS.coral}44`, background: "transparent", color: COLORS.coral, fontSize: 12, cursor: "pointer" }}>🗑</button>}
            </>}
      </div>
    </div>
  );
}

function ExerciseForm({ initial, onSave, onCancel, inputStyle }) {
  const [name,       setName]       = useState(initial?.name || "");
  const [blockType,  setBlockType]  = useState(initial?.blockType || "FUERZA");
  const [videoUrl,   setVideoUrl]   = useState(initial?.videoUrl || "");
  const [imageB64,   setImageB64]   = useState(initial?.imageBase64 || "");
  const [notes,      setNotes]      = useState(initial?.notes || "");
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setErr("El nombre es obligatorio."); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave({ ...initial, name: name.trim(), blockType, videoUrl, imageBase64: imageB64, notes });
    } catch (e) {
      setErr(e?.message || "Error al guardar.");
    } finally { setSaving(false); }
  };

  const is = inputStyle || { width: "100%", padding: "10px 12px", borderRadius: 9, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: T, fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: T, marginBottom: 5 }}>Nombre *</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del ejercicio..." style={is} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: T, marginBottom: 5 }}>Tipo de bloque</div>
        <select value={blockType} onChange={(e) => setBlockType(e.target.value)} style={{ ...is, padding: "9px 12px" }}>
          {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: T, marginBottom: 5 }}>URL del vídeo (YouTube, Vimeo, MP4…)</div>
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." style={is} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: T, marginBottom: 5 }}>Imagen de referencia</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {imageB64 && <img src={imageB64} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: `1px solid ${COLORS.line}` }} />}
          <ImageUploadButton label={imageB64 ? "Cambiar imagen" : "+ Añadir imagen"} onUploaded={(b64) => setImageB64(b64)} />
          {imageB64 && <button onClick={() => setImageB64("")} style={{ background: "transparent", border: `1px solid ${COLORS.line}`, color: T, borderRadius: 7, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>Quitar</button>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: T, marginBottom: 5 }}>Notas</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Descripción, consejos técnicos..." style={{ ...is, resize: "vertical" }} />
      </div>
      {err && <div style={{ color: COLORS.coral, fontSize: 12 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: T, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export default function ExerciseBatteryPanel({ coachUsername, onSelect, onClose, pickerMode = false, filterBlockType = null, inputStyle }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState("");
  const [filter,  setFilter]      = useState(filterBlockType || "");
  const [editing, setEditing]     = useState(null); // null | "new" | exercise object

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getExercises(coachUsername);
    setExercises(data);
    setLoading(false);
  }, [coachUsername]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (ex) => {
    const saved = await saveExercise({ ...ex, coachUsername });
    setEditing(null);
    await load();
  };

  const handleDelete = async (id) => {
    await deleteExercise(id);
    await load();
  };

  const is = inputStyle || { width: "100%", padding: "9px 12px", borderRadius: 9, background: "#1c2128", border: `1px solid ${COLORS.line}`, color: T, fontSize: 13, outline: "none", boxSizing: "border-box" };

  const filtered = exercises.filter((ex) => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) || (ex.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || ex.blockType === filter;
    return matchSearch && matchFilter;
  });

  const panelStyle = pickerMode
    ? { display: "flex", flexDirection: "column", gap: 0 }
    : { background: COLORS.panel, borderRadius: 14, border: `1px solid ${COLORS.line}`, overflow: "hidden", display: "flex", flexDirection: "column" };

  return (
    <div style={panelStyle}>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: pickerMode ? "0 0 12px" : "14px 16px", borderBottom: pickerMode ? `1px solid ${COLORS.line}` : "none", flexWrap: "wrap" }}>
        {!pickerMode && <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 17, color: T, marginRight: "auto" }}>🏋️ Batería de ejercicios</div>}
        {pickerMode && <div style={{ fontWeight: 700, fontSize: 14, color: T, flex: 1 }}>🔍 Buscar en batería</div>}
        <button
          onClick={() => setEditing("new")}
          style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: COLORS.lime, color: "#14171c", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Nuevo ejercicio
        </button>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: T, fontSize: 18, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Formulario de edición / nuevo */}
      {editing && (
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.line}`, background: COLORS.panelRaised }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T, marginBottom: 12 }}>
            {editing === "new" ? "Nuevo ejercicio" : `Editando: ${editing.name}`}
          </div>
          <ExerciseForm
            initial={editing === "new" ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            inputStyle={is}
          />
        </div>
      )}

      {/* Filtros */}
      <div style={{ padding: pickerMode ? "10px 0" : "10px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o descripción…"
          style={{ ...is, flex: "1 1 180px", padding: "7px 10px", fontSize: 12 }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...is, flex: "0 0 auto", padding: "7px 10px", fontSize: 12, width: "auto" }}>
          <option value="">Todos los bloques</option>
          {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Grid de ejercicios */}
      <div style={{ padding: pickerMode ? "0" : "0 16px 16px", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {loading && <div style={{ color: T, fontSize: 13, padding: "12px 0", textAlign: "center", opacity: 0.6 }}>Cargando…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: T, fontSize: 13, opacity: 0.5, padding: "16px 0", textAlign: "center" }}>
            {exercises.length === 0
              ? "La batería está vacía. Crea el primer ejercicio con el botón \"+ Nuevo ejercicio\"."
              : "No hay ejercicios que coincidan con la búsqueda."}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {filtered.map((ex) => (
              <ExerciseCard
                key={ex.id}
                ex={ex}
                pickerMode={pickerMode}
                onSelect={onSelect}
                onEdit={setEditing}
                onDelete={handleDelete}
                inputStyle={is}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
