"use client";

import Link from "next/link";
import { useState } from "react";
import { Ellipsis } from "lucide-react";
import { deletePersonalDraft } from "@/app/studio/artworks/new/actions";
import { SubmitButton } from "@/components/submit-button";

export function UploadDraftMenu({ id, revision, title }: { id: string; revision: number; title: string }) {
  const [error, setError] = useState("");

  return <details name="upload-draft-options" className="upload-draft-menu" onKeyDown={event => {
    if (event.key === "Escape" && event.currentTarget.open) {
      event.currentTarget.open = false;
      event.currentTarget.querySelector("summary")?.focus();
    }
  }}>
    <summary aria-label={`Opsi draf ${title}`}><Ellipsis size={20} aria-hidden="true"/></summary>
    <div className="upload-draft-menu-panel">
      <Link href={`/studio/drafts/${id}`}>Lanjutkan draf</Link>
      <Link href={`/studio?draft=${encodeURIComponent(id)}`}>Buka di Studio</Link>
      <form action={async () => {
        setError("");
        try {
          setError(await deletePersonalDraft(id, revision) ?? "");
        } catch {
          setError("Draf gagal dihapus. Coba lagi.");
        }
      }} onSubmit={event => {
        if (!window.confirm(`Hapus draf “${title}”? Draf yang dihapus tidak bisa dipulihkan.`)) event.preventDefault();
      }}>
        <SubmitButton className="upload-draft-delete">Hapus draf</SubmitButton>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  </details>;
}
