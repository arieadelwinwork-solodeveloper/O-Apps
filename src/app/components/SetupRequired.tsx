import { Droplets, FileWarning, RefreshCw } from "lucide-react";
import { supabaseConfig } from "../lib/supabase";

export function SetupRequired() {
  const missing: string[] = [];
  if (!supabaseConfig.hasUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseConfig.hasAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex justify-center px-6">
      <div className="w-full max-w-md py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-[22px] shadow-lg flex items-center justify-center text-white mx-auto mb-4">
            <FileWarning className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-[#001F5B] tracking-tight">
            Konfigurasi diperlukan
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Variabel Supabase belum terbaca oleh dev server. Biasanya karena{" "}
            <strong>belum restart</strong> setelah mengisi{" "}
            <code className="bg-slate-200/60 px-1 rounded">.env</code>.
          </p>
        </div>

        <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/[0.03] space-y-4 text-sm text-slate-700">
          <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-xs font-mono">
            <p className="font-sans font-semibold text-slate-700 mb-2">
              Status env (di browser ini):
            </p>
            <p>
              VITE_SUPABASE_URL:{" "}
              <span className={supabaseConfig.hasUrl ? "text-emerald-600" : "text-red-600"}>
                {supabaseConfig.hasUrl ? "terbaca" : "belum terbaca"}
              </span>
            </p>
            <p>
              VITE_SUPABASE_ANON_KEY:{" "}
              <span className={supabaseConfig.hasAnonKey ? "text-emerald-600" : "text-red-600"}>
                {supabaseConfig.hasAnonKey ? "terbaca" : "belum terbaca"}
              </span>
            </p>
            {missing.length > 0 && (
              <p className="text-red-600 font-sans pt-1">
                Kurang: {missing.join(", ")}
              </p>
            )}
          </div>

          <p className="font-semibold text-[#001F5B]">Langkah perbaikan:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Pastikan file <code className="bg-slate-100 px-1 rounded">.env</code> ada di
              folder <strong>Laundry POS Cashier Dashboard</strong> (sejajar{" "}
              <code className="bg-slate-100 px-1 rounded">package.json</code>)
            </li>
            <li>
              Isi <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_URL</code> dan{" "}
              <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>
            </li>
            <li>
              <strong>Hentikan</strong> semua terminal <code className="bg-slate-100 px-1 rounded">npm run dev</code>{" "}
              yang lama, lalu jalankan ulang:
              <pre className="mt-2 bg-slate-100 p-2 rounded-lg text-xs overflow-x-auto">
                npm run dev
              </pre>
            </li>
            <li>
              Buka URL <strong>terbaru</strong> dari terminal (bukan tab/port lama seperti
              5173/5174 jika server sudah di-restart)
            </li>
          </ol>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 bg-[#001F5B] text-white rounded-xl py-3 text-sm font-semibold active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Muat ulang halaman
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Droplets className="w-4 h-4" />
          O'Apps Service POS
        </div>
      </div>
    </div>
  );
}
