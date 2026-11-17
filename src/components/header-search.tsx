"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
type Results = { artworks: { id:string;title:string;artist:string }[]; creators: { name:string;username:string }[] };
export function HeaderSearch() {
  const [query,setQuery] = useState(""); const [open,setOpen] = useState(false);
  const [results,setResults] = useState<Results | null>(null);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try { const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`,{signal:controller.signal}); if (response.ok) { const data = await response.json(); if (!controller.signal.aborted) setResults(data); } } catch { /* The form still supports full-page search. */ }
    },300);
    return () => { clearTimeout(timer); controller.abort(); };
  },[query]);
  return <div className="header-search-wrap" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}><form action="/art/for-you" className="header-search" role="search"><Search size={17}/><input name="q" value={query} onChange={e => {setQuery(e.target.value);setResults(null);setOpen(true);}} onFocus={() => setOpen(true)} onKeyDown={e => {if(e.key === "Escape")setOpen(false);}} aria-label="Cari karya, kreator, atau gaya" placeholder="Cari inspirasi di sini..." aria-controls="search-suggestions"/><button type="submit" aria-label="Cari">↵</button></form>{open && results && <div className="search-suggestions" id="search-suggestions"><span className="eyebrow">KARYA</span>{results.artworks.map(a => <Link key={a.id} href={`/artworks/${a.id}`} onClick={() => setOpen(false)}><strong>{a.title}</strong><small>{a.artist}</small></Link>)}{!results.artworks.length && <p>Belum ada karya yang cocok.</p>}<span className="eyebrow">KREATOR</span>{results.creators.map(c => <Link key={c.username} href={`/creators/${c.username}`} onClick={() => setOpen(false)}>{c.name}<small>@{c.username}</small></Link>)}<Link href={`/creators?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)}>Lihat hasil pencarian kreator →</Link></div>}</div>;
}
