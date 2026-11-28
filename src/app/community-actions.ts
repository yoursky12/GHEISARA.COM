"use server";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { artworkExists, usernameOf } from "@/lib/community";
export async function communityAction(form: FormData) {
  const user = await currentUser(); if (!user) redirect("/auth/login");
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const op = value("operation"); const id = value("id");
  const destination = op === "profile" ? "/studio/profile" : op === "collection" ? "/studio/collections" : op === "follow" ? `/creators/${encodeURIComponent(value("username"))}` : op === "read" ? "/notifications" : `/artworks/${encodeURIComponent(id)}`;
  if (op === "profile") {
    const photo = form.get("photo");
    const profileError = (message: string) => redirect(`${destination}?error=${encodeURIComponent(message)}`);
    let image: Buffer | undefined;
    if (photo instanceof File && photo.size) {
      if (photo.size > 5 * 1024 * 1024) profileError("Foto profil maksimal 5 MB.");
      try {
        const input = sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 32_000_000 });
        const { format, pages } = await input.metadata();
        if (!format || !["jpeg", "png", "webp"].includes(format) || (pages ?? 1) > 1) throw new Error();
        image = await input.rotate().resize(384, 384, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
      } catch {
        profileError("Pilih foto JPG, PNG, atau WebP yang bisa dibuka.");
      }
    }
    const directory = join(process.env.VERCEL ? "/tmp/.data" : join(process.cwd(), ".data"), "profile-photos");
    let asset: string | undefined;
    let previousPhoto: string | undefined;
    let committed = false;
    let error = "";
    try {
      if (image) {
        asset = `${randomUUID()}.webp`;
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, asset), image);
      }
      error = store(data => {
        const username = value("username").toLowerCase();
        if (!/^[a-z0-9_]{3,30}$/.test(username) || /^(claude|vincent|gustave|katsushika|georges|pierre|toulouse)_/.test(username) || value("name").length < 2 || value("name").length > 80 || value("bio").length > 1000 || value("location").length > 100) return "Periksa nama, username (3–30 huruf/angka/underscore), dan panjang bio.";
        if (data.users.some(u => u.id !== user.id && usernameOf(u).toLowerCase() === username)) return "Username sudah digunakan.";
        const website = value("website");
        if (website) { try { const url = new URL(website); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "Tautan harus berupa URL HTTP atau HTTPS."; } catch { return "Tautan tidak valid."; } }
        const account = data.users.find(u => u.id === user.id);
        if (!account) return "Akun tidak ditemukan.";
        if (asset) {
          previousPhoto = account.photo;
          account.photo = asset;
        }
        Object.assign(account, { name: value("name"), username, bio: value("bio"), location: value("location"), website, open: value("open") === "yes" });
        return "";
      }, true);
      committed = !error;
    } catch {
      error = "Profil belum bisa disimpan. Coba lagi.";
    } finally {
      const obsolete = committed ? previousPhoto : asset;
      if (obsolete && /^[a-f0-9-]{36}\.webp$/.test(obsolete)) {
        await unlink(join(directory, obsolete)).catch(() => {});
      }
    }
    if (error) profileError(error);
    revalidatePath("/", "layout");
    redirect(`/creators/${encodeURIComponent(value("username").toLowerCase())}`);
  }
  const error = store(data => {
    if (op === "follow") {
      const creator = data.users.find(u => u.id === id);
      if (!creator || creator.id === user.id) return "Kreator tidak ditemukan atau merupakan akunmu sendiri.";
      const matchesFollow = (follow: { user: string; creator: string }) => follow.user === user.id && follow.creator === id;
      if (value("enabled") !== "yes") {
        data.follows = data.follows.filter(follow => !matchesFollow(follow));
      } else if (!data.follows.some(matchesFollow)) {
        data.follows.push({ user: user.id, creator: id });
        data.notifications.push({
          id: randomUUID(), user: id, kind: "follow", text: `${user.name} mulai mengikutimu.`,
          href: `/creators/${encodeURIComponent(usernameOf(user))}`, at: new Date().toISOString(), read: false,
        });
      }
      return "";
    }
    if (op === "collection") {
      const name = value("name"); if (!name || name.length > 80) return "Nama koleksi wajib diisi, maksimal 80 karakter.";
      if (!data.collections.some(c => c.owner === user.id && c.name.toLowerCase() === name.toLowerCase())) data.collections.push({ id: randomUUID(), owner: user.id, name, artworks: [] });
      return "";
    }
    if (op === "read") { data.notifications.filter(n => n.user === user.id).forEach(n => { n.read = true; }); return ""; }
    if (!artworkExists(data, id)) return "Karya tidak ditemukan.";
    if (op === "like") {
      const existing = data.appreciations.find(a => a.user === user.id && a.artwork === id);
      if (value("enabled") === "yes" && !existing) data.appreciations.push({ user: user.id, artwork: id, at: new Date().toISOString() });
      if (value("enabled") !== "yes") data.appreciations = data.appreciations.filter(a => a !== existing);
      return "";
    }
    if (op === "save") {
      const collection = data.collections.find(c => c.id === value("collection") && c.owner === user.id);
      if (!collection) return "Pilih koleksi milikmu sendiri.";
      collection.artworks = collection.artworks.filter(a => a !== id);
      if (value("enabled") === "yes") collection.artworks.push(id);
      return "";
    }
    if (op === "comment") {
      const text = value("text"); if (!text || text.length > 2000) return "Komentar wajib diisi, maksimal 2.000 karakter.";
      if (data.comments.some(c => c.user === user.id && Date.now() - Date.parse(c.at) < 5000)) return "Tunggu beberapa detik sebelum mengirim komentar lagi.";
      data.comments.push({ id: randomUUID(), user: user.id, artwork: id, text, at: new Date().toISOString() });
      return "";
    }
    if (op === "delete-comment") { data.comments = data.comments.filter(c => !(c.id === value("comment") && c.user === user.id && c.artwork === id)); return ""; }
    return "Tindakan tidak dikenal.";
  }, true);
  revalidatePath("/", "layout");
  redirect(`${destination}${error ? `?error=${encodeURIComponent(error)}` : "?saved=1"}`);
}
