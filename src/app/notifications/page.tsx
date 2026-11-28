import { isCollabRequestHref, notificationHref } from "@/lib/community-model";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { communityAction } from "@/app/community-actions";
import { SubmitButton } from "@/components/submit-button";

const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
});

export default async function Notifications() {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const notices = store(d => d.notifications.filter(n => n.user === user.id).sort((a,b) => b.at.localeCompare(a.at)));
  return <div className="page-wrap studio-page notifications-page">
    <header className="notifications-heading">
      <div>
        <span className="eyebrow">KABAR DARI RUANG KREATIFMU</span>
        <h1>Notifikasi.</h1>
      </div>
      <form action={communityAction}>
        <input type="hidden" name="operation" value="read"/>
        <SubmitButton className="button">Tandai semua dibaca</SubmitButton>
      </form>
    </header>
    <section className="collab-panel notifications-list" aria-label="Daftar notifikasi" tabIndex={notices.length ? 0 : undefined}>
      {notices.length ? notices.map(n => {
        const href = notificationHref(n.href);
        const isRequest = isCollabRequestHref(href);
        return <article className="collab-item" key={n.id}>
          <span className="status-badge">{n.read ? "DIBACA" : "BARU"}</span>
          <p>{n.text}</p>
          <time dateTime={n.at}>{dateTime.format(new Date(n.at))} WIB</time>
          <p><Link className={isRequest ? "button primary notification-action" : "text-link"} href={href}>
            {isRequest ? "Lihat pengajuan kolaborasi" : n.kind === "publication" ? "Lihat karya" : "Buka"}
          </Link></p>
        </article>;
      }) : <p>Belum ada kabar baru.</p>}
    </section>
  </div>;
}
