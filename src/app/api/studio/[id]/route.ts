import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { store, type Store } from "@/lib/collab-store";
import { media, styles, licenses, authoredBy, areMutualFollowers, mutualFollowRequired, type MemberArtwork } from "@/lib/community-model";
import { apiError, sameOrigin } from "@/lib/http";
import { maxDrawingManifestBytes, maxDrawingSheetBytes, parseEditableDrawing } from "@/lib/drawing-document";
type Context = { params: Promise<{ id: string }> };

function canEdit(data: Store, artwork: MemberArtwork) {
  if (!artwork.projectId) return true;
  const project = data.projects.find(item => item.id === artwork.projectId);
  return areMutualFollowers(data.follows, project?.members[0], project?.members[1]);
}

export async function GET(request: Request, { params }: Context) {
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);
  const { id } = await params;
  const drawing = store(data => data.artworks.find(art =>
    art.id === id && art.status === "draft" && art.owner === user.id && !art.projectId)?.drawing);
  if (!drawing || drawing.asset !== new URL(request.url).searchParams.get("v") ||
    !/^[a-f0-9-]{36}\.png$/.test(drawing.asset)) return apiError("Layer tidak ditemukan.", 404);
  try {
    const sheet = await readFile(join(process.cwd(), ".data", "media", drawing.asset));
    return new Response(new Uint8Array(sheet), { headers: {
      "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return apiError("Layer tidak ditemukan.", 404);
  }
}

export async function PUT(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return apiError("Origin tidak valid.", 403);
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return apiError("ID draf tidak valid.", 400);
  if (Number(request.headers.get("content-length")) > 30000) return apiError("Metadata terlalu besar.", 413);
  let input;
  try { input = await request.json(); } catch { return apiError("Data tidak valid.", 400); }
  if (!input || typeof input !== "object") return apiError("Data tidak valid.", 400);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const selected = Array.isArray(input.styles) ? [...new Set(input.styles)].filter((s): s is string => typeof s === "string") : [];
  if (title.length > 120 || description.length > 5000 || selected.length > 5 || selected.some(s => !styles.includes(s)) || (input.medium && !media.includes(input.medium)) || (input.license && !licenses.includes(input.license)) || (input.era && !["Modern", "Klasik", "Kontemporer"].includes(input.era))) return apiError("Periksa panjang isian dan pilihan metadata.");
  const result = store(data => {
    let artwork = data.artworks.find(a => a.id === id);
    if (artwork && !authoredBy(artwork,user.id)) return apiError("Draf tidak ditemukan.", 404);
    if (artwork && !canEdit(data, artwork)) return apiError(mutualFollowRequired, 403);
    if (artwork?.projectId && input.license !== artwork.license) return apiError("Lisensi mengikuti kesepakatan proyek dan tidak dapat diubah sepihak.", 422);
    if (artwork?.status === "published") return apiError("Karya sudah diterbitkan.", 409);
    if ((artwork?.revision ?? 0) !== input.revision) return apiError("Draf berubah di tab lain. Muat ulang sebelum melanjutkan; isianmu masih ada di halaman ini.", 409, "CONFLICT");
    const now = new Date().toISOString();
    if (!artwork) {
      artwork = { id, owner: user.id, title: "", description: "", medium: "", styles: [], era: "", license: "", colors: [], status: "draft", revision: 0, createdAt: now, updatedAt: now } satisfies MemberArtwork;
      data.artworks.push(artwork);
    }
    Object.assign(artwork, { title, description, medium: input.medium || "", styles: selected, era: input.era || "", license: input.license || "", updatedAt: now, revision: artwork.revision + 1 });
    return Response.json({ artwork });
  }, true);
  return result;
}

export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return apiError("Origin tidak valid.", 403);
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);
  const { id } = await params;
  if (Number(request.headers.get("content-length")) > maxDrawingSheetBytes + maxDrawingManifestBytes + 21 * 1024 * 1024) return apiError("Unggahan terlalu besar.", 413);
  const creating = new URL(request.url).searchParams.get("create") === "1";
  if (creating && !/^[a-f0-9-]{36}$/.test(id)) return apiError("ID draf tidak valid.", 400);
  const access = store(data => {
    const artwork = data.artworks.find(a => a.id === id);
    if (!artwork) return creating ? null : apiError("Draf tidak ditemukan.", 404);
    if (!authoredBy(artwork, user.id)) return apiError("Draf tidak ditemukan.", 404);
    if (creating || artwork.status !== "draft") return apiError("Draf telah berubah.", 409, "CONFLICT");
    return canEdit(data, artwork) ? null : apiError(mutualFollowRequired, 403);
  });
  if (access) return access;
  let form;
  try { form = await request.formData(); } catch { return apiError("Unggahan tidak valid.", 400); }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024) return apiError("Gambar wajib diisi, maksimal 20 MB.", 413);
  const revision = Number(form.get("revision"));
  const canvasVersion = form.get("canvasVersion");
  if (creating && form.get("revision") !== "0") return apiError("Versi awal draf tidak valid.", 400);
  const manifest = form.get("drawing");
  const layerFile = form.get("layers");
  const drawing = typeof manifest === "string" ? parseEditableDrawing(manifest) : null;
  if ((manifest !== null || layerFile !== null) && (!drawing || !(layerFile instanceof File) || layerFile.type !== "image/png" || !layerFile.size)) {
    return apiError("Dokumen layer tidak valid.", 422);
  }
  if (layerFile instanceof File && layerFile.size > maxDrawingSheetBytes) return apiError("Dokumen layer maksimal 32 MB.", 413);
  let encoded: Buffer; let colors: string[]; let width: number; let height: number;
  let sheet: Buffer | undefined;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, { limitInputPixels: 40_000_000, animated: false }).metadata();
    const mime = ( { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[metadata.format ?? ""];
    if (!mime || file.type !== mime || (metadata.pages ?? 1) > 1) return apiError("Isi gambar harus PNG, JPG, atau WEBP statis sesuai tipe file.", 415);
    const image = await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
    encoded = image.data; width = image.info.width; height = image.info.height;
    if (drawing && layerFile instanceof File) {
      const layerImage = sharp(Buffer.from(await layerFile.arrayBuffer()));
      const meta = await layerImage.metadata();
      if (width !== drawing.width || height !== drawing.height || meta.format !== "png" ||
        meta.width !== width || meta.height !== height * drawing.layers.length || (meta.pages ?? 1) > 1) {
        return apiError("Ukuran layer tidak cocok dengan kanvas.", 422);
      }
      sheet = await layerImage.ensureAlpha().png().toBuffer();
    }
    const { data: pixels, info } = await sharp(encoded).resize(80, 80, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const histogram = new Map<string, number>();
    for (let i = 0; i < pixels.length; i += info.channels) {
      if (pixels[i + 3] < 128) continue;
      const color = `#${[pixels[i], pixels[i + 1], pixels[i + 2]].map(n => (Math.round(n / 51) * 51).toString(16).padStart(2, "0")).join("")}`;
      histogram.set(color, (histogram.get(color) ?? 0) + 1);
    }
    colors = [...histogram].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([color]) => color);
  } catch { return apiError("Gambar rusak atau melebihi batas 40 megapiksel.", 415); }
  const asset = `${randomUUID()}.webp`;
  const layerAsset = drawing && sheet ? `${randomUUID()}.png` : undefined;
  const directory = join(process.cwd(), ".data", "media");
  await mkdir(directory, { recursive: true });
  let committed = false;
  let oldLayerAsset: string | undefined;
  try {
    await writeFile(join(directory, asset), encoded);
    if (layerAsset && sheet) await writeFile(join(directory, layerAsset), sheet);
    const result = store(data => {
      let artwork = data.artworks.find(a => a.id === id);
      if (creating && !artwork) {
        const now = new Date().toISOString();
        artwork = { id, owner: user.id, title: "", description: "", medium: "", styles: [], era: "", license: "", colors: [], status: "draft", revision: 0, createdAt: now, updatedAt: now };
        data.artworks.push(artwork);
      } else if (creating || !artwork || !authoredBy(artwork, user.id) || artwork.status !== "draft" || artwork.revision !== revision) {
        return apiError("Draf telah berubah. Muat ulang sebelum mengganti gambar.", 409, "CONFLICT");
      }
      if (!canEdit(data, artwork)) return apiError(mutualFollowRequired, 403);
      if (drawing && (artwork.projectId || artwork.owner !== user.id)) return apiError("Layer hanya tersedia untuk draf pribadi.", 403);
      const project = data.projects.find(item => item.id === artwork.projectId);
      const shared = project?.canvas;
      if (shared && canvasVersion !== String(shared.version)) return apiError("Kanvas bersama berubah. Simpan gambar dari kanvas proyek setelah sinkronisasi.", 409, "CONFLICT");
      if (project && shared) {
        shared.finalVersion = shared.version;
        project.approvals = [];
      }
      oldLayerAsset = artwork.drawing?.asset;
      artwork.drawing = drawing && layerAsset ? { ...drawing, asset: layerAsset } : undefined;
      Object.assign(artwork, { asset, width, height, colors, revision: artwork.revision + 1, updatedAt: new Date().toISOString() });
      return Response.json({ artwork });
    }, true);
    committed = result.ok;
    return result;
  } finally {
    const obsolete = committed ? [oldLayerAsset] : [asset, layerAsset];
    await Promise.allSettled(obsolete.filter((name): name is string => !!name && /^[a-f0-9-]{36}\.(png|webp)$/.test(name))
      .map(name => unlink(join(directory, name))));
  }
}
