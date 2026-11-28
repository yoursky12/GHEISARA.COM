"use client";

import { useId, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, MessageSquare, RefreshCw, X } from "lucide-react";

export function CollabProjectDialog({ kind, children }: { kind: "discussion" | "publication"; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const router = useRouter();
  const discussion = kind === "discussion";
  const title = discussion ? "Diskusi proyek" : "Persetujuan publikasi";
  const Icon = discussion ? MessageSquare : CircleAlert;

  return <>
    <button type="button" className="collab-icon-link" aria-label={title} aria-haspopup="dialog" title={title}
      onClick={() => {
        dialog.current?.showModal();
        router.refresh();
      }}>
      <Icon size={17} aria-hidden="true"/>
    </button>
    <dialog ref={dialog} className="collab-inbox collab-discussion" aria-labelledby={titleId}>
      <header className="collab-inbox-header">
        <h2 id={titleId}>{title}</h2>
        <div className="collab-workbench-actions">
          {discussion && <button type="button" className="collab-icon-link" aria-label="Muat ulang diskusi" title="Muat ulang diskusi" onClick={() => router.refresh()}>
            <RefreshCw size={15} aria-hidden="true"/>
          </button>}
          <button type="button" className="collab-icon-link" aria-label="Tutup pop-up" title="Tutup" onClick={() => dialog.current?.close()}>
            <X size={17} aria-hidden="true"/>
          </button>
        </div>
      </header>
      <div className="collab-inbox-content">{children}</div>
    </dialog>
  </>;
}
