import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { authoredBy } from "@/lib/community-model";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const a = store(data => data.artworks.find(a => a.id === id && (a.status === "published" || (user && authoredBy(a,user.id)))));
  if (!a?.asset || !/^[a-f0-9-]{36}\.webp$/.test(a.asset)) return new Response(null, { status: 404 });
  try {
    const file = await readFile(join(process.cwd(), ".data", "media", a.asset));
    const headers: Record<string,string> = { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    if (new URL(request.url).searchParams.get("download") === "1") headers["Content-Disposition"] = `attachment; filename="gheisara-${a.id}.webp"`;
    return new Response(new Uint8Array(file), { headers });
  } catch { return new Response(null, { status: 404 }); }
}
