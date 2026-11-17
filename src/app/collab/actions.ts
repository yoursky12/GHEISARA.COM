"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { approveCandidate, canPublishTogether } from "@/lib/project-domain";

export async function mutate(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const operation = value("operation");
  let next = "";
  const error = store(data => {
    data.notifications ??= []; data.artworks ??= [];
    const notify = (recipient: string, text: string, href: string) => data.notifications.push({ id: randomUUID(), user: recipient, text, href, at: new Date().toISOString(), read: false });
    if (operation === "availability") {
      data.users.find(u => u.id === user.id)!.open = value("open") === "yes";
      return "";
    }
    if (operation === "invite") {
      const recipient = data.users.find(u => u.id === value("recipient") && u.open && u.id !== user.id);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const deadline = value("deadline");
      if (!recipient || !/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !Number.isFinite(Date.parse(deadline)) || new Date(deadline).toISOString().slice(0, 10) !== deadline || deadline <= today || !["Art Trade", "Lineart × Coloring", "Background × Character", "Style Mashup", "Mentorship"].includes(value("type")) || !["All rights reserved", "CC BY 4.0", "CC BY-NC 4.0"].includes(value("license")) || !value("idea") || value("idea").length > 1000) return "Pengajuan tidak valid. Pilih kreator tersedia, lengkapi isian, dan gunakan tenggat minimal besok (WIB).";
      if (data.invitations.some(i => i.sender === user.id && i.recipient === recipient.id && i.status === "pending")) return "Masih ada pengajuan tertunda untuk kreator ini.";
      data.invitations.push({ id: randomUUID(), sender: user.id, recipient: recipient.id, type: value("type"), deadline, license: value("license"), idea: value("idea"), status: "pending" });
      notify(recipient.id, `${user.name} mengirim pengajuan kolaborasi.`, "/collab");
      return "";
    }
    if (["accepted", "rejected", "cancelled"].includes(operation)) {
      const invitation = data.invitations.find(i => i.id === value("id"));
      if (!invitation || (operation === "cancelled" ? invitation.sender !== user.id : invitation.recipient !== user.id)) return "Pengajuan tidak ditemukan.";
      if (invitation.status !== "pending") return "";
      invitation.status = operation as "accepted" | "rejected" | "cancelled";
      if (operation === "accepted") data.projects.push({ id: randomUUID(), invitation: invitation.id, members: [invitation.sender, invitation.recipient], messages: [] });
      notify(operation === "cancelled" ? invitation.recipient : invitation.sender, `${user.name} ${operation === "accepted" ? "menerima" : operation === "rejected" ? "menolak" : "membatalkan"} pengajuan kolaborasi.`, "/collab");
      return "";
    }
    if (operation === "message") {
      const project = data.projects.find(p => p.id === value("id") && p.members.includes(user.id));
      if (!project || !value("text") || value("text").length > 2000) return "Pesan tidak valid atau proyek tidak ditemukan.";
      if (value("clientMessageId") && project.messages.some(m => m.author === user.id && m.clientMessageId === value("clientMessageId"))) return "";
      project.messages.push({ id: randomUUID(), author: user.id, text: value("text"), at: new Date().toISOString(), clientMessageId: value("clientMessageId") || undefined });
      project.members.filter(id => id !== user.id).forEach(id => notify(id, `${user.name} mengirim pesan di proyek kolaborasi.`, `/collab/projects/${project.id}`));
      return "";
    }
    if (["candidate", "progress", "approve", "publish"].includes(operation)) {
      const project = data.projects.find(p => p.id === value("id") && p.members.includes(user.id));
      if (!project) return "Proyek tidak ditemukan.";
      if (project.publishedId) { next = `/artworks/${project.publishedId}`; return ""; }
      const candidate = data.artworks.find(a => a.id === project.candidateId);
      if (operation === "progress") {
        const progress = Number(value("progress"));
        if (!/^\d{1,3}$/.test(value("progress")) || progress < 0 || progress > 100) return "Progres harus 0–100%.";
        project.progress = progress; project.history ??= [];
        project.history.push({ user: user.id, progress, at: new Date().toISOString() });
        return "";
      }
      if (operation === "candidate") {
        if (candidate) { next = `/studio/drafts/${candidate.id}`; return ""; }
        const invitation = data.invitations.find(i => i.id === project.invitation)!;
        const now = new Date().toISOString(); const id = randomUUID();
        data.artworks.push({ id, owner: user.id, coauthors: [...project.members], projectId: project.id, title: "", description: "", medium: "", styles: [], era: "", license: invitation.license, status: "draft", revision: 1, colors: [], createdAt: now, updatedAt: now });
        project.candidateId = id; project.approvals = []; next = `/studio/drafts/${id}`;
        return "";
      }
      if (operation === "approve") {
        const error = approveCandidate(project, candidate, user.id, Number(value("revision")));
        if (!error) project.members.filter(id => id !== user.id).forEach(id => notify(id, `${user.name} menyetujui versi final kolaborasi.`, `/collab/projects/${project.id}`));
        return error;
      }
      if (!canPublishTogether(project, candidate) || !candidate) return "Publikasi memerlukan final lengkap dan persetujuan kedua anggota pada versi yang sama.";
      candidate.status = "published"; candidate.publishedAt = new Date().toISOString(); candidate.updatedAt = candidate.publishedAt;
      project.publishedId = candidate.id; project.progress = 100;
      project.members.forEach(id => notify(id, "Karya kolaborasi kalian telah diterbitkan.", `/artworks/${candidate.id}`));
      next = `/artworks/${candidate.id}`;
      return "";
    }
    return "Tindakan tidak dikenal.";
  }, true);
  revalidatePath("/", "layout");
  if (error) redirect(`/collab?error=${encodeURIComponent(error)}`);
  if (next) redirect(next);
}
