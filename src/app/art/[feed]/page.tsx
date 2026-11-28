import { ArtImage } from "@/components/art-image";
import { LandingGallery } from "@/components/landing-gallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Brush, Compass, Fingerprint, Layers, Search, Sparkles, Users } from "lucide-react";
import { ArtworkCard } from "@/components/artwork-card";
import { Filters } from "@/components/filters";
import { filterArtworks, first, galleryWorks, queryString, type Query } from "@/lib/catalog";
import { currentUser } from "@/lib/auth";
import { feedArtworks, usernameOf } from "@/lib/community";
const tabs = [{ id: "for-you", title: "Untukmu", icon: Sparkles }, { id: "following", title: "Mengikuti", icon: Users }, { id: "popular", title: "Sedang Populer", icon: Compass }, { id: "collaborations", title: "Karya Kolaborasi", icon: Layers }];
export default async function Discovery({ params, searchParams }: { params: Promise<{ feed: string }>; searchParams: Promise<Query> }) {
  const { feed } = await params;
  if (!tabs.some(t => t.id === feed)) notFound();
  const query = await searchParams;
  const term = first(query, "q").trim();
  const user = await currentUser();
  const filtered = filterArtworks({ ...query, sort: feed === "popular" ? undefined : query.sort }, feedArtworks(feed, user?.id, first(query, "period")));
  const page = Math.max(1, Math.min(10000, Math.floor(Number(first(query, "page")) || 1)));
  const items = filtered.slice((page - 1) * 20, page * 20);
  const hasQuery = Object.keys(query).some(k => ["q", "era", "medium", "style", "license"].includes(k));
  return <div className="page-wrap">
    <div className="page-intro"><div><div className="eyebrow"><span/> THE ART OF DISCOVERY</div><h1>Temukan karya. <em>Rasakan ceritanya.</em></h1><p>Jelajahi perspektif baru, temukan inspirasi, dan terhubung melalui seni.</p></div><Link href="/studio" className="studio-link" aria-label="Buka Studio"><Brush size={17}/><span>Buka Studio</span><ArrowUpRight size={17}/></Link></div>
    <nav className="discovery-tabs" aria-label="Jelajahi karya">{tabs.map(t => <Link href={`/art/${t.id}`} key={t.id} className={`${feed === t.id ? "selected" : ""} ${t.id === "collaborations" ? "collab-tab" : ""}`} aria-current={feed === t.id ? "page" : undefined}><t.icon size={16}/>{t.title}{t.id === "collaborations" && <span>BERSAMA</span>}</Link>)}</nav>
    {feed === "for-you" && !hasQuery && (
      <div className="discovery-spotlight">
        <LandingGallery works={galleryWorks} />
        <Link href="/art/for-you?style=Impresionisme" className="text-link">Jelajahi koleksi Impresionisme</Link>
      </div>
    )}
    {feed === "for-you" && !hasQuery && <div className="inspiration-strip"><span className="strip-icon"><Fingerprint size={27}/></span><div><strong>Selera senimu punya cerita.</strong><p>Kenali warna dan gaya yang membentuk Art DNA-mu.</p></div><Link href={user ? `/creators/${usernameOf(user)}` : "/auth/login"}>Temukan Art DNA-mu <ArrowRight size={16}/></Link><span className="strip-decoration" aria-hidden="true">✳</span></div>}
    <section className="gallery-section" aria-labelledby="gallery-title"><div className="section-heading"><div><div className="eyebrow">{feed === "for-you" ? "RUANG INSPIRASIMU" : "JELAJAHI LEBIH DEKAT"}</div><h2 id="gallery-title">{term ? `Hasil untuk “${term}”` : ({ "for-you": "Sebuah karya, sudut pandang baru.", following: "Dari kreator yang kamu ikuti.", popular: "Karya yang mengundang perhatian.", collaborations: "Dua perspektif, satu karya." })[feed]}</h2></div>{term && <Link className="sample-label" href={`/creators${queryString({ q: term })}`}>Cari kreator <ArrowUpRight size={14}/></Link>}</div>
      {feed !== "following" && feed !== "collaborations" && <Filters key={queryString(query)} query={query} action={`/art/${feed}`}/>}
      {feed === "popular" && <nav className="period-tabs" aria-label="Periode popularitas">{[["all","Semua waktu"],["today","Hari ini"],["week","Minggu ini"],["month","Bulan ini"]].map(([id,label]) => <Link key={id} className={(first(query,"period") || "all") === id ? "selected" : ""} href={queryString(query,{period:id,page:undefined})}>{label}</Link>)}</nav>}
      {feed === "popular" && <p className="inline-notice">Peringkat berdasarkan apresiasi aktif pada periode terpilih. Karya tanpa apresiasi belum masuk peringkat.</p>}
      <div className="results-bar"><span><strong>{filtered.length}</strong> karya {hasQuery ? "ditemukan" : "untuk dijelajahi"}</span>{items.length > 0 && feed !== "popular" && <form action={`/art/${feed}`}><label htmlFor="sort">Urutkan:</label>{Object.entries(query).filter(([k]) => k !== "sort").flatMap(([k, v]) => (Array.isArray(v) ? v : v ? [v] : []).map((x, i) => <input type="hidden" name={k} value={x} key={`${k}-${i}`}/>))}<select id="sort" name="sort" defaultValue={first(query, "sort") === "title" ? "title" : "curated"}><option value="curated">Pilihan kurator</option><option value="title">Judul A–Z</option></select><button type="submit" className="sort-apply" aria-label="Terapkan urutan"><ArrowRight size={14}/></button></form>}</div>
      {items.length ? <div className="art-grid">{items.map((a, i) => <ArtworkCard key={a.id} artwork={a} index={i}/>)}</div> : <div className="empty-state">{feed === "following" ? <Users size={32}/> : <Search size={32}/>}<h3>{feed === "following" ? "Inspirasi terasa lebih dekat bersama kreator favorit." : feed === "collaborations" ? "Ruang untuk karya bersama." : "Belum ada karya yang cocok."}</h3><p>{feed === "following" ? "Masuk untuk mengikuti kreator dan melihat karya publik terbaru mereka." : feed === "collaborations" ? "Karya bersama akan tampil setelah final disetujui kedua kreator dan diterbitkan. Belum ada karya kolaborasi dalam katalog ini." : "Coba kata kunci lain atau hapus beberapa filter untuk menemukan inspirasi baru."}</p><Link className="button primary" href={feed === "following" ? (user ? "/creators" : "/auth/login") : "/art/for-you"}>{feed === "following" ? (user ? "Temukan kreator" : "Masuk ke akun") : "Jelajahi karya"}<ArrowRight size={16}/></Link></div>}
      <div className="collab-toolbar">{page > 1 && <Link className="button" href={queryString(query,{page:String(page-1)})}>Sebelumnya</Link>}{filtered.length > page*20 && <Link className="button" href={queryString(query,{page:String(page+1)})}>Berikutnya</Link>}</div>
      {items.length > 0 && <div className="gallery-end"><span/><p>Karya kreator dan koleksi studi memiliki label sumber pada halaman detail.</p><span/></div>}
    </section>
    <section className="explore-section"><div className="section-heading"><div><div className="eyebrow">IKUTI RASA INGIN TAHUMU</div><h2>Setiap gaya, dunia yang berbeda.</h2></div><span className="quiet">Mulai dari yang membuatmu penasaran <ArrowUpRight size={16}/></span></div><div className="style-grid">{[{ style: "Impresionisme", image: "monet", note: "Menangkap cahaya, merayakan momen." }, { style: "Postimpresionisme", image: "garden", note: "Warna dan emosi, melampaui kenyataan." }, { style: "Ukiyo-e", image: "wave", note: "Kisah dunia dalam setiap garis." }].map(s => <Link key={s.style} href={`/art/for-you?style=${encodeURIComponent(s.style)}`} className="style-card"><ArtImage src={`/art/${s.image}.jpg`} alt="" loading="lazy" width="600" height="260"/><div><h3>{s.style}</h3><p>{s.note}</p></div><span><ArrowUpRight size={21}/></span></Link>)}</div></section>
    <section className="bottom-banner"><span className="banner-star" aria-hidden="true">✳</span><div><span className="eyebrow">TUMBUH BERSAMA SENI</span><h2>Rasa ingin tahu adalah awal dari karya hebat.</h2><p>Kembangkan ide dan simpan proses kreatifmu sebagai draf di Studio.</p></div><Link href="/studio" className="button primary">Buka Studio <ArrowUpRight size={17}/></Link></section>
  </div>;
}

