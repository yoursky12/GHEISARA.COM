import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Brush, ChevronDown, Download, FileImage, Info, LockKeyhole, Users } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { usernameOf } from "@/lib/community";
import { canPublishTogether } from "@/lib/project-domain";
import { areMutualFollowers, mutualFollowRequired, publicationErrors } from "@/lib/community-model";
import { ArtImage } from "@/components/art-image";
import { WorkspaceDrawing } from "@/components/workspace-drawing";
import { CollabProjectDialog } from "@/components/collab-project-dialog";
import { StudioPanelControls } from "@/components/studio-panel-controls";
import { canvasNeedsSave } from "@/lib/shared-canvas";
import { SubmitButton } from "@/components/submit-button";
import { mutate } from "@/app/collab/actions";

const messageTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
});

export default async function Workspace({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const { projectId } = await params;
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(query.page) || 1)));
  const result = store(data => {
    const project = data.projects.find(p => p.id === projectId && p.members.includes(user.id));
    if (!project) return null;
    return {
      project,
      invitation: data.invitations.find(i => i.id === project.invitation)!,
      members: project.members.flatMap(id => data.users.filter(user => user.id === id)),
      candidate: data.artworks.find(a => a.id === project.candidateId),
      friends: areMutualFollowers(data.follows, project.members[0], project.members[1]),
    };
  });
  if (!result) notFound();

  const { project, invitation, members, candidate, friends } = result;
  const names = Object.fromEntries(members.map(member => [member.id, member.name]));
  const canEdit = friends && !project.publishedId;
  const showDrawingTools = canEdit && candidate?.status === "draft";
  const title = candidate?.title || invitation.type;
  const source = candidate?.asset ? `/api/media/${candidate.id}?v=${candidate.revision}` : undefined;
  const approvals = project.approvals?.filter(a => a.candidateId === candidate?.id && a.revision === candidate?.revision) ?? [];
  const messages = project.messages.slice(Math.max(0, project.messages.length - page * 50), Math.max(0, project.messages.length - (page - 1) * 50));
  const approved = approvals.some(a => a.user === user.id);
  const ready = candidate ? !canvasNeedsSave(project.canvas) && publicationErrors(candidate).length === 0 : false;
  const progress = project.progress ?? 0;
  const projectFields = (operation: string) => <>
    <input type="hidden" name="operation" value={operation}/>
    <input type="hidden" name="id" value={project.id}/>
  </>;

  const discussion = <CollabProjectDialog kind="discussion">
      <div className="collab-messages">
        {!messages.length && <p className="quiet">Belum ada pesan. Mulai diskusi dengan partnermu.</p>}
        {messages.map(message => <article key={message.id}>
          <strong>{names[message.author]}</strong>
          <p className="collab-text">{message.text}</p>
          <time dateTime={message.at}>{messageTime.format(new Date(message.at))} WIB</time>
        </article>)}
      </div>
      <div className="collab-workbench-actions">
        {project.messages.length > page * 50 && <Link className="text-link" href={`?page=${page + 1}`} scroll={false}>Lebih lama</Link>}
        {page > 1 && <Link className="text-link" href={`?page=${page - 1}`} scroll={false}>Lebih baru</Link>}
      </div>
      <form action={mutate} className="collab-workbench-form">
        {projectFields("message")}
        <input type="hidden" name="clientMessageId" value={randomUUID()}/>
        <label>Pesan<textarea name="text" required maxLength={2000} rows={2} placeholder="Tulis ke partnermu"/></label>
        <SubmitButton className="button">Kirim pesan</SubmitButton>
      </form>
  </CollabProjectDialog>;

  const publication = <CollabProjectDialog kind="publication">
      <p className="quiet">{approvals.length} dari {project.members.length} anggota menyetujui.</p>
      <ul className="collab-approvals">
        {project.members.map(id => <li key={id}><strong>{names[id]}</strong><span>{approvals.some(a => a.user === id) ? "Disetujui" : "Menunggu"}</span></li>)}
      </ul>
      {canEdit && <>
        <p className="quiet">{ready ? "Persetujuan berlaku untuk versi yang tersimpan." : "Lengkapi gambar dan metadata final sebelum meminta persetujuan."}</p>
        <div className="collab-workbench-actions">
          <form action={mutate}>
            {projectFields("approve")}
            <input type="hidden" name="revision" value={candidate?.revision ?? 0}/>
            <button className="button" disabled={!ready || approved}>{approved ? "Sudah disetujui" : "Setujui versi ini"}</button>
          </form>
          <form action={mutate}>
            {projectFields("publish")}
            <button className="button primary" disabled={!canPublishTogether(project, candidate)}>Terbitkan bersama</button>
          </form>
        </div>
      </>}
  </CollabProjectDialog>;

  return (
    <div className="collab-workbench collab-project-editor">
      <header className="collab-workbench-header">
        <div className="collab-project-title" data-workspace-navigation>
          <Link href="/studio/collab" className="collab-icon-link" aria-label="Kembali ke Collab Hub" title="Kembali ke Collab Hub"><ArrowLeft size={18}/></Link>
          <div><h1>{title}</h1><p><LockKeyhole size={12}/> Collab Hub / Workspace privat</p></div>
        </div>
        <div className="collab-workbench-actions">
          <StudioPanelControls shared showInspector={showDrawingTools}/>
          <div className="collab-member-list" role="group" aria-label="Anggota proyek" data-workspace-navigation>
            <Users size={15} aria-hidden="true"/>
            {members.map(member => (
              <Link key={member.id} className="collab-member-avatar"
                href={`/creators/${encodeURIComponent(usernameOf(member))}`}
                aria-label={`Buka profil ${member.name}`} title={member.name}>
                {member.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("")}
              </Link>
            ))}
          </div>
          {discussion}
          {publication}
          {project.publishedId ? <Link className="button primary" href={`/artworks/${project.publishedId}`}>Lihat karya terbit</Link> : canEdit && <>
            <form action={mutate}>{projectFields("candidate")}<SubmitButton className="button">Edit final</SubmitButton></form>
          </>}
        </div>
      </header>
      <div className="collab-workbench-body">
        <aside className="collab-project-pane" id="collab-project-details">
          <section className="collab-pane">
            <h2>Karya proyek</h2>
            <div className="collab-art-row">
              {source ? <ArtImage src={source} alt="" width={44} height={44}/> : <FileImage size={23}/>}
              <div><strong>{candidate?.title || "Kanvas bersama"}</strong><small>{candidate ? `Versi ${candidate.revision}` : "Belum dibuat"}</small></div>
              {candidate?.asset && <a className="collab-icon-link collab-art-download"
                href={`/api/media/${candidate.id}?download=1`} download
                aria-label="Unduh gambar tersimpan" title="Unduh gambar tersimpan">
                <Download size={16} aria-hidden="true"/>
              </a>}
            </div>
            <details className="collab-canvas-info">
              <summary className="button"><Info size={15} aria-hidden="true"/> Info kanvas bersama <ChevronDown size={15} aria-hidden="true"/></summary>
              <dl className="collab-workbench-facts">
                {invitation.idea && <><dt>Kesepakatan</dt><dd className="collab-text">{invitation.idea}</dd></>}
                {invitation.deadline && <><dt>Tenggat</dt><dd>{invitation.deadline} (WIB)</dd></>}
                <dt>Lisensi</dt><dd>{invitation.license}</dd>
                <dt>Atribusi</dt><dd>{project.members.map(id => names[id]).join(" & ")}</dd>
              </dl>
            </details>
            {candidate?.description && <p className="collab-text">{candidate.description}</p>}
          </section>
          <section className="collab-pane">
            <div className="collab-pane-heading"><h2>Progres proyek</h2><span>{progress}%</span></div>
            <progress value={progress} max={100} aria-label="Progres proyek"/>
            {canEdit && <form action={mutate} className="collab-workbench-form">
              {projectFields("progress")}
              <label>Progres (%)<input name="progress" type="number" min={0} max={100} defaultValue={progress} required key={progress}/></label>
              <SubmitButton className="button">Simpan progres</SubmitButton>
            </form>}
            {project.history?.slice(-3).reverse().map((entry, index) => <p className="quiet" key={index}>{names[entry.user]} · {entry.progress}% · {messageTime.format(new Date(entry.at))}</p>)}
          </section>
        </aside>
        {showDrawingTools ? (
          <WorkspaceDrawing key={candidate.id} id={candidate.id} revision={candidate.revision} projectId={project.id}
            source={source} title={candidate.title} palette={candidate.colors} sidebar={null}/>
        ) : (
          <div className="collab-canvas-grid">
            <section className="collab-stage" aria-label="Kanvas bersama">
              <div className="collab-stage-label"><strong>{title}</strong>{candidate?.width && <span>{candidate.width} × {candidate.height} px</span>}</div>
              {!canEdit && !project.publishedId && <p className="inline-notice">{mutualFollowRequired}</p>}
              {source ? (
                <div className="collab-published-preview"><ArtImage src={source} alt={title} width={candidate?.width} height={candidate?.height}/></div>
              ) : (
                <div className="collab-empty-sheet">
                  <Brush size={32}/>
                  <h2>Kanvas bersama</h2>
                  {canEdit && <><p>Buat kanvas agar kamu dan partnermu bisa melanjutkan gambar dari versi yang tersimpan.</p>
                  <form action={mutate}>
                    {projectFields("candidate")}
                    <input name="workspace" type="hidden" value="1"/>
                    <SubmitButton>Buat kanvas</SubmitButton>
                  </form></>}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <footer className="collab-workbench-status">
        <span><span aria-hidden="true"/> {project.publishedId ? "Terbit" : "Proyek privat"}</span>
        <span>{invitation.type}</span>
        {candidate && <span>Versi {candidate.revision} · {messageTime.format(new Date(candidate.updatedAt))} WIB</span>}
      </footer>
    </div>
  );
}
