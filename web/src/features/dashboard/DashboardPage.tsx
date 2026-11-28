import { supabase } from "../../lib/supabaseClient";

export function DashboardPage() {
  return (
    <section aria-labelledby="gallery-title">
      <h1 className="page-title" id="gallery-title">
        Galeri
      </h1>
      <p className="mt-4 max-w-lg text-slate-700">
        Galeri karya akan tersedia setelah katalog diaktifkan.
      </p>
      {!supabase && (
        <p className="mt-3 text-sm text-slate-600">
          Konfigurasi Supabase belum tersedia untuk lingkungan ini.
        </p>
      )}
    </section>
  );
}
