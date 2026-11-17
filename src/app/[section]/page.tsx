import { ArtImage } from "@/components/art-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Compass, Bell, Users } from "lucide-react";
const sections = {
  collab: { title: "Ide besar dimulai dari pertemuan.", label: "COLLAB HUB", description: "Tempat dua kreator bertukar perspektif, mengembangkan ide, dan menerbitkan karya dengan persetujuan bersama.", status: "Pengajuan dan workspace privat belum tersedia pada versi awal ini. Autentikasi dan database proyek perlu dihubungkan terlebih dahulu.", icon: Users },
  studio: { title: "Ruang untuk proses kreatifmu.", label: "STUDIO", description: "Rumah bagi karya, draf, dan perjalanan kreatifmu. Dari ide pertama hingga karya yang siap dibagikan.", status: "Penyimpanan draf dan unggah karya belum tersedia. Tidak ada file pribadi yang dikirim atau disimpan pada versi ini.", icon: Compass },
  notifications: { title: "Cerita baru akan datang ke sini.", label: "NOTIFIKASI", description: "Pengajuan kolaborasi, kabar proyek, dan pembaruan karya dalam satu tempat.", status: "Notifikasi pribadi membutuhkan akun. Layanan akun belum terhubung pada versi awal ini.", icon: Bell },
};
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "learn") return <div className="page-wrap"><div className="learning-hero"><BookOpen size={35}/><span className="eyebrow">PATHFINDER</span><h1>Selalu ada hal baru<br/>untuk <em>dipelajari.</em></h1><p>Temukan jalurmu sendiri dalam dunia seni.</p></div><div className="section-heading"><h2>Ke mana rasa ingin tahumu membawamu?</h2></div><div className="style-grid">{[{ name: "Impressionism", image: "monet", text: "Mengenal cahaya, warna, dan kesan sesaat." }, { name: "Modern Art", image: "bathers", text: "Membaca bentuk dan sudut pandang baru." }, { name: "Ukiyo-e", image: "wave", text: "Menjelajahi bahasa garis dan komposisi." }].map(p => <article className="learning-card" key={p.name}><ArtImage src={`/art/${p.image}.jpg`} width="600" height="350" alt=""/><div><span className="eyebrow">JALUR BELAJAR</span><h2>{p.name}</h2><p>{p.text}</p><span className="coming-soon">Materi dalam persiapan</span></div></article>)}</div><p className="inline-notice">Katalog rencana pembelajaran. Pelajaran, kuis, dan progres belum diaktifkan karena materi belum disahkan.</p><Link className="button primary" href="/art/for-you">Cari inspirasi dari karya <ArrowRight size={16}/></Link></div>;
  const data = sections[section as keyof typeof sections];
  if (!data) notFound();
  return <div className="page-wrap"><section className="feature-intro"><span className="feature-icon"><data.icon size={32}/></span><span className="eyebrow">{data.label}</span><h1>{data.title}</h1><p>{data.description}</p><div className="inline-notice">{data.status}</div><Link className="button primary" href="/art/for-you">Jelajahi karya <ArrowRight size={16}/></Link></section></div>;
}

