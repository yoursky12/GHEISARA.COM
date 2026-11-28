"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Users, X } from "lucide-react";
import { mutateCollabInbox } from "@/app/collab/actions";
import type { Invitation } from "@/lib/collab-store";

type InboxInvite = Pick<Invitation, "id" | "type" | "deadline" | "license" | "idea" | "status"> & {
  incoming: boolean;
  partnerId: string;
  partnerName: string;
  canAccept: boolean;
  canvasTitle?: string;
  projectId?: string;
};

type Inbox = { friends: { id: string; name: string }[]; invitations: InboxInvite[] };

const statusLabel = {
  pending: "Menunggu respons", accepted: "Diterima", rejected: "Ditolak", cancelled: "Dibatalkan",
};

export function CollabInbox({ canvasTitle, prepareInvitation }: {
  canvasTitle: string;
  prepareInvitation: (values: FormData) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [recipient, setRecipient] = useState("");
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; text: string }>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const response = await fetch("/api/studio/collab", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data: Inbox = await response.json();
        if (!controller.signal.aborted) {
          setInbox(data);
          setLoadError("");
        }
      } catch {
        if (!controller.signal.aborted) setLoadError("Daftar Collab gagal dimuat.");
      } finally {
        loading = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [open, reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const button = (event.nativeEvent as SubmitEvent).submitter;
    const values = new FormData(form, button);
    const operation = values.get("operation");
    setPending(true);
    setFeedback(undefined);
    try {
      if (operation === "invite") await prepareInvitation(values);
      const { error } = await mutateCollabInbox(values);
      if (error) {
        setFeedback({ error: true, text: error });
      } else {
        if (operation === "invite") {
          form.reset();
          setRecipient("");
        }
        setFeedback({ error: false, text: operation === "invite" ? "Ajakan terkirim." : "Status ajakan diperbarui." });
      }
      setReload(value => value + 1);
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : "Ajakan belum bisa diperbarui. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  const waiting = new Set(inbox?.invitations.filter(invite => !invite.incoming && invite.status === "pending")
    .map(invite => invite.partnerId));
  const available = inbox?.friends.some(friend => friend.id === recipient && !waiting.has(friend.id));

  function inviteList(incoming: boolean) {
    const items = inbox?.invitations.filter(invite => invite.incoming === incoming) ?? [];
    return items.length ? <ul className="collab-inbox-list">
      {items.map(invite => <li key={invite.id}>
        <div className="collab-inbox-row">
          <strong>{invite.partnerName}</strong>
          <span className="status-badge">{statusLabel[invite.status]}</span>
        </div>
        {invite.canvasTitle && <p>{invite.canvasTitle}</p>}
        {invite.deadline && <p>{invite.type} · {invite.deadline} WIB · {invite.license}</p>}
        {invite.idea && <p className="collab-text">{invite.idea}</p>}
        {invite.status === "pending" && <form onSubmit={submit} className="collab-inbox-row">
          <input type="hidden" name="id" value={invite.id}/>
          {incoming ? <>
            <button type="submit" name="operation" value="accepted" className="button primary" disabled={pending || !invite.canAccept}>Terima</button>
            <button type="submit" name="operation" value="rejected" className="button" disabled={pending}>Tolak</button>
          </> : <button type="submit" name="operation" value="cancelled" className="button" disabled={pending}>Batalkan</button>}
        </form>}
        {invite.status === "pending" && incoming && !invite.canAccept && <p>Kalian perlu saling mengikuti untuk menerima ajakan.</p>}
        {invite.projectId && <Link className="text-link" href={`/studio/collab/projects/${invite.projectId}`}>Buka proyek</Link>}
      </li>)}
    </ul> : <p className="quiet">{incoming ? "Belum ada ajakan masuk." : "Belum ada ajakan terkirim."}</p>;
  }

  return <>
    <button type="button" className="button primary" aria-haspopup="dialog" onClick={() => {
      dialog.current?.showModal();
      setFeedback(undefined);
      setOpen(true);
    }}><Users size={16}/>Ajak Collab</button>
    <dialog ref={dialog} className="collab-inbox" aria-labelledby="collab-inbox-title" onClose={() => setOpen(false)}
      onCancel={event => { if (pending) event.preventDefault(); }}>
      <header className="collab-inbox-header">
        <h2 id="collab-inbox-title">Ajak Collab</h2>
        <button type="button" className="icon-button" aria-label="Tutup pop-up Collab" disabled={pending} onClick={() => dialog.current?.close()}><X size={19}/></button>
      </header>
      <div className="collab-inbox-content">
        {loadError && <p className="inline-notice" role="alert">{loadError} <button type="button" className="button" onClick={() => setReload(value => value + 1)}>Coba lagi</button></p>}
        {feedback && <p className="inline-notice" role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
        {!inbox && !loadError && <p role="status">Memuat daftar Collab…</p>}
        {inbox && <div className="collab-inbox-grid">
          <section aria-labelledby="collab-friends-title">
            <h3 id="collab-friends-title">Teman yang saling mengikuti</h3>
            <p>Kanvas yang diajak kolaborasi <strong>{canvasTitle}</strong></p>
            {inbox.friends.length ? <form className="collab-inbox-form" onSubmit={submit}>
              <input type="hidden" name="operation" value="invite"/>
              <label>Teman <select name="recipient" required value={recipient} onChange={event => setRecipient(event.target.value)}>
                <option value="" disabled>Pilih teman</option>
                {inbox.friends.map(friend => <option value={friend.id} key={friend.id} disabled={waiting.has(friend.id)}>
                  {friend.name}{waiting.has(friend.id) ? " · Ajakan menunggu" : ""}
                </option>)}
              </select></label>
              <button type="submit" className="button primary" disabled={pending || !available}>Kirim ajakan</button>
            </form> : <p className="quiet">Belum ada teman. Pengguna baru masuk ke daftar setelah kalian saling mengikuti.</p>}
          </section>
          <div className="collab-inbox-activity">
            <section aria-labelledby="collab-incoming-title">
              <h3 id="collab-incoming-title">Ajakan masuk</h3>
              {inviteList(true)}
            </section>
            <section aria-labelledby="collab-outgoing-title">
              <h3 id="collab-outgoing-title">Ajakan terkirim</h3>
              {inviteList(false)}
            </section>
          </div>
        </div>}
      </div>
    </dialog>
  </>;
}
