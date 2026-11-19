# PRD — geishara

> Versi 1.0 · 10 November 2026 · Draf implementasi. Dokumen pendamping PRD.md. Acuan seluruh modul; bukan pernyataan fitur telah diimplementasikan. Versi Markdown lengkap pada repositori memuat requirement ID, kontrak layanan, dan skenario uji lebih terperinci.

## 1. Produk dan aturan pembacaan

geishara adalah aplikasi web penemuan karya seni, identitas kreator, pembelajaran, dan kolaborasi privat hingga publikasi bersama. Bahasa produk Indonesia; desktop referensi utama, aplikasi tetap responsif.

Tujuan: menemukan karya/kreator melalui metadata dan rekomendasi; membangun profil dan Art DNA; menerbitkan karya; mempertemukan dua kreator; menjaga atribusi dan persetujuan bersama; menyediakan perjalanan belajar.

**DESAIN** adalah elemen pada 13 layar Page 1. **BASELINE** adalah usulan perilaku implementasi, bukan keputusan bisnis yang sudah disetujui. **TERBUKA** memerlukan keputusan pemilik produk. Route, arsitektur, teknis, metrik dan perilaku di luar teks desain adalah BASELINE. **P0** = alur awal wajib; **P1** = pengayaan; **P2** = lanjutan.

Tidak termasuk baseline: marketplace/pembayaran/royalti, NFT, aplikasi native, generative AI, video call, editor profesional setara Photoshop. Jangan menambahkan tanpa keputusan baru.

## 2. Pengguna dan privasi

Pengunjung membaca karya/profil publik; aksi personal meminta login. DESAIN menyediakan persona Artist, Collector, Beginner Student. Persona bukan otorisasi keras: baseline semua akun boleh berkarya. Anggota proyek hanya mengakses proyek yang diikuti. Admin/moderasi diperlukan operasional, tetapi panel belum didesain.

Draf pribadi hanya untuk pemilik; draf kolaborasi hanya anggota proyek terkait. Koleksi tersimpan privat default. Chat, vault, dan unduhan proyek tidak boleh terbuka untuk nonanggota. Semua akses diperiksa server, bukan sekadar tombol disembunyikan.

## 3. Modul, referensi, dan route

Sumber: https://www.figma.com/design/DOT45zCD9GqlbbqWt9WeOS

| Layar | Node | Route baseline |
|---|---|---|
| Untukmu | 4:2 | /art/for-you |
| Mengikuti | 11:2 | /art/following |
| Sedang Populer | 11:130 | /art/popular |
| Karya Kolaborasi | 11:258 | /art/collaborations |
| Profil & Art DNA, draf | 4:5 | /creators/:username; /studio/drafts |
| Collab workspace | 4:8 | /collab/projects/:projectId |
| Unggah karya | 4:14 | /studio/artworks/new |
| Pengajuan kolaborasi | 4:17 | /creators/:username?dialog=collaboration |
| Login | 7:2 | /auth/login |
| Register | 7:7 | /auth/register |
| Lupa sandi | 7:12 | /auth/forgot-password |
| Ganti kata sandi | 7:17 | /auth/reset-password |

Layar pendukung belum lengkap secara visual: detail karya /artworks/:id, koleksi, pencarian, notifikasi, daftar pengajuan/proyek /collab, Studio, detail jalur/pelajaran/progres/kuis/tantangan. Implementasikan kebutuhan minimum konsisten dan mintakan validasi; jangan menganggap seluruh CTA memiliki layar tujuan yang disetujui.

### Navigasi dan visual

Dashboard Art, Collab Hub, Studio adalah navigasi utama. Empat discovery submodul di bawah Dashboard Art, bukan navigasi utama terpisah. Search, notifikasi, unggah, menu akun tersedia.

DESAIN TERBARU: Untukmu, Mengikuti, Sedang Populer memakai tab teks ringkas, garis aktif, area 40 px. Karya Kolaborasi masih memakai kartu; penyamaan perlu konfirmasi. Posisi layar di kanvas adalah dokumentasi, bukan syarat horizontal scrolling aplikasi.

Desktop 1440 px; navy #12376B, aksen #0EA5E9, surface #F8FAFC, border #E2E8F0; Inter untuk UI, Lora sesuai editorial. Responsif baseline grid 4/2/1 desktop/tablet/mobile, tab scroll horizontal, filter menjadi panel, workspace panel buka-tutup. Tidak ada scroll horizontal halaman di viewport 360 px.

