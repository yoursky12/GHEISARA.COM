"use server";
import { randomUUID } from "node:crypto";
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
  const error = store(data => {
    if (op === "profile") {
      const username = value("username").toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(username) || /^(claude|vincent|gustave|katsushika|georges|pierre|toulouse)_/.test(username) || value("name").length < 2 || value("name").length > 80 || value("bio").length > 1000 || value("location").length > 100) return "Periksa nama, username (3–30 huruf/angka/underscore), dan panjang bio.";
      if (data.users.some(u => u.id !== user.id && usernameOf(u).toLowerCase() === username)) return "Username sudah digunakan.";
      const website = value("website");
      if (website) { try { const url = new URL(website); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "Tautan harus berupa URL HTTP atau HTTPS."; } catch { return "Tautan tidak valid."; } }
      Object.assign(data.users.find(u => u.id === user.id)!, { name: value("name"), username, bio: value("bio"), location: value("location"), website, open: value("open") === "yes" });
      return "";
    }
    if (op === "follow") {
      const creator = data.users.find(u => u.id === id);
      if (!creator || creator.id === user.id) return "Kreator tidak ditemukan atau merupakan akunmu sendiri.";
      data.follows = data.follows.filter(f => !(f.user === user.id && f.creator === id));
      if (value("enabled") === "yes") data.follows.push({ user: user.id, creator: id });
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
