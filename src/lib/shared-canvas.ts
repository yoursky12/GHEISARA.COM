import { shapeTools, type DrawingLayerInfo } from "./drawing-document";

export const maxStrokePoints = 2048;
export const maxSharedStrokes = 1500;
export const drawingTools = ["brush", "eraser", ...shapeTools] as const;
export const brushTextures = ["solid", "pencil", "spray"] as const;
const brushSmoothing = [true, "refined", "strong"] as const;
export const baseLayerId = "base";
export type SharedLayer = DrawingLayerInfo & { id: string };
export const initialSharedLayers: SharedLayer[] = [{ id: baseLayerId, name: "Layer 1", visible: true, opacity: 100 }];
export type CanvasPoint = { x: number; y: number };
export type CanvasStroke = {
  id: string; tool: typeof drawingTools[number]; color: string; size: number; points: CanvasPoint[];
  opacity?: number; texture?: typeof brushTextures[number]; filled?: boolean; layer?: string; smooth?: boolean | typeof brushSmoothing[number];
};
export type SharedStroke = CanvasStroke & { author: string; hidden: boolean };
export type SharedCanvas = { baseAsset: string | null; version: number; finalVersion: number; strokes: SharedStroke[]; layers?: SharedLayer[] };
export type LayerEdit =
  | { action: "add"; id: string }
  | { action: "remove"; id: string }
  | { action: "move"; id: string; relativeTo: string; after: boolean }
  | { action: "update"; id: string; changes: Partial<DrawingLayerInfo> };
export type CanvasMutation =
  | { kind: "stroke"; base: string | null; stroke: CanvasStroke }
  | { kind: "preview"; base: string | null; stroke: CanvasStroke; sequence?: number }
  | { kind: "visibility"; id: string; hidden: boolean }
  | { kind: "layer"; edit: LayerEdit };
export type CanvasSnapshot = {
  base: string | null; version: number; finalVersion: number; revision: number;
  viewer: string; strokes: SharedStroke[]; layers: SharedLayer[]; previews: CanvasStroke[]; previewToken: string;
};

export const canvasNeedsSave = (canvas?: SharedCanvas) => !!canvas && canvas.version !== canvas.finalVersion;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isLayerId = (id: unknown): id is string => typeof id === "string" && (id === baseLayerId || uuid.test(id));
const isOpacity = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;

export function applyLayerEdit(layers: SharedLayer[], edit: LayerEdit, limit: number) {
  const index = layers.findIndex(layer => layer.id === edit.id);
  if (edit.action === "add") {
    if (index !== -1 || layers.length >= limit) return layers;
    const names = new Set(layers.map(layer => layer.name));
    let number = 1;
    while (names.has(`Layer ${number}`)) number++;
    return [...layers, { id: edit.id, name: `Layer ${number}`, visible: true, opacity: 100 }];
  }
  if (index === -1) return layers;
  if (edit.action === "remove") return layers.length > 1 ? layers.filter(layer => layer.id !== edit.id) : layers;
  if (edit.action === "update") return layers.map(layer => layer.id === edit.id ? { ...layer, ...edit.changes } : layer);
  const neighbor = layers.findIndex(layer => layer.id === edit.relativeTo);
  if (neighbor < 0 || neighbor === index || index === neighbor + (edit.after ? 1 : -1)) return layers;
  const reordered = layers.filter(layer => layer.id !== edit.id);
  const destination = reordered.findIndex(layer => layer.id === edit.relativeTo) + Number(edit.after);
  reordered.splice(destination, 0, layers[index]);
  return reordered;
}

