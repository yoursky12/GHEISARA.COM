"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Bell, BookOpen, ChevronDown, Compass, Grid2X2, Menu, Plus, Users, X } from "lucide-react";
import { HeaderSearch } from "./header-search";
export function Shell({ children, account, unread }: { children: React.ReactNode; account: { name: string; username: string } | null; unread: number }) {
  const path = usePathname();
  const [mobile, setMobile] = useState(false);
  const nav = [{ href: "/art/for-you", label: "Dashboard Art", icon: Grid2X2, active: path.startsWith("/art") || path.startsWith("/creators") }, { href: "/collab", label: "Collab Hub", icon: Users, active: path.startsWith("/collab") }, { href: "/studio", label: "Studio", icon: Compass, active: path.startsWith("/studio") }];
  return <><a className="skip-link" href="#main">Langsung ke konten</a><header className="header">
    <Link href="/" className="brand" aria-label="geishara beranda">geishara<span className="brand-dot">.</span></Link>
    <nav className="desktop-nav" aria-label="Navigasi utama">{nav.map(n => <Link key={n.href} href={n.href} className={n.active ? "nav-link active" : "nav-link"} aria-current={n.active ? "page" : undefined}><n.icon size={17}/>{n.label}</Link>)}</nav>
    <HeaderSearch/>
    <div className="header-actions"><Link href="/notifications" className="icon-button notification" aria-label="Notifikasi"><Bell size={20}/>{unread > 0 && <span className="unread-count">{unread > 99 ? "99+" : unread}</span>}</Link><span className="header-divider"/><Link href="/studio/artworks/new" className="button primary upload"><Plus size={17}/> Unggah karya</Link><details className="account-menu"><summary className="account" aria-label="Menu akun"><span>{account?.name.slice(0, 1) || "G"}</span><ChevronDown size={14}/></summary><div>{account ? <><strong>{account.name}</strong><Link href={`/creators/${account.username}`}>Profil & Art DNA</Link><Link href="/studio">Studio</Link><Link href="/studio/collections">Koleksi privat</Link><Link href="/studio/profile">Edit profil</Link><form action="/api/auth/logout" method="post"><button>Keluar</button></form></> : <Link href="/auth/login">Masuk dengan Google</Link>}</div></details><button className="icon-button mobile-menu" aria-label={mobile ? "Tutup menu" : "Buka menu"} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button></div>
    </header>{mobile && <nav className="mobile-navigation" aria-label="Navigasi ponsel">{nav.map(n => <Link key={n.href} href={n.href} onClick={() => setMobile(false)}><n.icon size={18}/>{n.label}</Link>)}<Link href="/learn" onClick={() => setMobile(false)}><BookOpen size={18}/>Pathfinder</Link></nav>}
    <main id="main">{children}</main><footer className="footer"><span className="footer-wordmark">geishara.</span><p>Setiap karya punya cerita. Temukan yang menyentuhmu.</p><span>Versi awal · Katalog contoh domain publik</span><Link href="/learn">Terus bertumbuh <ArrowUpRight size={14}/></Link></footer></>;
}
