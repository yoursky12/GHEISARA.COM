# Audit Studio Geishara

## S0

| Area | Implementasi saat ini |
|---|---|
| Framework | Aplikasi aktif di root memakai Next.js 16 App Router. `src/app/studio/page.tsx` memasang editor pribadi. Rute proyek memasang editor bersama. Paket Vite di `web/` memiliki rute Studio placeholder. |
| Render | `src/components/drawing-canvas.tsx` memakai Canvas 2D. Setiap layer pribadi menyimpan raster pada `HTMLCanvasElement` dan daftar bentuk atau jalur Pena yang bisa diedit. Komposit dirender ke kanvas tampilan. Jalur bersama memakai komposit raster dan pratinjau goresan terpisah. |
| Layer | Maksimum 8 layer dan 1.440 px per sisi melalui konstanta serta validator `src/lib/drawing-document.ts`. Layer mendukung nama, visibilitas, opasitas, dan pengurutan. L-09 memerlukan anggaran memori yang juga mencakup riwayat dan buffer pratinjau. |
| Pena dan seleksi | Pena menambah simpul, menggambar jalur vektor, dan menyimpan kelengkungan. Seleksi memilih atau memindahkan elemen vektor. Seleksi area dan lasso belum tersedia. |
| State | React state menyimpan layer dan pengaturan alat. Ref menyimpan pointer aktif, timer, buffer raster, dan undo/redo lokal. Riwayat pribadi menyimpan hingga 12 langkah berbasis snapshot. Antrean kolaborasi berada di `use-shared-canvas.ts`. |
| Pointer | Kanvas memakai Pointer Events dan pointer capture. Goresan diperbarui pada event gerak. Pointer cancel dan lost capture membatalkan aksi aktif. Tekanan, tilt, dan coalesced events belum digunakan. |
| Draf | Simpan manual mengirim PNG komposit, lembar layer PNG, manifest, dan revisi ke `/api/studio/[id]`. Server memeriksa pemilik dan revisi, mengonversi komposit ke WebP dengan Sharp, mengekstrak warna, dan menyimpan aset serta metadata di penyimpanan lokal. Draf lama dapat dimuat dari gambar datar. Terdapat peringatan saat meninggalkan perubahan, tanpa autosave atau pemulihan IndexedDB. |
| Kolaborasi | HTTP polling mengambil snapshot dan pratinjau. Mutasi tervalidasi server mengubah goresan, visibilitas undo/redo per penulis, dan metadata layer. `collab.json` menyimpan state untuk satu server. Belum ada log append-only, Supabase Broadcast, atau RLS pada jalur editor aktif. |

## Temuan dan perbaikan S0

- **C-01, I-01.** Kuas memang menggambar titik pada satu klik atau ketukan. Sebelum S0, hover Kuas memakai crosshair dan tidak menggambar ke bitmap. Pena juga menggambar penanda simpul selama jalur masih terbuka. Penyebab titik pada screenshot belum terkonfirmasi. S0 menambahkan indikator Kuas berbentuk cincin di luar bitmap dan menyaring pointer non-primer sebelum alat memulai aksi. Ini mengurangi kemungkinan munculnya titik akibat sentuhan tambahan sambil mempertahankan goresan titik yang disengaja.
- **C-02, C-04, C-11, L-01.** Penghapus bentuk bekerja pada layer aktif dan meratakan bentuk apabila terkena sapuan. Pipet membaca komposit terlihat. Dialog ukuran menawarkan preset dan ukuran kustom. Daftar layer mendukung drag langsung. Perilaku ini dipertahankan.
- **Q-01, Q-02, Q-03.** Komposit penuh di setiap gerakan dan buffer per goresan berpotensi mahal. Pada 1.440 × 1.440, satu RGBA canvas memerlukan sekitar 7,9 MiB sebelum overhead browser. Ukur baseline perangkat menengah sebelum mengubah batas layer, resolusi, atau undo. Angka FPS dan penggunaan memori aktual belum diukur.

## Arsitektur yang diusulkan untuk S1

Pertahankan raster dan vektor yang sudah ada sebagai hasil render. Tambahkan operasi bertipe dan berversi untuk stroke, erase, perubahan bentuk, impor, layer, dan ukuran, dengan ID klien, penulis, layer, cabang, dan waktu. Pembatalan dan pengulangan menjadi operasi kompensasi yang merujuk ID operasi sumber. Pisahkan pratinjau pointer dari operasi final agar pratinjau tidak masuk replay. Pakai seed eksplisit, pembulatan konsisten, dan renderer yang sama untuk render langsung dan replay. Sederhanakan titik dengan mempertahankan ujung dan informasi tekanan, lalu kodekan delta dan kirim dalam batch.

Mulai dari reducer dan replay draf pribadi agar bentuk lama tetap dapat diedit. Gunakan manifest dan lembar PNG versi lama sebagai snapshot awal pada urutan 0. Draf datar menjadi satu layer dasar. Referensikan aset awal yang tidak berubah, dan pertahankan jalur pembacaan lama hingga migrasi draf tersebut berhasil. Jangan membuat riwayat sintetis untuk aktivitas sebelum snapshot awal.

Server menetapkan urutan per cabang dalam transaksi append. Retry memakai ID operasi yang sama. Klien hanya menerima snapshot dan delta setelah urutan terakhir, mengisi celah sebelum replay, dan menyimpan antrean belum diakui di IndexedDB. Buat checkpoint berkala berdasarkan jumlah operasi atau waktu, dengan aset privat dan urutan yang dapat diverifikasi. Untuk S4, transport Broadcast dapat memberi notifikasi cepat, sementara Postgres menjadi sumber urutan dan izin. Migrasi data lokal dan pemetaan identitas perlu dirancang sebelum beralih penyimpanan.

## Baseline pengujian

- Hasil S0 pada 28 November 2026. `npm test`, TypeScript tanpa emit, ESLint pada komponen yang diubah, pemeriksaan sintaks CSS, dan `git diff --check` lulus. Pengujian interaksi di browser dan pengukuran kinerja masih terbuka.
- Jalankan `npm test`, TypeScript tanpa emit, dan parse CSS. Suite yang ada mencakup validasi domain dan operasi layer kolaborasi.
- Di Chrome, Firefox, dan Safari, buka draf kosong. Gerakkan mouse di atas kanvas lalu keluarkan. Indikator harus hilang tanpa mengubah gambar atau status draf. Ketuk sekali dan urungkan. Ulangi dengan sentuhan tambahan pada perangkat sentuh, lalu pastikan kontak non-primer tidak memulai goresan baru.
- Gambar kuas dan bentuk di dua layer, ubah ukuran, pindahkan bentuk, simpan, lalu buka ulang. Bandingkan hasil dan pastikan bentuk asli tetap dapat dipilih. Uji juga pembukaan draf gambar datar.
- Untuk S1, tambahkan pengujian replay deterministik, penyederhanaan dan delta titik, retry ID, kompatibilitas snapshot lama, dan E2E gambar → simpan → muat ulang.
