"use client";

import dynamic from "next/dynamic";

export const DrawingCanvas = dynamic(() => import("./drawing-canvas").then(module => module.DrawingCanvas), {
  ssr: false,
  loading: () => <p role="status">Memuat kanvas…</p>,
});
