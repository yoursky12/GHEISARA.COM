import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brush, FileImage } from "lucide-react";
import { currentUser, studioLoginHref } from "@/lib/auth";
import { personalDrafts } from "@/lib/community";
import { ArtImage } from "@/components/art-image";
import { WorkspaceDrawing } from "@/components/workspace-drawing";
import { StudioPanelControls } from "@/components/studio-panel-controls";
import { StudioDraftTitle } from "@/components/studio-draft-title";

export default async function Studio({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const user = await currentUser();
  if (!user) redirect(studioLoginHref);

  const { draft: draftId } = await searchParams;
  const drafts = personalDrafts(user.id);
  const draft = drafts.find(art => art.id === draftId);
  if (draftId && !draft) redirect("/studio");

  const id = draft?.id ?? randomUUID();
  const title = draft?.title || "Karya tanpa judul";
  const source = draft?.asset ? `/api/media/${id}?v=${draft.revision}` : undefined;
  const otherDrafts = drafts.filter(art => art.id !== draft?.id);
  const editTitle = <StudioDraftTitle key={id} id={id} revision={draft?.revision ?? 0} title={draft?.title}/>;

  return (
    <div className="collab-workbench studio-editor">
      <WorkspaceDrawing key={id} personal id={id} revision={draft?.revision ?? 0} source={source}
        drawing={draft?.drawing} artworkAsset={draft?.asset} title={title} titleControl={editTitle} palette={draft?.colors ?? []} sidebar={null}
        studioHeader={{ title: <div className="collab-project-title">
          <Brush size={19} aria-hidden="true"/>
          <div><h1 className="sr-only">{title}</h1>{editTitle}<p>Studio / Kanvas pribadi</p></div>
        </div>, actions: <>
          <StudioPanelControls/>
          {draft && <Link href={`/studio/drafts/${id}`} className="button">Siapkan publikasi draf</Link>}
        </> }}
          draftPicker={<section className="collab-pane studio-draft-picker" data-workspace-navigation>
            <h2>Draf aktif</h2>
            <div className="collab-art-row">
              {source ? <ArtImage src={source} alt="" width={40} height={40}/> : <FileImage size={20} aria-hidden="true"/>}
              <div>{editTitle}<small>{draft ? `Versi ${draft.revision}` : "Belum disimpan"}</small></div>
            </div>
            {(draft || otherDrafts.length > 0) && <details>
              <summary>Pilih draf</summary>
              <div className="studio-draft-options">
                {otherDrafts.map(art => (
                  <Link key={art.id} href={`/studio?draft=${encodeURIComponent(art.id)}`} className="collab-art-row">
                    {art.asset ? <ArtImage src={`/api/media/${art.id}?v=${art.revision}`} alt="" width={40} height={40}/> : <FileImage size={20} aria-hidden="true"/>}
                    <div><strong>{art.title || "Karya tanpa judul"}</strong><small>Versi {art.revision}</small></div>
                  </Link>
                ))}
                {draft && <Link href="/studio" className="collab-art-row">Kanvas baru</Link>}
              </div>
            </details>}
          </section>}/>
      <footer className="collab-workbench-status">
        <span><span aria-hidden="true"/> Kanvas pribadi</span>
        <span>{draft ? `Versi ${draft.revision} tersimpan` : "Draf baru"}</span>
      </footer>
    </div>
  );
}
