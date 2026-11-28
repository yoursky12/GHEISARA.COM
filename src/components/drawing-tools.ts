import type { CanvasStroke } from "@/lib/shared-canvas";
import type { ShapeTool } from "@/lib/drawing-document";

export type Tool = ShapeTool | "brush" | "eraser" | "eyedropper" | "hand" | "pen" | "select";
export type Texture = "solid" | "pencil" | "spray";
export type Point = { x: number; y: number };

export function stabilizeBrushPoint(previous: Point, current: Point): Point {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const distance = Math.hypot(dx, dy);
  // Keep the correction small so the stroke follows the intended shape.
  const correction = distance > 0 ? Math.min(0.4, 3 / distance) : 0;
  return { x: current.x - dx * correction, y: current.y - dy * correction };
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function traceBrushCurve(ctx: CanvasRenderingContext2D, control: Point, next: Point): Point {
  const midpoint = { x: (control.x + next.x) / 2, y: (control.y + next.y) / 2 };
  ctx.quadraticCurveTo(control.x, control.y, midpoint.x, midpoint.y);
  return midpoint;
}

export function tracePenPath(ctx: CanvasRenderingContext2D, points: Point[], curvature: number) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  const tension = curvature / 360;
  for (let index = 1; index < points.length; index++) {
    const to = points[index];
    if (!tension) {
      ctx.lineTo(to.x, to.y);
      continue;
    }
    const from = points[index - 1];
    const before = points[Math.max(0, index - 2)];
    const after = points[Math.min(points.length - 1, index + 1)];
    ctx.bezierCurveTo(
      from.x + (to.x - before.x) * tension, from.y + (to.y - before.y) * tension,
      to.x - (after.x - from.x) * tension, to.y - (after.y - from.y) * tension,
      to.x, to.y,
    );
  }
  ctx.stroke();
}

function traceLegacyBrush(ctx: CanvasRenderingContext2D, points: Point[]) {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  let previous = first;
  for (let index = 1; index < points.length - 1; index++) {
    const before = points[Math.max(0, index - 2)];
    const after = points[Math.min(points.length - 1, index + 2)];
    const current = points[index];
    const dx = (before.x + after.x) / 2 - current.x;
    const dy = (before.y + after.y) / 2 - current.y;
    const distance = Math.hypot(dx, dy);
    const weight = distance ? Math.min(0.5, 8 / distance) : 0;
    const adjusted = { x: current.x + dx * weight, y: current.y + dy * weight };
    traceBrushCurve(ctx, previous, adjusted);
    previous = adjusted;
  }
  traceBrushCurve(ctx, previous, last);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

export const smoothBrushWidth = (size: number) => Math.max(1.8, size);
const refinedWeights = [1, 6, 15, 20, 15, 6, 1];
const strongWeights = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];

