"use client";

import { useState } from "react";

export function StudioPanelControls({ shared = false, showInspector = true }: { shared?: boolean; showInspector?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const panels = [
    shared ? { id: "collab-project-details", label: "Proyek" } : { id: "studio-layers", label: "Draf & layer" },
    { id: shared ? "collab-project-inspector" : "studio-inspector", label: "Pengaturan" },
  ] as const;

  return <div className="studio-panel-controls" onKeyDown={event => {
    if (event.key === "Escape") setOpen(null);
  }}>
    {(showInspector ? panels : panels.slice(0, 1)).map(({ id, label }) => <button key={id} type="button" className="button"
      aria-controls={id} aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>{label}</button>)}
  </div>;
}
