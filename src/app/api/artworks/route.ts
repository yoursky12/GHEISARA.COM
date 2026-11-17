import { filterArtworks, type Query } from "@/lib/catalog";
import { feedArtworks } from "@/lib/community";
import { currentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query: Query = {};
  for (const key of ["q", "era", "medium", "style", "sort", "license"]) query[key] = params.getAll(key);
  const cursor = params.get("cursor") ?? "0";
  const limitValue = params.get("limit") ?? "20";
  if (!/^\d+$/.test(cursor) || !/^\d+$/.test(limitValue) || !Number.isSafeInteger(Number(cursor)) || !Number.isSafeInteger(Number(limitValue))) {
    return Response.json({ code: "INVALID_PAGINATION", message: "Parameter pagination tidak valid.", requestId: crypto.randomUUID() }, { status: 400 });
  }
  const offset = Number(cursor);
  const limit = Math.min(50, Math.max(1, Number(limitValue)));
  const feed = params.get("feed") ?? "for-you";
  const user = feed === "following" ? await currentUser() : null;
  if (feed === "popular") delete query.sort;
  const all = filterArtworks(query, feedArtworks(feed, user?.id, params.get("period") ?? "all"));
  const items = all.slice(offset, offset + limit);
  return Response.json({ items, total: all.length, nextCursor: offset + limit < all.length ? String(offset + limit) : null, dataMode: "community-and-study" });
}
