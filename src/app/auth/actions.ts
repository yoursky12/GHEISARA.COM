"use server";

import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieOptions, currentUser, hash, loginDestination } from "@/lib/auth";
import { store } from "@/lib/collab-store";

const sessionLifetime = 7 * 86400;

function passwordDigest(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function submitCredentials(action: "login" | "register", form: FormData) {
  if (action !== "login" && action !== "register") redirect("/auth/login");
  const next = form.get("next") === "studio" ? "studio" : "";
  if (await currentUser()) redirect(loginDestination(next));

  const fail = (reason: string): never => redirect(`/auth/${action}?error=${reason}${next ? "&next=studio" : ""}`);
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const registering = action === "register";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password || password.length > 128 ||
      (registering && (!name || name.length > 100 || password.length < 8))) {
    fail("invalid-form");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hash(token);
  const credential = registering ? undefined : store((data) => {
    const user = data.users.find((candidate) => candidate.id.startsWith("local:") && candidate.email === email);
    return data.passwords?.find((entry) => entry.user === user?.id);
  });
  const salt = credential?.salt ?? randomBytes(16).toString("hex");
  const digest = await passwordDigest(password, salt);
  if (!registering && (!credential || !timingSafeEqual(digest, Buffer.from(credential.digest, "hex")))) {
    fail("invalid-login");
  }

  const userId = credential?.user ?? `local:${randomUUID()}`;
  store((data) => {
    if (registering) {
      if (data.users.some((user) => user.email.toLowerCase() === email)) fail("existing-account");
      data.users.push({ id: userId, name, email, open: false });
      (data.passwords ??= []).push({ user: userId, salt, digest: digest.toString("hex") });
    }
    const now = Date.now();
    data.sessions = data.sessions.filter((session) => session.expires > now);
    data.sessions.push({ hash: tokenHash, user: userId, expires: now + sessionLifetime * 1000 });
  }, true);
  (await cookies()).set("geishara_session", token, { ...cookieOptions, maxAge: sessionLifetime });
  redirect(loginDestination(next));
}
