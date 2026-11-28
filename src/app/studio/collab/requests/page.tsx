import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { respondToCollabRequest } from "@/app/collab/actions";
import { CollabRequest } from "@/components/collab-request";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { areMutualFollowers, collabRequestHref } from "@/lib/community-model";

export default async function CollabRequests({ searchParams }: {
  searchParams: Promise<{ invitation?: string; error?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const { invitation, error } = await searchParams;
  const requests = store(data => data.invitations
    .filter(item => (item.sender === user.id || item.recipient === user.id) && (!invitation || item.id === invitation))
    .map(item => {
      const incoming = item.recipient === user.id;
      const partner = data.users.find(creator => creator.id === (incoming ? item.sender : item.recipient))?.name ?? "Kreator";
      const friends = areMutualFollowers(data.follows, item.sender, item.recipient);
      const projectId = data.projects.find(project => project.invitation === item.id && project.members.includes(user.id))?.id;
      return { item: { ...item, friends }, incoming, partner, projectId };
    }));
  if (invitation && !requests.length) notFound();

  return <div className="page-wrap studio-page">
    <Link href="/notifications" className="back-link">? Kembali ke notifikasi</Link>
    <h1>Pengajuan kolaborasi</h1>
    {error && <p role="alert" className="inline-notice">{error}</p>}
    <section className="collab-panel">
      {!requests.length && <p>Belum ada pengajuan kolaborasi.</p>}
      {requests.map(({ item, incoming, partner, projectId }) => invitation
        ? <div key={item.id}>
            <h2>{incoming ? "Pengajuan masuk" : "Pengajuan terkirim"}</h2>
            {item.canvas && <p>Kanvas <strong>{item.canvas.title || "Karya tanpa judul"}</strong></p>}
            <CollabRequest invitation={item} incoming={incoming} partner={partner} action={respondToCollabRequest.bind(null, item.id)}/>
            {projectId && <Link className="button primary" href={"/studio/collab/projects/" + projectId}>Buka workspace</Link>}
          </div>
        : <article className="collab-item" key={item.id}>
            <h2>{item.type} ? {partner}</h2>
            <Link className="button primary" href={collabRequestHref(item.id)}>Lihat pengajuan</Link>
          </article>)}
    </section>
  </div>;
}
