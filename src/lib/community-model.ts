import type { DrawingDocument } from "./drawing-document";
import type { Store } from "./collab-store";

export const media = ["Digital", "Cat minyak", "Cat air", "Akrilik", "Pensil", "Fotografi", "Cetak kayu", "Mixed media"];
export const styles = ["Impresionisme", "Postimpresionisme", "Ukiyo-e", "Realisme", "Abstrak", "Surealisme", "Ilustrasi", "Modern Art"];
export const licenses = ["All rights reserved", "CC BY 4.0", "CC BY-NC 4.0", "CC0"];
export type MemberArtwork = {
  id: string; owner: string; title: string; description: string; medium: string; styles: string[];
  era: string; license: string; status: "draft" | "published"; revision: number;
  asset?: string; colors: string[]; width?: number; height?: number;
  createdAt: string; updatedAt: string; publishedAt?: string;
  projectId?: string; coauthors?: string[];
  drawing?: DrawingDocument;
};
export type Collection = { id: string; owner: string; name: string; artworks: string[] };
export type CommunityComment = { id: string; user: string; artwork: string; text: string; at: string };
export type Notice = { id: string; user: string; text: string; href: string; at: string; read: boolean; kind?: "follow" | "publication" };
export const collabTypes = ["Art Trade", "Lineart × Coloring", "Background × Character", "Style Mashup", "Mentorship"];
export const collabLicenses = ["All rights reserved", "CC BY 4.0", "CC BY-NC 4.0"];
export const authoredBy = (a: MemberArtwork, userId: string) => a.owner === userId || Boolean(a.coauthors?.includes(userId));
export type Follow = { user: string; creator: string };
export function areMutualFollowers(follows: Follow[], first?: string, second?: string) {
  return Boolean(first && second && first !== second
    && follows.some(follow => follow.user === first && follow.creator === second)
    && follows.some(follow => follow.user === second && follow.creator === first));
}

export const mutualFollowRequired = "Kalian harus saling mengikuti untuk berkolaborasi.";

export function publishWithNotices(data: Pick<Store, "users" | "follows" | "notifications">, artwork: MemberArtwork) {
  const at = new Date().toISOString();
  artwork.status = "published";
  artwork.publishedAt = at;
  artwork.updatedAt = at;

  const authors = new Set([artwork.owner, ...(artwork.coauthors ?? [])]);
  const names = data.users.filter(account => authors.has(account.id)).map(account => account.name).join(" & ");
  for (const account of data.users) {
    const isAuthor = authors.has(account.id);
    if (!isAuthor && ![...authors].some(author => areMutualFollowers(data.follows, author, account.id))) continue;
    data.notifications.push({
      id: crypto.randomUUID(), user: account.id, href: `/artworks/${artwork.id}`, at, read: false,
      kind: "publication",
      text: isAuthor ? `Karyamu “${artwork.title}” sudah terbit.` : `${names} menerbitkan karya “${artwork.title}”.`,
    });
  }
}

export function publicationErrors(a: MemberArtwork) {
  return [!a.asset && "Unggah gambar terlebih dahulu.", (!a.title.trim() || a.title.length > 120) && "Judul wajib diisi, maksimal 120 karakter.", a.description.length > 5000 && "Deskripsi maksimal 5.000 karakter.", !media.includes(a.medium) && "Pilih medium yang tersedia.", (!a.styles.length || a.styles.length > 5 || a.styles.some(s => !styles.includes(s))) && "Pilih 1–5 gaya yang tersedia.", !licenses.includes(a.license) && "Pilih lisensi yang tersedia."].filter(Boolean) as string[];
}
export function artDNA(artworks: Pick<MemberArtwork, "status" | "styles" | "colors">[]) {
  const published = artworks.filter(a => a.status === "published");
  const weights = new Map<string, number>();
  const palette = new Map<string, number>();
  for (const a of published) {
    const unique = [...new Set(a.styles)];
    unique.forEach(s => weights.set(s, (weights.get(s) ?? 0) + 1 / unique.length));
    new Set(a.colors).forEach(c => palette.set(c, (palette.get(c) ?? 0) + 1));
  }
  const total = [...weights.values()].reduce((a, b) => a + b, 0);
  const entries = [...weights].map(([style, count]) => ({ style, exact: total ? count / total * 100 : 0, percent: total ? Math.floor(count / total * 100) : 0 }));
  const remaining = 100 - entries.reduce((sum, e) => sum + e.percent, 0);
  entries.sort((a, b) => (b.exact - b.percent) - (a.exact - a.percent) || a.style.localeCompare(b.style));
  if (total) for (let i = 0; i < remaining; i++) entries[i].percent++;
  entries.sort((a, b) => b.percent - a.percent || a.style.localeCompare(b.style));
  return { algorithmVersion: "equal-style-v1", count: published.length, styles: entries, colors: [...palette].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([color]) => color) };
}
export function periodStart(period: string, now = new Date()) {
  const date = new Date(now.getTime() + 7 * 3600000);
  date.setUTCHours(0, 0, 0, 0);
  if (period === "week") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  if (period === "month") date.setUTCDate(1);
  return ["today", "week", "month"].includes(period) ? date.getTime() - 7 * 3600000 : 0;
}

export const collabRequestsPath = "/studio/collab/requests";

export function collabRequestHref(id: string) {
  return collabRequestsPath + "?invitation=" + encodeURIComponent(id);
}

export function notificationHref(href: string) {
  const legacyPrefix = "/studio/collab#ajakan-";
  if (href.startsWith(legacyPrefix)) return collabRequestHref(href.slice(legacyPrefix.length));
  return href === "/studio/collab" ? collabRequestsPath : href;
}

export function isCollabRequestHref(href: string) {
  return href === collabRequestsPath || href.startsWith(collabRequestsPath + "?");
}
