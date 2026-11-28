"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { DrawingDocument } from "@/lib/drawing-document";
import type { DrawingUpload } from "./drawing-canvas";
import { DrawingCanvas } from "./drawing-canvas-client";
import { CollabInbox } from "./collab-inbox";
import { useSharedCanvas } from "./use-shared-canvas";

export function WorkspaceDrawing({ id, revision, source, drawing, artworkAsset, title, titleControl, palette, sidebar, draftPicker, studioHeader, personal = false, projectId }: {
  id: string;
  revision: number;
  source?: string;
  drawing?: DrawingDocument;
  artworkAsset?: string;
  title: string;
  titleControl?: ReactNode;
  palette: string[];
  sidebar: ReactNode;
  draftPicker?: ReactNode;
  studioHeader?: { title: ReactNode; actions: ReactNode };
  personal?: boolean;
  projectId?: string;
}) {
  const router = useRouter();
  const [loadedSource] = useState(source);
  const [loadedDrawing] = useState(drawing);
  const [saved, setSaved] = useState({ revision, asset: artworkAsset });
  const savedRevision = personal && artworkAsset === saved.asset ? Math.max(revision, saved.revision) : saved.revision;
  const dirty = useRef(false);
  const saveForInvite = useRef<() => Promise<void>>(null);
  const uploadedRevision = useRef<number>(null);
  const live = useSharedCanvas(projectId);
  const snapshot = live.snapshot;
  const needsSave = !!snapshot && snapshot.version !== snapshot.finalVersion;
  const revisionFromServer = snapshot?.revision;
  const lastStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || revisionFromServer === undefined) return;
    const status = `${revisionFromServer}:${needsSave}`;
    if (lastStatus.current && lastStatus.current !== status) router.refresh();
    lastStatus.current = status;
  }, [needsSave, projectId, revisionFromServer, router]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty.current || live.pending) event.preventDefault();
    }
    function confirmNavigation(event: MouseEvent) {
      if ((!dirty.current && !live.pending) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("[data-workspace-navigation] a")
        : null;
      if (link && link.href !== window.location.href && !window.confirm("Keluar tanpa menyimpan perubahan gambar?")) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [live.pending]);

  async function save(file: File, drawingUpload?: DrawingUpload) {
    const form = new FormData();
    form.set("file", file);
    form.set("revision", String(snapshot?.revision ?? savedRevision));
    if (snapshot) form.set("canvasVersion", String(snapshot.version));
    if (drawingUpload) {
      form.set("layers", drawingUpload.sheet);
      form.set("drawing", JSON.stringify(drawingUpload.document));
    }
    const creating = personal && savedRevision === 0;
    const response = await fetch(`/api/studio/${id}${creating ? "?create=1" : ""}`, { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Gambar gagal disimpan.");
    uploadedRevision.current = data.artwork.revision;
    setSaved({ revision: data.artwork.revision, asset: data.artwork.asset });
    if (creating) router.replace(`/studio?draft=${id}`, { scroll: false });
    else router.refresh();
    return true;
  }

  async function prepareInvitation(values: FormData) {
    if (!saveForInvite.current) throw new Error("Tunggu sampai kanvas selesai dimuat.");
    await saveForInvite.current();
    values.set("draftId", id);
    values.set("draftRevision", String(uploadedRevision.current));
  }

  if (projectId && !snapshot) return (
    <div className="collab-canvas-grid">
      <section className="collab-stage" role="status">{live.warning || "Menghubungkan kanvas bersama…"}</section>
      <aside className="collab-inspector" id="collab-project-inspector">{sidebar}</aside>
    </div>
  );

  const displaySource = snapshot
    ? snapshot.base ? `/api/media/${id}?canvasBase=${encodeURIComponent(snapshot.base)}` : undefined
    : loadedSource;

  const editor = (
    <DrawingCanvas key={snapshot?.base ?? "kanvas"} source={displaySource} document={loadedDrawing}
      layerSource={loadedDrawing ? `/api/studio/${id}?v=${loadedDrawing.asset}` : undefined}
      title={title} titleControl={titleControl} palette={palette} personal={personal} busy={false} onSave={save}
      draftPicker={draftPicker} saveForInvite={studioHeader ? saveForInvite : undefined}
      shared={snapshot ? {
        strokes: live.strokes, layers: live.layers, previews: snapshot.previews, viewer: snapshot.viewer,
        canSave: live.connected && !live.pending, needsSave,
        addStroke: live.addStroke, previewStroke: live.previewStroke, setHidden: live.setHidden, editLayer: live.editLayer,
      } : undefined}
      onDirty={value => { dirty.current = value; }}
      sidebar={<>
        {snapshot && <section className="collab-pane">
          <h2>Sinkronisasi kanvas</h2>
          <p role="status">{live.pending ? "Mengirim goresan…" : live.connected ? "Terhubung" : "Menyambungkan ulang…"}</p>
          {live.warning && <p role="alert">{live.warning}</p>}
          {needsSave && <p className="quiet">Simpan gambar terbaru sebelum meminta persetujuan publikasi.</p>}
        </section>}
        {!projectId && revision > savedRevision && <section className="collab-pane" role="status">
          <p>Ada versi draf yang lebih baru.</p>
          <button className="button" type="button" onClick={() => window.location.reload()}>Muat versi terbaru</button>
        </section>}
        {sidebar}
      </>}/>
  );

  if (!studioHeader) return editor;
  return <>
    <header className="collab-workbench-header" data-workspace-navigation>
      {studioHeader.title}
      <div className="collab-workbench-actions">
        {studioHeader.actions}
        <CollabInbox canvasTitle={title} prepareInvitation={prepareInvitation}/>
      </div>
    </header>
    <div className="collab-workbench-body">{editor}</div>
  </>;
}
