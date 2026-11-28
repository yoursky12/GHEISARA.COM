import Link from "next/link";
import {
  BiBell as Bell, BiChevronRight as ChevronRight, BiCompass as Compass, BiFile as FileText,
  BiGridAlt as LayoutGrid, BiGroup as Users, BiLinkExternal as ArrowUpRight, BiPlus as Plus, BiUser as UserRound,
  BiSolidFile, BiSolidGroup, BiSolidImage,
} from "react-icons/bi";
import type { ReactNode } from "react";
import type { User } from "@/lib/collab-store";
import { store } from "@/lib/collab-store";
import { usernameOf } from "@/lib/community";
import { authoredBy, notificationHref } from "@/lib/community-model";
import { DashboardControls } from "./dashboard-controls";
import { HeaderSearch } from "./header-search";
import { NotificationBell } from "./notification-bell";

const jakartaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
const weekday = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "short" });
const time = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });

function ActivityChart({ days }: { days: { label: string; published: number; likes: number }[] }) {
  const max = Math.max(4, ...days.flatMap(day => [day.published, day.likes]));
  const scale = Math.ceil(max / 4) * 4;
  const y = (value: number) => 112 - value * 96 / scale;
  const x = (index: number) => 12 + index * 76;
  const path = (key: "published" | "likes") => days.map((day, index) => `${x(index)},${y(day[key])}`).join(" ");

  return <>
    <div className="dashboard-chart" aria-hidden="true">
      <div className="dashboard-chart-axis">{[scale, scale * .75, scale * .5, scale * .25, 0].map(tick => <span key={tick}>{tick}</span>)}</div>
      <div className="dashboard-chart-plot">
        <svg viewBox="0 0 480 128" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4].map(step => <line key={step} x1="0" x2="480" y1={16 + step * 24} y2={16 + step * 24} className="dashboard-chart-grid"/>)}
          <polyline points={path("likes")} className="dashboard-chart-likes"/>
          <polyline points={path("published")} className="dashboard-chart-published"/>
        </svg>
        <div className="dashboard-chart-days">{days.map(day => <span key={day.label}>{day.label}</span>)}</div>
      </div>
    </div>
    <ul className="dashboard-chart-legend" aria-hidden="true"><li>Karya terbit</li><li>Apresiasi</li></ul>
    <table className="sr-only"><caption>Aktivitas tujuh hari terakhir</caption>
      <thead><tr><th>Hari</th><th>Karya terbit</th><th>Apresiasi</th></tr></thead>
      <tbody>{days.map(day => <tr key={day.label}><th>{day.label}</th><td>{day.published}</td><td>{day.likes}</td></tr>)}</tbody>
    </table>
  </>;
}

