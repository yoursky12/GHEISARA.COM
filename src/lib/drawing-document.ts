export const maxDrawingLayers = 8;
export const maxDrawingSide = 1440;
export const maxDrawingSheetBytes = 32 * 1024 * 1024;
export const maxDrawingManifestBytes = 2 * 1024 * 1024;
export const maxDrawingElements = 32;
export const maxDrawingBrushPoints = 512;
export const drawingBrushTextures = ["solid", "pencil", "spray"] as const;
export const shapeTools = ["line", "rectangle", "ellipse", "triangle", "diamond", "pentagon", "hexagon", "star", "arrow"] as const;
export type ShapeTool = typeof shapeTools[number];
export const drawingElementTools = [...shapeTools, "pen", "brush"] as const;
export type DrawingElement = {
  tool: typeof drawingElementTools[number];
  points: { x: number; y: number }[];
  color: string;
  size: number;
  opacity: number;
  fill: boolean;
  curvature?: number;
  texture?: typeof drawingBrushTextures[number];
  smooth?: boolean;
};

export type DrawingLayerInfo = {
  name: string;
  visible: boolean;
  opacity: number;
  elements?: DrawingElement[];
};

export type DrawingDocument = {
  asset: string;
  width: number;
  height: number;
  layers: DrawingLayerInfo[];
};

export type EditableDrawing = Pick<DrawingDocument, "width" | "height" | "layers">;

export function parseEditableDrawing(value: string): EditableDrawing | null {
  if (value.length > maxDrawingManifestBytes) return null;
  try {
    const { width, height, layers } = JSON.parse(value);
    if (![width, height].every(side => Number.isInteger(side) && side > 0 && side <= maxDrawingSide)
      || !Array.isArray(layers) || !layers.length) return null;
    const valid = layers.every(layer => layer && typeof layer.name === "string" && layer.name.trim().length > 0
      && layer.name.length <= 60 && typeof layer.visible === "boolean"
      && Number.isInteger(layer.opacity) && layer.opacity >= 0 && layer.opacity <= 100
      && (layer.elements === undefined || Array.isArray(layer.elements)
        && layer.elements.filter((element: DrawingElement) => element?.tool !== "brush").length <= maxDrawingElements
        && layer.elements.every((element: DrawingElement) => element && drawingElementTools.includes(element.tool)
          && typeof element.color === "string" && /^#[0-9a-f]{6}$/i.test(element.color)
          && Number.isInteger(element.size) && element.size >= 1 && element.size <= 100
          && Number.isInteger(element.opacity) && element.opacity >= 0 && element.opacity <= 100
          && typeof element.fill === "boolean" && Array.isArray(element.points) && element.points.length >= (element.tool === "brush" ? 1 : 2)
          && (element.curvature === undefined || element.tool === "pen" && Number.isInteger(element.curvature) && element.curvature >= 0 && element.curvature <= 100)
          && (element.texture === undefined || element.tool === "brush" && drawingBrushTextures.includes(element.texture))
          && (element.smooth === undefined || element.tool === "brush" && typeof element.smooth === "boolean")
          && element.points.length <= (element.tool === "brush" ? maxDrawingBrushPoints : element.tool === "pen" ? 256 : 2)
          && element.points.every(point => point && [point.x, point.y].every(value =>
            Number.isFinite(value) && Math.abs(value) <= maxDrawingSide * 3)))));
    if (!valid) return null;
    return { width, height, layers: layers.map(({ name, visible, opacity, elements }: DrawingLayerInfo) => ({
      name: name.trim(), visible, opacity,
      ...(elements?.length ? { elements: elements.map(({ tool, points, color, size, opacity, fill, curvature, texture, smooth }) => ({
        tool, points: points.map(({ x, y }) => ({ x, y })), color, size, opacity, fill,
        ...(curvature === undefined ? {} : { curvature }),
        ...(texture === undefined ? {} : { texture }),
        ...(smooth === undefined ? {} : { smooth }),
      })) } : {}),
    })) };
  } catch {
    return null;
  }
}