## 4. Alur utama

1. Dashboard → submodul → filter/search → detail → profil/apresiasi/simpan.
2. Profil → Ikuti → Mengikuti → karya publik terbaru.
3. Login → unggah → metadata → draf/tinjau → terbit → profil/discovery/DNA.
4. Profil partner → pengajuan → diterima → workspace privat → proses/chat → final → dua persetujuan versi sama → satu karya di kedua profil.
5. Studio → karya dan draf → lanjutkan proses kreatif atau terbitkan karya.
6. Lupa sandi → email → token → reset → login ulang.

## 5. Kebutuhan fungsional dan penerimaan

### 5.1 AUTH — Autentikasi \[P0\]

DESAIN: email/password, Google, Ingat saya; registrasi nama/username/email/password/konfirmasi/persona/persetujuan; reset dan kekuatan password. Minimum tertulis 8 karakter dengan huruf dan angka.

- AUTH-01–02: email/username unik case-insensitive; username baseline 3–30 huruf/angka/underscore, nama 2–80. Konfirmasi password cocok; ketentuan wajib dengan versi/waktu. Error per field tidak menghapus input aman.
- AUTH-03–04: sesi aman, Ingat saya sesuai masa sesi terkonfigurasi. Google OAuth nyata, jangan sukses palsu jika provider belum tersedia. Redirect hanya tujuan internal aman.
- AUTH-05–06: reset merespons generik tanpa membocorkan email terdaftar; token acak sekali pakai, hash di server, expiry baseline 30 menit. Reset membatalkan sesi lama, meminta login ulang.
- AUTH-07: verifikasi email sebelum publish/pengajuan adalah baseline keamanan; alur belum didesain. Logout mencabut sesi.

AC: akun duplikat/double submit tidak membuat akun kedua; token terpakai/kedaluwarsa ditolak; OAuth gagal tidak membuat sesi; privat menolak nonanggota.

### 5.2 SHELL — Navigasi, search, notifikasi \[P0\]

SHELL-01–05: menu aktif sesuai route; unggah ke form/login; akun ke profil/studio/keluar. Search karya publik/kreator/gaya, debounce 300 ms, batalkan respons lama. Tab/filter/sort/periode di URL, pulih saat back/refresh/share. Notifikasi pengajuan/respons/pesan/approval/publikasi dengan read/unread; akses target diperiksa ulang.

AC: respons search lama tidak menimpa query baru; parameter invalid memakai default aman; notifikasi tidak membocorkan proyek setelah akses dicabut.

### 5.3 ART-FOR-YOU — Untukmu \[P0\]

DESAIN: hero editorial, kartu, filter era/medium/gaya/warna/lisensi, Art DNA, kurator, eksplorasi gaya, koleksi editorial.

ART-01–05: gambar/judul/medium/gaya/seluruh kreator/palet/badge valid/apresiasi. Filter antarkategori AND, multi-pilih kategori OR. Sort/pagination setelah filter; filter aktif dan Reset. Cold start kurasi/terbaru; rekomendasi awal berbasis gaya atau like/simpan, ML tidak wajib. Hero ke koleksi; Art DNA ke akun sendiri/login. Count dari server, bukan tetap 12.840.

AC: draf/pending tidak muncul; URL sesuai query; pengguna baru mendapat hasil wajar; fallback gambar menjaga kartu.

### 5.4 ART-FOLLOWING — Mengikuti \[P0\]

FOLLOW-01–05: follow/unfollow idempotent, bukan diri sendiri. Feed hanya karya publik akun diikuti, publishedAt terbaru. Deduplicate ketika kedua coauthor diikuti. Filter kreator hanya akun diikuti. Belum follow → rekomendasi/ajakan eksplorasi. Karya terbaru P0; aktivitas koleksi publik P1, tidak mengekspos koleksi privat.

Follow akun individual; “Arka & Nadia” bukan akun gabungan baru.

AC: unfollow mengubah fetch berikutnya; non-followed tidak masuk feed utama; coauthor ganda satu kartu.

### 5.5 ART-POPULAR — Sedang Populer \[P0\]

POPULAR-01–05: ranking apresiasi valid, bukan skor tren buatan. Semua waktu semua like aktif; periode like dibuat di interval dan belum dibatalkan, bukan total lifetime karya baru. Zona baseline Asia/Jakarta, UTC storage; Hari ini kalender hari ini, Minggu ini Senin–sekarang, Bulan ini awal bulan–sekarang. Tie-break skor turun, publishedAt turun, ID naik. Sorotan/grid snapshot sama.

