import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { publicArtworks } from "@/lib/community";
import { store } from "@/lib/collab-store";
import { communityAction } from "@/app/community-actions";
import { ArtworkCard } from "@/components/artwork-card";
import { SubmitButton } from "@/components/submit-button";
export default async function Collections({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser(); if (!user) redirect("/auth/login");
  const collections = store(d => d.collections.filter(c => c.owner === user.id));
  const artworks = publicArtworks(); const { error } = await searchParams;
  return <div className="page-wrap studio-page"><Link className="back-link" href="/studio">← Studio</Link><span className="eyebrow">INSPIRASI YANG KAMU SIMPAN</span><h1>Koleksi pribadimu.</h1><p>Hanya kamu yang dapat melihat daftar simpanan ini.</p>{error && <p className="inline-notice" role="alert">{error}</p>}<form className="collection-create" action={communityAction}><input type="hidden" name="operation" value="collection"/><label>Nama koleksi<input name="name" maxLength={80} required placeholder="Misalnya: Warna yang menenangkan"/></label><SubmitButton>Buat koleksi privat</SubmitButton></form>{collections.map(c => { const items = artworks.filter(a => c.artworks.includes(a.id)); return <section className="collab-panel" key={c.id}><div className="section-heading"><h2>{c.name}</h2><span>{items.length} karya · Privat</span></div>{items.length ? <div className="art-grid">{items.map(a => <div key={a.id}><ArtworkCard artwork={a}/><form action={communityAction}><input type="hidden" name="operation" value="save"/><input type="hidden" name="id" value={a.id}/><input type="hidden" name="collection" value={c.id}/><input type="hidden" name="enabled" value="no"/><SubmitButton className="button">Hapus dari koleksi</SubmitButton></form></div>)}</div> : <p>Jelajahi karya dan pilih Simpan untuk mengisi koleksi ini.</p>}</section>; })}</div>;
}
