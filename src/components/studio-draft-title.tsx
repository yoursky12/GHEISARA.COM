"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { renameStudioDraft } from "@/app/studio/title-actions";

export function StudioDraftTitle({ id, revision, title }: { id: string; revision: number; title?: string }) {
  const router = useRouter();
  const [value, setValue] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === null || pending) return;
    setPending(true);
    setError("");
    try {
      const result = await renameStudioDraft(id, revision, value);
      if (result.error) {
        setError(result.error);
        if (revision > 0) router.refresh();
        return;
      }
      setValue(null);
      if (revision === 0) router.replace(`/studio?draft=${id}`, { scroll: false });
      else router.refresh();
    } catch {
      setError("Judul belum tersimpan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (value === null) return <button type="button" className="studio-title-trigger" title="Edit judul draf"
    aria-label={`Edit judul draf ${title || "Karya tanpa judul"}`} onClick={() => setValue(title ?? "")}>
    <span>{title || "Karya tanpa judul"}</span><Pencil size={13} aria-hidden="true"/>
  </button>;

  return <form className="studio-title-form" onSubmit={save} onKeyDown={event => {
    if (event.key === "Escape" && !pending) { setValue(null); setError(""); }
  }}>
    <input aria-label="Judul draf" placeholder="Judul draf" required maxLength={120} value={value}
      autoFocus disabled={pending} onChange={event => setValue(event.target.value)}/>
    <button type="submit" className="collab-icon-link" disabled={pending} aria-label="Simpan judul" title="Simpan judul"><Check size={15}/></button>
    <button type="button" className="collab-icon-link" disabled={pending} aria-label="Batal edit judul" title="Batal"
      onClick={() => { setValue(null); setError(""); }}><X size={15}/></button>
    {error && <span className="studio-title-error" role="alert">{error}</span>}
  </form>;
}