Fixture Semua waktu: Ruang yang sunyi 324 → Senja yang tinggal 248 → Bunga setelah hujan 192 → Di antara bintang 186. Seed/contoh, bukan analytics produksi.

AC: periode mengubah hitungan; unlike tidak dihitung; rank sesuai skor; stabil saat seri; metrik belum tersedia tidak ditawarkan seolah berfungsi.

### 5.6 ART-COLLAB — Galeri kolaborasi \[P0\]

GALLERY-01–05: hanya karya bersama terbit dengan approval valid. Seluruh kreator/peran/jenis/lisensi/metrik bersama. Filter kreator/medium/gaya/jenis/lisensi dan sort backend. Referensi solo terpisah, tidak diklaim karya bersama. Temukan rekan ke search kreator; Ruang diskusi hanya workspace berizin; Hub ke pengajuan/proyek.

AC: satu artwork di galeri/kedua profil; like semua konteks resource sama; referensi solo tetap solo.

### 5.7 ART-DETAIL — Detail/interaksi \[P0; UI pendukung\]

DETAIL-01–05: gambar/deskripsi/metadata/palet/lisensi/kreator/waktu terbit; link akun benar. Like unik pengguna–karya, set/unset idempotent, optimistic rollback. Simpan koleksi privat, buat koleksi P0; koleksi publik P1. Komentar login 1–2.000 karakter baseline, pagination/hapus sendiri/sanitasi; thread/moderasi lanjutan P1. View tidak menggandakan karya; deduplikasi analytics P1.

AC: double click bukan dua like; simpanan privat tidak terbaca publik; komentar tidak menjalankan script; URL dihapus/privat ditolak.

### 5.8 PROFILE — Profil, Art DNA, Studio \[P0\]

PROFILE-01–03: pemilik edit bio/lokasi/avatar/cover/link HTTP(S)/Open for Collab. Pengunjung publik/Ikuti/Ajak kolaborasi. Draf/koleksi privat tidak terlihat atau terbaca API orang lain. Statistik aktual: karya publik unik; kolaborasi baseline proyek hasil terbit, bukan seluruh pengajuan.

DNA-01–04: DESAIN persentase gaya/palet dari karya terbit, draf dikecualikan. Baseline setiap karya bobot 1 dibagi rata gaya; normalisasi 100%, pembulatan sisa terbesar. Karya bersama satu kali per coauthor. Palet agregat deterministik bucket baseline, clustering P1. Simpan algorithmVersion/jumlah karya. Update publish/gaya/unpublish, baseline ≤60 detik. Kosong → empty state, bukan gaya karangan.

STUDIO-01: karya/draf sendiri, status, unggah, tautan Collab Hub.

AC: ID tebakan tidak membuka draf; draf tidak mengubah DNA; kosong tanpa pembagian nol; count sesuai data publik.

### 5.9 UPLOAD — Unggah/draf/tinjau/publish \[P0\]

DESAIN: dua langkah; PNG/JPG/WEBP ≤20 MB, preview/dimensi; lima warna dominan, ekspor JSON/ASE; wajib judul/medium/gaya/lisensi; deskripsi/era, atribusi dan kolaborator; Simpan draf.

UPLOAD-01–05: server memeriksa MIME/isi, bukan ekstensi. 20 MB = 20×1024×1024 byte; dimensi baseline ≤40 megapiksel perlu konfirmasi. Progress/retry/batal; ganti gambar memperbarui preview/palet. Judul 1–120, deskripsi ≤5.000, satu medium/lisensi, 1–5 gaya, era opsional. Palet mengabaikan transparansi, fallback monokrom, error ekstraksi tidak menghapus file. JSON HEX/RGB/version P0; ASE P1 tanpa download palsu.

DRAFT-01–02: draf boleh tidak lengkap; autosave metadata jeda baseline 1 detik; Tersimpan hanya setelah ACK server. Simpan version untuk konflik perangkat/tab. Error/retry tidak kehilangan metadata; lanjutkan memulihkan file/isian.

PUBLISH-01–03: review snapshot lengkap; solo valid publish idempotent. Menambahkan nama partner bukan approval. Karya bersama terkait proyek/undangan sah dengan approval ganda. Draf/pending tidak ada di discovery/statistik/DNA publik.

AC: MIME palsu/oversize ditolak; draf tanpa era tersimpan; refresh memulihkan revisi; double publish satu artwork; perubahan final membatalkan approval.