export function ArtDashboard({ user, catalogCount, children }: { user: User | null; catalogCount: number; children: ReactNode }) {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  const profileHref = user ? `/creators/${usernameOf(user)}` : "/auth/login";
  const { drafts, projects, unread, activities, days } = store(data => {
    const published = data.artworks.filter(art => art.status === "published");
    const publishedIds = new Set(published.filter(art => !user || authoredBy(art, user.id)).map(art => art.id));
    const dateKeys = Array.from({ length: 7 }, (_, index) => new Date(now.getTime() - (6 - index) * 86_400_000));
    const days = dateKeys.map(date => ({ date: jakartaDate.format(date), label: weekday.format(date), published: 0, likes: 0 }));
    const byDate = new Map(days.map(day => [day.date, day]));
    for (const art of published) {
      if (!art.publishedAt || !publishedIds.has(art.id)) continue;
      const day = byDate.get(jakartaDate.format(new Date(art.publishedAt)));
      if (day) day.published += 1;
    }
    for (const like of data.appreciations) {
      if (user && !publishedIds.has(like.artwork)) continue;
      const day = byDate.get(jakartaDate.format(new Date(like.at)));
      if (day) day.likes += 1;
    }

    const notices = user ? data.notifications.filter(notice => notice.user === user.id) : [];
    const recent = user ? notices : published.filter(art => art.publishedAt).map(art => ({
      text: `“${art.title}” diterbitkan`, href: `/artworks/${art.id}`, at: art.publishedAt!, read: true,
    }));
    const grouped = new Map<string, { href: string; text: string; at: string; read: boolean; count: number }>();
    for (const item of recent.toSorted((a, b) => b.at.localeCompare(a.at)).slice(0, 12)) {
      const href = notificationHref(item.href);
      const key = JSON.stringify([href, item.text]);
      const current = grouped.get(key);
      if (current) {
        current.count += 1;
        current.read &&= item.read;
      } else grouped.set(key, { ...item, href, count: 1 });
    }
    return {
      drafts: user ? data.artworks.filter(art => art.owner === user.id && !art.projectId && art.status === "draft").length : 0,
      projects: user ? data.projects.filter(project => project.members.includes(user.id) && !project.publishedId).length : 0,
      unread: notices.filter(notice => !notice.read).length,
      activities: [...grouped.values()],
      days,
    };
  });

  const links = [
    { label: "Ringkasan", href: "/", icon: LayoutGrid },
    { label: "Jelajahi galeri", href: "/art/for-you", icon: Compass },
    { label: "Studio", href: "/studio", icon: FileText },
    { label: "Kolaborasi", href: "/studio/collab", icon: Users },
    { label: "Notifikasi", href: "/notifications", icon: Bell },
    { label: user ? "Profil" : "Masuk", href: profileHref, icon: UserRound },
  ];
  const summaries = [
    { title: "Galeri karya", badge: "Publik", count: catalogCount, hint: "Karya dalam katalog", icon: BiSolidImage, href: "/art/for-you" },
    { title: "Draf karya", badge: "Pribadi", count: drafts, hint: user ? "Draf di Studio" : "Masuk untuk mulai berkarya", icon: BiSolidFile, href: "/studio" },
    { title: "Kolaborasi", badge: "Bersama", count: projects, hint: user ? "Proyek aktif" : "Masuk untuk berkolaborasi", icon: BiSolidGroup, href: "/studio/collab" },
  ];

  return <div className="art-dashboard">
    <aside className="dashboard-sidebar" aria-label="Sidebar Dashboard Art">
      <div className="dashboard-brand-row">
        <Link href="/" className="dashboard-brand">geishara<span>.</span></Link>
      </div>
      <div className="dashboard-sidebar-search"><HeaderSearch/></div>
      <nav className="dashboard-sidebar-links" id="dashboard-sidebar-links" aria-label="Navigasi Dashboard Art">
        {[links.slice(0, 4), links.slice(4)].map((group, index) => <div className="dashboard-nav-group" key={index}>
          {group.map(({ label, href, icon: Icon }) => <Link key={href} href={href} aria-current={href === "/" ? "page" : undefined} title={label}>
            <Icon size={17} aria-hidden="true"/><span>{label}</span><ChevronRight size={13} aria-hidden="true"/>
          </Link>)}
        </div>)}
      </nav>
      <Link href="/studio/artworks/new" className="dashboard-sidebar-upload" aria-label="Unggah karya" title="Unggah karya">
        <Plus size={17}/><span>Unggah karya</span>
      </Link>
    </aside>

    <div className="dashboard-main">
      <section className="dashboard-hero" aria-labelledby="dashboard-greeting">
        <div className="dashboard-ambient" aria-hidden="true"/>
        <div className="dashboard-greeting">
          <div>
            <p>Dashboard Art</p>
            <h1 id="dashboard-greeting">{greeting}{user ? `, ${user.name.trim().split(/\s+/)[0]}` : ""}.</h1>
            <p>{user ? "Kreator geishara" : "Jelajahi karya dan temukan inspirasi."}</p>
          </div>
          <div className="dashboard-greeting-actions">
            <DashboardControls/>
            <NotificationBell signedIn={!!user} initialUnread={unread}/>
            <Link href={profileHref} className="dashboard-profile-link">
              {user?.photo ? <span className="dashboard-avatar" style={{ backgroundImage: `url(/api/profile-photo/${user.photo})` }}/>
                : <UserRound size={16} aria-hidden="true"/>}
              <span>{user ? "Profil" : "Masuk"}</span>
            </Link>
          </div>
        </div>

        <div className="dashboard-summaries" aria-label="Ringkasan dashboard">
          {summaries.map(({ title, badge, count, hint, icon: Icon, href }) => <Link key={title} href={href} className="dashboard-summary">
            <div className="dashboard-summary-top">
              <span className="dashboard-summary-icon"><Icon size={16} aria-hidden="true"/></span>
              <h2>{title}</h2><span className="dashboard-badge">{badge}</span>
            </div>
            <div className="dashboard-summary-bottom">
              <div><strong>{count.toLocaleString("id-ID")}</strong><p>{hint}</p></div>
              <span className="dashboard-open"><span>Buka</span><ArrowUpRight size={12} aria-hidden="true"/></span>
            </div>
          </Link>)}
        </div>
      </section>

      <div className="dashboard-mobile-search"><HeaderSearch/></div>

      <div className="dashboard-panels">
        <section className="dashboard-panel" aria-labelledby="dashboard-chart-title">
          <div className="dashboard-panel-title"><div><h2 id="dashboard-chart-title">{user ? "Aktivitas karyamu" : "Aktivitas galeri"}</h2><p>Karya terbit dan apresiasi</p></div><span className="dashboard-badge">7 hari terakhir</span></div>
          <ActivityChart days={days}/>
        </section>
        <section className="dashboard-panel" aria-labelledby="dashboard-activity-title">
          <div className="dashboard-panel-title">
            <div><h2 id="dashboard-activity-title">Aktivitas terbaru</h2><p>{user ? "Kabar dari komunitasmu" : "Publikasi dari komunitas"}</p></div>
            <Link className="dashboard-all-link" href={user ? "/notifications" : "/art/for-you"}><span>Lihat semua</span><ArrowUpRight size={13}/></Link>
          </div>
          {activities.length ? <ul className="dashboard-activity" tabIndex={0} aria-label="Riwayat aktivitas">
            {activities.map(item => <li key={JSON.stringify([item.href, item.text])}>
              <Link href={item.href}>
                <span className="dashboard-activity-icon"><Bell size={15} aria-hidden="true"/></span>
                <span className="dashboard-activity-copy"><strong>{item.text}</strong><time dateTime={item.at}>{time.format(new Date(item.at))} WIB</time></span>
                {item.count > 1 && <span className="dashboard-badge">{item.count}×</span>}
                {!item.read && <span className="dashboard-unread"><span className="sr-only">Belum dibaca</span></span>}
                <ChevronRight size={14} aria-hidden="true"/>
              </Link>
            </li>)}
          </ul> : <p className="dashboard-empty">{user ? "Belum ada aktivitas baru." : "Belum ada karya komunitas yang terbit."}</p>}
        </section>
      </div>

      {children}
    </div>

  </div>;
}
