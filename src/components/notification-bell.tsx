"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BiBell as Bell, BiX as X } from "react-icons/bi";

type PopupNotice = { id: string; text: string; href: string };
const noticeLabels = {
  invite: { title: "Pengajuan kolaborasi", action: "Lihat pengajuan kolaborasi" },
  follow: { title: "Pengikut baru", action: "Lihat profil" },
  publication: { title: "Karya terbit", action: "Lihat karya" },
};
type NoticeKind = keyof typeof noticeLabels;
type NotificationSummary = { unread: number } & Record<NoticeKind, PopupNotice | null>;
const noticeOrder = ["invite", "follow", "publication"] as const;

export function NotificationBell({ signedIn, initialUnread }: { signedIn: boolean; initialUnread: number }) {
  const path = usePathname();
  const [snapshot, setSnapshot] = useState({ baseline: initialUnread, unread: initialUnread });
  const [announcement, setAnnouncement] = useState<(PopupNotice & { kind: NoticeKind }) | null>(null);
  const lastNotices = useRef<NotificationSummary | null>(null);
  const unread = snapshot.baseline === initialUnread ? snapshot.unread : initialUnread;

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const summary: NotificationSummary = await response.json();
        if (controller.signal.aborted) return;
        setSnapshot({ baseline: initialUnread, unread: summary.unread });
        const last = lastNotices.current;
        const kind = last && noticeOrder.find(kind => summary[kind] && summary[kind]?.id !== last[kind]?.id);
        if (kind && summary[kind]) {
          setAnnouncement({ ...summary[kind], kind });
        }
        lastNotices.current = summary;
      } catch {
        // A later refresh retries after a temporary network failure.
      } finally {
        pending = false;
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 8000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initialUnread, path, signedIn]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(null), 12000);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  return <>
    <Link href="/notifications" className="icon-button notification"
      aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}>
      <Bell size={20}/>
      {unread > 0 && <span className="unread-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
    </Link>
    <div className="notification-popups" aria-live="polite">
      {announcement && <div className="notification-popup">
        <div>
          <strong>{noticeLabels[announcement.kind].title}</strong>
          <p>{announcement.text}</p>
          <Link href={announcement.href} className={announcement.kind === "invite" ? "button primary notification-action" : "text-link"} onNavigate={() => setAnnouncement(null)}>
            {noticeLabels[announcement.kind].action}
          </Link>
        </div>
        <button type="button" className="icon-button" aria-label="Tutup pemberitahuan" onClick={() => setAnnouncement(null)}><X size={17}/></button>
      </div>}
    </div>
  </>;
}
