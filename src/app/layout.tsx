import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./theme.css";
import "./globals.css";
import "./interface.css";
import { currentUser } from "@/lib/auth";
import { usernameOf } from "@/lib/community";
import { store } from "@/lib/collab-store";
export const metadata: Metadata = {
  title: { default: "geishara — Ruang untuk rasa dan karya", template: "%s | geishara" },
  description: "Temukan karya, kenali kreator, dan jelajahi sudut pandang baru bersama geishara.",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const unread = user ? store(d => d.notifications.filter(n => n.user === user.id && !n.read).length) : 0;
  return <html lang="id"><body><Shell unread={unread} account={user ? { name: user.name, username: usernameOf(user) } : null}>{children}</Shell></body></html>;
}
