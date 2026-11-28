import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { usernameOf } from "@/lib/community";
import { areMutualFollowers } from "@/lib/community-model";

export default async function Creators({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q: rawQuery }, viewer] = await Promise.all([searchParams, currentUser()]);
  const q = typeof rawQuery === "string" ? rawQuery : "";
  const term = q.trim().toLocaleLowerCase("id");
  const creators = store(d => d.users
    .filter(u => `${u.name} ${usernameOf(u)} ${u.bio ?? ""}`.toLocaleLowerCase("id").includes(term))
    .map(u => ({
      id: u.id,
      name: u.name,
      username: usernameOf(u),
      friends: areMutualFollowers(d.follows, viewer?.id, u.id),
      bio: u.bio,
      count: d.artworks.filter(a => a.owner === u.id && a.status === "published").length,
    })));

  return (
    <div className="page-wrap studio-page">
      <span className="eyebrow">TEMUKAN PERSPEKTIF BARU</span>
      <h1>Kenali kreatornya.</h1>
      <p>Temukan partner atau ikuti perjalanan kreator yang menginspirasimu.</p>
      <form className="collection-create">
        <label>Cari kreator<input name="q" defaultValue={q} placeholder="Nama, username, atau bio" /></label>
        <button className="button primary">Cari</button>
      </form>
      <div className="creator-grid">
        {creators.map(creator => (
          <article className="creator-tile" key={creator.id}>
            <span className="profile-initials">{creator.name.slice(0, 1)}</span>
            <h2><Link href={`/creators/${creator.username}`}>{creator.name}</Link></h2>
            <p>@{creator.username}</p>
            <p>{creator.bio || "Menemukan cerita melalui karya."}</p>
            <span>{creator.count} karya terbit</span>
            {creator.friends && (
              <Link
                className="button secondary"
                href={`/studio/collab?recipient=${encodeURIComponent(creator.id)}#ajak-kreator`}
                aria-label={`Ajak ${creator.name} berkolaborasi`}
              >
                Ajak kolaborasi
              </Link>
            )}
          </article>
        ))}
      </div>
      {!creators.length && <p className="inline-notice">Belum ada kreator yang cocok dengan pencarianmu.</p>}
    </div>
  );
}
