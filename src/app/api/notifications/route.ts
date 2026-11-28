import { isCollabRequestHref, notificationHref } from "@/lib/community-model";
import { currentUser } from "@/lib/auth";
import { store } from "@/lib/collab-store";
import { apiError } from "@/lib/http";

export async function GET() {
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);

  const summary = store(data => {
    const unread = data.notifications.filter(notice => notice.user === user.id && !notice.read);
    const invite = unread.findLast(notice => isCollabRequestHref(notificationHref(notice.href)));
    const follow = unread.findLast(notice => notice.kind === "follow");
    const publication = unread.findLast(notice => notice.kind === "publication");
    return {
      unread: unread.length,
      invite: invite ? { id: invite.id, text: invite.text, href: notificationHref(invite.href) } : null,
      follow: follow ? { id: follow.id, text: follow.text, href: follow.href } : null,
      publication: publication ? { id: publication.id, text: publication.text, href: publication.href } : null,
    };
  });

  return Response.json(summary, { headers: { "Cache-Control": "private, no-store" } });
}
