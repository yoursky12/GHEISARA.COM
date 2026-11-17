import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ArtworkEditor } from "@/components/artwork-editor";
export default async function Upload() {
  const user = await currentUser();
  if (!user) redirect("/auth/login");
  const now = new Date().toISOString();
  return <ArtworkEditor initial={{ id: randomUUID(), owner: user.id, title: "", description: "", medium: "", styles: [], era: "", license: "", status: "draft", revision: 0, colors: [], createdAt: now, updatedAt: now }}/>;
}
