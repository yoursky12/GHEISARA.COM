import { publicationErrors, type MemberArtwork } from "./community-model";
import type { Project } from "./collab-store";
import { canvasNeedsSave } from "./shared-canvas";
export function approveCandidate(project: Project, candidate: MemberArtwork | undefined, user: string, revision: number) {
  if (!project.members.includes(user)) return "Proyek tidak ditemukan.";
  if (canvasNeedsSave(project.canvas)) return "Simpan gambar terbaru dari kanvas sebelum meminta persetujuan.";
  if (!candidate || candidate.id !== project.candidateId || candidate.projectId !== project.id || candidate.revision !== revision || candidate.status !== "draft") return "Versi final berubah. Muat ulang dan tinjau lagi.";
  const errors = publicationErrors(candidate); if (errors.length) return errors.join(" ");
  project.approvals ??= [];
  project.approvals = project.approvals.filter(a => a.user !== user);
  project.approvals.push({ user, candidateId: candidate.id, revision, at: new Date().toISOString() });
  return "";
}
export function canPublishTogether(project: Project, candidate: MemberArtwork | undefined) {
  if (canvasNeedsSave(project.canvas)) return false;
  if (!candidate || candidate.projectId !== project.id || candidate.id !== project.candidateId || publicationErrors(candidate).length) return false;
  if (project.members.length !== 2 || new Set(project.members).size !== 2 || candidate.coauthors?.length !== 2 || project.members.some(id => !candidate.coauthors?.includes(id))) return false;
  return project.members.every(user => project.approvals?.some(a => a.user === user && a.candidateId === candidate.id && a.revision === candidate.revision));
}
