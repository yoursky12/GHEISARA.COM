# Status implementasi Gheisara

10 November 2026. Seluruh PRD v1.0 telah dibaca. Ini tahap awal pengembangan lokal, belum memenuhi Definition of Done seluruh P0 dan belum dipublikasikan.

## Keputusan tahap awal

- Mempertahankan Next.js 16.4.5, React, TypeScript, serta lucide-react yang sudah terpasang. Perubahan pengguna pada package.json/package-lock dipertahankan.
- Mengerjakan alur discovery publik sebagai potongan pertama yang dapat ditinjau. Tidak menganggap proposal BASELINE sebagai keputusan bisnis final.
- Desain awal mengacu teks PRD. Tautan Figma tidak dapat diakses; kesesuaian piksel belum diverifikasi.
- Katalog studi statis dengan aset lokal domain publik, bukan akun, statistik, atau unggahan pengguna produksi. Seniman historis tidak dibuat seolah akun aktif. Palet adalah contoh editorial.
- Belum memilih provider database/auth/email/object storage/realtime. Tidak ada biaya layanan baru atau perubahan hak akses.
- Font menggunakan Segoe UI/Arial dan Georgia sebagai fallback lokal; berkas Inter dan Lora belum disediakan.

## Pemetaan requirement

| Requirement | Implementasi awal | Status / verifikasi |
|---|---|---|
| SHELL-01–02 | `components/shell.tsx`, navigasi, pencarian submit, menu ponsel, unggah menuju login | Navigasi berfungsi; search debounce 300 ms belum diimplementasikan |
| SHELL-03 | URL filter multi-pilih/sort/query pada `/art/[feed]` | URL dapat dibagikan/refresh; riwayat browser native; tes serialisasi |
| ART-01–03 | Hero, kartu, jumlah hasil, filter era/medium/gaya, reset, sort | Berfungsi pada katalog studi; warna/lisensi/pagination UI/rekomendasi personal belum tersedia |
| Kontrak daftar | `GET /api/artworks` | Filter server, `items/nextCursor/total`, limit 1–50, invalid cursor 400; dataMode eksplisit |
| FOLLOW-01–05 | `/art/following` | State pengunjung; follow dan feed personal belum tersedia |
| POPULAR-01–05 | `/art/popular` | Koleksi editorial dengan notice; belum ada ranking/periode/apresiasi |
| GALLERY-01–05 | `/art/collaborations` | State kosong jujur; tidak memberi label kolaborasi pada karya solo |
| DETAIL-01 | `/artworks/[id]` | Gambar, deskripsi editorial, metadata, palet, tautan seniman; ID tak dikenal 404 |
| DETAIL-02–05 | CTA apresiasi/simpan ke `/auth/login` | Tidak melakukan mutasi palsu; komentar/koleksi belum tersedia |
| PROFILE-01–03 | `/creators/[username]` | Profil referensi historis + karya terkait; bukan akun aktif; tidak ada follow/ajakan palsu |
| AUTH-01–07 | `/auth/[action]` | Notice kesiapan, tidak mengumpulkan password atau membuat sesi palsu |
| UPLOAD/DRAFT/PUBLISH/DNA | Unggah menuju login | Belum diimplementasikan; tidak menyimpan file atau menghitung DNA palsu |
| REQUEST/HUB/WORKSPACE/APPROVAL | `/collab` | Halaman pengantar status; layanan privat belum diimplementasikan |
| LEARN-01–04 | `/learn` | Katalog rencana; materi belum tersedia, tidak membuat progres/kuis palsu |
| State/a11y | Empty, 404, fallback gambar, focus, skip link, native details/checkbox | CSS responsif 4/2/1; loading/error fetch belum diperlukan untuk katalog lokal sinkron; pengujian browser/keyboard/360px belum dilakukan |

## Arsitektur

`src/lib/catalog.ts` menyimpan model katalog dan fungsi domain pencarian/filter/sort. Server Components dan API memakai fungsi yang sama; UI berada di `src/components`. Tidak ada data privat, sesi, atau mutasi pada implementasi awal ini. JSON API merupakan katalog contoh, bukan kontrak backend produksi lengkap.

Query: kategori AND, opsi dalam satu kategori OR; nilai taxonomy tidak dikenal diabaikan; default urutan kurator; `sort=title` untuk A–Z. Pencarian mencakup judul, nama seniman, dan gaya. Konten pengguna tidak dirender sebagai HTML.

## Tahap berikutnya

Validasi tahap ini: `npm run build` lulus (termasuk TypeScript), lima unit test katalog lulus, dan `scripts/smoke.cjs` lulus pada server produksi lokal. Smoke mencakup 11 halaman publik, filter/pagination API, cursor invalid 400, ID/route invalid 404, redirect unggah ke login, pencarian kosong, dan kedelapan gambar lokal. Browser visual, keyboard, viewport, audit WCAG, serta E2E akun/privasi belum diuji; backend terkait belum tersedia.

