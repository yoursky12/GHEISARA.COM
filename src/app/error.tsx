"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="page-wrap"><section className="empty-state" role="alert"><h1>Halaman belum dapat dimuat.</h1><p>Coba lagi untuk memuat data terbaru. Draf yang sudah tersimpan tetap tersedia di Studio.</p><button className="button primary" onClick={reset}>Coba lagi</button></section></div>; }
