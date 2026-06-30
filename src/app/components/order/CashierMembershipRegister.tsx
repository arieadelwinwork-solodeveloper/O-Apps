import { useEffect, useMemo, useState } from "react";
import { Crown, Loader2, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  listMembershipPackages,
  registerMembershipAtCashier,
  formatMembershipSavings,
  formatRupiah,
  describePackage,
  defaultMembershipNotaMessage,
} from "../../lib/membership";
import { uploadPaymentProof } from "../../lib/orders";
import { openWhatsApp, waNumber } from "../../lib/messages";
import { assignMembershipTiers } from "../../lib/membershipTier";
import { MembershipPackageCard } from "../membership/MembershipPackageCard";
import { PaymentProofField } from "./PaymentProofField";
import {
  MembershipSuccessDialog,
  type MembershipSuccessInfo,
} from "./MembershipSuccessDialog";
import type { Membership, MembershipPackage, PaymentMethod } from "../../types";

const PAYMENT_METHOD: { id: PaymentMethod; label: string }[] = [
  { id: "tunai", label: "Tunai" },
  { id: "qris", label: "QRIS" },
  { id: "transfer", label: "Transfer" },
];

interface CashierMembershipRegisterProps {
  customerName: string;
  customerPhone: string;
  phoneValid: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onRegistered: () => void;
  onNewTransaction: () => void;
}

