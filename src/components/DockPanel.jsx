"use client";
import { useEffect, useSyncExternalStore } from "react";
import { COLORS } from "@/lib/constants";
import { useMediaQuery } from "@/lib/useMediaQuery";

// Paneles acoplados a la derecha: no tapan la app con fondo oscuro, pueden estar abiertos
// a la vez uno junto al otro. La página se desplaza a la izquierda para dejarles sitio.
// En pantallas estrechas vuelven a ser ventana emergente centrada.

const listeners = new Set();
let state = { panels: {}, editorDirty: false };
const emit = () => listeners.forEach((l) => l());
export const dock = {
  get: () => state,
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  setPanel(id, info) { const panels = { ...state.panels }; if (info) panels[id] = info; else delete panels[id]; state = { ...state, panels }; emit(); },
  setDirty(editorDirty) { if (state.editorDirty !== editorDirty) { state = { ...state, editorDirty }; emit(); } },
};
export const useDock = () => useSyncExternalStore(dock.subscribe, dock.get, dock.get);

export const DOCK_QUERY = "(max-width: 1100px)";

export default function DockPanel({ id, order = 0, width = 460, zIndex = 60, onBackdrop = null, cardMaxWidth = null, children }) {
  const narrow = useMediaQuery(DOCK_QUERY);
  const { panels } = useDock();

  useEffect(() => {
    if (narrow) return undefined;
    dock.setPanel(id, { width, order });
    return () => dock.setPanel(id, null);
  }, [id, width, order, narrow]);

  const widths = Object.values(panels);
  useEffect(() => {
    if (narrow) { document.body.style.paddingRight = ""; return undefined; }
    const total = widths.reduce((s, p) => s + p.width, 0);
    document.body.style.paddingRight = `${Math.min(total, Math.round(window.innerWidth * 0.6))}px`;
    return () => { document.body.style.paddingRight = ""; };
  }, [narrow, JSON.stringify(widths)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (narrow) {
    return (
      <div onClick={onBackdrop ? (e) => { if (e.target === e.currentTarget) onBackdrop(); } : undefined}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", zIndex: zIndex + 20, overflowY: "auto" }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: "1.25rem", width: "100%", maxWidth: cardMaxWidth || width, marginBottom: "2rem" }}>{children}</div>
      </div>
    );
  }

  const offset = widths.filter((p) => p.order < order).reduce((s, p) => s + p.width, 0);
  return (
    <div style={{
      position: "fixed", top: 0, bottom: 0, right: offset, width, maxWidth: "100vw", zIndex,
      background: COLORS.panel, borderLeft: `1px solid ${COLORS.line}`, boxShadow: "-10px 0 28px rgba(0,0,0,0.35)",
      overflowY: "auto", overflowX: "hidden", padding: "1.25rem", boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}