### 5.10 COLLAB-REQUEST — Pengajuan dan Hub \[P0\]

DESAIN: Art Trade, Lineart × Coloring, Background × Character, Style Mashup, Mentorship; tenggat, lisensi, ide ≤1.000 karakter; workspace privat setelah diterima.

REQUEST-01–06: login, bukan diri sendiri; baseline hanya Open for Collab menerima request baru. Jenis/tenggat/lisensi/ide wajib; deadline minimal besok zona aplikasi, ide trim 1–1.000. State pending → accepted/rejected/cancelled. Hanya penerima menerima/menolak, pengirim membatalkan pending. Dua akun berbeda per proyek sesuai 0/2, multianggota P2. Accept transaksional membuat satu proyek, retry idempotent. Perubahan lisensi/tenggat/atribusi membutuhkan kedua pihak dan riwayat.

HUB-01: masuk/terkirim/proyek aktif/selesai; detail ide/partner/tenggat/lisensi/status, counter aktual.

AC: pengirim tidak bisa accept sendiri; akun ketiga tidak membaca ide; dua accept bersamaan satu workspace; reject tidak membuat workspace.

### 5.11 WORKSPACE — Kolaborasi privat \[P0 inti/P1 editor\]

DESAIN: preview 2400×1600 RGB, zoom, Layer/File vault, opacity/blend/clipping/alpha lock, brush/warna, chat, progres, atribusi/lisensi, final render, persetujuan ganda, share/export.

**Batas scope:** P0 adalah file collaboration, chat, preview final raster, metadata layer dan publikasi. Painting/compositing aktual, edit native, brush lengkap, undo/redo dan realtime drawing adalah P1. Bila editor penuh wajib rilis awal, konfirmasi scope/estimasi. Jangan menyebut P0 editor lengkap atau membuat kontrol pura-pura berfungsi.

WORK-01: ACL anggota pada API/websocket/download; share deep link tetap perlu login/keanggotaan.

VAULT-01–03: versi immutable, uploader/waktu/ukuran/MIME/checksum, signed download. DESAIN PSD 128 MB dan CLIP 42 MB: batas raster 20 MB tidak berlaku vault. Baseline vault 200 MB/file, kuota proyek 2 GB, perlu konfirmasi biaya. Raster preview; PSD/CLIP arsip download, bukan diasumsikan bisa diedit. Karantina hingga scan aman.

LAYER-01–02: P0 urutan/nama/pemilik/opacity/blend/visibility metadata dengan revisi. Jangan klaim mengubah gambar jika renderer belum ada. Tambah/Duplikat/Gabung/Folder/Hapus/Brush ada di desain, efek visual penuh P1; unavailable disabled beralasan.

CHAT-01: teks/lampiran berizin, identitas/timestamp/pagination/retry, clientMessageId unik; reconnect catch-up; presence best-effort.

PROJECT-01: type/role/deadline/progress aktual; 60% bukan konstanta atau jumlah layer. Baseline progres manual anggota dengan riwayat. Tenggat relatif dinamis.

FINAL-01: pilih/upload final raster eksplisit; final kosong tidak siap. P0 boleh memakai final aplikasi eksternal.

APPROVAL-01–04: dua anggota menyetujui finalVersionId + metadataRevision + agreementRevision sama. Catat aktor/waktu/versi. Perubahan final/judul/deskripsi/metadata/atribusi/lisensi membatalkan approval; chat/progres tidak. Server recheck dalam transaksi publish. Hasil satu Artwork, dua ArtworkCreator. Revisi pascapublish kandidat privat; versi publik lama tetap tampil sampai approval baru. Unpublish/sengketa TERBUKA; tidak ada perubahan lisensi sepihak.

EXPORT-01: P0 final raster disetujui dan vault berizin; native gabungan P1.

AC: final kosong/1 dari 2/approval beda versi tidak terbit; update final membuat persetujuan baru 0/2; race publish satu artwork; metrik sama semua profil; nonanggota ditolak termasuk media/channel.

### 5.12 Studio — Pembelajaran \[P0 inti/P1 personalisasi\]

DESAIN: kuis 5 pertanyaan ±2 menit, Beginner/Intermediate/Advanced; Impressionism 8 pelajaran ±2 jam, Modern Art 6 ±90 menit, Surrealism 10 ±3 jam; teknik/brush/latihan; progres mingguan/streak; daily prompt empat warna. Jumlah/durasi konten contoh sampai materi disahkan.

