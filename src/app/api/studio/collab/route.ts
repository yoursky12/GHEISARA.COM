import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { areMutualFollowers } from "@/lib/community-model";
import { apiError } from "@/lib/http";

export async function GET() {
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);

  const inbox = store(data => {
    const names = new Map(data.users.map(account => [account.id, account.name]));
    const friends = data.users.filter(account => areMutualFollowers(data.follows, user.id, account.id))
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
    const projects = new Map(data.projects.filter(project => project.members.includes(user.id))
      .map(project => [project.invitation, project.id]));
    const invitations = data.invitations.filter(invite => invite.sender === user.id || invite.recipient === user.id)
      .toReversed().map(invite => {
        const incoming = invite.recipient === user.id;
        const partnerId = incoming ? invite.sender : invite.recipient;
        return {
          id: invite.id, type: invite.type, deadline: invite.deadline, license: invite.license,
          idea: invite.idea, status: invite.status, incoming, partnerId,
          canvasTitle: invite.canvas ? invite.canvas.title || "Karya tanpa judul" : undefined,
          partnerName: names.get(partnerId) ?? "Kreator",
          canAccept: incoming && areMutualFollowers(data.follows, user.id, partnerId),
          projectId: projects.get(invite.id),
        };
      });
    return { friends, invitations };
  });

  return Response.json(inbox, { headers: { "Cache-Control": "private, no-store" } });
}
