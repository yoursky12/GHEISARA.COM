import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, oauthReady, oauthRedirectUri } from "@/lib/auth";

export async function GET(request: Request) {
  if (!oauthReady()) return NextResponse.redirect(new URL("/auth/login?error=config", request.url));
  let redirectUri: string;
  try { redirectUri = oauthRedirectUri(request.url); }
  catch { return NextResponse.redirect(new URL("/auth/login?error=config", request.url)); }
  // Start on the callback's origin so the browser sends the state cookies back.
  if (new URL(redirectUri).origin !== new URL(request.url).origin) {
    return NextResponse.redirect(new URL("/api/auth/google", redirectUri));
  }
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set("oauth_state", state, { ...cookieOptions, maxAge: 600 });
  jar.set("oauth_verifier", verifier, { ...cookieOptions, maxAge: 600 });
  jar.set("oauth_redirect_uri", redirectUri, { ...cookieOptions, maxAge: 600 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.OAUTH_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", prompt: "select_account" }).toString();
  return NextResponse.redirect(url);
}
