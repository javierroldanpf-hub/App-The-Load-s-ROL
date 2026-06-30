"use client";
import { useState, useRef } from "react";
import { COLORS } from "@/lib/constants";
import { fileToCompressedDataUrl } from "@/lib/utils";

export default function ImageUploadButton({ label, onUploaded, busyLabel = "Subiendo..." }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Elige un archivo de imagen."); return; }
    setError("");
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      await onUploaded(dataUrl);
    } catch {
      setError("No se pudo procesar la imagen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }}
        id={`upload-${label.replace(/\s+/g, "-")}`} />
      <button onClick={() => inputRef.current && inputRef.current.click()} disabled={busy} style={{
        width: "auto", padding: "8px 14px", fontSize: 13, borderRadius: 12, fontWeight: 600,
        background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.text,
        cursor: busy ? "default" : "pointer",
      }}>
        {busy ? busyLabel : label}
      </button>
      {error && <div style={{ color: COLORS.coral, fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
