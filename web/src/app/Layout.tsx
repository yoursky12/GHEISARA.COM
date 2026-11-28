import { Link, NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#konten">
        Langsung ke konten
      </a>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="font-serif text-2xl font-bold tracking-tight">
            geishara<span className="text-sky-700">.</span>
          </Link>
          <nav className="flex gap-2" aria-label="Navigasi utama">
            <NavLink end to="/" className="nav-link">
              Galeri
            </NavLink>
            <NavLink to="/studio" className="nav-link">
              Studio
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="konten" className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <Outlet />
      </main>
    </>
  );
}

export function NotFoundPage() {
  return (
    <section>
      <h1 className="page-title">Halaman tidak ditemukan</h1>
      <Link className="mt-4 inline-block underline" to="/">
        Kembali ke galeri
      </Link>
    </section>
  );
}
