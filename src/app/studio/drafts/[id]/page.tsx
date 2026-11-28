import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { ArtworkEditor } from "@/components/artwork-editor";
import { areMutualFollowers, authoredBy } from "@/lib/community-model";
export default async function Draft({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ canvas?: string }> }) {
  const user = await currentUser(); if (!user) redirect("/auth/login");
  const { id } = await params;
  const { artwork, canEdit } = store(data => {
    const artwork = data.artworks.find(art => art.id === id && authoredBy(art, user.id));
    const project = artwork?.projectId ? data.projects.find(item => item.id === artwork.projectId) : undefined;
    return { artwork, canEdit: !artwork?.projectId || areMutualFollowers(data.follows, project?.members[0], project?.members[1]) };
  });
  if (!artwork) notFound();
  if (artwork.status === "published") redirect(`/artworks/${id}`);
  if (!canEdit) redirect(`/studio/collab/projects/${artwork.projectId}`);
  return <ArtworkEditor initial={artwork} openCanvas={(await searchParams).canvas === "1"}/>;
}
