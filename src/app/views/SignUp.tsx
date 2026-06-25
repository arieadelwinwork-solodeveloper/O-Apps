import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Droplets, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function SignUp() {
  const { signUpOwner } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const result = await signUpOwner(email, password, fullName, businessName);
      if (result.needsEmailConfirmation) {
        setSuccess(
          "Pendaftaran berhasil. Cek email kamu untuk konfirmasi, lalu masuk."
        );
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col justify-center px-6 py-10">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-[#001F5B] rounded-[22px] shadow-lg flex items-center justify-center text-white mx-auto mb-4">
            <Droplets className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold text-[#001F5B] tracking-tight">
            Daftar Bisnis Baru
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Akun owner & bisnis otomatis tersimpan ke Supabase
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[20px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03] space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Nama Bisnis
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Contoh: Laundry Sejahtera"
              className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Nama Lengkap (Owner)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all"
            />
          </div>
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 karakter"
              className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
              Konfirmasi Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password"
              className="w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full bg-[#001F5B] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Mendaftar..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-[#001F5B] font-semibold">
            Masuk
          </Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          Karyawan ditambahkan oleh owner setelah login (bukan lewat halaman ini).
        </p>
      </div>
    </div>
  );
}
