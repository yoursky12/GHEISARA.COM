import { CollabRequest } from "@/components/collab-request";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { areMutualFollowers } from "@/lib/community-model";
import { mutate } from "@/app/collab/actions";

export default async function Collab({ searchParams }: { searchParams: Promise<{ error?: string; recipient?: string }> }) {
  const user = await currentUser();
  const { error, recipient } = await searchParams;
  if (!user) return <div className="page-wrap"><section className="feature-intro"><span className="eyebrow">COLLAB HUB</span><h1>Ide besar dimulai dari pertemuan.</h1><p>Masuk untuk menemukan partner, mengirim pengajuan, dan membuka ruang diskusi privat.</p><Link href="/auth/login" className="button primary">Masuk ke akun</Link></section></div>;
  const data = store(d => ({ creators: d.users.filter(u => areMutualFollowers(d.follows, user.id, u.id)), users: d.users.map(u => ({ id: u.id, name: u.name })), invitations: d.invitations.filter(i => i.sender === user.id || i.recipient === user.id).map(i => ({ ...i, friends: areMutualFollowers(d.follows, i.sender, i.recipient) })), projects: d.projects.filter(p => p.members.includes(user.id)) }));
  const selectedRecipient = data.creators.some(creator => creator.id === recipient) ? recipient : "";
  const name = (id: string) => data.users.find(u => u.id === id)?.name ?? "Kreator";
  return <div className="page-wrap collab-hub"><span className="eyebrow">COLLAB HUB</span><h1>Ruang berkarya bersama.</h1><p>Selamat datang, {user.name}.</p>{error && <p role="alert" className="inline-notice">{error}</p>}
    
    {selectedRecipient && <section id="ajak-kreator" className="collab-panel"><h2>Ajak teman berkolaborasi</h2><p>Untuk membuat karya bersama, kamu dan partnermu harus saling mengikuti.</p><Link className="text-link" href="/creators">Jelajahi profil kreator</Link>{data.creators.length ? <form action={mutate} className="collab-form"><input type="hidden" name="operation" value="invite"/><label>Partner<select name="recipient" required defaultValue={selectedRecipient}><option value="" disabled>Pilih partner</option>{data.creators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Jenis kolaborasi<select name="type">{["Art Trade", "Lineart × Coloring", "Background × Character", "Style Mashup", "Mentorship"].map(t => <option key={t}>{t}</option>)}</select></label><label>Tenggat (WIB)<input type="date" name="deadline" required/></label><label>Lisensi yang diajukan<select name="license">{["All rights reserved", "CC BY 4.0", "CC BY-NC 4.0"].map(l => <option key={l}>{l}</option>)}</select></label><label className="collab-wide">Ide kolaborasi<textarea name="idea" required maxLength={1000} rows={4}/></label><button className="button primary">Kirim pengajuan</button></form> : <p>Belum ada teman yang saling mengikuti. Ikuti kreator dari profilnya dan tunggu mereka mengikuti balik.</p>}</section>}
    {(["incoming", "outgoing"] as const).map(direction => { const items = data.invitations.filter(i => direction === "incoming" ? i.recipient === user.id : i.sender === user.id); return <section className="collab-panel" key={direction}><h2>{direction === "incoming" ? "Pengajuan masuk" : "Pengajuan terkirim"} ({items.length})</h2>{!items.length && <p>Belum ada pengajuan.</p>}{items.map(i => <CollabRequest key={i.id} invitation={i} partner={name(direction === "incoming" ? i.sender : i.recipient)} incoming={direction === "incoming"} action={mutate}/>)}</section>; })}
    <section className="collab-panel"><h2>Proyek aktif ({data.projects.filter(p => !p.publishedId).length})</h2>{!data.projects.some(p => !p.publishedId) && <p>Workspace dibuat setelah pengajuan diterima partner.</p>}{data.projects.filter(p => !p.publishedId).map(p => <article key={p.id} className="collab-item"><h3>{name(p.members.find(id => id !== user.id)!)}</h3><Link className="button primary" href={`/studio/collab/projects/${p.id}`}>Buka workspace</Link></article>)}</section>
    <section className="collab-panel"><h2>Proyek selesai ({data.projects.filter(p => p.publishedId).length})</h2>{data.projects.filter(p => p.publishedId).map(p => <article key={p.id} className="collab-item"><h3>{name(p.members.find(id => id !== user.id)!)}</h3><Link className="button primary" href={`/artworks/${p.publishedId}`}>Lihat karya bersama</Link><Link className="button" href={`/studio/collab/projects/${p.id}`}>Workspace</Link></article>)}</section>
  </div>;
}

