import { useEffect, useState } from "react";
import { Loader2, Crown, Check, Calendar } from "lucide-react";
import {
  getSubscription,
  PLAN_LABEL,
  PLAN_FEATURES,
  SUBSCRIPTION_STATUS_LABEL,
} from "../lib/subscriptions";
import { formatRupiah } from "../lib/dashboard";
import type { Subscription, SubscriptionPayment } from "../types";

function daysRemaining(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function SubscriptionView() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const r = await getSubscription();
      setSubscription(r.subscription);
      setPayments(r.payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat langganan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 space-y-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => load(true)}
            className="text-xs font-semibold text-[#001F5B] underline"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const hasSubscription = subscription !== null;
  const plan = subscription?.plan ?? "starter";
  const status = subscription?.status ?? "trial";
  const features = PLAN_FEATURES[plan];
  const trialDays = daysRemaining(subscription?.trial_ends_at ?? null);
  const expireDays = daysRemaining(subscription?.expires_at ?? null);

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!hasSubscription && (
        <div className="bg-amber-50 text-amber-800 text-sm rounded-xl px-4 py-3 border border-amber-100">
          Data langganan belum tersedia. Anda akan otomatis masuk paket trial
          setelah backend SaaS diaktifkan.
        </div>
      )}

      <div className="bg-gradient-to-br from-[#001F5B] to-[#003080] rounded-[24px] p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">Paket Anda</span>
        </div>
        <h2 className="text-2xl font-bold">
          {hasSubscription ? PLAN_LABEL[plan] : "Belum Terdaftar"}
        </h2>
        <p className="text-sm opacity-80 mt-1">
          Status:{" "}
          {hasSubscription
            ? SUBSCRIPTION_STATUS_LABEL[status]
            : "Menunggu aktivasi"}
        </p>
        {hasSubscription && status === "trial" && trialDays !== null && (
          <p className="text-xs mt-2 bg-white/15 px-2 py-1 rounded-lg w-fit">
            Sisa trial: {trialDays} hari
          </p>
        )}
        {hasSubscription && status === "active" && expireDays !== null && (
          <p className="text-xs mt-2 bg-white/15 px-2 py-1 rounded-lg flex items-center gap-1 w-fit">
            <Calendar className="w-3 h-3" />
            Jatuh tempo: {expireDays} hari lagi
          </p>
        )}
      </div>

      {features && (
        <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm">
          <h3 className="text-sm font-semibold text-[#001F5B] mb-3">
            Fitur Paket
          </h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Karyawan: {features.employees}
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Transaksi: {features.transactions}
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Inventori: {features.inventory}
            </li>
            <li className="flex items-center gap-2">
              {features.export ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <span className="w-4 h-4 text-center text-slate-300">—</span>
              )}
              Export laporan
            </li>
          </ul>
        </div>
      )}

      {showPaymentNotice && (
        <div className="bg-slate-50 text-slate-700 text-sm rounded-xl px-4 py-3 border border-slate-200">
          Integrasi pembayaran (Midtrans/Xendit) akan diaktifkan setelah backend
          SaaS siap.
        </div>
      )}

      <button
        type="button"
        className="w-full py-3.5 bg-[#001F5B] text-white font-medium rounded-2xl text-sm"
        onClick={() => setShowPaymentNotice(true)}
      >
        Perpanjang / Upgrade Paket
      </button>

      {payments.length > 0 && (
        <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm">
          <h3 className="text-sm font-semibold text-[#001F5B] mb-3">
            Riwayat Pembayaran
          </h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {PLAN_LABEL[p.plan]}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#001F5B] shrink-0 ml-2">
                  {formatRupiah(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
