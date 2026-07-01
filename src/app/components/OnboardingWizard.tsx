import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { inputClass } from "./formui";
import { getBusinessSettings, updateBusinessSettings } from "../lib/businessSettings";
import { listUsers, createEmployee } from "../lib/users";
import { listServices, createService } from "../lib/customization";
import { openShift } from "../lib/cash";
import type { Business } from "../types";

const STEPS = [
  { title: "Profil Toko", desc: "Nama & kontak bisnis Anda" },
  { title: "Layanan Pertama", desc: "Tambahkan jasa laundry" },
  { title: "Undang Karyawan", desc: "Opsional — bisa dilewati" },
  { title: "Buka Kas", desc: "Opsional — bisa dilewati" },
  { title: "Selesai!", desc: "Siap menerima pesanan" },
] as const;

interface OnboardingWizardProps {
  onComplete: () => void;
  onOpenCashier: () => void;
}

export function OnboardingWizard({
  onComplete,
  onOpenCashier,
}: OnboardingWizardProps) {
  const [biz, setBiz] = useState<Business | null>(null);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [svcName, setSvcName] = useState("Cuci Kiloan");
  const [svcPrice, setSvcPrice] = useState("8000");
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [openingCash, setOpeningCash] = useState("500000");

  useEffect(() => {
    getBusinessSettings()
      .then((b) => {
        setBiz(b);
        setStep(b.onboardingStep ?? 0);
        setName(b.name ?? "");
        setWhatsapp(b.whatsapp ?? b.phone ?? "");
        if (b.onboardingCompleted) setDismissed(true);
      })
      .catch(() => setDismissed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading || dismissed || !biz || biz.onboardingCompleted) return null;

  async function saveStep(
    next: number,
    extra?: Parameters<typeof updateBusinessSettings>[0],
    manageBusy = true
  ) {
    if (manageBusy) setBusy(true);
    setError(null);
    try {
      const updated = await updateBusinessSettings({
        onboardingStep: next,
        ...extra,
      });
      setBiz(updated);
      setStep(next);
      if (next >= STEPS.length - 1) {
        await updateBusinessSettings({ onboardingCompleted: true });
        onComplete();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      if (manageBusy) setBusy(false);
    }
  }

  async function handleStep0() {
    if (!name.trim()) {
      setError("Nama toko wajib diisi");
      return;
    }
    await saveStep(1, { name: name.trim(), whatsapp: whatsapp.trim() });
  }

  async function handleStep1() {
    const price = Number(svcPrice) || 0;
    if (!svcName.trim() || price <= 0) {
      setError("Nama layanan dan harga wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const existing = await listServices();
      if (existing.length === 0) {
        await createService({
          name: svcName.trim(),
          price,
          unit: "kg",
          isActive: true,
        });
      }
      await saveStep(2, undefined, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah layanan");
    } finally {
      setBusy(false);
    }
  }

  async function handleStep2(skip = false) {
    if (!skip) {
      const hasAny =
        empName.trim() || empEmail.trim() || empPassword.length > 0;
      if (hasAny) {
        if (!empName.trim() || !empEmail.trim() || empPassword.length < 8) {
          setError(
            "Isi nama, email, dan password (min. 8 karakter), atau gunakan Lewati"
          );
          return;
        }
        setBusy(true);
        setError(null);
        try {
          const users = await listUsers();
          if (users.filter((u) => u.role === "karyawan").length === 0) {
            await createEmployee({
              fullName: empName.trim(),
              email: empEmail.trim(),
              password: empPassword,
            });
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Gagal menambah karyawan");
          return;
        } finally {
          setBusy(false);
        }
      }
    }
    await saveStep(3);
  }

  async function handleStep3(skip = false) {
    if (!skip) {
      const cash = Number(openingCash) || 0;
      if (cash > 0) {
        setBusy(true);
        try {
          await openShift(cash);
        } catch {
          /* shift mungkin sudah terbuka */
        } finally {
          setBusy(false);
        }
      }
    }
    await saveStep(4);
  }

  async function handleDismiss() {
    await updateBusinessSettings({ onboardingCompleted: true }).catch(() => {});
    setDismissed(true);
    onComplete();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[20px] border border-[#001F5B]/10 shadow-sm overflow-hidden mb-5"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#001F5B]/5 border-b border-[#001F5B]/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#001F5B]" />
            <span className="text-sm font-semibold text-[#001F5B]">
              Setup Bisnis ({step + 1}/{STEPS.length})
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Lewati
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-[#001F5B]" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div>
            <h3 className="font-semibold text-slate-800">{STEPS[step].title}</h3>
            <p className="text-xs text-slate-500">{STEPS[step].desc}</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-2">
              <input
                className={inputClass}
                placeholder="Nama toko"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="WhatsApp bisnis"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <input
                className={inputClass}
                placeholder="Nama layanan"
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
              />
              <input
                className={inputClass}
                type="number"
                placeholder="Harga per kg (Rp)"
                value={svcPrice}
                onChange={(e) => setSvcPrice(e.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <input
                className={inputClass}
                placeholder="Nama karyawan (opsional)"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
              />
              <input
                className={inputClass}
                type="email"
                placeholder="Email karyawan"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
              />
              <input
                className={inputClass}
                type="password"
                placeholder="Password awal"
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
              />
            </div>
          )}

          {step === 3 && (
            <input
              className={inputClass}
              type="number"
              placeholder="Saldo awal kas (Rp)"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />
          )}

          {step === 4 && (
            <p className="text-sm text-slate-600">
              Setup selesai! Anda siap menerima pesanan pertama.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {step === 2 && (
              <button
                type="button"
                onClick={() => handleStep2(true)}
                disabled={busy}
                className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl"
              >
                Lewati
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={() => handleStep3(true)}
                disabled={busy}
                className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl"
              >
                Lewati
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (step === 0) handleStep0();
                else if (step === 1) handleStep1();
                else if (step === 2) handleStep2(false);
                else if (step === 3) handleStep3(false);
                else {
                  onOpenCashier();
                  handleDismiss();
                }
              }}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm font-medium bg-[#001F5B] text-white rounded-xl disabled:opacity-60"
            >
              {step === 4 ? "Ke Kasir" : "Lanjut"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
