import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, oauthReady, oauthRedirectUri } from "@/lib/auth";

export async function GET(request: Request) {
  const fromStudio = new URL(request.url).searchParams.get("next") === "studio";
  const configError = () => NextResponse.redirect(new URL(`/auth/login?error=config${fromStudio ? "&next=studio" : ""}`, request.url));
  if (!oauthReady()) return configError();
  let redirectUri: string;
  try { redirectUri = oauthRedirectUri(request.url); }
  catch { return configError(); }
  // Start on the callback's origin so the browser sends the state cookies back.
  if (new URL(redirectUri).origin !== new URL(request.url).origin) {
    return NextResponse.redirect(new URL(`/api/auth/google${fromStudio ? "?next=studio" : ""}`, redirectUri));
  }
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set("oauth_state", state, { ...cookieOptions, maxAge: 600 });
  jar.set("oauth_verifier", verifier, { ...cookieOptions, maxAge: 600 });
  jar.set("oauth_redirect_uri", redirectUri, { ...cookieOptions, maxAge: 600 });
  if (fromStudio) jar.set("oauth_next", "studio", { ...cookieOptions, maxAge: 600 });
  else jar.delete("oauth_next");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.OAUTH_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", prompt: "select_account" }).toString();
  return NextResponse.redirect(url);
}
