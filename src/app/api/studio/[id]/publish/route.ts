import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { publicationErrors, publishWithNotices } from "@/lib/community-model";
import { apiError, sameOrigin } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return apiError("Origin tidak valid.", 403);
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);
  let body;
  try { body = await request.json(); } catch { return apiError("Data tidak valid.", 400); }
  const { id } = await params;
  const result = store(data => {
    const a = data.artworks.find(a => a.id === id && a.owner === user.id);
    if (!a) return apiError("Draf tidak ditemukan.", 404);
    if (a.projectId) return apiError("Karya bersama memerlukan persetujuan kedua anggota melalui workspace.", 403);
    if (a.status === "published") return Response.json({ id: a.id });
    if (a.revision !== body?.revision) return apiError("Versi tinjauan sudah berubah. Muat ulang draf dan tinjau kembali.", 409, "CONFLICT");
    const errors = publicationErrors(a);
    if (errors.length) return apiError(errors.join(" "));
    publishWithNotices(data, a);
    return Response.json({ id: a.id });
  }, true);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
