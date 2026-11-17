import { publicArtworks } from "@/lib/community";
import { filterArtworks } from "@/lib/catalog";
import { store } from "@/lib/collab-store";
import { usernameOf } from "@/lib/community";
export function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0,120);
  if (q.length < 2) return Response.json({ artworks: [], creators: [] });
  const creators = store(d => d.users.filter(u => `${u.name} ${usernameOf(u)}`.toLocaleLowerCase("id").includes(q.toLocaleLowerCase("id"))).slice(0,4).map(u => ({ name:u.name, username:usernameOf(u) })));
  return Response.json({ artworks: filterArtworks({q},publicArtworks()).slice(0,4).map(a => ({ id:a.id,title:a.title,artist:a.artist })), creators });
}