1. Fondasi PostgreSQL dan migration untuk User/Session/Profile/Artwork/Revision/Media/Taxonomy. Pilih auth teruji, email verifikasi/reset dan storage berdasarkan keputusan pemilik produk.
2. Implementasikan satu alur akun nyata: register → verifikasi → login → draft/media → review → publish → profil/DNA/discovery, dengan transaksi dan validasi server.
3. Apresiasi, follow, koleksi, komentar dan ranking dari sumber data yang sama; test integrasi ACL/idempotensi dan E2E alur personal.
4. Pengajuan → accept transaksional → workspace privat/vault/chat → final → approval dua anggota yang mengikat versi → satu karya publik.
5. Materi Pathfinder yang disahkan, progres server, notifikasi, serta hardening operasional/aksesibilitas.

Keputusan terbuka PRD tetap terbuka, termasuk kuota/biaya vault, lisensi bersama, retensi, unpublish/sengketa, provider dan materi. Tidak ada klaim SLA, keamanan produksi, atau seluruh P0 selesai.

## Pembaruan Collab — 11 November 2026

Menggantikan status awal AUTH/REQUEST/HUB/WORKSPACE di atas: Google OAuth server-side kini memakai credential `.env.local`, state, PKCE, dan sesi lokal berumur tujuh hari. `/collab` menyediakan opt-in Open for Collab, pengajuan masuk/terkirim, terima/tolak/batal, serta proyek privat dengan diskusi teks. Server memeriksa kepemilikan dan keanggotaan; penerimaan ulang tidak membuat proyek tambahan. Tenggat minimal besok zona Asia/Jakarta.

Penyimpanan `.data/collab.json` untuk satu proses server lokal dengan disk persisten, bukan deployment multi-instance. File vault, realtime, progres, final raster, persetujuan, publikasi dan daftar selesai tetap belum tersedia. Katalog seniman historis tetap terpisah dari akun Google.

Validasi: build dan TypeScript; tes domain `node scripts/collab.test.mjs`; tes katalog; HTTP smoke publik; HTTP redirect Google/PKCE/cookie HttpOnly, callback tidak valid, logout tanpa origin ditolak dan workspace anonim menuju login. Login Google sungguhan belum diuji. Daftarkan callback sesuai README. Lint file yang diubah lulus; lint seluruh repository masih memiliki error require pada skrip CJS lama dan warning alt gambar.

## Implementasi lanjutan — 11 November 2026

Bagian ini menggantikan status kosong modul terkait pada tabel awal; tidak menyatakan seluruh P0 selesai.

| Requirement | Implementasi | Verifikasi |
|---|---|---|
| STUDIO, UPLOAD, DRAFT, PUBLISH | Studio, dua langkah, autosave, konflik revisi, palette JSON, publish idempoten | community.test: ACL, revisi, MIME palsu/oversize, file nyata/palet, retry publish |
| PROFILE, DNA | Profil/direktori akun, edit bio/lokasi/website/username/availability; DNA bobot gaya dan sisa terbesar | DNA kosong, draf dikecualikan, total 100%; avatar/cover belum tersedia |
| FOLLOW, DETAIL | Follow/feed, apresiasi, koleksi privat, komentar/hapus sendiri | Idempotensi dan pemisahan pemilik koleksi/komentar; tanpa optimistic rollback |
| POPULAR | Apresiasi aktif, periode WIB, tie-break skor/waktu/ID | Pergantian hari dan Senin; unlike menghapus apresiasi |
| SHELL | Menu akun sesuai sesi, search 300 ms/AbortController, notifikasi read/unread | Lint/TypeScript; data search publik, notifikasi hanya pemilik |
| REQUEST, HUB, PROJECT, FINAL | Pengajuan, proyek aktif/selesai, progres manual/riwayat, kandidat final raster | Collab tests; chat clientMessageId, muat ulang manual |
| APPROVAL, GALLERY | Dua approval terikat kandidat/revisi, invalidasi revisi, satu karya/coauthors/kedua profil | Satu approval/nonanggota/versi salah ditolak; retry publish satu karya |
| WORK, privasi media | Media route ACL terbit/pemilik/coauthor, file di .data/media | Media draf ditolak akun ketiga; media terbit publik |

Backfill kompatibel data lama tersedia di collab-store.ts. Username awal dihitung deterministik hingga diedit. Endpoint tidak menerima owner/coauthors/projectId/status dari input pengguna; atribusi bersama berasal dari keanggotaan proyek. PUT/media menolak karya yang sudah terbit. Approval lama tetap tercatat, tetapi hanya revisi saat ini dihitung.

JSON atomik hanya untuk satu proses Node dengan disk persisten. Mutasi sinkron tidak menggantikan transaksi PostgreSQL lintas proses. Provider database/storage/email belum dipilih. Vault dengan scan, materi belajar, email/password/reset, avatar/cover, revisi pascapublish, kebijakan sengketa/retensi/moderasi dan validasi visual masih terbuka. Status: alur vertikal karya dan final kolaborasi tersedia lokal; DoD produksi PRD belum terpenuhi.
