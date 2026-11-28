import { currentUser, hash, readAsCurrentUser } from "@/lib/auth";
import { store, type Store } from "@/lib/collab-store";
import { areMutualFollowers, mutualFollowRequired } from "@/lib/community-model";
import { apiError, sameOrigin } from "@/lib/http";
import { applyLayerEdit, baseLayerId, initialSharedLayers, maxSharedStrokes, parseCanvasMutation, type CanvasSnapshot, type CanvasStroke } from "@/lib/shared-canvas";
import { maxDrawingLayers } from "@/lib/drawing-document";

type Context = { params: Promise<{ projectId: string }> };
const headers = { "Cache-Control": "private, no-store" };
const previews = new Map<string, { project: string; author: string; stroke: CanvasStroke; at: number; token: number; sequence?: number }>();
const subscribers = new Map<string, Set<Subscriber>>();
let previewClock = 0;

function access(data: Store, projectId: string, userId: string) {
  const project = data.projects.find(item => item.id === projectId && item.members.includes(userId));
  const candidate = project && data.artworks.find(art => art.id === project.candidateId && art.projectId === project.id);
  if (!project || !candidate) return apiError("Kanvas proyek tidak ditemukan.", 404);
  if (candidate.status !== "draft" || project.publishedId) return apiError("Karya sudah diterbitkan.", 409);
  if (!areMutualFollowers(data.follows, project.members[0], project.members[1])) return apiError(mutualFollowRequired, 403);
  return { project, candidate, base: project.canvas ? project.canvas.baseAsset : candidate.asset ?? null };
}

function activePreviews() {
  const expiry = Date.now() - 2500;
  for (const [key, preview] of previews) if (preview.at < expiry) previews.delete(key);
  return [...previews.values()];
}

type Cursor = { version: string | null; revision: string | null; preview: string | null };
type CanvasAccess = Exclude<ReturnType<typeof access>, Response>;
type Subscriber = {
  userId: string;
  credential?: string;
  authorizedUntil: number;
  room?: CanvasAccess;
  refresh: (data: Store) => void;
  pushPreview: () => void;
};

function sessionHash(request: Request) {
  const token = /(?:^|;\s*)geishara_session=([\w-]+)(?:;|$)/.exec(request.headers.get("cookie") ?? "")?.[1];
  return token ? hash(token) : undefined;
}

function snapshotFor(result: CanvasAccess, userId: string, cursor: Cursor) {
    const { project, candidate, base } = result;
    const canvas = project.canvas;
    const active = activePreviews().filter(preview => preview.project === project.id && preview.author !== userId
      && !canvas?.strokes.some(stroke => stroke.id === preview.stroke.id));
    const previewToken = active.map(preview => preview.token).join(",");
    const version = canvas?.version ?? 0;
    const includeStrokes = cursor.version !== String(version);
    if (!includeStrokes && cursor.revision === String(candidate.revision) && cursor.preview === previewToken) {
      return;
    }
    const snapshot = {
      base, version, finalVersion: canvas?.finalVersion ?? 0, revision: candidate.revision,
      viewer: userId, layers: canvas?.layers ?? initialSharedLayers, previews: active.map(preview => preview.stroke), previewToken,
      ...(includeStrokes ? { strokes: canvas?.strokes ?? [] } : {}),
    } satisfies Omit<CanvasSnapshot, "strokes"> & Partial<Pick<CanvasSnapshot, "strokes">>;
    return snapshot;
}

function pushCanvas(projectId: string, data: Store) {
  for (const subscriber of subscribers.get(projectId) ?? []) subscriber.refresh(data);
}

function streamCanvas(request: Request, projectId: string, userId: string, cursor: Cursor) {
  const encoder = new TextEncoder();
  const credential = sessionHash(request);
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const listeners = subscribers.get(projectId) ?? new Set<Subscriber>();
      const subscriber: Subscriber = {
        userId, credential, authorizedUntil: 0,
        refresh(data) {
          if (closed) return;
          const now = Date.now();
          const session = credential && data.sessions.find(item => item.hash === credential && item.user === userId && item.expires > now);
          const result = access(data, projectId, userId);
          if ((credential && !session) || result instanceof Response) { stop(); return; }
          subscriber.room = result;
          subscriber.authorizedUntil = Math.min(now + 750, session ? session.expires : Infinity);
          pushPreview();
        },
        pushPreview,
      };
      function pushPreview() {
        if (closed) return;
        if (!subscriber.room || subscriber.authorizedUntil <= Date.now() || (controller.desiredSize ?? 0) < 0) return;
        const snapshot = snapshotFor(subscriber.room, userId, cursor);
        if (!snapshot) return;
        cursor = { version: String(snapshot.version), revision: String(snapshot.revision), preview: snapshot.previewToken };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
      }
      const heartbeat = setInterval(() => {
        store(subscriber.refresh);
        if (!closed && (controller.desiredSize ?? 0) >= 0) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 500);
      const renewal = setTimeout(stop, 60000);
      function stop() {
        if (closed) return;
        dispose();
        controller.close();
      }
      dispose = () => {
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(renewal);
        listeners.delete(subscriber);
        if (!listeners.size) subscribers.delete(projectId);
        request.signal.removeEventListener("abort", stop);
      };
      listeners.add(subscriber);
      subscribers.set(projectId, listeners);
      request.signal.addEventListener("abort", stop, { once: true });
      controller.enqueue(encoder.encode("retry: 250\n\n"));
      if (request.signal.aborted) stop();
      else store(subscriber.refresh);
    },
    cancel() { dispose(); },
  });
  return new Response(stream, { headers: {
    "Cache-Control": "private, no-store, no-transform",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  } });
}

