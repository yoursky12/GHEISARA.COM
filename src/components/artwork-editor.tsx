"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Brush, Check, ImagePlus, Save, Upload } from "lucide-react";
import { media, styles, licenses, publicationErrors, type MemberArtwork } from "@/lib/community-model";
import { ArtImage } from "./art-image";
import { Palette } from "./artwork-card";
import { DrawingCanvas } from "./drawing-canvas-client";
type Fields = Pick<MemberArtwork, "title" | "description" | "medium" | "styles" | "era" | "license">;
export function ArtworkEditor({ initial, openCanvas = false }: { initial: MemberArtwork; openCanvas?: boolean }) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({ title: initial.title, description: initial.description, medium: initial.medium, styles: initial.styles, era: initial.era, license: initial.license });
  const [artwork, setArtwork] = useState(initial);
  const [drawing, setDrawing] = useState<{ source?: string } | null>(openCanvas && !initial.drawing ? {
    source: initial.asset ? `/api/media/${initial.id}?v=${initial.revision}` : undefined,
  } : null);
  const drawingDirty = useRef(false);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState(initial.revision ? "Tersimpan" : "Draf baru");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const revision = useRef(initial.revision);
  const current = useRef(fields);
  const acknowledged = useRef(JSON.stringify(fields));
  const pending = useRef<Promise<void> | null>(null);
  const blocked = useRef(false);
  const upload = useRef<XMLHttpRequest | null>(null);
  useEffect(() => { current.current = fields; }, [fields]);
  const save = useCallback(async (ensureDraft = false) => {
    while (pending.current) await pending.current;
    if (blocked.current) throw new Error("Muat ulang halaman untuk menyelesaikan konflik versi.");
    const snapshot = JSON.stringify(current.current);
    if (snapshot === acknowledged.current && (!ensureDraft || revision.current > 0)) return;
    const task = (async () => {
      setStatus("Menyimpan…");
      const response = await fetch(`/api/studio/${initial.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(snapshot), revision: revision.current }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) blocked.current = true; throw new Error(result.message); }
      revision.current = result.artwork.revision;
      acknowledged.current = snapshot;
      setArtwork(result.artwork); setStatus(JSON.stringify(current.current) === snapshot ? "Tersimpan" : "Perubahan belum tersimpan"); setError("");
      window.history.replaceState(null, "", `/studio/drafts/${initial.id}`);
    })();
    pending.current = task;
    try { await task; } finally { if (pending.current === task) pending.current = null; }
  }, [initial.id]);
  useEffect(() => {
    const timer = setTimeout(() => { if (!busy) save().catch(e => { setError(e.message); setStatus("Belum tersimpan"); }); }, 1000);
    return () => clearTimeout(timer);
  }, [fields, save, busy]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (drawingDirty.current || JSON.stringify(current.current) !== acknowledged.current || upload.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const change = (key: keyof Fields, value: string | string[]) => { setFields(f => ({ ...f, [key]: value })); setStatus("Perubahan belum tersimpan"); };
  async function chooseFile(file?: File) {
    if (!file) return false;
    if (artwork.drawing && !window.confirm("Mengganti gambar akan menghapus susunan layer draf ini. Lanjutkan?")) return false;
    if (file.size > 20 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Pilih PNG, JPG, atau WEBP maksimal 20 MB."); return false; }
    setBusy(true); setUploading(true); setError(""); setProgress(0);
    try {
      await save(true);
      const form = new FormData(); form.set("file", file); form.set("revision", String(revision.current));
      const result = await new Promise<{ artwork: MemberArtwork }>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); upload.current = xhr;
        xhr.open("POST", `/api/studio/${initial.id}`);
        xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
        xhr.onload = () => { try { const data = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) resolve(data); else { if (xhr.status === 409) blocked.current = true; reject(new Error(data.message)); } } catch { reject(new Error("Unggah gagal. Pilih file kembali untuk mencoba lagi.")); } };
        xhr.onerror = () => reject(new Error("Koneksi terputus. Pilih file kembali untuk mencoba lagi."));
        xhr.onabort = () => reject(new Error("Unggah dibatalkan. Metadata draf tetap tersimpan."));
        xhr.send(form);
      });
      revision.current = result.artwork.revision; setArtwork(result.artwork); setStatus("Tersimpan");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Unggah gagal."); return false; }
    finally { upload.current = null; setUploading(false); setBusy(false); }
  }
  async function review() {
    setBusy(true);
    try { await save(); const errors = publicationErrors({ ...artwork, ...current.current }); if (errors.length) throw new Error(errors.join(" ")); setStep(2); setError(""); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function publish() {
    if (initial.projectId) { router.push(`/studio/collab/projects/${initial.projectId}`); router.refresh(); return; }
    setBusy(true); setError("");
    try {
      await save();
      const response = await fetch(`/api/studio/${initial.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message);
      router.push(`/artworks/${result.id}`); router.refresh();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  const paletteJSON = JSON.stringify({ version: "quantized-rgb-v1", colors: artwork.colors.map(hex => ({ hex, rgb: [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) })) }, null, 2);
  return <div className="page-wrap studio-page"><Link href={initial.projectId ? `/studio/collab/projects/${initial.projectId}` : initial.revision ? `/studio?draft=${initial.id}` : "/studio"} className="back-link"
    onNavigate={event => { if (drawingDirty.current && !window.confirm("Keluar tanpa menyimpan perubahan gambar?")) event.preventDefault(); }}>
    <ArrowLeft size={16}/>{initial.projectId ? "Kembali ke proyek" : "Kembali ke Studio"}</Link>
    <div className="studio-heading"><div><span className="eyebrow">RUANG UNTUK CERITAMU</span><h1>{step === 1 ? "Bagikan sudut pandangmu." : "Satu langkah menuju dunia."}</h1><p>{step === 1 ? "Setiap warna punya cerita. Mulai dari karyamu." : "Periksa gambar, atribusi, dan lisensi sebelum terbit."}</p></div><span className="save-status" role="status"><Check size={15}/>{status}</span></div>
    <ol className="upload-steps"><li aria-current={step === 1 ? "step" : undefined}><span>01</span>Karya & cerita</li><li aria-current={step === 2 ? "step" : undefined}><span>02</span>Tinjau & terbitkan</li></ol>
    {error && <div className="inline-notice" role="alert">{error} {<button className="button" onClick={() => window.location.reload()}>Muat versi server</button>}</div>}
    {step === 1 && <div className="drawing-entry">{drawing ? <DrawingCanvas source={drawing.source} busy={busy} onSave={chooseFile}
      onDirty={dirty => { drawingDirty.current = dirty; }} onClose={() => { drawingDirty.current = false; setDrawing(null); }}/>
      : artwork.drawing ? <Link className="button" href={`/studio?draft=${artwork.id}`}><Brush size={16}/>Edit layer di Studio</Link>
      : <button type="button" className="button" disabled={busy} onClick={() => setDrawing({
        source: artwork.asset ? `/api/media/${artwork.id}?v=${artwork.revision}` : undefined,
      })}><Brush size={16}/>{artwork.asset ? "Lanjutkan di kanvas" : "Buka kanvas gambar"}</button>}</div>}
    <div className="editor-grid"><section className="editor-visual"><div className="upload-preview">{artwork.asset ? <ArtImage src={`/api/media/${initial.id}?v=${artwork.revision}`} alt={fields.title || "Pratinjau karya"} width={artwork.width} height={artwork.height}/> : <div className="upload-placeholder"><ImagePlus size={42}/><h2>Mulai dengan sebuah karya</h2><p>PNG, JPG, WEBP · Maksimal 20 MB<br/>Maksimal 40 megapiksel</p></div>}</div>
      {step === 1 && !drawing && <label className="button primary upload-file"><Upload size={16}/>{artwork.asset ? "Ganti gambar" : "Pilih gambar"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ""; }}/></label>}
      {uploading && <div role="status"><progress value={progress} max={100}/><span>{progress}% {progress === 100 ? "· Memproses gambar…" : "· Mengunggah"}</span><button className="button" onClick={() => upload.current?.abort()}>Batalkan unggah</button></div>}
      {artwork.width && <p className="quiet">{artwork.width} × {artwork.height} px · Pratinjau WEBP</p>}
      <div className="palette-panel"><span className="eyebrow">PALET KARYAMU</span>{artwork.colors.length ? <><Palette colors={artwork.colors}/><p className="quiet">Warna dominan diekstrak dari gambar; piksel transparan diabaikan.</p><a className="text-link" href={`data:application/json;charset=utf-8,${encodeURIComponent(paletteJSON)}`} download="geishara-palette.json">Unduh palet JSON ↗</a></> : <p>Palet akan muncul setelah gambar diunggah.</p>}</div></section>
      <section className="editor-fields">{step === 1 ? <><label>Judul karya <span>*</span><input maxLength={120} value={fields.title} onChange={e => change("title", e.target.value)} placeholder="Beri nama untuk ceritamu"/></label><label>Deskripsi<textarea rows={5} maxLength={5000} value={fields.description} onChange={e => change("description", e.target.value)} placeholder="Apa yang ingin kamu ceritakan melalui karya ini?"/><small>{fields.description.length}/5.000 karakter</small></label><div className="field-pair"><label>Medium <span>*</span><select value={fields.medium} onChange={e => change("medium", e.target.value)}><option value="">Pilih medium</option>{media.map(m => <option key={m}>{m}</option>)}</select></label><label>Era<select value={fields.era} onChange={e => change("era", e.target.value)}><option value="">Opsional</option>{["Klasik", "Modern", "Kontemporer"].map(m => <option key={m}>{m}</option>)}</select></label></div><fieldset><legend>Gaya seni <span>*</span> <small>Pilih 1–5</small></legend><div className="style-choices">{styles.map(s => <label key={s}><input type="checkbox" checked={fields.styles.includes(s)} disabled={!fields.styles.includes(s) && fields.styles.length >= 5} onChange={e => change("styles", e.target.checked ? [...fields.styles, s] : fields.styles.filter(x => x !== s))}/>{s}</label>)}</div></fieldset><label>Lisensi <span>*</span><select disabled={Boolean(initial.projectId)} value={fields.license} onChange={e => change("license", e.target.value)}><option value="">Pilih lisensi</option>{licenses.map(l => <option key={l}>{l}</option>)}</select></label><p className="quiet">Unggah karya milikmu sendiri. Untuk karya bersama, mulai dari Collab Hub agar persetujuan partner tercatat.</p></> : <><span className="eyebrow">TINJAUAN PUBLIKASI</span><h2>{fields.title}</h2><p className="collab-text">{fields.description || "Tanpa deskripsi."}</p><dl className="metadata"><div><dt>Medium</dt><dd>{fields.medium}</dd></div><div><dt>Era</dt><dd>{fields.era || "Tidak ditentukan"}</dd></div><div><dt>Gaya</dt><dd>{fields.styles.join(", ")}</dd></div><div><dt>Lisensi</dt><dd>{fields.license}</dd></div></dl><p className="inline-notice">Setelah diterbitkan, karya tampil di profil publik, discovery, dan perhitungan Art DNA-mu.</p></>}
      <div className="editor-actions">{step === 1 ? <><button className="button" disabled={busy} onClick={() => save(true).catch(e => setError(e.message))}><Save size={16}/>Simpan draf</button><button className="button primary" disabled={busy || Boolean(drawing)} onClick={review}>Tinjau karya<ArrowRight size={16}/></button></> : <><button className="button" disabled={busy} onClick={() => setStep(1)}>Kembali edit</button><button className="button primary" disabled={busy} onClick={publish}>{busy ? "Menerbitkan…" : initial.projectId ? "Kembali untuk persetujuan" : "Terbitkan karya"}<ArrowRight size={16}/></button></>}</div></section></div></div>;
}
