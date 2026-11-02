"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "@/lib/constants";

// Ventanas acopladas (editor de sesión, Prescriptor HIIT, Calculadora de espacios): no tapan la app con un
// fondo oscuro, así se pueden tener abiertas a la vez y seguir viendo y usando el resto. La página se aparta
// para dejarles sitio.
//  - Pantalla ancha (ordenador, iPad, móvil en horizontal ≥760px): columnas a la DERECHA,
//    una junto a otra. Su ancho se adapta a la pantalla (pct del ancho, con tope width).
//  - Móvil en vertical (<760px): hoja INFERIOR — la página queda arriba y la ventana abajo, a la vez.
//    Con dos abiertas se reparten la altura; cada una se puede minimizar a una barra con su título.
// `order` decide la posición: 0 = junto al borde (derecho / inferior), 1 = la siguiente, etc.

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

const subscribeResize = (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
const useVw = () => useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 1200);
const useVh = () => useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800);

export const SIDE_MIN_VW = 760; // desde aquí, columnas a la derecha (iPad, móviles en horizontal)
const BAR_H = 38;               // barra de un panel minimizado (móvil en vertical)
const BOTTOM_SHARE = 0.92;      // fracción de la altura que pueden ocupar las hojas inferiores

const sideWidth = (info, vw) => Math.round(Math.min(info.width, Math.max(info.minWidth, vw * info.pct)));

export default function DockPanel({ id, title = "", order = 0, width = 460, pct = 0.4, minWidth = 340, zIndex = 60, children }) {
  const vw = useVw();
  const vh = useVh();
  const side = vw >= SIDE_MIN_VW;
  const { panels } = useDock();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    dock.setPanel(id, { width, pct, minWidth, order, collapsed });
    return () => dock.setPanel(id, null);
  }, [id, width, pct, minWidth, order, collapsed]);

  const registered = { ...panels };
  if (!registered[id]) registered[id] = { width, pct, minWidth, order, collapsed };
  const list = Object.values(registered).sort((a, b) => a.order - b.order);

  const bottomHeights = (() => {
    const open = list.filter((p) => !p.collapsed);
    const per = open.length ? Math.max(180, Math.round((vh * BOTTOM_SHARE) / open.length)) : 0;
    return list.map((p) => (p.collapsed ? BAR_H : per));
  })();
  const total = side ? list.reduce((s, p) => s + sideWidth(p, vw), 0) : bottomHeights.reduce((s, h) => s + h, 0);

  useEffect(() => {
    const b = document.body.style;
    if (side) { b.paddingRight = `${Math.min(total, Math.round(vw * 0.6))}px`; b.paddingBottom = ""; }
    else { b.paddingBottom = `${Math.min(total, Math.round(vh * 0.75))}px`; b.paddingRight = ""; }
    return () => { b.paddingRight = ""; b.paddingBottom = ""; };
  }, [side, total, vw, vh]);

  const myIdx = list.findIndex((p) => p.order === order);
  const me = panels[id];

  const out = (node) => (typeof document === "undefined" ? null : createPortal(node, document.body));

  if (side) {
    const offset = list.filter((p) => p.order < order).reduce((s, p) => s + sideWidth(p, vw), 0);
    const w = me ? sideWidth(me, vw) : Math.round(Math.min(width, Math.max(minWidth, vw * pct)));
    return out(
      <div style={{
        position: "fixed", top: 0, bottom: 0, right: offset, width: w, maxWidth: "100vw", zIndex,
        background: COLORS.panel, borderLeft: `1px solid ${COLORS.line}`, boxShadow: "-10px 0 28px rgba(0,0,0,0.35)",
        overflowY: "auto", overflowX: "hidden", padding: "1.25rem", boxSizing: "border-box",
      }}>
        {children}
      </div>
    );
  }

  const bottomOffset = bottomHeights.slice(0, Math.max(0, myIdx)).reduce((s, h) => s + h, 0);
  const h = myIdx >= 0 ? bottomHeights[myIdx] : 0;
  return out(
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: bottomOffset, height: h || undefined, zIndex,
      background: COLORS.panel, borderTop: `1px solid ${COLORS.line}`, borderRadius: "14px 14px 0 0", boxShadow: "0 -8px 24px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden",
      paddingBottom: bottomOffset === 0 ? "env(safe-area-inset-bottom)" : 0,
    }}>
      <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Ampliar" : "Minimizar"}
        style={{ flexShrink: 0, height: BAR_H, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.panelRaised, border: "none", borderBottom: collapsed ? "none" : `1px solid ${COLORS.line}`, color: COLORS.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        <span>{collapsed ? "▲" : "▼"}</span><span>{title || "Ventana"}</span><span style={{ opacity: 0.6, fontWeight: 500 }}>{collapsed ? "· toca para ampliar" : "· minimizar"}</span>
      </button>
      <div style={{ display: collapsed ? "none" : "block", flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "0.9rem", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    </div>
  );
}
