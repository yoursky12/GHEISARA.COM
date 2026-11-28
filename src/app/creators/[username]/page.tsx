import Link from "next/link";
import { notFound } from "next/navigation";
import { artworks } from "@/lib/catalog";
import { store } from "@/lib/collab-store";
import { currentUser } from "@/lib/auth";
import { usernameOf, memberCard } from "@/lib/community";
import { areMutualFollowers, artDNA, authoredBy } from "@/lib/community-model";
import { ArtworkCard, Palette } from "@/components/artwork-card";
import { ProfilePhoto } from "@/components/profile-photo";
import { SubmitButton } from "@/components/submit-button";
import { communityAction } from "@/app/community-actions";
export default async function Creator({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ error?: string }> }) {
  const { username } = await params; const { error } = await searchParams;
  const viewer = await currentUser();
  const member = store(d => {
    const u = d.users.find(u => usernameOf(u).toLowerCase() === username.toLowerCase());
    if (!u) return null;
    const published = d.artworks.filter(a => authoredBy(a,u.id) && a.status === "published");
    return { user: { id: u.id, name: u.name, username: usernameOf(u), bio: u.bio, location: u.location, website: u.website, photo: u.photo }, artworks: published.map(a => memberCard(a,d)), dna: artDNA(published), followers: d.follows.filter(f => f.creator === u.id).length, friends: areMutualFollowers(d.follows, viewer?.id, u.id), following: d.follows.some(f => f.creator === u.id && f.user === viewer?.id) };
  });
  if (member) return <div className="page-wrap studio-page"><Link href="/art/for-you" className="back-link">← Kembali menjelajah</Link><section className="creator-profile member-profile"><ProfilePhoto name={member.user.name} photo={member.user.photo}/><div><span className="eyebrow">KREATOR geishara · @{member.user.username}</span><h1>{member.user.name}</h1><p>{member.user.bio || "Menemukan cerita melalui karya."}</p><div className="profile-meta"><span>{member.user.location}</span><span>{member.artworks.length} karya terbit</span><span>{member.followers} pengikut</span>{member.friends && <span className="open-badge">Saling mengikuti</span>}</div>{member.user.website && <a href={member.user.website} rel="noreferrer" target="_blank" className="text-link">Website ↗</a>}</div></section>{error && <p className="inline-notice" role="alert">{error}</p>}<div className="collab-toolbar">{viewer?.id === member.user.id ? <><Link className="button primary" href="/studio">Buka Studio</Link><Link className="button" href="/studio/profile">Edit profil</Link><Link className="button" href="/studio/collections">Koleksi privat</Link></> : <>{viewer ? <form action={communityAction}><input type="hidden" name="operation" value="follow"/><input type="hidden" name="id" value={member.user.id}/><input type="hidden" name="username" value={member.user.username}/><input type="hidden" name="enabled" value={member.following ? "no" : "yes"}/><SubmitButton>{member.following ? "Berhenti mengikuti" : "Ikuti kreator"}</SubmitButton></form> : <Link href="/auth/login" className="button primary">Masuk untuk mengikuti</Link>}{member.friends && <Link className="button" href={`/studio/collab?recipient=${encodeURIComponent(member.user.id)}#ajak-kreator`}>Ajak kolaborasi ↗</Link>}</>}</div><section className="dna-panel"><div><span className="eyebrow">ART DNA</span><h2>Perspektif dalam warna.</h2><p>Berdasarkan {member.dna.count} karya terbit · {member.dna.algorithmVersion}</p></div><div>{member.dna.count ? <>{member.dna.styles.map(s => <div className="dna-row" key={s.style}><span>{s.style}</span><strong>{s.percent}%</strong><progress max={100} value={s.percent}/></div>)}<Palette colors={member.dna.colors}/></> : <p>Art DNA akan terbentuk setelah karya pertama diterbitkan.</p>}</div></section><div className="section-heading"><h2>Karya {member.user.name}</h2></div>{member.artworks.length ? <div className="art-grid">{member.artworks.map(a => <ArtworkCard key={a.id} artwork={a}/>)}</div> : <div className="empty-state"><h3>Cerita pertamanya segera hadir.</h3><p>Kreator ini belum menerbitkan karya.</p></div>}</div>;
  const collection = artworks.filter(a => a.username === username);
  if (!collection.length) notFound();
  return <div className="page-wrap"><Link href="/art/for-you" className="back-link">← Kembali menjelajah</Link><section className="creator-profile"><span className="profile-initials">{collection[0].artist.split(" ").map(n => n[0]).slice(0, 2).join("")}</span><div><span className="eyebrow">SENIMAN DALAM KOLEKSI STUDI</span><h1>{collection[0].artist}</h1><p>{collection.length} karya dalam katalog</p></div></section><p className="inline-notice">Halaman referensi seniman historis, bukan akun kreator aktif. Profil ini tidak menerima follow atau pengajuan kolaborasi.</p><div className="section-heading"><h2>Karya dalam koleksi</h2></div><div className="art-grid">{collection.map((a, i) => <ArtworkCard key={a.id} artwork={a} index={i}/>)}</div></div>;
}
