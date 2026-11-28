import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(asset)) return new Response(null, { status: 404 });

  try {
    const directory = process.env.VERCEL ? "/tmp/.data" : join(process.cwd(), ".data");
    const file = await readFile(join(directory, "profile-photos", asset));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
