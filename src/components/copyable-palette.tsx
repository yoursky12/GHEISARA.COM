"use client";

import { useEffect, useRef, useState } from "react";

function ColorCode({ color }: { color: string }) {
  const hex = color.toUpperCase();
  const [status, setStatus] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hex);
      setStatus("Tersalin!");
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setStatus(""), 1500);
    } catch {
      setStatus("Gagal menyalin. Coba lagi.");
    }
  }

  return <span className="palette-color">
    <button type="button" className="palette-swatch" style={{ backgroundColor: color }} onClick={copy} aria-label={`Salin kode warna ${hex}`} title="Klik untuk menyalin"/>
    <span className="palette-copy-status" role="status">{status}</span>
  </span>;
}

export function CopyablePalette({ colors }: { colors: string[] }) {
  return <span className="palette-labeled" aria-label="Palet warna">{colors.map(color => <ColorCode key={color} color={color}/>)}</span>;
}
