import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Fingerprint, Sparkles, Users } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Gheisara — Ruang untuk setiap imajinasi",
  description: "Temukan inspirasi seni, kenali Art DNA-mu, dan mulai berkarya bersama di Gheisara. Jelajahi karya tanpa harus masuk.",
};

export default function Home() {
  return <div className={styles.landing}>
    <section className={styles.hero} aria-labelledby="welcome-title">
      <div className={styles.artPanel}>
        <span className={styles.panelEyebrow}>RUANG UNTUK SETIAP IMAJINASI</span>
        <h2>Setiap karya bermula<br/>dari sebuah rasa.</h2>
        <p>Satu warna. Satu perspektif.<br/>Kemungkinan yang tak terhingga.</p>
        <Link href="/artworks/the-great-wave" className={styles.heroArtwork} aria-label="Jelajahi The Great Wave karya Katsushika Hokusai">
          <ArtImage src="/art/wave.jpg" alt="Gelombang biru dalam The Great Wave karya Katsushika Hokusai" width="900" height="650" fetchPriority="high"/>
          <span className={styles.artworkArrow}><ArrowUpRight size={21}/></span>
        </Link>
        <div className={styles.artCredit}><div><strong>The Great Wave</strong><span>Katsushika Hokusai · Koleksi studi domain publik</span></div><ArrowUpRight size={17}/></div>
        <div className={styles.panelNote}><strong>Lebih dari galeri. Ruang untuk tumbuh.</strong><span>Jelajahi seni · Temukan Art DNA · Berkarya bersama</span></div>
      </div>
      <div className={styles.heroCopy}>
        <span className={styles.heroIcon}><Sparkles size={25} strokeWidth={1.5}/></span>
        <span className={styles.eyebrow}>SELAMAT DATANG DI GHEISARA</span>
        <h1 id="welcome-title">Temukan inspirasi.<br/>Ceritakan <em>dirimu.</em></h1>
        <p className={styles.intro}>Sebuah ruang untuk menikmati seni, menemukan gaya yang terasa seperti dirimu, dan mempertemukan ide dengan kreator lainnya.</p>
        <div className={styles.heroActions}><Link href="/art/for-you" className={styles.primary}>Mulai jelajahi karya <ArrowRight size={17}/></Link><Link href="/auth/login" className={styles.secondary}>Masuk dengan Google <ArrowUpRight size={16}/></Link></div>
        <p className={styles.smallNote}>Temukan inspirasi tanpa akun. Masuk saat kamu siap berkarya.</p>
        <div className={styles.heroDivider}/>
        <div className={styles.audience}><span className={styles.audienceMark}><Fingerprint size={24} strokeWidth={1.4}/></span><p>Untuk seniman, penikmat seni,<br/>dan siapa pun yang ingin <strong>mulai.</strong></p></div>
        <a href="#tentang" className={styles.scrollLink}>Kenali ruang kreatifmu <span>↓</span></a>
      </div>
    </section>
    <section id="tentang" className={styles.about} aria-labelledby="about-title">
      <div className={styles.sectionIntro}><span className={styles.eyebrow}>SEBUAH RUANG, BANYAK KEMUNGKINAN</span><h2 id="about-title">Datang karena penasaran.<br/>Tinggal untuk <em>bertumbuh.</em></h2><p>Tidak harus punya gaya yang pasti atau karya yang sempurna. Ada tempat untuk setiap tahap perjalanan kreatifmu.</p></div>
      <div className={styles.paths}>
        <Link href="/art/for-you" className={styles.path}><span className={styles.pathNumber}>01</span><div><h3>Temukan yang menggerakkanmu.</h3><p>Jelajahi karya, warna, dan berbagai gaya seni. Simpan inspirasi yang ingin kamu kunjungi kembali.</p><span>Jelajahi Dashboard Art <ArrowUpRight size={15}/></span></div><Sparkles size={23} strokeWidth={1.3}/></Link>
        <Link href="/studio" className={styles.path}><span className={styles.pathNumber}>02</span><div><h3>Kenali jejak kreatifmu.</h3><p>Unggah karya, rawat proses dalam draf, dan lihat Art DNA terbentuk dari gaya serta palet karyamu.</p><span>Masuk ke Studio <ArrowUpRight size={15}/></span></div><Fingerprint size={23} strokeWidth={1.3}/></Link>
        <Link href="/collab" className={styles.path}><span className={styles.pathNumber}>03</span><div><h3>Perluas sudut pandangmu.</h3><p>Temukan partner, tukar ide dalam ruang privat, dan terbitkan karya setelah disetujui bersama.</p><span>Kenali Collab Hub <ArrowUpRight size={15}/></span></div><Users size={23} strokeWidth={1.3}/></Link>
      </div>
    </section>
    <section className={styles.gallery} aria-labelledby="collection-title"><div className={styles.galleryHeading}><div><span className={styles.eyebrow}>SEKILAS RUANG INSPIRASI</span><h2 id="collection-title">Perspektif berbeda.<br/>Rasa yang bertemu.</h2></div><Link href="/art/for-you">Lihat galeri <ArrowUpRight size={17}/></Link></div>
      <div className={styles.artGrid}>{[{id:"water-lilies",image:"monet",title:"Water Lilies",artist:"Claude Monet",style:"Impresionisme"},{id:"the-bedroom",image:"bedroom",title:"The Bedroom",artist:"Vincent van Gogh",style:"Postimpresionisme"},{id:"paris-street",image:"paris",title:"Paris Street; Rainy Day",artist:"Gustave Caillebotte",style:"Impresionisme"}].map(a => <Link href={`/artworks/${a.id}`} key={a.id} className={styles.galleryArt}><div><ArtImage src={`/art/${a.image}.jpg`} alt={`${a.title} oleh ${a.artist}`} width="600" height="450" loading="lazy"/><span>{a.style}</span></div><h3>{a.title}</h3><p>{a.artist} <ArrowUpRight size={15}/></p></Link>)}</div><p className={styles.collectionNote}>Pilihan dari koleksi studi domain publik. Temukan sumber dan atribusi pada detail karya.</p>
    </section>
    <section id="bantuan" className={styles.faq} aria-labelledby="faq-title"><div><span className={styles.eyebrow}>SEBELUM MEMULAI</span><h2 id="faq-title">Sedikit kenalan,<br/>banyak kemungkinan.</h2></div><div className={styles.questions}><details><summary>Haruskah punya akun untuk melihat karya?<span>+</span></summary><p>Tidak. Kamu bisa menjelajahi galeri dan profil publik tanpa masuk. Akun diperlukan untuk mengunggah, mengapresiasi, menyimpan karya, atau berkolaborasi.</p></details><details><summary>Apakah pemula bisa bergabung?<span>+</span></summary><p>Tentu. Gheisara terbuka untuk seniman, penikmat seni, dan pemula. Mulai dengan menjelajahi karya atau unggah karya pertamamu di Studio.</p></details><details><summary>Bagaimana cara mulai berkolaborasi?<span>+</span></summary><p>Masuk dengan Google, cari kreator yang berstatus Open for Collab, lalu kirim pengajuan melalui Collab Hub. Workspace privat terbuka setelah pengajuan diterima.</p></details></div></section>
    <section className={styles.closing}><span className={styles.eyebrow}>PERJALANAN KREATIFMU DIMULAI DI SINI</span><h2>Ruangnya sudah ada.<br/>Sekarang, giliran <em>ceritamu.</em></h2><Link href="/auth/login" className={styles.primary}>Mulai bersama Gheisara <ArrowRight size={17}/></Link><Link href="/art/for-you" className={styles.closingExplore}>Jelajahi dulu, juga boleh <ArrowUpRight size={15}/></Link></section>
  </div>;
}
