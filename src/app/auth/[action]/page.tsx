import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser, oauthReady } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { submitCredentials } from "../actions";
export default async function Auth({ params, searchParams }: { params: Promise<{ action: string }>; searchParams: Promise<{ error?: string; next?: string }> }) {
  const { action } = await params;
  if (!["login", "register", "forgot-password", "reset-password"].includes(action)) notFound();
  const user = await currentUser();
  const { error, next } = await searchParams;
  const fromStudio = next === "studio";
  const nextQuery = fromStudio ? "?next=studio" : "";
  const registering = action === "register";
  const credentialsMode = action === "login" || registering;
  const googleAvailable = oauthReady();
  const errors: Record<string, string> = {
    credentials: "Google menolak kredensial aplikasi. Pastikan Client ID dan Client Secret berasal dari OAuth client yang sama, lalu restart server aplikasi.",
    code: "Kode login sudah kedaluwarsa, sudah digunakan, atau tidak cocok dengan sesi login. Mulai login ulang dari aplikasi.",
    redirect: "URL callback belum cocok dengan Authorized redirect URIs pada OAuth client yang digunakan aplikasi.",
    config: "Konfigurasi login Google belum lengkap atau URL callback tidak valid.",
    cancelled: "Login dibatalkan. Klik Lanjutkan dengan Google untuk mencoba lagi.",
    session: "Sesi login kedaluwarsa atau cookie tidak tersedia. Mulai login lagi dari browser yang sama.",
    token: "Google gagal menyelesaikan login. Pastikan kredensial dan URL callback di Google Cloud sesuai dengan aplikasi.",
    profile: "Profil Google tidak dapat dibaca. Gunakan akun dengan email terverifikasi dan coba lagi.",
    "invalid-form": "Periksa nama, alamat email, dan kata sandi yang kamu masukkan. Pendaftaran memerlukan kata sandi minimal 8 karakter.",
    "invalid-login": "Email atau kata sandi salah. Jika akunmu dibuat lewat Google, gunakan opsi Google.",
    "existing-account": "Email ini sudah terdaftar. Masuk dengan metode yang kamu gunakan saat mendaftar.",
  };
  return (
    <div className="page-wrap auth-page">
      <figure className="auth-artwork">
        <Image
          src="/art/monet.jpg"
          alt="Lukisan bunga teratai di permukaan kolam karya Claude Monet"
          fill
          sizes="100vw"
          preload
          className="auth-image"
        />
        <figcaption className="auth-caption"><cite>Water Lilies</cite><span>Claude Monet · Koleksi studi</span></figcaption>
      </figure>
      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-title">
          <h1 id="auth-title">
            {registering ? "Daftar di" : credentialsMode ? "Masuk ke" : "Pemulihan akun"} <em>geishara.</em>
          </h1>
          {!user && credentialsMode && (
            <nav className="auth-mode" aria-label="Pilihan akun">
              <Link href={`/auth/login${nextQuery}`} aria-current={registering ? undefined : "page"}>Masuk</Link>
              <Link href={`/auth/register${nextQuery}`} aria-current={registering ? "page" : undefined}>Daftar</Link>
            </nav>
          )}
          {error && <p role="alert" className="inline-notice">{errors[error] ?? "Login Google belum berhasil. Periksa koneksi lalu coba lagi."}</p>}
          {!user && credentialsMode && (
            <form className="auth-form" action={submitCredentials.bind(null, registering ? "register" : "login")}>
              {fromStudio && <input type="hidden" name="next" value="studio"/>}
              <div className="auth-fields">
                {registering && (
                  <label>Nama lengkap
                    <input name="name" placeholder="Masukkan nama lengkap" autoComplete="name" maxLength={100} required />
                  </label>
                )}
                <label>Email
                  <input type="email" name="email" placeholder="nama@contoh.com" autoComplete="username" maxLength={254} required />
                </label>
                <label>Kata sandi
                  <input type="password" name="password" placeholder={registering ? "Minimal 8 karakter" : "Masukkan kata sandi"}
                    autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 8 : undefined} maxLength={128} required />
                </label>
              </div>
              <SubmitButton>{registering ? "Buat akun" : "Masuk"}</SubmitButton>
            </form>
          )}
          <div className="auth-actions">
            {user ? (
              <>
                <p>Kamu sudah masuk sebagai {user.name}.</p>
                <Link className="button primary" href="/studio">Buka Studio</Link>
              </>
            ) : googleAvailable ? (
              <form action="/api/auth/google" method="get">
                {fromStudio && <input type="hidden" name="next" value="studio"/>}
                <button className="button secondary" type="submit">Lanjutkan dengan Google</button>
              </form>
            ) : (
              <p className="inline-notice">Masuk dengan Google belum tersedia.</p>
            )}
            {!credentialsMode && <p>Akun Google menggunakan pemulihan sandi dari Google.</p>}
            <Link className="text-link" href="/art/for-you">Jelajahi sebagai pengunjung</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

