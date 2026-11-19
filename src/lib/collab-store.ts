import "server-only";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import type { MemberArtwork, Collection, CommunityComment, Notice } from "./community-model";
export type User = { id: string; name: string; email: string; open: boolean; username?: string; bio?: string; location?: string; website?: string };
export type Invitation = { id: string; sender: string; recipient: string; type: string; deadline: string; license: string; idea: string; status: "pending" | "accepted" | "rejected" | "cancelled" };
export type Project = { id: string; invitation: string; members: string[]; messages: { id: string; author: string; text: string; at: string; clientMessageId?: string }[]; candidateId?: string; approvals?: { user: string; candidateId: string; revision: number; at: string }[]; progress?: number; history?: { user: string; progress: number; at: string }[]; publishedId?: string };
export type Store = { users: User[]; sessions: { hash: string; user: string; expires: number }[]; invitations: Invitation[]; projects: Project[]; artworks: MemberArtwork[]; follows: { user: string; creator: string }[]; appreciations: { user: string; artwork: string; at: string }[]; collections: Collection[]; comments: CommunityComment[]; notifications: Notice[] };
// Local, single-server persistence. Use a transactional shared database before scaling.
export function store<T>(fn: (data: Store) => T, write = false): T {
  const directory = process.env.VERCEL ? "/tmp/.data" : join(process.cwd(), ".data");
  const path = join(directory, "collab.json");
  let data: Store;
  try { data = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    data = { users: [], sessions: [], invitations: [], projects: [], artworks: [], follows: [], appreciations: [], collections: [], comments: [], notifications: [] };
  }
  // Backfill existing local data without replacing accounts or OAuth sessions.
  data.artworks ??= []; data.follows ??= []; data.appreciations ??= [];
  data.collections ??= []; data.comments ??= []; data.notifications ??= [];
  const result = fn(data);
  if (write) {
    mkdirSync(directory, { recursive: true });
    const temporary = join(directory, `${randomUUID()}.tmp`);
    writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
    renameSync(temporary, path);
  }
  return result;
}
