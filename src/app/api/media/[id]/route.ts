import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { authoredBy } from "@/lib/community-model";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const query = new URL(request.url).searchParams;
  const asset = store(data => {
    const artwork = data.artworks.find(a => a.id === id && (a.status === "published" || (user && authoredBy(a,user.id))));
    if (!artwork) return;
    const base = query.get("canvasBase");
    if (!base) return artwork.asset;
    const project = data.projects.find(item => item.id === artwork.projectId && user && item.members.includes(user.id));
    if (!project || artwork.status !== "draft") return;
    const expected = project.canvas ? project.canvas.baseAsset : artwork.asset;
    if (base === expected) return expected;
  });
  if (!asset || !/^[a-f0-9-]{36}\.webp$/.test(asset)) return new Response(null, { status: 404 });
  try {
    const file = await readFile(join(process.cwd(), ".data", "media", asset));
    const headers: Record<string,string> = { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    if (query.get("download") === "1") headers["Content-Disposition"] = `attachment; filename="geishara-${id}.webp"`;
    return new Response(new Uint8Array(file), { headers });
  } catch { return new Response(null, { status: 404 }); }
}
