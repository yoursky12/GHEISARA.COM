import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, hash, loginDestination, oauthReady } from "@/lib/auth";
import { store } from "@/lib/collab-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const state = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value;
  const redirectUri = jar.get("oauth_redirect_uri")?.value;
  const next = jar.get("oauth_next")?.value;
  jar.delete("oauth_state"); jar.delete("oauth_verifier"); jar.delete("oauth_redirect_uri");
  jar.delete("oauth_next");
  const fail = (reason = "oauth") => NextResponse.redirect(new URL(`/auth/login?error=${reason}${next === "studio" ? "&next=studio" : ""}`, url));
  if (!oauthReady()) return fail("config");
  if (url.searchParams.get("error") === "access_denied") return fail("cancelled");
  if (!state || !verifier || !redirectUri || url.searchParams.get("state") !== state) return fail("session");
  if (!url.searchParams.get("code") || url.searchParams.has("error")) return fail();
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ code: url.searchParams.get("code")!, client_id: process.env.OAUTH_CLIENT_ID!, client_secret: process.env.OAUTH_CLIENT_SECRET!, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }), signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      // Only expose known error codes, never Google's raw response or credentials.
      if (failure?.error === "invalid_client") return fail("credentials");
      if (failure?.error === "invalid_grant") return fail("code");
      if (failure?.error === "redirect_uri_mismatch") return fail("redirect");
      return fail("token");
    }
    const token = await response.json();
    if (typeof token.access_token !== "string") return fail();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!profileResponse.ok) return fail("profile");
    const profile = await profileResponse.json();
    if (typeof profile.sub !== "string" || typeof profile.email !== "string" || profile.email_verified !== true) return fail("profile");
    const session = randomBytes(32).toString("base64url");
    store(data => {
      let user = data.users.find(u => u.id === profile.sub);
      if (!user) { user = { id: profile.sub, name: typeof profile.name === "string" ? profile.name : "Kreator", email: profile.email, open: false }; data.users.push(user); }
      data.sessions = data.sessions.filter(s => s.expires > Date.now());
      data.sessions.push({ hash: hash(session), user: user.id, expires: Date.now() + 7 * 86400000 });
    }, true);
    jar.set("geishara_session", session, { ...cookieOptions, maxAge: 7 * 86400 });
    return NextResponse.redirect(new URL(loginDestination(next), redirectUri));
  } catch { return fail(); }
}
