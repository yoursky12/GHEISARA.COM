import "server-only";
import { createHash } from "node:crypto";
import { artworks, type Artwork } from "./catalog";
import { store, type Store, type User } from "./collab-store";
import type { MemberArtwork } from "./community-model";
import { periodStart, authoredBy } from "./community-model";
export const usernameOf = (user: User) => user.username ?? `kreator_${createHash("sha256").update(user.id).digest("hex").slice(0, 12)}`;
export const imageOf = (a: Artwork) => a.image.startsWith("/") ? a.image : `/art/${a.image}.jpg`;
export function personalDrafts(userId: string) {
  return store(data => data.artworks
    .filter(art => art.owner === userId && art.status === "draft" && !art.projectId)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)));
}
export function memberCard(a: MemberArtwork, data: Store): Artwork {
  const user = data.users.find(u => u.id === a.owner)!;
  const creators = data.users.filter(u => authoredBy(a,u.id)).map(u => ({ name: u.name, username: usernameOf(u) }));
  return { id: a.id, title: a.title, description: a.description, artist: creators.map(c => c.name).join(" & "), username: usernameOf(user), creators, projectId: a.projectId, year: a.publishedAt?.slice(0, 4) ?? "", medium: a.medium, style: a.styles.join(", "), styles: a.styles, era: a.era, image: `/api/media/${a.id}?v=${a.revision}`, colors: a.colors, source: a.projectId ? "Karya kolaborasi" : "Karya kreator", license: a.license, publishedAt: a.publishedAt, member: true };
}
export function publicArtworks() {
  return store(data => [...data.artworks.filter(a => a.status === "published").sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).map(a => memberCard(a, data)), ...artworks].map(a => ({ ...a, appreciations:data.appreciations.filter(l => l.artwork === a.id).length })));
}
export function artworkExists(data: Store, id: string) {
  return artworks.some(a => a.id === id) || data.artworks.some(a => a.id === id && a.status === "published");
}
export function feedArtworks(feed: string, userId?: string, period = "all") {
  const all = publicArtworks();
  return store(data => {
    if (feed === "following") {
      const usernames = data.users.filter(u => data.follows.some(f => f.user === userId && f.creator === u.id)).map(usernameOf);
      return all.filter(a => a.member && (a.creators ?? [{ username:a.username }]).some(c => usernames.includes(c.username)));
    }
    if (feed === "collaborations") return all.filter(a => a.projectId);
    if (feed === "popular") {
      const scores = new Map<string, number>(); const since = periodStart(period);
      data.appreciations.filter(a => Date.parse(a.at) >= since).forEach(a => scores.set(a.artwork, (scores.get(a.artwork) ?? 0) + 1));
      return all.filter(a => scores.has(a.id)).sort((a,b) => (scores.get(b.id)! - scores.get(a.id)!) || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.id.localeCompare(b.id));
    }
    return all;
  });
}