export async function GET(request: Request, { params }: Context) {
  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);
  const { projectId } = await params;
  const query = new URL(request.url).searchParams;
  const cursor = { version: query.get("version"), revision: query.get("revision"), preview: query.get("preview") };
  return store(data => {
    const result = access(data, projectId, user.id);
    if (result instanceof Response) return result;
    if (query.get("stream") === "1") return streamCanvas(request, projectId, user.id, cursor);
    const snapshot = snapshotFor(result, user.id, cursor);
    return snapshot ? Response.json(snapshot, { headers }) : new Response(null, { status: 204, headers });
  });
}

export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return apiError("Origin tidak valid.", 403);
  const { projectId } = await params;
  if (Number(request.headers.get("content-length")) > 100_000) return apiError("Goresan terlalu besar.", 413);
  const body = await request.text();
  if (body.length > 100_000) return apiError("Goresan terlalu besar.", 413);
  let mutation;
  try { mutation = parseCanvasMutation(JSON.parse(body)); } catch { /* Invalid JSON. */ }
  if (!mutation) return apiError("Data goresan tidak valid.", 422);
  const command = mutation;

  if (command.kind === "preview") {
    function relay(result: CanvasAccess, userId: string, push: () => void) {
      if (command.kind !== "preview") return apiError("Data pratinjau tidak valid.", 422);
      if (command.base !== result.base) return apiError("Dasar kanvas telah berubah.", 409);
      if (!(result.project.canvas?.layers ?? initialSharedLayers).some(layer => layer.id === (command.stroke.layer ?? baseLayerId))) {
        return apiError("Layer tidak ditemukan.", 404);
      }
      activePreviews();
      const key = `${projectId}:${userId}`;
      const previous = previews.get(key);
      const stale = command.sequence !== undefined && previous?.stroke.id === command.stroke.id
        && previous.sequence !== undefined && command.sequence <= previous.sequence;
      if (!stale && !result.project.canvas?.strokes.some(stroke => stroke.id === command.stroke.id)) {
        previews.set(key, { project: projectId, author: userId, stroke: command.stroke, at: Date.now(), token: ++previewClock, sequence: command.sequence });
        push();
      }
      return new Response(null, { status: 204, headers });
    }
    const credential = sessionHash(request);
    const listeners = subscribers.get(projectId);
    const sender = credential && listeners && [...listeners].find(subscriber =>
      subscriber.credential === credential && subscriber.authorizedUntil > Date.now());
    if (sender && sender.room) return relay(sender.room, sender.userId, () => {
      for (const subscriber of listeners ?? []) subscriber.pushPreview();
    });
    const response = await readAsCurrentUser((user, data) => {
      const result = access(data, projectId, user.id);
      return result instanceof Response ? result : relay(result, user.id, () => pushCanvas(projectId, data));
    });
    return response ?? apiError("Silakan masuk kembali.", 401);
  }

  const user = await currentUser();
  if (!user) return apiError("Silakan masuk kembali.", 401);
  let changed = false;
  const response = store(data => {
    const result = access(data, projectId, user.id);
    if (result instanceof Response) return result;
    const { project, base } = result;
    if (command.kind === "stroke") {
      if (command.base !== base) return apiError("Dasar kanvas telah berubah.", 409);
      const existing = project.canvas?.strokes.find(item => item.id === command.stroke.id);
      if (existing) return existing.author === user.id ? new Response(null, { status: 204, headers }) : apiError("ID goresan sudah digunakan.", 409);
      if (!(project.canvas?.layers ?? initialSharedLayers).some(layer => layer.id === (command.stroke.layer ?? baseLayerId))) {
        return apiError("Layer tidak ditemukan.", 404);
      }
      if ((project.canvas?.strokes.length ?? 0) >= maxSharedStrokes) return apiError("Kanvas mencapai batas goresan.", 422);
      project.canvas ??= { baseAsset: base, finalVersion: 0, version: 0, strokes: [] };
      project.canvas.strokes.push({ ...command.stroke, author: user.id, hidden: false });
      const key = `${projectId}:${user.id}`;
      if (previews.get(key)?.stroke.id === command.stroke.id) previews.delete(key);
    } else if (command.kind === "layer") {
      const layers = project.canvas?.layers ?? initialSharedLayers;
      const updated = applyLayerEdit(layers, command.edit, maxDrawingLayers);
      if (updated === layers) return new Response(null, { status: 204, headers });
      project.canvas ??= { baseAsset: base, finalVersion: 0, version: 0, strokes: [] };
      project.canvas.layers = updated;
    } else if (command.kind === "visibility") {
      const stroke = project.canvas?.strokes.find(item => item.id === command.id && item.author === user.id);
      if (!stroke) return apiError("Goresan tidak ditemukan.", 404);
      if (stroke.hidden === command.hidden) return new Response(null, { status: 204, headers });
      stroke.hidden = command.hidden;
    }
    project.canvas!.version++;
    project.approvals = [];
    changed = true;
    return new Response(null, { status: 204, headers });
  }, true);
  if (changed && subscribers.has(projectId)) store(data => pushCanvas(projectId, data));
  return response;
}
