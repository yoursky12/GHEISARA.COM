import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hash } from "@/lib/auth";
import { store } from "@/lib/collab-store";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const jar = await cookies();
  const token = jar.get("geishara_session")?.value;
  if (token) store(data => { data.sessions = data.sessions.filter(s => s.hash !== hash(token)); }, true);
  jar.delete("geishara_session");
  return NextResponse.redirect(new URL("/auth/login", request.url), 303);
}
