import Image from "next/image";
import "./auth.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { currentUser, oauthReady } from "@/lib/auth";
export default async function Auth({ params, searchParams }: { params: Promise<{ action: string }>; searchParams: Promise<{ error?: string }> }) {
  const { action } = await params;
  if (!["login", "register", "forgot-password", "reset-password"].includes(action)) notFound();
  const user = await currentUser();
  const { error } = await searchParams;
  const errors: Record<string, string> = {
    credentials: "Google menolak kredensial aplikasi. Pastikan Client ID dan Client Secret berasal dari OAuth client yang sama, lalu restart server aplikasi.",
    code: "Kode login sudah kedaluwarsa, sudah digunakan, atau tidak cocok dengan sesi login. Mulai login ulang dari aplikasi.",
    redirect: "URL callback belum cocok dengan Authorized redirect URIs pada OAuth client yang digunakan aplikasi.",
    config: "Konfigurasi login Google belum lengkap atau URL callback tidak valid.",
    cancelled: "Login dibatalkan. Klik Lanjutkan dengan Google untuk mencoba lagi.",
    session: "Sesi login kedaluwarsa atau cookie tidak tersedia. Mulai login lagi dari browser yang sama.",
    token: "Google gagal menyelesaikan login. Pastikan kredensial dan URL callback di Google Cloud sesuai dengan aplikasi.",
    profile: "Profil Google tidak dapat dibaca. Gunakan akun dengan email terverifikasi dan coba lagi.",
  };
  return <div className="page-wrap"><div className="auth-layout">
<figure className="auth-artwork">
<Image src="/art/monet.jpg" alt="Lukisan bunga teratai di permukaan kolam karya Claude Monet" fill sizes="(max-width: 760px) 92vw, 45vw" preload className="auth-image"/>
<figcaption className="auth-caption"><span>RUANG UNTUK TERINSPIRASI</span><p>Setiap karya punya cerita.<br/>Mulai ceritamu di sini.</p><small>Water Lilies &middot; Claude Monet &middot; Koleksi studi</small></figcaption>
</figure><section className="feature-intro auth-intro"><span className="feature-icon"><Fingerprint size={36}/></span><span className="eyebrow">AKUN GHEISARA</span><h1>Perjalanan kreatifmu<br/>dimulai di sini.</h1><p>Masuk dengan Google untuk membuka pengajuan kolaborasi dan diskusi privat.</p>{error && <p role="alert" className="inline-notice">{errors[error] ?? "Login Google belum berhasil. Periksa koneksi lalu coba lagi."}</p>}{user ? <><p>Kamu sudah masuk sebagai {user.name}.</p><Link className="button primary" href="/collab">Buka Collab Hub</Link></> : oauthReady() ? <form action="/api/auth/google" method="get"><button className="button primary">Lanjutkan dengan Google</button></form> : <p className="inline-notice">OAUTH_CLIENT_ID dan OAUTH_CLIENT_SECRET belum dikonfigurasi.</p>}{["forgot-password", "reset-password"].includes(action) && <p>Akun Google menggunakan pemulihan sandi dari Google.</p>}<p><Link href="/art/for-you">Jelajahi sebagai pengunjung</Link></p></section></div></div>;
}

