"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BiChevronDown as ChevronDown, BiCompass as Compass, BiGridAlt as Grid2X2, BiLinkExternal as ArrowUpRight, BiMenu as Menu, BiPlus as Plus, BiX as X } from "react-icons/bi";
import { NotificationBell } from "./notification-bell";
import { SiteBottomNav } from "./site-bottom-nav";
import { ThemeToggle } from "./theme-toggle";
export function Shell({ children, account, unread }: { children: React.ReactNode; account: { name: string; username: string } | null; unread: number }) {
  const path = usePathname();
  const [mobile, setMobile] = useState(false);
  const accountMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    accountMenu.current?.removeAttribute("open");
  }, [path]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const menu = accountMenu.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const studioEditor = Boolean(account) && (path === "/studio" || /^\/studio\/collab\/projects\/[^/]+\/?$/.test(path));
  const showBottomNav = !studioEditor && !path.startsWith("/auth/");
  const nav = [{ href: "/", label: "Dashboard Art", icon: Grid2X2, active: path === "/" || path.startsWith("/art") || path.startsWith("/creators") }, { href: "/studio", label: "Studio", icon: Compass, active: path.startsWith("/studio") }];
  return <><a className="skip-link" href="#main">Langsung ke konten</a>{path !== "/" && <><header className="header" data-workspace-navigation>
    <Link href="/" className="brand" aria-label="geishara beranda">geishara<span className="brand-dot">.</span></Link>
    <nav className="desktop-nav" aria-label="Navigasi utama">{nav.map(n => <Link key={n.href} href={n.href} className={n.active ? "nav-link active" : "nav-link"} aria-current={path === n.href ? "page" : undefined}><n.icon size={17}/>{n.label}</Link>)}</nav>
    <div className="header-actions">
      <ThemeToggle/>
      <NotificationBell key={account?.username} signedIn={Boolean(account)} initialUnread={unread}/>
      <span className="header-divider"/>
      <Link href="/studio/artworks/new" className="button primary upload" aria-label="Unggah karya"><Plus size={17} aria-hidden="true"/><span>Unggah karya</span></Link>
      <details ref={accountMenu} className="account-menu" onKeyDown={event => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }} onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}>
        <summary className="account" aria-label="Menu akun"><span>{account?.name.slice(0, 1) || "G"}</span><ChevronDown size={14}/></summary>
        <div onClick={event => {
          if (event.target instanceof Element && event.target.closest("a")) accountMenu.current?.removeAttribute("open");
        }}>
          {account ? <>
            <strong>{account.name}</strong>
            <Link href={`/creators/${account.username}`}>Profil & Art DNA</Link>
            <Link href="/studio/profile">Edit profil</Link>
            <form action="/api/auth/logout" method="post"><button>Keluar</button></form>
          </> : <Link href="/auth/login">Masuk dengan Google</Link>}
        </div>
      </details>
      <button className="icon-button mobile-menu" aria-label={mobile ? "Tutup menu" : "Buka menu"} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
    </div>
    </header>{mobile && <nav className="mobile-navigation" aria-label="Navigasi ponsel" data-workspace-navigation>{nav.map(n => <Link key={n.href} href={n.href} onClick={() => setMobile(false)}><n.icon size={18}/>{n.label}</Link>)}</nav>}</>}
    <main id="main" className={studioEditor ? "studio-editor-shell" : undefined}>{children}</main>{!studioEditor && <footer className="footer"><span className="footer-wordmark">geishara.</span><p>Setiap karya punya cerita. Temukan yang menyentuhmu.</p><span>Versi awal · Katalog contoh domain publik</span><Link href="/studio">Buka Studio <ArrowUpRight size={14}/></Link></footer>}
    {showBottomNav && <SiteBottomNav path={path} username={account?.username}/>}</>;
}
