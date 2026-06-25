import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Droplets, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { DUMMY_ACCOUNTS } from "../lib/dummyAccounts";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fillDemo(role: keyof typeof DUMMY_ACCOUNTS) {
    const acc = DUMMY_ACCOUNTS[role];
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col justify-center px-6">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-[#001F5B] rounded-[22px] shadow-lg flex items-center justify-center text-white mx-auto mb-4">
            <Droplets className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-[#001F5B] tracking-tight">
            O'Apps Service POS
          </h1>
          <p className="text-sm text-slate-500 mt-1">Masuk untuk melanjutkan</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[20px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03] space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@usaha.com"
              className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#001F5B] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-6 bg-white rounded-[20px] p-4 border border-dashed border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Akun demo (jalankan <code className="bg-slate-100 px-1 rounded">npm run seed:dummy</code> di folder server)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo("owner")}
                className="flex-1 text-xs py-2.5 rounded-xl bg-[#001F5B]/10 text-[#001F5B] font-medium active:scale-[0.98]"
              >
                {DUMMY_ACCOUNTS.owner.label}
              </button>
              <button
                type="button"
                onClick={() => fillDemo("karyawan")}
                className="flex-1 text-xs py-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 font-medium active:scale-[0.98]"
              >
                {DUMMY_ACCOUNTS.karyawan.label}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Belum punya akun bisnis?{" "}
          <Link to="/signup" className="text-[#001F5B] font-semibold">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