function parseLayerEdit(input: unknown): LayerEdit | undefined {
  if (!input || typeof input !== "object") return;
  const edit = input as Record<string, unknown>;
  if (!isLayerId(edit.id)) return;
  if (edit.action === "add" && edit.id !== baseLayerId) return { action: "add", id: edit.id };
  if (edit.action === "remove") return { action: "remove", id: edit.id };
  if (edit.action === "move" && isLayerId(edit.relativeTo) && typeof edit.after === "boolean") {
    return { action: "move", id: edit.id, relativeTo: edit.relativeTo, after: edit.after };
  }
  if (edit.action !== "update" || !edit.changes || typeof edit.changes !== "object") return;
  const inputChanges = edit.changes as Record<string, unknown>;
  const changes: Partial<DrawingLayerInfo> = {};
  if (typeof inputChanges.name === "string" && inputChanges.name.trim() && inputChanges.name.length <= 60) changes.name = inputChanges.name.trim();
  if (typeof inputChanges.visible === "boolean") changes.visible = inputChanges.visible;
  if (isOpacity(inputChanges.opacity)) changes.opacity = inputChanges.opacity;
  if (Object.keys(changes).length) return { action: "update", id: edit.id, changes };
}

export function parseCanvasMutation(input: unknown): CanvasMutation | undefined {
  if (!input || typeof input !== "object") return;
  const value = input as Record<string, unknown>;
  if (value.kind === "layer") {
    const edit = parseLayerEdit(value.edit);
    if (edit) return { kind: "layer", edit };
    return;
  }
  if (value.kind === "visibility" && typeof value.id === "string" && uuid.test(value.id) && typeof value.hidden === "boolean") {
    return { kind: value.kind, id: value.id, hidden: value.hidden };
  }
  if ((value.kind !== "stroke" && value.kind !== "preview") ||
    (value.base !== null && (typeof value.base !== "string" || !/^[0-9a-f-]{36}\.webp$/.test(value.base))) ||
    !value.stroke || typeof value.stroke !== "object") return;
  const stroke = value.stroke as Record<string, unknown>;
  const tool = drawingTools.find(item => item === stroke.tool);
  const texture = brushTextures.find(item => item === stroke.texture);
  const smooth = brushSmoothing.find(item => item === stroke.smooth);
  if (typeof stroke.id !== "string" || !uuid.test(stroke.id) || !tool ||
    (stroke.opacity !== undefined && !isOpacity(stroke.opacity)) ||
    (stroke.texture !== undefined && !texture) ||
    (stroke.layer !== undefined && !isLayerId(stroke.layer)) ||
    (stroke.filled !== undefined && typeof stroke.filled !== "boolean") ||
    (stroke.smooth !== undefined && stroke.smooth !== false && !smooth) ||
    typeof stroke.color !== "string" || !/^#[0-9a-f]{6}$/i.test(stroke.color) ||
    typeof stroke.size !== "number" || !Number.isInteger(stroke.size) || stroke.size < 1 || stroke.size > 100 ||
    !Array.isArray(stroke.points) || !stroke.points.length || stroke.points.length > maxStrokePoints) return;
  const points: CanvasPoint[] = [];
  for (const point of stroke.points) {
    if (!point || typeof point.x !== "number" || typeof point.y !== "number" ||
      ![point.x, point.y].every(v => Number.isFinite(v) && v >= 0 && v <= 1440)) return;
    points.push({ x: point.x, y: point.y });
  }
  const parsed: CanvasStroke = { id: stroke.id, tool, color: stroke.color, size: stroke.size, points,
    ...(isOpacity(stroke.opacity) ? { opacity: stroke.opacity } : {}),
    ...(texture ? { texture } : {}),
    ...(isLayerId(stroke.layer) ? { layer: stroke.layer } : {}),
    ...(typeof stroke.filled === "boolean" ? { filled: stroke.filled } : {}),
    ...(smooth && tool === "brush" ? { smooth } : {}),
  };
  if (value.kind === "preview") {
    const sequence = value.sequence;
    if (sequence !== undefined && (typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 0)) return;
    return { kind: "preview", base: value.base, stroke: parsed, sequence };
  }
  return { kind: "stroke", base: value.base, stroke: parsed };
}
