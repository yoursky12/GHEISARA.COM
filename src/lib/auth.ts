import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { store } from "./collab-store";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export const oauthReady = () => Boolean(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET);
export function oauthRedirectUri(requestUrl: string) {
  const configured = process.env.OAUTH_REDIRECT_URI?.trim();
  const url = new URL(configured || "/api/auth/google/callback", requestUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/api/auth/google/callback") {
    throw new Error("Invalid OAUTH_REDIRECT_URI");
  }
  return url.href;
}
export async function currentUser() {
  const token = (await cookies()).get("geishara_session")?.value;
  if (!token) return null;
  return store(data => {
    const session = data.sessions.find(s => s.hash === hash(token) && s.expires > Date.now());
    return session ? data.users.find(u => u.id === session.user) ?? null : null;
  });
}
