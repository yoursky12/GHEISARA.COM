"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";

export async function deletePersonalDraft(id: string, revision: number) {
  const user = await currentUser();
  if (!user) redirect("/auth/login");

  const assets = store(data => {
    const index = data.artworks.findIndex(art => art.id === id && art.owner === user.id &&
      art.status === "draft" && !art.projectId && art.revision === revision);
    if (index < 0) return null;

    const [draft] = data.artworks.splice(index, 1);
    return [draft.asset, draft.drawing?.asset].filter((name): name is string =>
      !!name && /^[a-f0-9-]{36}\.(png|webp)$/.test(name) &&
      !data.artworks.some(art => art.asset === name || art.drawing?.asset === name) &&
      !data.invitations.some(invite => invite.status === "pending" && invite.canvas?.asset === name) &&
      !data.projects.some(project => project.canvas?.baseAsset === name));
  }, true);

  revalidatePath("/studio", "layout");
  if (!assets) return "Draf sudah berubah atau tidak tersedia. Muat ulang halaman untuk melihat draf terbaru.";

  await Promise.allSettled(assets.map(name => unlink(join(process.cwd(), ".data", "media", name))));
}
