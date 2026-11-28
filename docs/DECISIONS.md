# Keputusan teknis Geishara

## Fase 0

- Aplikasi Vite berada di `web/` dengan package dan lockfile sendiri. Aplikasi
  Next.js di root tetap bisa dijalankan selama migrasi, termasuk Studio yang
  sudah ada. Pemeriksaan TypeScript dan ESLint di root mengecualikan paket Vite.
- Rute Galeri dan Studio memakai React Router. TanStack Query dipasang melalui
  provider. Zustand, Radix Slot, Konva, React Konva, dan Perfect Freehand
  tersedia untuk fase yang menggunakannya.
- Supabase dikonfigurasi dari variabel publik Vite yang divalidasi dengan Zod.
  Layout tetap bisa dibuka sebelum variabel itu diisi. Skema, kebijakan RLS,
  dan tipe hasil generate menyusul setelah migration fase terkait tersedia.
- Supabase tetap menjadi backend aplikasi Vite. Folder `supabase/migrations/`
  di root disiapkan untuk perubahan skema.

## S0 Studio

- Gunakan Next.js App Router di root untuk Studio. Kedua pemanggil kanvas memakai wrapper Client Component dengan `dynamic(..., { ssr: false })`. Paket Vite tetap menjadi proyek terpisah.
- Token warna aplikasi berada di `src/app/theme.css`. Studio mengikuti aksen oranye, latar krem, dan teks cokelat tua yang sudah dipakai aplikasi aktif. Status palet menunggu konfirmasi pemilik proyek.
- S1 memakai log operasi append-only dengan renderer Canvas 2D hibrida yang sudah ada. Manifest dan raster lama menjadi checkpoint awal. Gunakan validasi dan revisi yang ada selama transisi. Penyimpanan transaksional, identitas, dan kebijakan akses Supabase perlu diputuskan sebelum migrasi jalur aktif. Rincian ada di `STUDIO_AUDIT.md`.
