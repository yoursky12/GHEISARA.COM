import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { communityAction } from "@/app/community-actions";
import { SubmitButton } from "@/components/submit-button";
export default async function Notifications() {
  const user = await currentUser(); if (!user) redirect("/auth/login");
  const notices = store(d => d.notifications.filter(n => n.user === user.id).sort((a,b) => b.at.localeCompare(a.at)));
  return <div className="page-wrap studio-page"><span className="eyebrow">KABAR DARI RUANG KREATIFMU</span><h1>Notifikasi.</h1><form action={communityAction}><input type="hidden" name="operation" value="read"/><SubmitButton className="button">Tandai semua dibaca</SubmitButton></form><section className="collab-panel">{notices.length ? notices.map(n => <article className="collab-item" key={n.id}><span className="status-badge">{n.read ? "DIBACA" : "BARU"}</span><p>{n.text}</p><time>{new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date(n.at))} WIB</time><p><Link className="text-link" href={n.href}>Buka →</Link></p></article>) : <p>Belum ada kabar baru. Pengajuan dan respons kolaborasi akan muncul di sini.</p>}</section></div>;
}
