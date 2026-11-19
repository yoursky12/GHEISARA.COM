
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Compass, Bell, Users } from "lucide-react";
const sections = {
  collab: { title: "Ide besar dimulai dari pertemuan.", label: "COLLAB HUB", description: "Tempat dua kreator bertukar perspektif, mengembangkan ide, dan menerbitkan karya dengan persetujuan bersama.", status: "Pengajuan dan workspace privat belum tersedia pada versi awal ini. Autentikasi dan database proyek perlu dihubungkan terlebih dahulu.", icon: Users },
  studio: { title: "Ruang untuk proses kreatifmu.", label: "STUDIO", description: "Rumah bagi karya, draf, dan perjalanan kreatifmu. Dari ide pertama hingga karya yang siap dibagikan.", status: "Penyimpanan draf dan unggah karya belum tersedia. Tidak ada file pribadi yang dikirim atau disimpan pada versi ini.", icon: Compass },
  notifications: { title: "Cerita baru akan datang ke sini.", label: "NOTIFIKASI", description: "Pengajuan kolaborasi, kabar proyek, dan pembaruan karya dalam satu tempat.", status: "Notifikasi pribadi membutuhkan akun. Layanan akun belum terhubung pada versi awal ini.", icon: Bell },
};
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "learn") redirect("/studio");
  const data = sections[section as keyof typeof sections];
  if (!data) notFound();
  return <div className="page-wrap"><section className="feature-intro"><span className="feature-icon"><data.icon size={32}/></span><span className="eyebrow">{data.label}</span><h1>{data.title}</h1><p>{data.description}</p><div className="inline-notice">{data.status}</div><Link className="button primary" href="/art/for-you">Jelajahi karya <ArrowRight size={16}/></Link></section></div>;
}