function PackageCategorySection({
  title,
  packages,
  selectedId,
  onSelect,
  disabled,
}: {
  title: string;
  packages: MembershipPackage[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const tierMap = useMemo(() => assignMembershipTiers(packages), [packages]);
  const sortedPackages = useMemo(
    () => [...packages].sort((a, b) => a.price - b.price),
    [packages]
  );

  if (packages.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-2">
        {sortedPackages.map((pkg) => {
          const tier = tierMap.get(pkg.id) ?? "silver";
          const selected = selectedId === pkg.id;
          return (
            <MembershipPackageCard
              key={pkg.id}
              pkg={pkg}
              tier={tier}
              selected={selected}
              disabled={disabled}
              onClick={() => onSelect(selected ? "" : pkg.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function buildBalanceLabel(
  membership: Membership,
  pkg: MembershipPackage
): string | null {
  if (membership.type === "saldo") {
    return `Saldo tersisa: ${formatRupiah(membership.balance)}`;
  }
  const unit = pkg.services?.unit ?? membership.services?.unit ?? "unit";
  const svc = pkg.services?.name ?? membership.services?.name ?? "layanan";
  return `Kuota tersisa: ${membership.quota_remaining} ${unit} ${svc}`;
}

export function CashierMembershipRegister({
  customerName,
  customerPhone,
  phoneValid,
  expanded,
  onExpand,
  onCollapse,
  onRegistered,
  onNewTransaction,
}: CashierMembershipRegisterProps) {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packageId, setPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<MembershipSuccessInfo | null>(
    null
  );
  const [successError, setSuccessError] = useState<string | null>(null);
  const [sendingWa, setSendingWa] = useState(false);

  const selectedPkg = packages.find((p) => p.id === packageId);

  useEffect(() => {
    setPackagesLoading(true);
    listMembershipPackages({ activeOnly: true })
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setPackagesLoading(false));
  }, []);

  function resetForm() {
    setPackageId("");
    setPaymentMethod("");
    setProofFile(null);
    setError(null);
  }

  useEffect(() => {
    if (!expanded) {
      resetForm();
      setSuccessOpen(false);
      setSuccessInfo(null);
      setSuccessError(null);
    }
  }, [expanded]);

  useEffect(() => {
    setPaymentMethod("");
    setProofFile(null);
    setError(null);
  }, [packageId]);

  async function doRegister(method: PaymentMethod, proof?: File | null) {
    if (!phoneValid) {
      setError("Isi nomor WhatsApp pelanggan terlebih dahulu (min. 8 digit)");
      return;
    }
    if (!packageId || !selectedPkg) {
      setError("Pilih paket membership");
      return;
    }
    if (!customerName.trim()) {
      setError("Nama pelanggan wajib diisi");
      return;
    }
    if (method !== "tunai" && !proof) {
      setError("Bukti bayar wajib untuk QRIS/Transfer");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessError(null);
    try {
      let proofUrl: string | undefined;
      if (proof) proofUrl = await uploadPaymentProof(proof);

      const membership = await registerMembershipAtCashier({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        packageId,
        paymentMethod: method,
        proofUrl,
      });

      const benefit = describePackage(selectedPkg);
      const savings = formatMembershipSavings(selectedPkg);
      const balanceLabel = buildBalanceLabel(membership, selectedPkg);

      setSuccessInfo({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        packageName: selectedPkg.name,
        packagePrice: selectedPkg.price,
        benefit,
        savings,
        paymentMethod: method,
        balanceLabel,
      });
      setSuccessOpen(true);
      resetForm();
      onRegistered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftarkan membership");
    } finally {
      setLoading(false);
    }
  }

  async function handleMethodSelect(method: PaymentMethod) {
    if (loading || !phoneValid || !packageId) return;
    setPaymentMethod(method);
    setProofFile(null);
  }

  async function handleConfirm() {
    if (!paymentMethod) return;
    if (paymentMethod !== "tunai" && !proofFile) {
      setError("Bukti bayar wajib untuk QRIS/Transfer");
      return;
    }
    await doRegister(
      paymentMethod,
      paymentMethod === "tunai" ? null : proofFile
    );
  }

  function handleNewTransaction() {
    setSuccessOpen(false);
    setSuccessInfo(null);
    setSuccessError(null);
    resetForm();
    onNewTransaction();
  }

  async function handleSendNota() {
    if (!successInfo) return;
    const phone = waNumber(successInfo.customerPhone);
    if (!phone) {
      setSuccessError("Nomor WhatsApp pelanggan tidak valid");
      return;
    }
    setSuccessError(null);
    setSendingWa(true);
    try {
      const message = defaultMembershipNotaMessage({
        customerName: successInfo.customerName,
        packageName: successInfo.packageName,
        price: successInfo.packagePrice,
        benefit: successInfo.benefit,
        savings: successInfo.savings,
        paymentMethod: successInfo.paymentMethod,
        balanceLabel: successInfo.balanceLabel,
      });
      openWhatsApp(phone, message);
    } catch (e) {
      setSuccessError(
        e instanceof Error ? e.message : "Gagal membuka WhatsApp"
      );
    } finally {
      setSendingWa(false);
    }
  }

  const saldoPackages = packages.filter((p) => p.type === "saldo");
  const kuotaPackages = packages.filter((p) => p.type === "kuota");

  const needsProof =
    paymentMethod === "qris" || paymentMethod === "transfer";

  const canConfirm =
    paymentMethod === "tunai" ||
    (needsProof && proofFile != null);

  return (
    <>
      <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-violet-100">
        {expanded ? (
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-violet-600" />
              + Membership
            </h2>
            <button
              type="button"
              onClick={onCollapse}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 shrink-0"
              aria-label="Kembali ke layanan"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={onExpand} className="w-full text-left">
            <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-violet-600" />
              + Membership
            </h2>
            <p className="text-xs text-slate-500">
              Daftarkan pelanggan ke paket membership (saldo atau kuota).
            </p>
          </button>
        )}

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-slate-500 mb-3 mt-1">
                Pilih paket, lalu bayar lunas untuk mendaftarkan membership.
              </p>

              {packagesLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat paket membership…
                </div>
              ) : packages.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
                  Belum ada paket membership aktif. Owner perlu menambahkan paket
                  di menu Daftar Membership → Kelola Paket.
                </p>
              ) : (
                <>
                  {!phoneValid && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 mb-3">
                      Isi <strong>nama</strong> dan <strong>nomor WhatsApp</strong>{" "}
                      pelanggan di atas untuk mendaftarkan membership.
                    </p>
                  )}

                  {error && (
                    <div className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4 mb-4">
                    <PackageCategorySection
                      title="Saldo"
                      packages={saldoPackages}
                      selectedId={packageId}
                      onSelect={setPackageId}
                      disabled={!phoneValid || loading}
                    />
                    <PackageCategorySection
                      title="Kuota"
                      packages={kuotaPackages}
                      selectedId={packageId}
                      onSelect={setPackageId}
                      disabled={!phoneValid || loading}
                    />
                  </div>

                  {selectedPkg && phoneValid && (
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                          Pembayaran (Lunas)
                        </span>
                        <span className="text-sm font-semibold text-[#001F5B]">
                          {formatRupiah(selectedPkg.price)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                          Metode Pembayaran
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {PAYMENT_METHOD.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              disabled={loading}
                              onClick={() => handleMethodSelect(m.id)}
                              className={`rounded-xl py-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                paymentMethod === m.id
                                  ? "bg-[#001F5B] text-white"
                                  : "bg-[#F5F5F7] text-slate-600"
                              }`}
                            >
                              {loading && m.id === paymentMethod ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                              ) : (
                                m.label
                              )}
                            </button>
                          ))}
                        </div>
                        {paymentMethod === "tunai" && !loading && (
                          <p className="text-[11px] text-slate-400 mt-2 ml-1">
                            Pastikan uang tunai sudah diterima, lalu konfirmasi.
                          </p>
                        )}
                      </div>

                      {paymentMethod && (
                        <>
                          {needsProof && (
                            <PaymentProofField
                              file={proofFile}
                              onChange={setProofFile}
                            />
                          )}
                          <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={loading || !canConfirm}
                            className="w-full bg-violet-600 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            Konfirmasi & Daftarkan Membership
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MembershipSuccessDialog
        open={successOpen}
        info={successInfo}
        error={successError}
        sending={sendingWa}
        onOpenChange={setSuccessOpen}
        onSendNota={handleSendNota}
        onNewTransaction={handleNewTransaction}
      />
    </>
  );
}
