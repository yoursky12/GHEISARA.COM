"use client";

import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode, type Ref } from "react";
import { ArrowRight, Brush, ChevronDown, Circle, Diamond, Download, Eraser, Eye, EyeOff, Hand, Hexagon, ImagePlus, Minus, MousePointer2, PenTool, Pentagon, Pipette, Plus, Redo2, Save, Shapes, Square, Star, Trash2, Triangle, Undo2, X } from "lucide-react";
import { drawingElementTools, maxDrawingBrushPoints, maxDrawingElements, maxDrawingLayers, maxDrawingSide, type DrawingElement, type DrawingLayerInfo, type EditableDrawing } from "@/lib/drawing-document";
import { makeCanvas, paint, paintSharedStroke, smoothBrushWidth, stabilizeBrushPoint, traceBrushCurve, tracePenPath, traceShape, traceSmoothBrush, type Point, type Texture, type Tool } from "./drawing-tools";
import { baseLayerId, drawingTools, maxStrokePoints, type CanvasStroke, type LayerEdit, type SharedLayer, type SharedStroke } from "@/lib/shared-canvas";

const historyLimit = 12;
const minZoom = 0.25;
const maxZoom = 4;
const clampZoom = (value: number) => Math.min(maxZoom, Math.max(minZoom, value));
const defaultLayer = { id: 0, name: "Layer 1", visible: true, opacity: 100, content: null };
const toolOptions = [
  { id: "brush", label: "Kuas", icon: Brush }, { id: "eraser", label: "Penghapus", icon: Eraser },
  { id: "eyedropper", label: "Ambil warna", icon: Pipette },
  { id: "hand", label: "Geser kanvas", icon: Hand },
  { id: "pen", label: "Pena", icon: PenTool },
  { id: "select", label: "Pilih elemen", icon: MousePointer2 },
] as const;
const shapeOptions = [
  { id: "line", label: "Garis", icon: Minus }, { id: "rectangle", label: "Persegi panjang", icon: Square },
  { id: "ellipse", label: "Elips", icon: Circle }, { id: "triangle", label: "Segitiga", icon: Triangle },
  { id: "diamond", label: "Belah ketupat", icon: Diamond }, { id: "pentagon", label: "Segi lima", icon: Pentagon },
  { id: "hexagon", label: "Segi enam", icon: Hexagon }, { id: "star", label: "Bintang", icon: Star },
  { id: "arrow", label: "Panah", icon: ArrowRight },
] as const;

type Layer = DrawingLayerInfo & { id: number; content: HTMLCanvasElement | null };
type LayerDrop = { id: string; above: boolean };
type ElementSelection = { layerId: number; index: number };
type ElementDrag = { selection: ElementSelection; pointerId: number; start: Point };
type CanvasSize = { width: number; height: number };
type CanvasHistory = { layers: Layer[]; dimensions: CanvasSize };
const canvasSizes = [
  { label: "Potret", width: 960, height: 1200 },
  { label: "Persegi", width: 1080, height: 1080 },
  { label: "Lanskap", width: 1200, height: 960 },
  { label: "Lebar 16:9", width: 1440, height: 810 },
  { label: "Cerita 9:16", width: 810, height: 1440 },
  { label: "A4 potret", width: 1018, height: 1440 },
  { label: "A4 lanskap", width: 1440, height: 1018 },
];
type Stroke = {
  id: number; layer: Layer; start: Point; last: Point; ink: HTMLCanvasElement; preview: HTMLCanvasElement;
  erasesElements?: boolean;
  curveEnd?: Point; curvePoints?: Point[]; brush?: DrawingElement; shared?: CanvasStroke; settledPreview?: CanvasStroke;
};
type SharedDrawing = {
  strokes: SharedStroke[]; layers: SharedLayer[]; previews: CanvasStroke[]; viewer: string; canSave: boolean; needsSave: boolean;
  addStroke: (stroke: CanvasStroke) => void; previewStroke: (stroke: CanvasStroke) => void;
  setHidden: (id: string, hidden: boolean) => void;
  editLayer: (edit: LayerEdit) => void;
};

type SharedFrame = {
  flat: HTMLCanvasElement; scratch: HTMLCanvasElement; base?: HTMLCanvasElement;
  layers: (SharedLayer & { content?: HTMLCanvasElement; strokeIds: string[] })[];
};

function showShared(surface: HTMLCanvasElement, frame: SharedFrame | null, previews: CanvasStroke[], local?: CanvasStroke) {
  if (!frame) return;
  const ctx = surface.getContext("2d")!;
  ctx.clearRect(0, 0, surface.width, surface.height);
  if (!previews.length && !local) {
    ctx.drawImage(frame.flat, 0, 0);
    return;
  }
  const visible = local ? [...previews, local] : previews;
  for (const layer of frame.layers) {
    if (!layer.visible || layer.opacity === 0) continue;
    const strokes = visible.filter(stroke => (stroke.layer ?? baseLayerId) === layer.id);
    let content = layer.content;
    if (strokes.length) {
      const scratch = frame.scratch.getContext("2d")!;
      scratch.clearRect(0, 0, surface.width, surface.height);
      if (content) scratch.drawImage(content, 0, 0);
      for (const stroke of strokes) paintSharedStroke(scratch, stroke);
      content = frame.scratch;
    }
    if (!content) continue;
    ctx.globalAlpha = layer.opacity / 100;
    ctx.drawImage(content, 0, 0);
  }
  ctx.globalAlpha = 1;
}
export type DrawingUpload = { sheet: File; document: EditableDrawing };

const layerRasters = new WeakMap<Layer, HTMLCanvasElement>();

function drawElement(context: CanvasRenderingContext2D, element: DrawingElement) {
  const { tool, points, size, color, opacity, fill } = element;
  context.save();
  context.strokeStyle = context.fillStyle = color;
  context.lineWidth = size;
  context.lineCap = context.lineJoin = "round";
  context.globalAlpha = opacity / 100;
  if (tool === "brush") {
    if (element.smooth && element.texture === "solid") {
      context.lineWidth = smoothBrushWidth(size);
      traceSmoothBrush(context, points, true, 13);
    } else {
      paintSharedStroke(context, { id: "personal-brush", tool, points, size, color, opacity, texture: element.texture });
    }
  } else if (tool === "pen") tracePenPath(context, points, element.curvature ?? (fill ? 60 : 0));
  else traceShape(context, tool, points[0], points[1], fill);
  context.restore();
}

function renderLayer(layer: Layer, width: number, height: number) {
  if (!layer.elements?.length) return layer.content;
  const cached = layerRasters.get(layer);
  if (cached) return cached;
  const result = makeCanvas(width, height);
  const context = result.getContext("2d")!;
  if (layer.content) context.drawImage(layer.content, 0, 0);
  for (const element of layer.elements) drawElement(context, element);
  layerRasters.set(layer, result);
  return result;
}

function elementBounds(element: DrawingElement) {
  const xs = element.points.map(point => point.x);
  const ys = element.points.map(point => point.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function translateElement(element: DrawingElement, offset: Point): DrawingElement {
  return { ...element, points: element.points.map(point => ({ x: point.x + offset.x, y: point.y + offset.y })) };
}

function composite(surface: HTMLCanvasElement, layers: Layer[], stroke?: Stroke) {
  const ctx = surface.getContext("2d")!;
  ctx.clearRect(0, 0, surface.width, surface.height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    const preview = stroke?.layer.id === layer.id
      ? { ...layer, content: stroke.preview, elements: stroke.erasesElements ? undefined : layer.elements }
      : layer;
    const content = renderLayer(preview, surface.width, surface.height);
    if (!content) continue;
    ctx.globalAlpha = layer.opacity / 100;
    ctx.drawImage(content, 0, 0);
  }
  ctx.globalAlpha = 1;
}

function drawPenLayer(surface: HTMLCanvasElement, layer: Layer, points: Point[], curvature: number, color: string, size: number, opacity: number) {
  const content = makeCanvas(surface.width, surface.height);
  const context = content.getContext("2d")!;
  if (layer.content) context.drawImage(layer.content, 0, 0);
  context.strokeStyle = color;
  context.lineWidth = size;
  context.lineCap = context.lineJoin = "round";
  context.globalAlpha = opacity / 100;
  tracePenPath(context, points, curvature);
  return { ...layer, content };
}

function png(surface: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => surface.toBlob(blob => {
    if (blob) resolve(new File([blob], name, { type: "image/png" }));
    else reject(new Error("Gambar gagal disiapkan. Coba simpan lagi."));
  }, "image/png"));
}

function LayerPreview({ content }: { content: HTMLCanvasElement | null }) {
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = preview.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!content) return;
    const scale = Math.min(canvas.width / content.width, canvas.height / content.height);
    const width = content.width * scale;
    const height = content.height * scale;
    context.drawImage(content, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }, [content]);

  return <canvas ref={preview} className="studio-layer-preview" width={64} height={48} aria-hidden="true"/>;
}

