"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyLayerEdit, initialSharedLayers, type CanvasMutation, type CanvasSnapshot, type CanvasStroke, type LayerEdit, type SharedStroke } from "@/lib/shared-canvas";
import { maxDrawingLayers } from "@/lib/drawing-document";

type Queued = { command: CanvasMutation; sent: boolean; sending?: boolean };
type CanvasUpdate = Omit<CanvasSnapshot, "strokes"> & Partial<Pick<CanvasSnapshot, "strokes">>;
const previewIntervalMs = 16;

export function useSharedCanvas(projectId?: string) {
  const url = projectId ? `/api/studio/collab/projects/${projectId}/strokes` : "";
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null);
  const [commands, setCommands] = useState<CanvasMutation[]>([]);
  const [connected, setConnected] = useState(false);
  const [warning, setWarning] = useState("");
  const queue = useRef<Queued[]>([]);
  const latest = useRef<CanvasSnapshot | null>(null);
  const lastPreview = useRef(0);
  const previewsInFlight = useRef(0);
  const previewSequence = useRef(0);
  const previewTimer = useRef<number | undefined>(undefined);
  const pendingPreview = useRef<CanvasMutation | null>(null);
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const stream = new EventSource(`${url}?stream=1`);
    let streaming = false;
    let streamFrames = 0;
    let running = false;
    let rerun = false;
    function receive(data: CanvasUpdate) {
      const current = latest.current;
      if (current && (data.version < current.version || data.revision < current.revision)) return;
      const updated = {
        ...data, strokes: data.strokes ?? current?.strokes ?? [],
        layers: current && current.version === data.version ? current.layers : data.layers ?? initialSharedLayers,
      };
      latest.current = updated;
      setSnapshot(updated);
      setConnected(true);
    }
    async function poll() {
      if (controller.signal.aborted) return;
      if (running) { rerun = true; return; }
      if (queue.current.length === 0 && (document.hidden || streaming)) return;
      running = true;
      try {
        for (const entry of queue.current) {
          if (entry.sent) continue;
          entry.sending = true;
          const response = await fetch(url, {
            method: "POST", body: JSON.stringify(entry.command), signal: controller.signal,
            headers: { "Content-Type": "application/json" },
          }).finally(() => { entry.sending = false; });
          if (response.status >= 500) throw new Error();
          if (!response.ok) {
            const error = await response.json();
            setWarning(error.message || "Perubahan kanvas ditolak.");
          }
          entry.sent = true;
        }
        const current = latest.current;
        const framesBeforeFetch = streamFrames;
        const query = current ? `?${new URLSearchParams({
          version: String(current.version), revision: String(current.revision), preview: current.previewToken,
        })}` : "";
        const response = await fetch(url + query, { cache: "no-store", signal: controller.signal });
        if (response.status !== 204) {
          if (!response.ok) {
            const error = await response.json();
            setWarning(error.message || "Kanvas bersama belum bisa dimuat.");
            setConnected(false);
            return;
          }
          const data = await response.json() as CanvasUpdate;
          if (controller.signal.aborted) return;
          if (streamFrames === framesBeforeFetch || data.version > (latest.current?.version ?? -1)) receive(data);
        }
        if (controller.signal.aborted) return;
        if (queue.current.some(entry => entry.sent)) {
          queue.current = queue.current.filter(entry => !entry.sent);
          setCommands(queue.current.map(entry => entry.command));
        }
        setConnected(true);
      } catch {
        if (!controller.signal.aborted) setConnected(false);
      } finally {
        running = false;
        if (rerun) { rerun = false; void poll(); }
      }
    }
    stream.onopen = () => { streaming = true; setConnected(true); };
    stream.onmessage = event => {
      streamFrames++;
      receive(JSON.parse(event.data) as CanvasUpdate);
    };
    stream.onerror = () => { streaming = false; void poll(); };
    wake.current = () => { void poll(); };
    void poll();
    const timer = window.setInterval(poll, 350);
    window.addEventListener("focus", poll);
    return () => {
      controller.abort();
      stream.close();
      wake.current = () => {};
      window.clearTimeout(previewTimer.current);
      previewTimer.current = undefined;
      pendingPreview.current = null;
      window.clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [url]);

  function enqueue(command: CanvasMutation) {
    const last = queue.current.at(-1);
    const previous = last?.command;
    if (last && !last.sent && !last.sending && command.kind === "layer" && command.edit.action === "update" &&
      previous?.kind === "layer" && previous.edit.action === "update" && previous.edit.id === command.edit.id) {
      last.command = { kind: "layer", edit: { ...command.edit, changes: { ...previous.edit.changes, ...command.edit.changes } } };
    } else {
      queue.current.push({ command, sent: false });
    }
    setCommands(queue.current.map(entry => entry.command));
    setWarning("");
    wake.current();
  }

  function previewStroke(stroke: CanvasStroke) {
    if (!url || !connected || !snapshot) return;
    pendingPreview.current = { kind: "preview", base: snapshot.base, stroke, sequence: ++previewSequence.current };
    function flushPreview() {
      if (previewsInFlight.current >= 2 || previewTimer.current !== undefined || !pendingPreview.current) return;
      const delay = previewIntervalMs - (performance.now() - lastPreview.current);
      if (delay > 0) {
        previewTimer.current = window.setTimeout(() => {
          previewTimer.current = undefined;
          flushPreview();
        }, delay);
        return;
      }
      const preview = pendingPreview.current;
      pendingPreview.current = null;
      previewsInFlight.current++;
      lastPreview.current = performance.now();
      void fetch(url, {
        method: "POST", body: JSON.stringify(preview), headers: { "Content-Type": "application/json" },
      }).catch(() => {}).finally(() => {
        previewsInFlight.current--;
        flushPreview();
      });
    }
    flushPreview();
  }

  const recorded = snapshot?.strokes;
  const recordedLayers = snapshot?.layers;
  const viewer = snapshot?.viewer;
  const strokes = useMemo(() => {
    if (!recorded || !viewer) return [];
    const merged = new Map<string, SharedStroke>(recorded.map(stroke => [stroke.id, stroke]));
    for (const command of commands) {
      if (command.kind === "stroke" && !merged.has(command.stroke.id)) {
        merged.set(command.stroke.id, { ...command.stroke, author: viewer, hidden: false });
      }
      if (command.kind === "visibility") {
        const stroke = merged.get(command.id);
        if (stroke) merged.set(command.id, { ...stroke, hidden: command.hidden });
      }
    }
    return [...merged.values()];
  }, [recorded, viewer, commands]);
  const layers = useMemo(() => commands.reduce((current, command) => command.kind === "layer"
    ? applyLayerEdit(current, command.edit, maxDrawingLayers) : current, recordedLayers ?? initialSharedLayers), [commands, recordedLayers]);

  return {
    snapshot, strokes, layers, connected, warning, pending: commands.length > 0,
    addStroke: (stroke: CanvasStroke) => { if (snapshot) enqueue({ kind: "stroke", base: snapshot.base, stroke }); },
    setHidden: (id: string, hidden: boolean) => enqueue({ kind: "visibility", id, hidden }),
    editLayer: (edit: LayerEdit) => enqueue({ kind: "layer", edit }),
    previewStroke,
  };
}
