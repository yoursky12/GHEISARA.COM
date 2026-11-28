"use server";

import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";

export async function renameStudioDraft(id: string, revision: number, title: string) {
  const user = await currentUser();
  if (!user) return { error: "Silakan masuk kembali." };
  const name = typeof title === "string" ? title.trim() : "";
  if (!/^[a-f0-9-]{36}$/.test(id) || !Number.isSafeInteger(revision) || revision < 0 || !name || name.length > 120) {
    return { error: "Judul wajib diisi, maksimal 120 karakter." };
  }
  return store(data => {
    const artwork = data.artworks.find(item => item.id === id);
    if (artwork && (artwork.owner !== user.id || artwork.status !== "draft" || artwork.projectId)) {
      return { error: "Draf tidak ditemukan." };
    }
    if ((artwork?.revision ?? 0) !== revision) return { error: "Draf sudah berubah. Coba simpan judul lagi." };
    const now = new Date().toISOString();
    if (artwork) {
      if (artwork.title !== name) Object.assign(artwork, { title: name, revision: revision + 1, updatedAt: now });
    } else {
      data.artworks.push({ id, owner: user.id, title: name, status: "draft", revision: 1,
        createdAt: now, updatedAt: now, description: "", medium: "", styles: [], era: "", license: "", colors: [] });
    }
    return { error: "" };
  }, true);
}