export function DrawingCanvas({ source, layerSource, document: drawingDocument, busy, onSave, onClose, onDirty, sidebar, draftPicker, title, titleControl, palette = [], personal = false, shared, saveForInvite }: {
  source?: string;
  layerSource?: string;
  document?: EditableDrawing;
  busy: boolean;
  onSave: (file: File, drawing?: DrawingUpload) => Promise<boolean>;
  onClose?: () => void;
  onDirty: (dirty: boolean) => void;
  sidebar?: ReactNode;
  draftPicker?: ReactNode;
  title?: string;
  titleControl?: ReactNode;
  palette?: string[];
  personal?: boolean;
  shared?: SharedDrawing;
  saveForInvite?: Ref<() => Promise<void>>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const toolCursor = useRef<HTMLSpanElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const sharedRaster = useRef<SharedFrame>(null);
  const previous = useRef<CanvasHistory[]>([]);
  const next = useRef<CanvasHistory[]>([]);
  const pointer = useRef<Stroke | null>(null);
  const layerList = useRef<HTMLDivElement>(null);
  const layerPositions = useRef<Map<string, number> | null>(null);
  const layerDrag = useRef<{ id: string; pointerId: number; startY: number; dragging: boolean } | null>(null);
  const suppressLayerClick = useRef(false);
  const [draggedLayer, setDraggedLayer] = useState<{ id: string; offset: number } | null>(null);
  const [layerDrop, setLayerDrop] = useState<LayerDrop | null>(null);
  const [openLayerSettings, setOpenLayerSettings] = useState<number | string | null>(null);
  const layerSettingsId = useId();
  const canvasSizeTitleId = useId();
  const canvasSizeDialog = useRef<HTMLDialogElement>(null);
  const [sizeDraft, setSizeDraft] = useState({ width: "", height: "" });
  const [sizeFormat, setSizeFormat] = useState("");
  const settleTimer = useRef<number | undefined>(undefined);
  const panStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const layerSequence = useRef(1);
  const [layers, setLayers] = useState<Layer[]>([defaultLayer]);
  const [active, setActive] = useState<number | string>(0);
  const [tool, setTool] = useState<Tool>("brush");
  const [texture, setTexture] = useState<Texture>("solid");
  const [fill, setFill] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [color, setColor] = useState("#30251e");
  const [sampledColor, setSampledColor] = useState<string | null>(null);
  const [size, setSize] = useState(12);
  const [stabilize, setStabilize] = useState(true);
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(!source && !layerSource);
  const [dimensions, setDimensions] = useState({ width: 960, height: 1200 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [penCurvature, setPenCurvature] = useState(60);
  const penNodeDrag = useRef<{ index: number; pointerId: number } | null>(null);
  const [selection, setSelection] = useState<ElementSelection | null>(null);
  const [elementOffset, setElementOffset] = useState<Point | null>(null);
  const elementDrag = useRef<ElementDrag | null>(null);
  const elementHold = useRef<{ id: number; x: number; y: number; timer: number } | null>(null);
  const [elementActions, setElementActions] = useState<"menu" | "edit" | "move" | null>(null);
  const [error, setError] = useState("");
  const disabled = !ready || busy || saving || importing;
  const layerLocked = disabled || penPoints.length > 0;
  const sharedStrokes = shared?.strokes;
  const sharedLayers = shared?.layers;
  const sharedPreviews = shared?.previews;
  const fullTools = personal || Boolean(shared);
  const visibleLayers = sharedLayers ?? layers;
  const sharedLayerLimitReached = !!shared && visibleLayers.length >= maxDrawingLayers;

  useLayoutEffect(() => {
    const positions = layerPositions.current;
    layerPositions.current = null;
    if (!positions || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const row of layerList.current?.querySelectorAll<HTMLElement>("[data-layer-id]") ?? []) {
      const previous = positions.get(row.dataset.layerId!);
      if (previous === undefined) continue;
      const offset = previous - row.getBoundingClientRect().top;
      if (offset) row.animate([{ transform: `translateY(${offset}px)` }, { transform: "none" }], {
        duration: 220, easing: "cubic-bezier(.2,.75,.25,1)",
      });
    }
  }, [visibleLayers]);

  const selectedIndex = visibleLayers.findIndex(layer => layer.id === active);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeLayer = visibleLayers[activeIndex];
  const selectedLayer = selection ? layers.find(layer => layer.id === selection.layerId) : undefined;
  const selectedElement = selection && selectedLayer?.visible ? selectedLayer.elements?.[selection.index] : undefined;

  useEffect(() => () => window.clearTimeout(elementHold.current?.timer), []);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !personal || !ready || tool !== "select") return;
    const element = selectedElement && elementOffset ? translateElement(selectedElement, elementOffset) : selectedElement;
    const previewLayers = element && selection && elementOffset ? layers.map(layer => layer.id === selection.layerId
      ? { ...layer, elements: layer.elements?.map((item, index) => index === selection.index ? element : item) }
      : layer) : layers;
    composite(surface, previewLayers);
    if (!element) return;
    const bounds = elementBounds(element);
    const gap = element.size / 2 + 6;
    const context = surface.getContext("2d")!;
    context.save();
    context.strokeStyle = "#ad551f";
    context.lineWidth = 2;
    context.setLineDash([7, 5]);
    context.strokeRect(bounds.left - gap, bounds.top - gap, bounds.right - bounds.left + gap * 2, bounds.bottom - bounds.top + gap * 2);
    context.restore();
  }, [personal, ready, tool, layers, selection, selectedElement, elementOffset]);

  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !personal || !ready || tool !== "pen") return;
    const layer = layers[activeIndex];
    const preview = penPoints.length > 1 ? drawPenLayer(surface, layer, penPoints, penCurvature, color, size, opacity) : layer;
    composite(surface, layers.map(item => item.id === preview.id ? preview : item));
    if (!penPoints.length) return;
    const context = surface.getContext("2d")!;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.fillStyle = "#fff";
    for (const point of penPoints) {
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.restore();
  }, [personal, ready, tool, layers, activeIndex, penPoints, penCurvature, color, size, opacity]);

  useEffect(() => {
    const surface = viewport.current;
    if (!fullTools || !surface) return;
    function zoomWithWheel(event: WheelEvent) {
      if (!event.deltaY) return;
      event.preventDefault();
      if (!ready || pointer.current || panStart.current) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
      const delta = Math.min(160, Math.max(-160, event.deltaY * unit));
      setZoom(current => clampZoom(current * Math.exp(-delta / 420)));
    }
    surface.addEventListener("wheel", zoomWithWheel, { passive: false });
    return () => surface.removeEventListener("wheel", zoomWithWheel);
  }, [fullTools, ready]);

  function stepZoom(direction: -1 | 1) {
    if (!pointer.current && !panStart.current) {
      setZoom(current => clampZoom((Math.round(current * 4) + direction) / 4));
    }
  }

  function fitCanvas() {
    if (pointer.current || panStart.current) return;
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  useEffect(() => {
    const url = layerSource || source;
    if (!url) return;
    const surface = canvas.current!;
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxDrawingSide / Math.max(image.width, image.height));
      surface.width = drawingDocument?.width ?? Math.max(1, Math.round(image.width * scale));
      surface.height = drawingDocument?.height ?? Math.max(1, Math.round(image.height * scale));
      const loaded = (drawingDocument?.layers ?? [{ ...defaultLayer, name: "Gambar awal" }]).map((info, id) => {
        const { width, height } = surface;
        const content = makeCanvas(width, height);
        const ctx = content.getContext("2d")!;
        if (drawingDocument) ctx.drawImage(image, 0, id * height, width, height, 0, 0, width, height);
        else ctx.drawImage(image, 0, 0, width, height);
        return { ...info, id, content };
      });
      layerSequence.current = loaded.length;
      setLayers(loaded);
      setActive(loaded.at(-1)!.id);
      composite(surface, loaded);
      setDimensions({ width: surface.width, height: surface.height });
      setReady(true);
    };
    image.onerror = () => setError("Gambar draf gagal dimuat. Buka ulang draf untuk mencoba lagi.");
    image.src = url;
    return () => { image.onload = null; image.onerror = null; };
  }, [source, layerSource, drawingDocument]);

  useEffect(() => {
    if (!ready || !sharedStrokes || !sharedLayers) return;
    const { width, height } = canvas.current!;
    const base = layers[0]?.content ?? undefined;
    const previousFrame = sharedRaster.current;
    const previous = previousFrame?.base === base && previousFrame?.flat.width === width && previousFrame.flat.height === height
      ? previousFrame : null;
    const frame: SharedFrame = {
      flat: previous?.flat ?? makeCanvas(width, height),
      scratch: previous?.scratch ?? makeCanvas(width, height),
      base,
      layers: sharedLayers.map(layer => ({ ...layer, content: layer.id === baseLayerId ? base : undefined, strokeIds: [] })),
    };
    const grouped = new Map<string, SharedStroke[]>();
    for (const stroke of sharedStrokes) {
      if (stroke.hidden) continue;
      const id = stroke.layer ?? baseLayerId;
      const list = grouped.get(id);
      if (list) list.push(stroke);
      else grouped.set(id, [stroke]);
    }
    const ctx = frame.flat.getContext("2d")!;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    for (const layer of frame.layers) {
      const strokes = grouped.get(layer.id) ?? [];
      layer.strokeIds = strokes.map(stroke => stroke.id);
      const prior = previous?.layers.find(item => item.id === layer.id);
      const extendsPrior = prior && prior.strokeIds.every((id, index) => layer.strokeIds[index] === id);
      if (extendsPrior && prior.strokeIds.length === strokes.length) {
        layer.content = prior.content;
      } else if (strokes.length) {
        const content = makeCanvas(width, height);
        const layerCtx = content.getContext("2d")!;
        const background = extendsPrior ? prior.content : layer.content;
        if (background) layerCtx.drawImage(background, 0, 0);
        for (const stroke of strokes.slice(extendsPrior ? prior.strokeIds.length : 0)) paintSharedStroke(layerCtx, stroke);
        layer.content = content;
      }
      if (!layer.visible || !layer.content) continue;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.drawImage(layer.content, 0, 0);
    }
    sharedRaster.current = frame;
  }, [ready, layers, sharedStrokes, sharedLayers]);

  useEffect(() => {
    if (ready && sharedStrokes && sharedPreviews) {
      showShared(canvas.current!, sharedRaster.current, sharedPreviews, pointer.current?.settledPreview ?? pointer.current?.shared);
    }
  }, [ready, layers, sharedStrokes, sharedLayers, sharedPreviews]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  function updateHistory() {
    setHistory({ undo: previous.current.length > 0, redo: next.current.length > 0 });
    setDirty(true);
    onDirty(true);
  }

  function updateLayers(updated: Layer[], size = dimensions) {
    const surface = canvas.current!;
    if (surface.width !== size.width || surface.height !== size.height) {
      surface.width = size.width;
      surface.height = size.height;
      setDimensions(size);
    }
    setLayers(updated);
    if (!updated.some(layer => layer.id === active)) setActive(updated.at(-1)!.id);
    composite(surface, updated);
    updateHistory();
  }

  function commit(updated: Layer[], size = dimensions) {
    previous.current.push({ layers, dimensions });
    if (previous.current.length > historyLimit) previous.current.shift();
    next.current = [];
    updateLayers(updated, size);
  }

  function positionToolCursor(event: PointerEvent<HTMLCanvasElement>) {
    const marker = toolCursor.current;
    if (!marker || !event.isPrimary || (event.pointerType === "touch" && (tool !== "eraser" || event.buttons === 0))) return;
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const parent = viewport.current!.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    marker.hidden = x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
    if (marker.hidden) return;
    marker.style.left = `${x - parent.left}px`;
    marker.style.top = `${y - parent.top}px`;
    marker.style.width = `${size * bounds.width / surface.width}px`;
    marker.style.height = `${size * bounds.height / surface.height}px`;
  }

  function hideToolCursor() {
    if (toolCursor.current) toolCursor.current.hidden = true;
  }

  function renderStrokePreview(surface: HTMLCanvasElement, stroke: Stroke, ink = stroke.ink) {
    const preview = stroke.preview.getContext("2d")!;
    preview.clearRect(0, 0, surface.width, surface.height);
    const background = stroke.erasesElements
      ? renderLayer(stroke.layer, surface.width, surface.height)
      : stroke.layer.content;
    if (background) preview.drawImage(background, 0, 0);
    preview.globalAlpha = opacity / 100;
    preview.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    preview.drawImage(ink, 0, 0);
    preview.globalAlpha = 1;
    preview.globalCompositeOperation = "source-over";
    composite(surface, layers, stroke);
  }

  function eraserHitsElements(stroke: Stroke) {
    const { width, height } = stroke.ink;
    const overlap = makeCanvas(width, height).getContext("2d")!;
    for (const element of stroke.layer.elements ?? []) drawElement(overlap, element);
    overlap.globalCompositeOperation = "destination-in";
    overlap.drawImage(stroke.ink, 0, 0);
    return overlap.getImageData(0, 0, width, height).data.some((value, index) => index % 4 === 3 && value > 0);
  }

  function settleCurve(surface: HTMLCanvasElement, stroke: Stroke, point: Point) {
    if (pointer.current !== stroke || !stroke.curveEnd) return;
    if (shared && stroke.shared) {
      const bounded = boundPoint(surface, point);
      const points = stroke.shared.points;
      const last = points.at(-1);
      const unchanged = last?.x === bounded.x && last.y === bounded.y;
      if (unchanged && !stroke.settledPreview) return;
      const preview = unchanged ? stroke.shared
        : { ...stroke.shared, points: [...points.slice(0, maxStrokePoints - 1), bounded] };
      stroke.settledPreview = preview;
      shared.previewStroke(preview);
      showShared(surface, sharedRaster.current, shared.previews, preview);
      return;
    }
    if (!stroke.curvePoints || stroke.curvePoints.length < 2) return;
    const ink = makeCanvas(surface.width, surface.height);
    const context = ink.getContext("2d")!;
    context.strokeStyle = color;
    context.lineWidth = smoothBrushWidth(size);
    context.lineCap = context.lineJoin = "round";
    const points = stroke.curvePoints;
    const endpoint = points.at(-1);
    traceSmoothBrush(context, endpoint?.x === point.x && endpoint.y === point.y ? points : [...points, point]);
    renderStrokePreview(surface, stroke, ink);
  }

  function boundPoint(surface: HTMLCanvasElement, point: Point) {
    return {
      x: Math.round(Math.max(0, Math.min(surface.width, point.x))),
      y: Math.round(Math.max(0, Math.min(surface.height, point.y))),
    };
  }

  function draw(event: PointerEvent<HTMLCanvasElement>, start = false, end = false) {
    if (disabled || tool === "hand" || tool === "select") return;
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const rawPoint = { x: (event.clientX - bounds.left) * surface.width / bounds.width, y: (event.clientY - bounds.top) * surface.height / bounds.height };
    if (tool === "pen") {
      if (!start || event.button !== 0) return;
      const radius = 10 * surface.width / bounds.width;
      const index = penPoints.findLastIndex(point => Math.hypot(point.x - rawPoint.x, point.y - rawPoint.y) <= radius);
      if (index >= 0) {
        penNodeDrag.current = { index, pointerId: event.pointerId };
        surface.setPointerCapture(event.pointerId);
      } else if (!activeLayer.visible) setError("Tampilkan layer aktif sebelum menggambar.");
      else if (penPoints.length < 256) {
        setError("");
        setPenPoints(points => [...points, rawPoint]);
        onDirty(true);
      }
      return;
    }
    if (start) {
      if (pointer.current || event.button !== 0) return;
      if (tool === "eyedropper") {
        const x = Math.max(0, Math.min(surface.width - 1, Math.floor(rawPoint.x)));
        const y = Math.max(0, Math.min(surface.height - 1, Math.floor(rawPoint.y)));
        const [red, green, blue, alpha] = surface.getContext("2d")!.getImageData(x, y, 1, 1).data;
        const coverage = alpha / 255;
        const sampled = `#${[red, green, blue].map(channel =>
          Math.round(channel * coverage + 255 * (1 - coverage)).toString(16).padStart(2, "0")).join("")}`;
        setColor(sampled);
        setSampledColor(sampled);
        setTool("brush");
        return;
      }
      const layer = shared ? layers[0] : layers.find(item => item.id === activeLayer.id);
      if (!layer || !activeLayer.visible) {
        setError("Tampilkan layer aktif sebelum menggambar.");
        return;
      }
      setError("");
      surface.setPointerCapture(event.pointerId);
      const sharedTool = shared && drawingTools.find(item => item === tool);
      const brush: DrawingElement | undefined = personal && tool === "brush"
        ? { tool, points: [], color, size, opacity, fill: false, texture, smooth: stabilize }
        : undefined;
      const smooth = !brush && tool === "brush" && texture === "solid" && stabilize;
      pointer.current = { id: event.pointerId, layer, start: rawPoint, last: rawPoint,
        brush,
        erasesElements: tool === "eraser" && !shared && Boolean(layer.elements?.length),
        curveEnd: smooth ? rawPoint : undefined,
        curvePoints: smooth && !shared ? [rawPoint] : undefined,
        ink: makeCanvas(surface.width, surface.height), preview: makeCanvas(surface.width, surface.height),
        shared: sharedTool ? {
          id: crypto.randomUUID(), tool: sharedTool, color, size, opacity, texture, filled: fill,
          ...(smooth ? { smooth: "strong" as const } : {}),
          layer: String(activeLayer.id), points: [],
        } : undefined };
    }
    const stroke = pointer.current;
    if (stroke?.id !== event.pointerId) return;
    if (stroke.brush) {
      const brush = stroke.brush;
      const point = brush.smooth && brush.texture !== "solid" && !start && !end
        ? stabilizeBrushPoint(stroke.last, rawPoint) : rawPoint;
      const previous = brush.points.at(-1);
      if (previous?.x === point.x && previous.y === point.y) return;
      brush.points.push(point);
      stroke.last = point;
      const context = stroke.preview.getContext("2d")!;
      context.clearRect(0, 0, surface.width, surface.height);
      const background = renderLayer(stroke.layer, surface.width, surface.height);
      if (background) context.drawImage(background, 0, 0);
      drawElement(context, brush);
      composite(surface, layers, { ...stroke, erasesElements: true });
      return;
    }
    const point = tool === "brush" && stabilize && !start && !end
      ? stabilizeBrushPoint(stroke.last, rawPoint)
      : rawPoint;
    if (stroke.curveEnd && !start && !end) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => settleCurve(surface, stroke, rawPoint), 80);
    }
    if (shared && stroke.shared) {
      stroke.last = point;
      const points = stroke.shared.points;
      const bounded = boundPoint(surface, point);
      const last = points.at(-1);
      if (last?.x === bounded.x && last.y === bounded.y) return;
      stroke.settledPreview = undefined;
      const pointLimit = stroke.shared.tool === "brush" || stroke.shared.tool === "eraser" ? maxStrokePoints : 2;
      points[Math.min(points.length, pointLimit - 1)] = bounded;
      shared.previewStroke(stroke.shared);
      showShared(surface, sharedRaster.current, shared.previews, stroke.shared);
      return;
    }
    const moved = point.x !== stroke.last.x || point.y !== stroke.last.y;
    if (end && tool === "eraser" && !moved) return;
    if (end && tool === "brush" && !moved && !stroke.curveEnd) return;
    const context = stroke.ink.getContext("2d")!;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = stroke.curveEnd ? smoothBrushWidth(size) : size;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (stroke.curveEnd && stroke.curvePoints && !start) {
      if (moved) stroke.curvePoints.push(point);
      if (end && stroke.curvePoints.length > 1) {
        context.clearRect(0, 0, surface.width, surface.height);
        traceSmoothBrush(context, stroke.curvePoints);
      } else if (moved) {
        context.beginPath();
        context.moveTo(stroke.curveEnd.x, stroke.curveEnd.y);
        stroke.curveEnd = traceBrushCurve(context, stroke.last, point);
        context.stroke();
      }
    } else if (tool === "brush" || tool === "eraser") {
      paint(context, tool === "eraser" ? "solid" : texture, context.lineWidth, stroke.last, point, start);
    } else {
      context.clearRect(0, 0, surface.width, surface.height);
      traceShape(context, tool, stroke.start, point, fill);
    }
    stroke.last = point;
    renderStrokePreview(surface, stroke);
  }

  function finish(event: PointerEvent<HTMLCanvasElement>, cancel = false) {
    const stroke = pointer.current;
    if (stroke?.id !== event.pointerId) return;
    window.clearTimeout(settleTimer.current);
    if (shared && stroke.shared) {
      if (!cancel) draw(event, false, true);
      pointer.current = null;
      if (cancel) showShared(event.currentTarget, sharedRaster.current, shared.previews);
      else shared.addStroke(stroke.shared);
      return;
    }
    if (!cancel && (stroke.brush || tool !== "brush" || stabilize)) draw(event, false, true);
    pointer.current = null;
    if (cancel) composite(event.currentTarget, layers);
    else {
      if (stroke.brush) {
        const { points } = stroke.brush;
        const count = Math.min(points.length, maxDrawingBrushPoints);
        const sampled = count === points.length ? points : Array.from({ length: count },
          (_, index) => points[Math.round(index * (points.length - 1) / (count - 1))]);
        addElement(stroke.layer, { ...stroke.brush, points: sampled });
        return;
      }
      const shape = personal && drawingElementTools.find(option => option === tool);
      if (shape && shape !== "pen" && shape !== "brush") {
        addElement(stroke.layer, { tool: shape, points: [stroke.start, stroke.last], color, size, opacity, fill });
      } else {
        if (stroke.erasesElements && (!opacity || !eraserHitsElements(stroke))) {
          stroke.erasesElements = false;
          renderStrokePreview(event.currentTarget, stroke);
        }
        if (stroke.erasesElements) setSelection(null);
        commit(layers.map(layer => layer.id === stroke.layer.id
          ? { ...layer, content: stroke.preview, elements: stroke.erasesElements ? undefined : layer.elements }
          : layer));
      }
    }
  }

  function addElement(layer: Layer, element: DrawingElement) {
    if (element.tool !== "brush" && (layer.elements?.filter(item => item.tool !== "brush").length ?? 0) >= maxDrawingElements) {
      composite(canvas.current!, layers);
      setError("Layer ini penuh. Tambah layer untuk membuat elemen lain.");
      return false;
    }
    const points = element.points.map(point => ({
      x: Math.round(Math.max(0, Math.min(canvas.current!.width, point.x)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(canvas.current!.height, point.y)) * 10) / 10,
    }));
    commit(layers.map(item => item.id === layer.id ? { ...item, elements: [...(item.elements ?? []), { ...element, points }] } : item));
    return true;
  }

  function selectElement(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || event.button !== 0 || elementDrag.current) return;
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * surface.width / rect.width, y: (event.clientY - rect.top) * surface.height / rect.height };
    const next = hitElement(point, 12 * surface.width / rect.width);
    setSelection(next);
    if (!next) return;
    setActive(next.layerId);
    elementDrag.current = { selection: next, pointerId: event.pointerId, start: point };
    surface.setPointerCapture(event.pointerId);
  }

  function hitElement(point: Point, tolerance: number) {
    const hit = makeCanvas(1, 1).getContext("2d")!;
    let interior: ElementSelection | null = null;
    for (const layer of [...layers].reverse()) {
      if (!layer.visible || !layer.opacity || !layer.elements) continue;
      for (let index = layer.elements.length - 1; index >= 0; index--) {
        const element = layer.elements[index];
        if (!element.opacity) continue;
        hit.beginPath();
        if (element.tool === "brush") {
          const first = element.points[0];
          if (element.points.length === 1 && Math.hypot(point.x - first.x, point.y - first.y) <= (element.size + tolerance) / 2) {
            return { layerId: layer.id, index };
          }
          if (element.smooth && element.texture === "solid") traceSmoothBrush(hit, element.points, true, 13);
          else {
            hit.moveTo(first.x, first.y);
            for (const item of element.points.slice(1)) hit.lineTo(item.x, item.y);
          }
        } else drawElement(hit, element);
        hit.lineWidth = element.size + tolerance;
        hit.lineJoin = hit.lineCap = "round";
        const next = { layerId: layer.id, index };
        const inside = element.tool !== "brush" && element.tool !== "pen" && element.tool !== "line" && hit.isPointInPath(point.x, point.y);
        if (hit.isPointInStroke(point.x, point.y) || (element.fill && inside)) return next;
        if (inside && !interior) interior = next;
      }
    }
    return interior;
  }

  function clearElementHold(pointerId: number) {
    if (elementHold.current?.id !== pointerId) return;
    window.clearTimeout(elementHold.current.timer);
    elementHold.current = null;
  }

  function startElementHold(event: PointerEvent<HTMLCanvasElement>) {
    if (!personal || layerLocked || tool === "hand" || tool === "pen" || tool === "eyedropper" ||
      event.button !== 0 || pointer.current || elementDrag.current || elementHold.current) return;
    const surface = event.currentTarget;
    const { pointerId, clientX, clientY } = event;
    const rect = surface.getBoundingClientRect();
    const point = {
      x: (clientX - rect.left) * surface.width / rect.width,
      y: (clientY - rect.top) * surface.height / rect.height,
    };
    if (tool === "select") return;
    const next = hitElement(point, 12 * surface.width / rect.width);
    if (!next) return;
    surface.setPointerCapture(pointerId);
    const timer = window.setTimeout(() => {
      clearElementHold(pointerId);
      if (pointer.current?.id === pointerId) {
        window.clearTimeout(settleTimer.current);
        pointer.current = null;
      }
      elementDrag.current = { selection: next, pointerId, start: point };
      setElementOffset(null);
      composite(surface, layers);
      setSelection(next);
      setActive(next.layerId);
      setTool("select");
      setElementActions("menu");
    }, 220);
    elementHold.current = { id: pointerId, x: clientX, y: clientY, timer };
  }

  function getElementOffset(event: PointerEvent<HTMLCanvasElement>, drag: ElementDrag) {
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    const element = layers.find(layer => layer.id === drag.selection.layerId)?.elements?.[drag.selection.index];
    if (!element) return null;
    const bounds = elementBounds(element);
    const x = (event.clientX - rect.left) * surface.width / rect.width - drag.start.x;
    const y = (event.clientY - rect.top) * surface.height / rect.height - drag.start.y;
    return {
      x: Math.round(Math.min(surface.width - bounds.right, Math.max(-bounds.left, x))),
      y: Math.round(Math.min(surface.height - bounds.bottom, Math.max(-bounds.top, y))),
    };
  }

  function dropElement(event: PointerEvent<HTMLCanvasElement>, cancel = false) {
    const drag = elementDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    elementDrag.current = null;
    setElementOffset(null);
    const offset = cancel ? null : getElementOffset(event, drag);
    if (!offset || (!offset.x && !offset.y)) return;
    setElementActions(null);
    commit(layers.map(layer => layer.id === drag.selection.layerId ? {
      ...layer, elements: layer.elements?.map((element, index) => index === drag.selection.index ? translateElement(element, offset) : element),
    } : layer));
  }

  function removeSelectedElement() {
    if (disabled || !selection || !selectedElement || elementDrag.current) return;
    commit(layers.map(layer => layer.id === selection.layerId ? {
      ...layer, elements: layer.elements?.filter((_, index) => index !== selection.index),
    } : layer));
    setSelection(null);
    setElementActions(null);
  }

  function restore(from: CanvasHistory[], to: CanvasHistory[]) {
    if (pointer.current) return;
    const snapshot = from.pop();
    if (!snapshot) return;
    to.push({ layers, dimensions });
    setSelection(null);
    updateLayers(snapshot.layers, snapshot.dimensions);
  }

  function cancelPenPath() {
    penNodeDrag.current = null;
    setPenPoints([]);
    onDirty(dirty);
  }

  function commitPenPath() {
    if (disabled || penNodeDrag.current || penPoints.length < 2) return;
    const layer = layers[activeIndex];
    if (!addElement(layer, { tool: "pen", points: penPoints, fill: penCurvature > 0, curvature: penCurvature, color, size, opacity })) return;
    setPenPoints([]);
    setSelection({ layerId: layer.id, index: layer.elements?.length ?? 0 });
    setTool("select");
  }

  function changeSelectedCurvature(curvature: number) {
    if (selectedElement?.tool === "pen") updateSelectedElement({ curvature });
  }

  function updateSelectedElement(changes: Partial<Pick<DrawingElement, "color" | "size" | "fill" | "curvature">>) {
    if (!selection || !selectedElement || disabled || elementDrag.current) return;
    commit(layers.map(layer => layer.id === selection.layerId ? {
      ...layer, elements: layer.elements?.map((element, index) => index === selection.index ? { ...element, ...changes } : element),
    } : layer));
  }

  function resizeCanvas(size: CanvasSize) {
    if (layerLocked || pointer.current || elementDrag.current || (size.width === dimensions.width && size.height === dimensions.height)) return;
    const scale = Math.min(size.width / dimensions.width, size.height / dimensions.height);
    const width = dimensions.width * scale;
    const height = dimensions.height * scale;
    const x = (size.width - width) / 2;
    const y = (size.height - height) / 2;
    const resized = layers.map(layer => {
      const content = layer.content ? makeCanvas(size.width, size.height) : null;
      if (content && layer.content) content.getContext("2d")!.drawImage(layer.content, x, y, width, height);
      return { ...layer, content, elements: layer.elements?.map(element => ({
        ...element, size: Math.max(1, Math.min(100, Math.round(element.size * scale))),
        points: element.points.map(point => ({
          x: Math.round((point.x * scale + x) * 10) / 10, y: Math.round((point.y * scale + y) * 10) / 10,
        })),
      })) };
    });
    setSelection(null);
    commit(resized, size);
    fitCanvas();
  }

  async function importImage(file: File) {
    if (layerLocked || pointer.current) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setError("Pilih gambar PNG, JPG, atau WebP hingga 20 MB.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const surface = canvas.current;
        if (!surface) return;
        if (bitmap.width * bitmap.height > 40_000_000) {
          setError("Ukuran gambar maksimal 40 megapiksel.");
          return;
        }
        const content = makeCanvas(surface.width, surface.height);
        const scale = Math.min(1, surface.width / bitmap.width, surface.height / bitmap.height);
        const width = bitmap.width * scale;
        const height = bitmap.height * scale;
        content.getContext("2d")!.drawImage(bitmap, (surface.width - width) / 2, (surface.height - height) / 2, width, height);
        const id = layerSequence.current++;
        const name = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 60) || "Gambar impor";
        commit([...layers, { ...defaultLayer, id, name, content }]);
        setActive(id);
      } finally {
        bitmap.close();
      }
    } catch {
      setError("Gambar tidak bisa dibuka. Coba pilih file lain.");
    } finally {
      setImporting(false);
    }
  }

  async function persistDrawing() {
    if (layerLocked || pointer.current || elementDrag.current) {
      throw new Error("Selesaikan pengeditan kanvas sebelum menyimpan.");
    }
    setSaving(true);
    setError("");
    try {
      const surface = canvas.current!;
      const image = await png(exportSurface(surface), "kanvas.png");
      let drawing: DrawingUpload | undefined;
      if (personal) {
        const { width, height } = surface;
        const sheet = makeCanvas(width, height * layers.length);
        const context = sheet.getContext("2d")!;
        layers.forEach((layer, index) => {
          if (layer.content) context.drawImage(layer.content, 0, index * height);
        });
        drawing = { sheet: await png(sheet, "layers.png"), document: {
          width, height, layers: layers.map(({ name, visible, opacity, elements }) => ({ name, visible, opacity, elements })),
        } };
      }
      if (await onSave(image, drawing)) {
        setDirty(false);
        onDirty(false);
        onClose?.();
      } else throw new Error("Gambar belum tersimpan ke draf. Kamu bisa mengunduh salinan PNG.");
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(saveForInvite, () => persistDrawing);

  async function saveDrawing() {
    if (layerLocked || pointer.current || elementDrag.current) return;
    try {
      await persistDrawing();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Gambar gagal disimpan.");
    }
  }

  function exportSurface(surface: HTMLCanvasElement) {
    if (!personal) return sharedRaster.current?.flat ?? surface;
    const result = makeCanvas(surface.width, surface.height);
    composite(result, layers);
    return result;
  }

  function downloadDrawing() {
    if (pointer.current || elementDrag.current || penPoints.length) return;
    const link = document.createElement("a");
    link.href = exportSurface(canvas.current!).toDataURL("image/png");
    link.download = "kanvas.png";
    link.click();
  }

  function editLayer(id: number | string, properties: Partial<DrawingLayerInfo>) {
    if (pointer.current) return;
    if (shared) shared.editLayer({ action: "update", id: String(id), changes: properties });
    else commit(layers.map(layer => layer.id === id ? { ...layer, ...properties } : layer));
  }

  function addLayer() {
    if (pointer.current || sharedLayerLimitReached) return;
    if (shared) {
      const id = crypto.randomUUID();
      shared.editLayer({ action: "add", id });
      setActive(id);
      return;
    }
    const id = layerSequence.current++;
    commit([{ ...defaultLayer, id, name: `Layer ${id + 1}` }, ...layers]);
    setActive(id);
  }

  function moveLayer(id: string, target: LayerDrop, offset = 0) {
    if (pointer.current || layerLocked || id === target.id) return;
    const source = visibleLayers.findIndex(layer => String(layer.id) === id);
    const neighbor = visibleLayers.findIndex(layer => String(layer.id) === target.id);
    if (source < 0 || neighbor < 0 || source === neighbor + (target.above ? 1 : -1)) return;
    layerPositions.current = new Map(Array.from(layerList.current?.querySelectorAll<HTMLElement>("[data-layer-id]") ?? [],
      row => [row.dataset.layerId!, row.getBoundingClientRect().top + (row.dataset.layerId === id ? offset : 0)]));
    if (shared) {
      shared.editLayer({ action: "move", id, relativeTo: target.id, after: target.above });
      return;
    }
    const reordered = [...layers];
    const [moved] = reordered.splice(source, 1);
    const destination = reordered.findIndex(layer => String(layer.id) === target.id) + Number(target.above);
    reordered.splice(destination, 0, moved);
    commit(reordered);
  }

  function layerDropAt(event: PointerEvent<HTMLButtonElement>): LayerDrop | null {
    const list = layerList.current;
    if (!list) return null;
    const bounds = list.getBoundingClientRect();
    const padding = 24;
    if (event.clientX < bounds.left - padding || event.clientX > bounds.right + padding ||
      event.clientY < bounds.top - padding || event.clientY > bounds.bottom + padding) return null;
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-layer-id]"))
      .filter(row => row.dataset.layerId !== layerDrag.current?.id)
      .map(row => ({
        id: row.dataset.layerId!,
        buttonBounds: row.querySelector(".studio-layer-select")!.getBoundingClientRect(),
      }));
    const next = rows.find(row => event.clientY < row.buttonBounds.top + row.buttonBounds.height / 2);
    if (next) return { id: next.id, above: true };
    const last = rows.at(-1);
    return last ? { id: last.id, above: false } : null;
  }

  function clearLayerDrag() {
    layerDrag.current = null;
    setDraggedLayer(null);
    setLayerDrop(null);
  }

  function startLayerDrag(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0 || layerDrag.current) return;
    suppressLayerClick.current = false;
    if (pointer.current || visibleLayers.length < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    layerDrag.current = { id, pointerId: event.pointerId, startY: event.clientY, dragging: false };
  }

  function updateLayerDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = layerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offset = event.clientY - drag.startY;
    if (!drag.dragging && Math.abs(offset) < 5) return;
    drag.dragging = true;
    suppressLayerClick.current = true;
    setDraggedLayer({ id: drag.id, offset });
    setLayerDrop(layerDropAt(event));
  }

  function finishLayerDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = layerDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const target = drag.dragging ? layerDropAt(event) : null;
    if (target) moveLayer(drag.id, target, event.clientY - drag.startY);
    clearLayerDrag();
  }

  function removeLayer(id: number | string) {
    if (pointer.current || layerLocked || visibleLayers.length < 2) return;
    if (shared) shared.editLayer({ action: "remove", id: String(id) });
    else commit(layers.filter(layer => layer.id !== id));
    if (openLayerSettings === id) setOpenLayerSettings(null);
  }

  const layerPanel = (
    <section className="collab-pane studio-layers">
      <div className="collab-pane-heading"><h2>Layer</h2><span>{visibleLayers.length}{shared && `/${maxDrawingLayers}`}</span></div>
      <div ref={layerList} className="studio-layer-list" role="group" aria-label="Daftar layer">
        {[...visibleLayers].reverse().map(layer => (
          <div className="studio-layer-row" key={layer.id} data-layer-id={layer.id}
            data-drop={layerDrop?.id === String(layer.id) ? (layerDrop.above ? "above" : "below") : undefined}>
            <div className="studio-layer-bar" data-active={layer.id === activeLayer.id}
              data-dragging={draggedLayer?.id === String(layer.id)}
              style={draggedLayer?.id === String(layer.id) ? { translate: `0 ${draggedLayer.offset}px` } : undefined}>
              <button type="button" className="studio-layer-visibility" disabled={layerLocked}
                aria-label={`${layer.visible ? "Sembunyikan" : "Tampilkan"} ${layer.name}`}
                onClick={() => editLayer(layer.id, { visible: !layer.visible })}>
                {layer.visible ? <Eye size={15} aria-hidden="true"/> : <EyeOff size={15} aria-hidden="true"/>}
              </button>
              <button type="button" className="studio-layer-select" disabled={layerLocked}
                aria-expanded={openLayerSettings === layer.id} aria-controls={`${layerSettingsId}-${layer.id}`}
                title="Klik untuk membuka pengaturan. Seret ke atas atau ke bawah untuk mengubah urutan."
                onClick={event => {
                  if (pointer.current || (event.detail > 0 && suppressLayerClick.current)) return;
                  setActive(layer.id);
                  setOpenLayerSettings(current => current === layer.id ? null : layer.id);
                }}
                onPointerDown={event => startLayerDrag(event, String(layer.id))}
                onPointerMove={updateLayerDrag}
                onPointerUp={finishLayerDrag}
                onLostPointerCapture={event => {
                  if (layerDrag.current?.pointerId === event.pointerId) clearLayerDrag();
                }}
                onContextMenu={event => event.preventDefault()}
                onKeyDown={event => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  const above = event.key === "ArrowUp";
                  const index = visibleLayers.findIndex(item => item.id === layer.id);
                  const target = visibleLayers[index + (above ? 1 : -1)];
                  if (target) moveLayer(String(layer.id), { id: String(target.id), above });
                }}>
                {"content" in layer && <LayerPreview content={renderLayer(layer, dimensions.width, dimensions.height)}/>}
                <span>{layer.name}</span>
                <ChevronDown size={15} aria-hidden="true"/>
              </button>
            </div>
            <div id={`${layerSettingsId}-${layer.id}`} className="studio-layer-fields" hidden={openLayerSettings !== layer.id}>
              <label>Nama layer
                <input key={layer.name} defaultValue={layer.name} maxLength={60} disabled={layerLocked} onBlur={event => {
                  const name = event.target.value.trim() || layer.name;
                  event.target.value = name;
                  if (name !== layer.name) editLayer(layer.id, { name });
                }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}/>
              </label>
              <label>Opasitas layer
                <input type="range" min="0" max="100" value={layer.opacity} disabled={layerLocked}
                  onChange={event => editLayer(layer.id, { opacity: Number(event.target.value) })}/>
                <output>{layer.opacity}%</output>
              </label>
              <button type="button" className="button studio-layer-delete"
                disabled={layerLocked || visibleLayers.length < 2} onClick={() => removeLayer(layer.id)}>
                <Trash2 size={16} aria-hidden="true"/>Hapus layer
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="drawing-toolbar studio-layer-actions">
        <button type="button" className="button" title="Tambah layer" aria-label="Tambah layer" disabled={layerLocked || sharedLayerLimitReached} onClick={addLayer}><Plus size={16}/></button>
      </div>
    </section>
  );

  const visibleIds = new Set(visibleLayers.map(layer => layer.id));
  const ownUndo = shared?.strokes.findLast(stroke => stroke.author === shared.viewer && !stroke.hidden && visibleIds.has(stroke.layer ?? baseLayerId));
  const ownRedo = shared?.strokes.find(stroke => stroke.author === shared.viewer && stroke.hidden && visibleIds.has(stroke.layer ?? baseLayerId));
  const activeShape = shapeOptions.find(option => option.id === tool);
  const ShapeIcon = activeShape?.icon ?? Shapes;

  function chooseTool(id: Tool) {
    if (layerLocked || pointer.current || elementDrag.current || id === tool) return;
    if (tool === "select") {
      setSelection(null);
      setElementActions(null);
      composite(canvas.current!, layers);
    }
    setSampledColor(null);
    setTool(id);
  }

  const toolButtons = (fullTools ? toolOptions.filter(option => personal || (option.id !== "pen" && option.id !== "select")) : toolOptions.slice(0, 2))
    .map(({ id, label, icon: Icon }) => (
      <button key={id} type="button" className="button" aria-label={label} title={label} aria-pressed={tool === id} disabled={layerLocked}
        onClick={() => chooseTool(id)}><Icon size={16}/>{!fullTools && label}</button>
    ));

  const tools = (
    <>
      {toolButtons.slice(0, 2)}
      {fullTools && <details className="drawing-shape-menu" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }} onKeyDown={event => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }}>
        <summary className="button" aria-label={activeShape ? `Bentuk, ${activeShape.label}` : "Pilih bentuk"}
          title="Pilih bentuk" data-active={Boolean(activeShape)} aria-disabled={layerLocked}
          onClick={event => { if (layerLocked) event.preventDefault(); }}>
          <ShapeIcon size={16} aria-hidden="true"/>
        </summary>
        <div className="drawing-shape-options" role="group" aria-label="Bentuk">
          {shapeOptions.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={tool === id}
            disabled={layerLocked} onClick={event => {
              chooseTool(id);
              const menu = event.currentTarget.closest("details");
              if (menu) {
                menu.open = false;
                menu.querySelector("summary")?.focus();
              }
            }}><Icon size={16} aria-hidden="true"/>{label}</button>)}
        </div>
      </details>}
      {toolButtons.slice(2)}
      <button type="button" className="button" aria-label="Urungkan" title="Urungkan" disabled={layerLocked || !(shared ? ownUndo : history.undo)} onClick={() => {
        if (!shared) restore(previous.current, next.current);
        else if (ownUndo && !pointer.current) shared.setHidden(ownUndo.id, true);
      }}><Undo2 size={17}/></button>
      <button type="button" className="button" aria-label="Ulangi" title="Ulangi" disabled={layerLocked || !(shared ? ownRedo : history.redo)} onClick={() => {
        if (!shared) restore(next.current, previous.current);
        else if (ownRedo && !pointer.current) shared.setHidden(ownRedo.id, false);
      }}><Redo2 size={17}/></button>
    </>
  );
  const settings = (
    <>
      <label>Warna <input type="color" value={color} disabled={disabled} onChange={event => setColor(event.target.value)}/>{fullTools && <output>{color.toUpperCase()}</output>}</label>
      <label>Ukuran <input type="range" min="1" max="100" value={size} disabled={disabled} onChange={event => setSize(Number(event.target.value))}/><output>{size} px</output></label>
      {tool === "brush" && <label>Haluskan goresan <input type="checkbox" checked={stabilize} disabled={disabled}
        onChange={event => setStabilize(event.target.checked)}/></label>}
      {fullTools && <>
        <label>Opasitas alat <input type="range" min="1" max="100" value={opacity} disabled={disabled} onChange={event => setOpacity(Number(event.target.value))}/><output>{opacity}%</output></label>
        {tool === "brush" && <label>Tekstur <select value={texture} disabled={disabled} onChange={event => setTexture(event.target.value as Texture)}>
          <option value="solid">Halus</option><option value="pencil">Pensil berbutir</option><option value="spray">Semprot</option>
        </select></label>}
        {activeShape && tool !== "line" &&
          <label>Isi bentuk <input type="checkbox" checked={fill} disabled={disabled} onChange={event => setFill(event.target.checked)}/></label>}
      </>}
    </>
  );
  const surface = (
    <>
      {error ? <p role="alert">{error}</p> : !ready && <p role="status">Memuat gambar draf…</p>}
      <div ref={viewport} className="drawing-surface" data-pan={fullTools && tool === "hand" ? (panning ? "dragging" : "ready") : undefined}
        onPointerDown={event => {
          if (!fullTools || tool !== "hand" || !event.isPrimary || event.button !== 0 || panStart.current) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          panStart.current = { id: event.pointerId, x: event.clientX - pan.x, y: event.clientY - pan.y };
          setPanning(true);
        }}
        onPointerMove={event => {
          const start = panStart.current;
          if (start?.id === event.pointerId) setPan({ x: event.clientX - start.x, y: event.clientY - start.y });
        }}
        onLostPointerCapture={event => {
          if (panStart.current?.id !== event.pointerId) return;
          panStart.current = null;
          setPanning(false);
        }}>
        <canvas ref={canvas} width={960} height={1200} aria-label="Area gambar" hidden={!ready}
          data-tool-cursor={!disabled && (tool === "eraser" || tool === "brush") ? "" : undefined}
          data-select={tool === "select" ? "" : undefined}
          style={fullTools ? {
            width: shared
              ? `min(94cqw, calc(max(50cqh, 100cqh - 120px) * ${dimensions.width / dimensions.height}), ${dimensions.width}px)`
              : `min(94cqw, ${82 * dimensions.width / dimensions.height}cqh, ${dimensions.width}px)`,
            scale: zoom,
            translate: `${pan.x}px ${pan.y}px`,
          } : undefined}
          onPointerEnter={positionToolCursor}
          tabIndex={tool === "pen" || tool === "select" ? 0 : undefined}
          onKeyDown={event => {
            if (tool === "select" && (event.key === "Delete" || event.key === "Backspace")) {
              event.preventDefault();
              removeSelectedElement();
              return;
            }
            if (tool !== "pen" || !penPoints.length) return;
            if (event.key === "Enter") commitPenPath();
            else if (event.key === "Escape") cancelPenPath();
            else return;
            event.preventDefault();
          }}
          onPointerLeave={hideToolCursor}
          onPointerDown={event => {
            if (!event.isPrimary) return;
            positionToolCursor(event);
            if (tool !== "eyedropper" && sampledColor) setSampledColor(null);
            if (elementActions !== "move") setElementActions(null);
            startElementHold(event);
            if (tool === "select") selectElement(event);
            else draw(event, true);
          }}
          onPointerMove={event => {
            positionToolCursor(event);
            const hold = elementHold.current;
            if (hold?.id === event.pointerId && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 6) {
              clearElementHold(event.pointerId);
            }
            const drag = elementDrag.current;
            const node = penNodeDrag.current;
            if (node?.pointerId === event.pointerId) {
              const surface = event.currentTarget;
              const bounds = surface.getBoundingClientRect();
              const point = {
                x: Math.max(0, Math.min(surface.width, (event.clientX - bounds.left) * surface.width / bounds.width)),
                y: Math.max(0, Math.min(surface.height, (event.clientY - bounds.top) * surface.height / bounds.height)),
              };
              setPenPoints(points => points.map((item, index) => index === node.index ? point : item));
            } else if (drag?.pointerId === event.pointerId) setElementOffset(getElementOffset(event, drag));
            else draw(event);
          }}
          onPointerUp={event => {
            clearElementHold(event.pointerId);
            if (event.isPrimary && event.pointerType === "touch") hideToolCursor();
            if (penNodeDrag.current?.pointerId === event.pointerId) penNodeDrag.current = null;
            dropElement(event);
            finish(event);
          }}
          onContextMenu={event => {
            if (personal && (elementHold.current || elementActions)) event.preventDefault();
          }}
          onPointerCancel={event => { clearElementHold(event.pointerId); if (event.isPrimary) hideToolCursor(); dropElement(event, true); finish(event, true); }}
          onLostPointerCapture={event => {
            clearElementHold(event.pointerId);
            if (penNodeDrag.current?.pointerId === event.pointerId) penNodeDrag.current = null;
            dropElement(event, true);
            finish(event, true);
          }}/>
        {!disabled && (tool === "eraser" || tool === "brush") && <span key={tool} ref={toolCursor}
          className="drawing-tool-cursor" hidden aria-hidden="true"/>}
      </div>
    </>
  );
  const actions = (
    <footer className="drawing-toolbar">
      {personal && <>
        <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void importImage(file);
        }}/>
        <button type="button" className="button" disabled={layerLocked}
          onClick={() => imageInput.current?.click()}><ImagePlus size={16} aria-hidden="true"/>{importing ? "Mengimpor…" : "Impor gambar"}</button>
      </>}
      <button type="button" className="button primary" disabled={layerLocked || (shared ? !shared.canSave || !shared.needsSave : !dirty)} onClick={saveDrawing}><Save size={16}/>{saving ? "Menyimpan gambar…" : "Simpan gambar ke draf"}</button>
      <button type="button" className="button" disabled={layerLocked} onClick={downloadDrawing}><Download size={16}/>Unduh PNG</button>
      {source && <small>Gambar yang diedit di kanvas disimpan dengan sisi terpanjang maksimal 1.440 px.</small>}
    </footer>
  );
  const formatSize = ({ width, height }: CanvasSize) => `${width} × ${height} px`;
  function openCanvasSize() {
    setSizeDraft({ width: String(dimensions.width), height: String(dimensions.height) });
    setSizeFormat(canvasSizes.find(size => size.width === dimensions.width && size.height === dimensions.height)?.label ?? "");
    canvasSizeDialog.current?.showModal();
  }
  const artworkActions = <section className="collab-pane studio-editor-actions">
    <h2>Karya</h2>
    {actions}
  </section>;

  if (sidebar) return (
    <div className={shared ? "collab-canvas-grid shared-editor" : "collab-canvas-grid"}>
      {personal && <aside className="collab-project-pane" id="studio-layers">
        {draftPicker}
        {fullTools && layerPanel}
      </aside>}
      <section className="collab-stage" aria-label={title || "Kanvas gambar"}>
        <div className="collab-stage-label">
          <div>
            {titleControl ?? <strong>{title || "Kanvas bersama"}</strong>}
            {ready && (personal
              ? <button type="button" className="studio-canvas-size-button" aria-haspopup="dialog"
                  aria-label={`Ubah ukuran kanvas, ${formatSize(dimensions)}`} disabled={layerLocked} onClick={openCanvasSize}>
                  {formatSize(dimensions)} <ChevronDown size={14} aria-hidden="true"/>
                </button>
              : <span>{formatSize(dimensions)}</span>)}
          </div>
          {fullTools && <div className="studio-zoom" role="group" aria-label="Zoom kanvas">
            <button type="button" className="button" aria-label="Perkecil kanvas" title="Perkecil kanvas" disabled={!ready || zoom <= minZoom} onClick={() => stepZoom(-1)}><Minus size={15}/></button>
            <output aria-label="Persentase zoom" aria-live="off">{Math.round(zoom * 100)}%</output>
            <button type="button" className="button" aria-label="Perbesar kanvas" title="Perbesar kanvas" disabled={!ready || zoom >= maxZoom} onClick={() => stepZoom(1)}><Plus size={15}/></button>
            <button type="button" className="button" title="Pusatkan dan sesuaikan kanvas" disabled={!ready} onClick={fitCanvas}>Pas</button>
          </div>}
        </div>
        {personal && <dialog ref={canvasSizeDialog} className="studio-canvas-size" aria-labelledby={canvasSizeTitleId}>
          <form onSubmit={event => {
            event.preventDefault();
            const size = { width: Number(sizeDraft.width), height: Number(sizeDraft.height) };
            if (layerLocked || ![size.width, size.height].every(side =>
              Number.isInteger(side) && side >= 1 && side <= maxDrawingSide)) return;
            resizeCanvas(size);
            canvasSizeDialog.current?.close();
          }}>
            <h2 id={canvasSizeTitleId}>Ukuran kanvas</h2>
            <label>Format
              <select value={sizeFormat}
                onChange={event => {
                  setSizeFormat(event.target.value);
                  const size = canvasSizes.find(item => item.label === event.target.value);
                  if (size) setSizeDraft({ width: String(size.width), height: String(size.height) });
                }}>
                <option value="">Kustom</option>
                {canvasSizes.map(size => <option key={size.label} value={size.label}>
                  {size.label} · {formatSize(size)}
                </option>)}
              </select>
            </label>
            <div className="studio-canvas-size-fields">
              <label>Lebar (px)
                <input type="number" min={1} max={maxDrawingSide} required value={sizeDraft.width}
                  onChange={event => {
                    setSizeFormat("");
                    setSizeDraft({ ...sizeDraft, width: event.target.value });
                  }}/>
              </label>
              <label>Tinggi (px)
                <input type="number" min={1} max={maxDrawingSide} required value={sizeDraft.height}
                  onChange={event => {
                    setSizeFormat("");
                    setSizeDraft({ ...sizeDraft, height: event.target.value });
                  }}/>
              </label>
            </div>
            <div className="drawing-toolbar">
              <button type="button" className="button" onClick={() => canvasSizeDialog.current?.close()}>Batal</button>
              <button type="submit" className="button primary">Terapkan</button>
            </div>
          </form>
        </dialog>}
        {surface}
        <div className="studio-eyedropper-status" aria-live="polite" aria-atomic="true">
          {tool === "eyedropper" && <span>Klik atau ketuk warna di kanvas.</span>}
          {sampledColor && <span><i aria-hidden="true" style={{ backgroundColor: sampledColor }}/>
            Warna kuas {sampledColor.toUpperCase()}</span>}
        </div>
        {elementActions && selectedElement && tool === "select" && <div className="studio-element-actions"
          role="group" aria-label="Pengaturan elemen">
          <div className="drawing-toolbar">
            <button type="button" className="button" aria-pressed={elementActions === "move"}
              onClick={() => setElementActions("move")}>Pindahkan</button>
            <button type="button" className="button" aria-pressed={elementActions === "edit"}
              onClick={() => setElementActions("edit")}>Edit</button>
            <button type="button" className="button" aria-label="Tutup pengaturan elemen"
              onClick={() => setElementActions(null)}><X size={16} aria-hidden="true"/></button>
          </div>
          {elementActions === "move" && <small>Seret elemen ke posisi baru.</small>}
          {elementActions === "edit" && <div className="studio-element-fields">
            <label>Warna <input type="color" value={selectedElement.color}
              onChange={event => updateSelectedElement({ color: event.target.value })}/></label>
            <label>Ketebalan <input type="range" min={1} max={100} value={selectedElement.size}
              onChange={event => updateSelectedElement({ size: Number(event.target.value) })}/></label>
            {selectedElement.tool !== "line" && selectedElement.tool !== "brush" && <label>Isi bentuk <input type="checkbox" checked={selectedElement.fill}
              onChange={event => updateSelectedElement({ fill: event.target.checked })}/></label>}
            {selectedElement.tool === "pen" && <label>Kelengkungan
              <input type="range" min={0} max={100} value={selectedElement.curvature ?? (selectedElement.fill ? 60 : 0)}
                onChange={event => changeSelectedCurvature(Number(event.target.value))}/>
            </label>}
            <button type="button" className="button" onClick={removeSelectedElement}>Hapus elemen</button>
          </div>}
        </div>}
        <div className="drawing-toolbar collab-floating-tools" role="group" aria-label="Alat gambar">{tools}</div>
        {!personal && !shared && actions}
      </section>
      <aside className="collab-inspector" id={personal ? "studio-inspector" : shared ? "collab-project-inspector" : undefined}>
        <section className="collab-pane">
          <h2>{activeShape?.label ?? toolOptions.find(option => option.id === tool)?.label}</h2>
          {fullTools && tool !== "hand" && tool !== "pen" && tool !== "select" && <div className="studio-brush-preview" aria-hidden="true">
            <span style={{ backgroundColor: tool === "brush" ? color : "var(--line)", height: Math.min(size, 24) }}/>
          </div>}
          <div className="drawing-toolbar">{tool === "hand"
            ? <button className="button" type="button" onClick={fitCanvas}>Pusatkan kanvas</button>
            : tool === "select"
              ? <>
                {selectedElement?.tool === "pen" && <label>Kelengkungan
                  <input type="range" min="0" max="100" disabled={disabled}
                    value={selectedElement.curvature ?? (selectedElement.fill ? 60 : 0)}
                    onChange={event => changeSelectedCurvature(Number(event.target.value))}/>
                  <output>{selectedElement.curvature ?? (selectedElement.fill ? 60 : 0)}%</output>
                </label>}
                <button className="button" type="button" disabled={disabled || !selectedElement} onClick={removeSelectedElement}>Hapus elemen</button>
              </>
              : settings}</div>
          {tool === "pen" && <>
            <p className="quiet">Klik untuk menambah titik. Seret titik untuk mengubah jalurnya.</p>
            <div className="drawing-toolbar"><label>Kelengkungan
              <input type="range" min="0" max="100" value={penCurvature} disabled={disabled}
                onChange={event => setPenCurvature(Number(event.target.value))}/>
              <output>{penCurvature}%</output>
            </label></div>
            <div className="drawing-toolbar">
              <button type="button" className="button primary" disabled={disabled || penPoints.length < 2} onClick={commitPenPath}>Selesai</button>
              <button type="button" className="button" disabled={!penPoints.length} onClick={cancelPenPath}>Batal</button>
            </div>
          </>}
          {tool !== "hand" && (fullTools || palette.length > 0) && <div className="collab-swatches" role="group" aria-label="Palet karya">
            {[...new Set([...palette, ...["#30251e", "#ffffff", "#a45732", "#ed795e", "#efa83d", "#578457"]])].map(value => <button type="button" key={value} title={value} aria-label={`Gunakan warna ${value}`} aria-pressed={color === value}
              style={{ backgroundColor: value }} disabled={disabled} onClick={() => setColor(value)}/>)}
          </div>}
        </section>
        {!personal && fullTools && layerPanel}
        {personal && artworkActions}
        {sidebar}
        {shared && artworkActions}
      </aside>
    </div>
  );

  return (
    <section className="drawing-workspace" aria-labelledby="drawing-title">
      <header className="drawing-toolbar">
        <h2 id="drawing-title">Kanvas gambar</h2>
        {onClose && <button type="button" className="button" disabled={busy || saving} onClick={() => {
          if (!dirty || window.confirm("Tutup kanvas tanpa menyimpan perubahan gambar?")) onClose();
        }}><X size={16}/>Tutup</button>}
      </header>
      <div className="drawing-toolbar" role="group" aria-label="Alat gambar">{tools}{settings}</div>
      {surface}
      {actions}
    </section>
  );
}
