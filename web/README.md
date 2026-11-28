# Geishara Web

Fondasi Fase 0 untuk aplikasi React 18, TypeScript, Vite, dan Supabase.
Galeri dan Studio memiliki rute serta layout dasar. Akun, katalog, dan editor
akan ditambahkan pada fase masing-masing.

## Menjalankan

Gunakan Node.js 22.12 atau lebih baru.

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di `.env.local` dengan
URL proyek dan anon key atau publishable key. Simpan service-role key di luar
konfigurasi Vite. Layout dasar juga dapat dibuka sebelum proyek Supabase
dikonfigurasi.

## Pemeriksaan

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

Migration SQL disiapkan di `../supabase/migrations/`. Setelah database dibuat,
tipe Supabase dihasilkan ke `src/types/database.types.ts` dengan Supabase CLI.
Lihat [keputusan teknis](../docs/DECISIONS.md) untuk penempatan aplikasi selama migrasi.
