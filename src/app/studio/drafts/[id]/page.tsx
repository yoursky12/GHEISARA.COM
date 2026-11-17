import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { ArtworkEditor } from "@/components/artwork-editor";
import { authoredBy } from "@/lib/community-model";
export default async function Draft({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) redirect("/auth/login");
  const { id } = await params;
  const artwork = store(d => d.artworks.find(a => a.id === id && authoredBy(a,user.id)));
  if (!artwork) notFound();
  if (artwork.status === "published") redirect(`/artworks/${id}`);
  return <ArtworkEditor initial={artwork}/>;
}
