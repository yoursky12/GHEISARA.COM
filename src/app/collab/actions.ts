"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { store, type User } from "@/lib/collab-store";
import { approveCandidate, canPublishTogether } from "@/lib/project-domain";
import { areMutualFollowers, collabRequestHref, collabLicenses, collabTypes, mutualFollowRequired, publishWithNotices } from "@/lib/community-model";

function applyMutation(user: User, form: FormData, quickInvite = false) {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const operation = value("operation");
  let next = "";
  const error = store(data => {
    data.notifications ??= []; data.artworks ??= [];
    const notify = (recipient: string, text: string, href: string) => data.notifications.push({ id: randomUUID(), user: recipient, text, href, at: new Date().toISOString(), read: false });
    if (operation === "invite") {
      const recipient = data.users.find(u => u.id === value("recipient") && u.id !== user.id);
      if (recipient && !areMutualFollowers(data.follows, user.id, recipient.id)) return mutualFollowRequired;
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const deadline = quickInvite ? "" : value("deadline");
      const idea = quickInvite ? "" : value("idea");
      const type = quickInvite ? "Kanvas bersama" : value("type");
      const license = quickInvite ? collabLicenses[0] : value("license");
      if (!recipient || (!quickInvite && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !Number.isFinite(Date.parse(deadline)) || new Date(deadline).toISOString().slice(0, 10) !== deadline || deadline <= today || !collabTypes.includes(type) || !collabLicenses.includes(license) || !idea || idea.length > 1000))) return "Pengajuan tidak valid. Pilih kreator tersedia, lengkapi isian, dan gunakan tenggat minimal besok (WIB).";
      const draft = quickInvite ? data.artworks.find(art => art.id === value("draftId") &&
        art.owner === user.id && art.status === "draft" && !art.projectId) : undefined;
      if (quickInvite && (!draft?.asset || String(draft.revision) !== value("draftRevision"))) {
        return "Versi kanvas aktif belum tersedia. Simpan ulang sebelum mengirim ajakan.";
      }
      const canvas = draft?.asset ? {
        asset: draft.asset, title: draft.title, width: draft.width, height: draft.height, colors: draft.colors,
      } : undefined;
      if (data.invitations.some(i => i.sender === user.id && i.recipient === recipient.id && i.status === "pending")) return "Masih ada pengajuan tertunda untuk kreator ini.";
      const id = randomUUID();
      data.invitations.push({ id, sender: user.id, recipient: recipient.id, type, deadline, license, idea, status: "pending", canvas });
      notify(recipient.id, `${user.name} mengajakmu berkolaborasi.`, collabRequestHref(id));
      return "";
    }
    if (["accepted", "rejected", "cancelled"].includes(operation)) {
      const invitation = data.invitations.find(i => i.id === value("id"));
      if (!invitation || (operation === "cancelled" ? invitation.sender !== user.id : invitation.recipient !== user.id)) return "Pengajuan tidak ditemukan.";
      if (invitation.status !== "pending") return "";
      if (operation === "accepted" && !areMutualFollowers(data.follows, invitation.sender, invitation.recipient)) return mutualFollowRequired;
      invitation.status = operation as "accepted" | "rejected" | "cancelled";
      if (operation === "accepted") {
        const projectId = randomUUID();
        const members = [invitation.sender, invitation.recipient];
        const canvas = invitation.canvas;
        const candidateId = canvas ? randomUUID() : undefined;
        if (canvas && candidateId) {
          const now = new Date().toISOString();
          data.artworks.push({
            ...canvas, id: candidateId, owner: invitation.sender, coauthors: members, projectId,
            description: "", medium: "", styles: [], era: "", license: invitation.license,
            status: "draft", revision: 1, createdAt: now, updatedAt: now,
          });
        }
        data.projects.push({
          id: projectId, invitation: invitation.id, members, messages: [], candidateId,
          canvas: canvas ? { baseAsset: canvas.asset, finalVersion: 0, version: 0, strokes: [] } : undefined,
        });
      }
      notify(operation === "cancelled" ? invitation.recipient : invitation.sender, `${user.name} ${operation === "accepted" ? "menerima" : operation === "rejected" ? "menolak" : "membatalkan"} pengajuan kolaborasi.`, collabRequestHref(invitation.id));
      return "";
    }
    if (operation === "message") {
      const project = data.projects.find(p => p.id === value("id") && p.members.includes(user.id));
      if (!project || !value("text") || value("text").length > 2000) return "Pesan tidak valid atau proyek tidak ditemukan.";
      if (value("clientMessageId") && project.messages.some(m => m.author === user.id && m.clientMessageId === value("clientMessageId"))) return "";
      project.messages.push({ id: randomUUID(), author: user.id, text: value("text"), at: new Date().toISOString(), clientMessageId: value("clientMessageId") || undefined });
      project.members.filter(id => id !== user.id).forEach(id => notify(id, `${user.name} mengirim pesan di proyek kolaborasi.`, `/studio/collab/projects/${project.id}`));
      return "";
    }
    if (["candidate", "progress", "approve", "publish"].includes(operation)) {
      const project = data.projects.find(p => p.id === value("id") && p.members.includes(user.id));
      if (!project) return "Proyek tidak ditemukan.";
      if (project.publishedId) { next = `/artworks/${project.publishedId}`; return ""; }
      if (!areMutualFollowers(data.follows, project.members[0], project.members[1])) return mutualFollowRequired;
      const candidate = data.artworks.find(a => a.id === project.candidateId);
      if (operation === "progress") {
        const progress = Number(value("progress"));
        if (!/^\d{1,3}$/.test(value("progress")) || progress < 0 || progress > 100) return "Progres harus 0–100%.";
        project.progress = progress; project.history ??= [];
        project.history.push({ user: user.id, progress, at: new Date().toISOString() });
        return "";
      }
      if (operation === "candidate") {
        const destination = (id: string) => value("workspace") === "1"
          ? `/studio/collab/projects/${project.id}`
          : `/studio/drafts/${id}`;
        if (candidate) { next = destination(candidate.id); return ""; }
        const invitation = data.invitations.find(i => i.id === project.invitation)!;
        const now = new Date().toISOString(); const id = randomUUID();
        data.artworks.push({ id, owner: user.id, coauthors: [...project.members], projectId: project.id, title: "", description: "", medium: "", styles: [], era: "", license: invitation.license, status: "draft", revision: 1, colors: [], createdAt: now, updatedAt: now });
        project.candidateId = id; project.approvals = []; next = destination(id);
        return "";
      }
      if (operation === "approve") {
        const error = approveCandidate(project, candidate, user.id, Number(value("revision")));
        if (!error) project.members.filter(id => id !== user.id).forEach(id => notify(id, `${user.name} menyetujui versi final kolaborasi.`, `/studio/collab/projects/${project.id}`));
        return error;
      }
      if (!canPublishTogether(project, candidate) || !candidate) return "Publikasi memerlukan final lengkap dan persetujuan kedua anggota pada versi yang sama.";
      publishWithNotices(data, candidate);
      project.publishedId = candidate.id; project.progress = 100;
      next = `/artworks/${candidate.id}`;
      return "";
    }
    return "Tindakan tidak dikenal.";
  }, true);
  return { error, next };
}

export async function mutate(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const { error, next } = applyMutation(user, form);
  revalidatePath("/", "layout");
  if (error) redirect(`/studio/collab?error=${encodeURIComponent(error)}`);
  if (next) redirect(next);
}

export async function mutateCollabInbox(form: FormData) {
  const user = await currentUser();
  if (!user) return { error: "Silakan masuk kembali." };
  if (!["invite", "accepted", "rejected", "cancelled"].includes(String(form.get("operation")))) {
    return { error: "Tindakan tidak dikenal." };
  }
  const { error } = applyMutation(user, form, true);
  return { error };
}

export async function respondToCollabRequest(id: string, form: FormData) {
  if (!["accepted", "rejected", "cancelled"].includes(String(form.get("operation")))) {
    redirect(collabRequestHref(id));
  }
  form.set("id", id);
  const { error } = await mutateCollabInbox(form);
  revalidatePath("/", "layout");
  const href = collabRequestHref(id);
  redirect(error ? href + "&error=" + encodeURIComponent(error) : href);
}