export function traceSmoothBrush(ctx: CanvasRenderingContext2D, points: Point[], strong = true, spacing = strong ? 9 : 6) {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return;

  // Sample by distance so fast and slow pointer movements get the same smoothing.
  const distances = [0];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    distances.push(distances[index - 1] + Math.hypot(to.x - from.x, to.y - from.y));
  }
  const length = distances[distances.length - 1];
  if (!length) {
    ctx.beginPath();
    ctx.arc(first.x, first.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const steps = Math.min(768, Math.max(1, Math.ceil(length / spacing)));
  const samples = [first];
  let segment = 1;
  for (let index = 1; index < steps; index++) {
    const distance = index * length / steps;
    while (distances[segment] < distance) segment++;
    const ratio = (distance - distances[segment - 1]) / (distances[segment] - distances[segment - 1]);
    const from = points[segment - 1];
    const to = points[segment];
    samples.push({ x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio });
  }
  samples.push(last);

  const weights = strong ? strongWeights : refinedWeights;
  const radius = (weights.length - 1) / 2;
  const total = strong ? 1024 : 64;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  let previous = first;
  for (let index = 1; index < steps; index++) {
    let x = 0;
    let y = 0;
    for (const [offset, weight] of weights.entries()) {
      const sample = samples[Math.max(0, Math.min(steps, index + offset - radius))];
      x += sample.x * weight;
      y += sample.y * weight;
    }
    const next = { x: x / total, y: y / total };
    traceBrushCurve(ctx, previous, next);
    previous = next;
  }
  traceBrushCurve(ctx, previous, last);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

export function paintSharedStroke(ctx: CanvasRenderingContext2D, stroke: CanvasStroke) {
  const [first, ...points] = stroke.points;
  if (!first) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.globalAlpha = (stroke.opacity ?? 100) / 100;
  ctx.fillStyle = ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.smooth === "strong" ? smoothBrushWidth(stroke.size) : stroke.size;
  ctx.lineCap = ctx.lineJoin = "round";
  if (stroke.tool !== "brush" && stroke.tool !== "eraser") {
    traceShape(ctx, stroke.tool, first, points.at(-1) ?? first, Boolean(stroke.filled));
  } else if (stroke.tool === "brush" && stroke.texture && stroke.texture !== "solid") {
    const texture = stroke.texture;
    let seed = 0;
    for (const char of stroke.id) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    paint(ctx, texture, stroke.size, first, first, true, random);
    let previous = first;
    for (const point of points) {
      paint(ctx, texture, stroke.size, previous, point, false, random);
      previous = point;
    }
  } else if (stroke.tool === "brush" && stroke.smooth && points.length) {
    if (stroke.smooth === true) traceLegacyBrush(ctx, stroke.points);
    else traceSmoothBrush(ctx, stroke.points, stroke.smooth === "strong");
  } else {
    ctx.beginPath();
    if (points.length) {
      ctx.moveTo(first.x, first.y);
      for (const point of points) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else {
      ctx.arc(first.x, first.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const polygonPoints = {
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  pentagon: [[0.5, 0], [1, 0.38], [0.81, 1], [0.19, 1], [0, 0.38]],
  hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  star: [[0.5, 0], [0.62, 0.35], [1, 0.38], [0.72, 0.62], [0.81, 1], [0.5, 0.78], [0.19, 1], [0.28, 0.62], [0, 0.38], [0.38, 0.35]],
  arrow: [[0, 0.32], [0.6, 0.32], [0.6, 0], [1, 0.5], [0.6, 1], [0.6, 0.68], [0, 0.68]],
};

export function traceShape(ctx: CanvasRenderingContext2D, tool: Tool, from: Point, to: Point, filled: boolean) {
  const width = Math.abs(to.x - from.x);
  const height = Math.abs(to.y - from.y);
  const left = Math.min(from.x, to.x);
  const top = Math.min(from.y, to.y);
  ctx.beginPath();
  switch (tool) {
    case "rectangle":
      ctx.rect(left, top, width, height);
      break;
    case "ellipse":
      ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    case "triangle":
      ctx.moveTo(left + width / 2, top);
      ctx.lineTo(left + width, top + height);
      ctx.lineTo(left, top + height);
      ctx.closePath();
      break;
    case "diamond":
    case "pentagon":
    case "hexagon":
    case "star":
    case "arrow": {
      const [[x, y], ...vertices] = polygonPoints[tool];
      ctx.moveTo(left + width * x, top + height * y);
      for (const [px, py] of vertices) ctx.lineTo(left + width * px, top + height * py);
      ctx.closePath();
      break;
    }
    default:
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
  }
  if (filled && tool !== "line") ctx.fill();
  else ctx.stroke();
}

export function paint(ctx: CanvasRenderingContext2D, texture: Texture, size: number, from: Point, to: Point, start: boolean, random = Math.random) {
  if (texture === "solid") {
    ctx.beginPath();
    if (start) {
      ctx.arc(to.x, to.y, size / 2, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    return;
  }
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.min(64, Math.max(1, Math.ceil(distance / Math.max(1, size / 7))));
  const particles = texture === "pencil" ? 14 : 24;
  const radius = texture === "pencil" ? 0.38 : 0.65;
  for (let step = 1; step <= steps; step++) {
    const x = from.x + (to.x - from.x) * step / steps;
    const y = from.y + (to.y - from.y) * step / steps;
    for (let i = 0; i < particles; i++) {
      const angle = random() * 2 * Math.PI;
      const offset = Math.sqrt(random()) * size * radius;
      const grain = Math.max(0.7, size * (texture === "pencil" ? 0.045 : 0.065) * random());
      ctx.fillRect(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset, grain, grain);
    }
  }
}
