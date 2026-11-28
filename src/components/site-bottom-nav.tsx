import Link from "next/link";
import { BiCompass, BiFile, BiGridAlt, BiPlus, BiUser } from "react-icons/bi";

export function SiteBottomNav({ path, username }: { path: string; username?: string }) {
  const tabs = [
    { label: "Dashboard", href: "/", active: path === "/", icon: BiGridAlt },
    { label: "Galeri", href: "/art/for-you", active: /^\/art(?:\/|works\/)|^\/creators\/?$/.test(path), icon: BiCompass },
    null,
    { label: "Studio", href: "/studio", active: path.startsWith("/studio"), icon: BiFile },
    { label: username ? "Profil" : "Masuk", href: username ? `/creators/${username}` : "/auth/login",
      active: !!username && path === `/creators/${username}`, icon: BiUser },
  ];

  return <nav className="site-bottom-nav" aria-label="Navigasi ponsel">
    <svg className="site-nav-notch" viewBox="0 0 136 66" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 0H21C36 0 38 26 68 26C98 26 100 0 115 0H136V66H0Z"/>
    </svg>
    {tabs.map(item => item
      ? <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined}><item.icon size={19} aria-hidden="true"/><span>{item.label}</span></Link>
      : <Link key="upload" href="/studio/artworks/new" className="site-mobile-upload" aria-label="Unggah karya"><BiPlus size={24} aria-hidden="true"/></Link>)}
  </nav>;
}
