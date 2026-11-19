# geishara

Platform penemuan seni, identitas kreator, pembelajaran, dan kolaborasi. Dibangun dengan Next.js 16.4.5 + React + TypeScript.

## Jalankan lokal

Gunakan Node.js 24 LTS (tes memanfaatkan dukungan TypeScript native).

```sh
npm install
npm run dev
```

Buka http://localhost:3000. Beranda mengarah ke `/art/for-you`.
Pada PowerShell dengan execution policy ketat, gunakan `npm.cmd` dan `npx.cmd`.

```sh
npm run build
npm start
node --experimental-strip-types --test scripts/catalog.test.cjs
npx tsc --noEmit
```

Untuk tes HTTP setelah build, jalankan `npm run start -- --port 3100` lalu `node scripts/smoke.cjs` pada terminal lain. URL alternatif dapat ditetapkan melalui `SMOKE_BASE_URL`.

## Cakupan awal

Dashboard discovery, pencarian/filter/sort server dengan URL, katalog API read-only, detail karya, profil seniman referensi, serta layout responsif. Data adalah katalog studi, bukan data pengguna produksi. Tidak membutuhkan environment variable untuk menjalankan tahap ini.

Status terbaru fitur akun, karya, dan kolaborasi tercantum di bagian berikut. Katalog referensi historis tetap terpisah dari akun kreator.

`GET /api/artworks?q=monet&limit=20` mengembalikan `{items, total, nextCursor, dataMode}`. Multi-filter memakai parameter berulang, misalnya `style=Impresionisme&style=Ukiyo-e&medium=Cat+minyak`. Nilai label peka huruf besar; gunakan taxonomy katalog. Search tidak peka huruf besar.

## Aset dan persyaratan

Lihat `public/art/sources.json` untuk sumber reproduksi karya domain publik dari Wikimedia Commons. Gambar disimpan lokal; runtime tidak membutuhkan API museum. `node scripts/download-art.cjs` dapat digunakan untuk menyiapkan ulang aset; membutuhkan akses jaringan dan sharp bawaan instalasi Next.js.

Spesifikasi: [PRD.md](PRD.md). Pemetaan requirement, status pengujian, keterbatasan, dan tahapan selanjutnya: [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Collab lokal (11 November 2026)

Login Google membaca `OAUTH_CLIENT_ID` dan `OAUTH_CLIENT_SECRET` dari `.env.local` di server. Daftarkan authorized redirect URI `http://localhost:3000/api/auth/google/callback` di Google Cloud (sesuaikan origin/port dengan alamat aplikasi). Restart `npm run dev` setelah mengubah environment. Login sukses menuju `/collab`.

Opsional: set `OAUTH_REDIRECT_URI` ke URL callback lengkap yang terdaftar di Google Cloud jika aplikasi memakai domain publik/reverse proxy. Login dimulai pada origin tersebut agar cookie kembali ke host yang sama. URL callback saat memulai login disimpan dalam cookie HttpOnly selama sepuluh menit dan dipakai kembali saat pertukaran kode. Pesan kegagalan membedakan pembatalan, sesi kedaluwarsa, kegagalan pertukaran kode, dan profil yang belum terverifikasi tanpa menampilkan kredensial.

Dua akun Google berbeda dapat mengaktifkan Open for Collab, mengirim pengajuan, menerima/menolak/membatalkan, lalu berdiskusi dalam workspace privat. Akun baru tidak otomatis terbuka untuk kolaborasi. Tenggat menggunakan WIB. Sesi tujuh hari disimpan sebagai hash; OAuth menggunakan state dan PKCE. Token Google tidak disimpan.

Data lokal disimpan di `.data/collab.json`, diabaikan Git. Implementasi ini untuk satu proses server dengan disk persisten; gunakan database transaksional bersama sebelum deployment multi-instance/serverless. Pengujian login Google langsung membutuhkan browser dan konfigurasi redirect URI di Google Cloud.

## Alur karya dan kolaborasi

- `/studio`: unggah, lanjutkan draf, edit profil, dan Art DNA. `/studio/collections`: koleksi privat.
- Unggah PNG/JPG/WEBP statis maksimal 20 MB/40 megapiksel. Server memeriksa format isi/MIME, mengubah gambar ke WEBP tanpa EXIF, dan mengekstrak hingga lima warna dominan. Palet dapat diunduh sebagai JSON.
- Metadata draf autosave setelah jeda satu detik. Status tersimpan menunggu respons server. Konflik revisi ditolak dengan 409; isian masih tersedia untuk disalin sebelum memuat versi server. Jika transfer file gagal, pilih ulang file untuk mencoba lagi. File yang telah diterima server pulih saat draf dibuka kembali.
- Tinjauan memvalidasi judul, medium, 1–5 gaya, lisensi, dan gambar sebelum publikasi idempoten. Draf/media privat hanya terbaca pemilik atau kedua anggota untuk final kolaborasi.
- `/creators`: direktori akun. Profil publik menampilkan karya, pengikut, Open for Collab, dan DNA dari karya terbit, dengan pembulatan total 100%. Username awal akun Google dapat diganti di Edit profil.
- Mengikuti memakai relasi follow; Sedang Populer memakai apresiasi aktif dan periode kalender WIB; galeri kolaborasi hanya memuat publikasi bersama dengan dua persetujuan. Referensi historis diberi label koleksi studi.
- Detail karya menyediakan apresiasi set/unset, komentar/hapus sendiri, serta simpan/hapus dari koleksi privat. Search header debounce 300 ms membatalkan respons lama.
- Workspace menyediakan kandidat final raster, metadata, progres manual/riwayat, chat, dan approval terikat ID kandidat + revisi. Perubahan gambar/metadata membatalkan validitas approval lama. Publikasi menghasilkan satu karya di kedua profil, satu sumber metrik, dan proyek selesai. Lisensi tetap mengikuti pengajuan yang diterima.
- `/notifications`: notifikasi pengajuan, respons, pesan, approval, dan publikasi dengan status dibaca/belum dibaca. Pesan dimuat ulang manual, tanpa klaim realtime.

Backup `.data/collab.json` **bersama** `.data/media/`. Backfill data lama mempertahankan akun/sesi. Jangan hapus `.data` saat memperbarui aplikasi.

Validasi: `npm test`, `npm run lint`, `npm run build`. `node scripts/smoke.cjs` memeriksa server pada port 3100 (atau `SMOKE_BASE_URL`). Tes domain memakai media sementara terisolasi.

Belum seluruh P0 selesai: email/password/verifikasi/reset memerlukan penyedia email; vault PSD/CLIP memerlukan keputusan storage/kuota dan pemindaian keamanan; materi pembelajaran Studio perlu disahkan sebelum progres/kuis diaktifkan. Avatar/cover, autosave offline, optimistic rollback, realtime, revisi pascapublish dan perubahan kesepakatan dua pihak belum tersedia. JSON lokal tidak memenuhi transaksi lintas proses/produksi. Audit browser/keyboard/viewport, backup-restore, moderasi, dan hardening produksi masih diperlukan.