LEARN-01–04: katalog/detail/pelajaran berurutan; latihan selesai idempotent di server; lanjutkan ke item belum selesai. Streak baseline hari latihan selesai (maksimal satu per hari), zona Asia/Jakarta; target minggu lima latihan konfigurabel. Materi belum ada diberi status jujur, bukan sukses semu.

QUIZ-01: lima pertanyaan, back/progress/submit, rekomendasi aturan deterministik yang dapat dijelaskan, bukan diagnosis kemampuan; P1 jika materi belum tersedia. PROMPT-01: tanggal/instruksi/palet, hasil privat atau publik melalui validasi unggah yang sama.

AC: retry tidak menggandakan progres; lintas perangkat konsisten; streak benar tengah malam; materi draft tidak publik; hasil kuis berasal jawaban.

## 6. State dan kegagalan

Daftar: loading/success/empty/error+retry/paginationEnd. Form: idle/dirty/invalid/submitting/success/error. Izin: unauthenticated/forbidden/notFound tanpa kebocoran. Skeleton menjaga struktur, input aman dipertahankan, double submit dicegah. Konflik revisi menawarkan muat/rekonsiliasi, bukan overwrite diam-diam. Timestamp server UTC; tanggal contoh bukan deadline otomatis proyek baru.

Artwork draft → pending\_approval → published → archived; solo draft → published; revisi live terpisah. Proyek active → review → published/cancelled; final berubah memerlukan review/approval baru.

## 7. Data dan invariant

Entitas: User/Session/ResetToken, CreatorProfile/Follow, Artwork/ArtworkRevision/ArtworkCreator/ArtworkStyle, Taxonomy, MediaAsset/Palette, Appreciation/Comment, Collection/CollectionItem, CollaborationRequest, Project/ProjectMember, ProjectFile/ProjectLayer, Message/Notification, PublicationCandidate/Approval, ArtDNASnapshot, LearningPath/Lesson/Exercise, LearningProgress/QuizResult, AuditEvent.

Unique constraints: email/username; follower+creator; user+artwork appreciation; collection+artwork; project.requestId; project+member; candidate+approver; clientMessageId scoped; user+lesson completion. Artwork ID stabil/publishedRevisionId; kandidat mengikat final/metadata/agreement revision. Taxonomy ID terpisah label. Media storage key/checksum/scanStatus/visibility. Audit tanpa token/password/chat sensitif.

Gunakan transaksi/FK; hapus media memperhitungkan referensi. Counter/grafik memakai sumber sama dengan daftar.

## 8. Kontrak layanan

Auth register/login/logout/forgot/reset/OAuth/me; GET artwork feed dengan filter+cursor; detail; PUT/DELETE appreciation; comments; profile/follow/DNA; collection items; upload intent/complete; drafts/review/publish; request accept/reject/cancel; project file/layer/message/final/candidate/approval/publish; learning path/progress/quiz/prompt; notification read. Endpoint dan requirement ID lebih rinci ada di PRD.md. Ikuti arsitektur repositori sebelum membuat route baru.

Daftar {items,nextCursor,total?}; error {code,message,fieldErrors?,requestId}. HTTP 400 malformed, 401 login, 403 forbidden, 404 hidden/missing, 409 conflict, 413 size, 415 MIME, 422 validation, 429 rate-limit. Validasi server; idempotency accept/publish/upload; revision/ETag edit.

Realtime chat/notifikasi: authorize setiap subscription, sequence/catch-up. Polling fallback boleh dengan label jujur. Cache key sesuai filter/period/user scope; jangan cache privat sebagai publik. Ranking cache baseline ≤60 detik; ACL/approval dicek aktual.

## 9. Nonfungsional

WCAG 2.2 AA, keyboard, focus/label/error semantik, alt, status bukan warna saja, dialog focus trap/restore. Layer/file bisa keyboard, bukan drag-only. Sentuh mobile target 44 px dan reduced motion.

Target awal bukan hasil ukur: LCP ≤2,5 detik, INP ≤200 ms, CLS ≤0,1 p75 representatif; API daftar/detail p95 ≤800 ms di luar transfer file pada beban disepakati. Thumbnail/responsive/lazy images; cursor baseline 20 item max50; indeks; ekstraksi/scan asinkron. Tersimpan hanya ACK. Backup/restore diuji; RPO/RTO ditetapkan sebelum produksi, jangan klaim SLA tanpa tes.

