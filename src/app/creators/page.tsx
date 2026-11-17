import Link from "next/link";
import { store } from "@/lib/collab-store";
import { usernameOf } from "@/lib/community";
export default async function Creators({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const creators = store(d => d.users.filter(u => `${u.name} ${usernameOf(u)} ${u.bio ?? ""}`.toLocaleLowerCase("id").includes(q.toLocaleLowerCase("id"))).map(u => ({ name: u.name, username: usernameOf(u), open: u.open, bio: u.bio, count: d.artworks.filter(a => a.owner === u.id && a.status === "published").length })));
  return <div className="page-wrap studio-page"><span className="eyebrow">TEMUKAN PERSPEKTIF BARU</span><h1>Kenali kreatornya.</h1><p>Temukan partner atau ikuti perjalanan kreator yang menginspirasimu.</p><form className="collection-create"><label>Cari kreator<input name="q" defaultValue={q} placeholder="Nama, username, atau bio"/></label><button className="button primary">Cari</button></form><div className="creator-grid">{creators.map(c => <Link className="creator-tile" key={c.username} href={`/creators/${c.username}`}><span className="profile-initials">{c.name.slice(0,1)}</span><h2>{c.name}</h2><p>@{c.username}</p><p>{c.bio || "Menemukan cerita melalui karya."}</p><span>{c.count} karya terbit</span>{c.open && <span className="open-badge">Open for Collab</span>}</Link>)}</div>{!creators.length && <p className="inline-notice">Belum ada kreator yang cocok dengan pencarianmu.</p>}</div>;
}
