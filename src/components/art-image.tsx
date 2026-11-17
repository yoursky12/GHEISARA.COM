"use client";
import { useState } from "react";

export function ArtImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="image-fallback" role="img" aria-label={props.alt}><span>✳</span><span>Gambar belum tersedia</span></div>;
  // Local, already resized collection assets; their source dimensions vary by work.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ""} onError={() => setFailed(true)}/>;
}
