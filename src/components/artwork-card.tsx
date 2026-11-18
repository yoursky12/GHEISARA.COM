import { ArtImage } from "@/components/art-image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Artwork } from "@/lib/catalog";
import { CopyablePalette } from "./copyable-palette";
export function Palette({ colors, showCodes = false }: { colors: string[]; showCodes?: boolean }) {
  if (showCodes) return <CopyablePalette colors={colors}/>;
  return <span className="palette" aria-label={`Palet warna: ${colors.join(", ")}`}>{colors.map(c => <span key={c} style={{ background: c }} title={c}/>)}</span>;
}
export function ArtworkCard({ artwork: a, index = 0 }: { artwork: Artwork; index?: number }) {
  return <article className="art-card"><Link href={`/artworks/${a.id}`} className="art-image-link"><ArtImage src={a.image.startsWith("/") ? a.image : `/art/${a.image}.jpg`} alt={`${a.title}, karya ${a.artist}`} loading={index < 4 ? "eager" : "lazy"} width="640" height="480"/><span className="image-tag">{a.style}</span><span className="image-open"><ArrowUpRight size={18}/></span></Link><div className="art-info"><span className="art-medium">{a.medium} <span>Â· {a.year}</span></span><h3><Link href={`/artworks/${a.id}`}>{a.title}</Link></h3><div className="art-bottom"><Link href={`/creators/${a.username}`} className="creator"><span className={`avatar avatar-${index % 4}`}>{a.artist.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>{a.artist}</Link><Palette colors={a.colors}/></div></div><p className="art-appreciations">? {a.appreciations ?? 0} apresiasi</p>{a.creators && a.creators.length > 1 && <div className="coauthor-links"><span>KOLABORASI</span>{a.creators.map(c => <Link key={c.username} href={`/creators/${c.username}`}>{c.name} ?</Link>)}</div>}</article>;
}

