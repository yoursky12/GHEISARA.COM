import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brush, Upload as UploadIcon } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { personalDrafts } from "@/lib/community";
import { ArtImage } from "@/components/art-image";
import { ArtworkEditor } from "@/components/artwork-editor";
import { UploadDraftMenu } from "@/components/upload-draft-menu";

export default async function Upload({ searchParams }: { searchParams: Promise<{ canvas?: string; new?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const { canvas, new: startNew } = await searchParams;
  const drafts = personalDrafts(user.id);

  if (drafts.length && startNew !== "1" && canvas !== "1") return (
    <div className="page-wrap studio-page">
      <Link href="/studio" className="back-link">Kembali ke Studio</Link>
      <header className="studio-heading">
        <div>
          <h1>Unggah karya</h1>
          <p>Lanjutkan draf Studio yang sudah ada atau mulai dari file baru.</p>
        </div>
        <Link href="/studio/artworks/new?new=1" className="button primary"><UploadIcon size={16}/>Unggah file baru</Link>
      </header>
      <section className="collab-panel" aria-labelledby="upload-drafts">
        <h2 id="upload-drafts">Draf pribadi dari Studio</h2>
        <div className="draft-grid">
          {drafts.map(draft => (
            <article className="upload-draft" key={draft.id}>
              <UploadDraftMenu id={draft.id} revision={draft.revision} title={draft.title || "Karya tanpa judul"}/>
              <Link className="draft-card" href={`/studio/drafts/${draft.id}`}>
                {draft.asset
                  ? <ArtImage src={`/api/media/${draft.id}?v=${draft.revision}`} alt="" width={400} height={240}/>
                  : <div className="draft-placeholder"><Brush size={30}/></div>}
                <div>
                  <h3>{draft.title || "Karya tanpa judul"}</h3>
                  <p>{draft.asset ? "Lanjutkan publikasi" : "Tambahkan gambar"} ↗</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const now = new Date().toISOString();
  return <ArtworkEditor openCanvas={canvas === "1"} initial={{ id: randomUUID(), owner: user.id, title: "", description: "", medium: "", styles: [], era: "", license: "", status: "draft", revision: 0, colors: [], createdAt: now, updatedAt: now }}/>;
}