TLS, managed secrets, hash password adaptif; sesi HttpOnly/Secure/SameSite, CSRF sesuai arsitektur, sanitasi XSS; ACL objek/API/realtime; signed URL privat singkat. Rate-limit auth/reset/request/comment/message/upload. Validasi kuota/MIME/dimensi, scan; hapus EXIF sensitif preview publik, tolak konten aktif tanpa pipeline aman. Audit approval/lisensi/akses/publish tanpa secret.

Retensi/ekspor-hapus akun/pelaporan/takedown/hak cipta/privasi wajib disepakati sebelum publik; footer bukan kepatuhan yang sudah selesai.

## 10. Analytics

Event: sign\_up\_completed, artwork\_viewed, creator\_followed, artwork\_appreciated, artwork\_saved, draft\_saved, artwork\_published, collab\_requested, collab\_accepted, final\_submitted, publication\_approved, collab\_published, lesson\_completed, quiz\_completed. Emit setelah commit, dedup retry. Properti aman ID pseudonymous/entity/module/UTC/outcome; tanpa email/token/chat/private URL.

Ukur funnel registrasi→aksi; discovery→detail→follow/like/save; upload completion; request→accept→publish; waktu karya pertama; belajar/retensi; error/failed autosave. Target bisnis belum disepakati, jangan mengarang angka produksi.

## 11. Delivery dan test

A fondasi auth/schema/media/shell → B karya personal/discovery/profil/draf/DNA → C pengajuan/Hub/vault/chat/approval/publikasi → D pembelajaran di Studio/progres/notifikasi/hardening → E P1 kuis/personalisasi/koleksi publik/ASE/engine editor sesuai keputusan. Materi/provider adalah dependency, bukan tombol mock.

E2E wajib: register/verifikasi/session/logout; reset generik+expired/reused; filter/back/pagination; follow/unfollow/dedup coauthor; upload/draft/reload/review/publish; MIME palsu/oversize/network retry; ranking batas waktu/tie; accept race satu workspace; nonanggota ditolak semua endpoint/channel/media; final 1/2/mismatch ditolak, 2/2 satu karya; final/lisensi berubah invalidasi approval; like/comment/save idempotent; progress lintas sesi/streak midnight; keyboard/360/768/1440.

Unit DNA/ranking/state; integration ACL/database/transaction; contract API; upload/signed URL expiry. Fixture deterministik dengan waktu terkontrol.

## 12. Instruksi Agent dan Definition of Done

Baca desain terbaru/PRD, periksa stack/repositori/test eksisting. Petakan requirement ID→route/component/service/test. Vertical slice nyata, bukan seluruh UI dengan tombol mati. Jangan ganti framework tanpa alasan. Jika kosong, proposal TypeScript+SSR framework+PostgreSQL+object storage+auth teruji+realtime; bukan keputusan final.

Pisahkan UI/domain/persistence/provider. ACL/approval bukan frontend-only. Seed contoh jelas, bukan live. Setiap CTA navigasi/aksi atau disabled beralasan, tidak ada login/download/editor/publish palsu. Secret hanya environment terkelola, dokumentasikan nama tanpa nilai. Sediakan migration/seed/langkah jalan/test. Konfirmasi perubahan hak/privasi/scope/biaya; catat keputusan.

DoD: semua P0 persisten, tervalidasi server, acceptance test, layar pendukung minimum tersedia; tanpa kebocoran/mock runtime; satu karya/metrik kolaborasi, approval version-bound/race-safe; konfigurasi/test/operasional terjelaskan; visual/responsive/a11y/security/konten/lisensi disetujui. Dependency belum siap dilaporkan sebagai blocker, bukan selesai semu.

## 13. Keputusan terbuka dan catatan sumber

Konfirmasi sebelum rilis terkait: editor penuh; vault 200MB/2GB/biaya; auth/email/storage/realtime provider; materi/hak konten; pembatasan persona; zona periode/streak; lisensi komersial/sengketa/unpublish bersama; moderasi/retensi/hapus akun; koleksi publik; navigasi kolaborasi; target bisnis/kapasitas.

Konflik metadata medium mockup: satu record kanonik, bukan duplikasi. “Arka & Nadia” dua akun Arka Pratama dan Nadia Putri, bukan akun baru. Batas 20MB raster bukan vault. Draf/pending bukan publik atau DNA. Tidak semua state/halaman tujuan telah didesain.

Perbarui versi PRD, requirement, acceptance test, dan keputusan bersama bila desain berubah; jangan menebak aturan yang bertentangan.
