import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Banknote,
  Plus,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { inputClass } from "../components/formui";
import { listUsers, updateUserSalary } from "../lib/users";
import {
  listLoans,
  listPayrolls,
  createLoan,
  approveLoan,
  generatePayrolls,
  updatePayrollStatus,
  currentPeriod,
  formatRupiah,
  LOAN_TYPE_LABEL,
  LOAN_STATUS_LABEL,
  PAYROLL_STATUS_LABEL,
  DEDUCTION_LABEL,
} from "../lib/payroll";
import type { Loan, Payroll, LoanType, DeductionMode } from "../types";

const LOAN_TYPES: LoanType[] = ["pinjaman", "hutang", "kerugian"];
const DEDUCTION_MODES: DeductionMode[] = ["langsung", "cicil", "berkala"];

export function PayrollView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [period, setPeriod] = useState(currentPeriod());
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; full_name: string; base_salary: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form pinjaman
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanType, setLoanType] = useState<LoanType>("pinjaman");
  const [loanNote, setLoanNote] = useState("");
  const [loanUserId, setLoanUserId] = useState("");
  const [deductionMode, setDeductionMode] = useState<DeductionMode>("cicil");
  const [deductionAmount, setDeductionAmount] = useState("");

  // Modal setujui pinjaman
  const [approving, setApproving] = useState<Loan | null>(null);
  const [approveMode, setApproveMode] = useState<DeductionMode>("cicil");
  const [approveAmount, setApproveAmount] = useState("");

  // Edit gaji pokok
  const [editingSalary, setEditingSalary] = useState<string | null>(null);
  const [salaryInput, setSalaryInput] = useState("");

  async function load() {
    setError(null);
    try {
      const [p, l] = await Promise.all([
        listPayrolls(period),
        listLoans(),
      ]);
      setPayrolls(p);
      setLoans(l);
      if (isOwner) {
        const users = await listUsers();
        setEmployees(
          users
            .filter((u) => u.role === "karyawan" && u.is_active)
            .map((u) => ({
              id: u.id,
              full_name: u.full_name,
              base_salary: u.base_salary,
            }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      await generatePayrolls(period);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate gaji");
    } finally {
      setBusy(false);
    }
  }

  async function handlePayrollStatus(id: string, status: Payroll["status"]) {
    setBusy(true);
    setError(null);
    try {
      await updatePayrollStatus(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui status");
    } finally {
      setBusy(false);
    }
  }

  async function submitLoan() {
    const amt = Number(loanAmount) || 0;
    if (amt <= 0) {
      setError("Nominal wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createLoan({
        type: loanType,
        amount: amt,
        note: loanNote || undefined,
        ...(isOwner
          ? {
              userId: loanUserId || undefined,
              deductionMode,
              deductionAmount:
                deductionMode !== "langsung"
                  ? Number(deductionAmount) || undefined
                  : amt,
            }
          : {}),
      });
      setShowLoanForm(false);
      setLoanAmount("");
      setLoanNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengajukan pinjaman");
    } finally {
      setBusy(false);
    }
  }

  async function rejectLoan(loan: Loan) {
    setBusy(true);
    setError(null);
    try {
      await approveLoan(loan.id, { status: "ditolak" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menolak pinjaman");
    } finally {
      setBusy(false);
    }
  }

  async function submitApprove(approved: boolean) {
    if (!approving) return;
    setBusy(true);
    setError(null);
    try {
      if (approved) {
        await approveLoan(approving.id, {
          status: "disetujui",
          deductionMode: approveMode,
          deductionAmount:
            approveMode !== "langsung"
              ? Number(approveAmount) || undefined
              : approving.amount,
        });
      } else {
        await approveLoan(approving.id, { status: "ditolak" });
      }
      setApproving(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses pinjaman");
    } finally {
      setBusy(false);
    }
  }

  async function saveSalary(userId: string) {
    const amt = Number(salaryInput) || 0;
    if (amt < 0) {
      setError("Gaji pokok tidak valid");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateUserSalary(userId, amt);
      setEditingSalary(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan gaji pokok");
    } finally {
      setBusy(false);
    }
  }

  const pendingLoans = loans.filter((l) => l.status === "diajukan");
  const myPayroll = !isOwner ? payrolls[0] : null;

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Owner: atur gaji pokok */}
      {isOwner && employees.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Gaji Pokok Karyawan
          </h3>
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.02] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {emp.full_name}
                  </div>
                  {editingSalary !== emp.id && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatRupiah(emp.base_salary)} / bulan
                    </div>
                  )}
                </div>
                {editingSalary === emp.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                      inputMode="numeric"
                      placeholder="Rp"
                      className={inputClass + " py-2 w-28 text-sm"}
                      autoFocus
                    />
                    <button
                      onClick={() => saveSalary(emp.id)}
                      disabled={busy}
                      className="p-2 rounded-lg bg-emerald-100 text-emerald-600 disabled:opacity-60"
                      aria-label="Simpan"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingSalary(null)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-500"
                      aria-label="Batal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingSalary(emp.id);
                      setSalaryInput(String(emp.base_salary || ""));
                    }}
                    className="text-xs text-[#001F5B] font-medium shrink-0"
                  >
                    Ubah
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Periode */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm border border-black/[0.03] flex items-center gap-3">
        <label className="text-xs font-medium text-slate-500 shrink-0">
          Periode
        </label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={inputClass + " py-2"}
        />
      </div>

      {/* Karyawan: slip sendiri */}
      {!isOwner && myPayroll && (
        <PayrollCard
          payroll={myPayroll}
          showActions={false}
        />
      )}
      {!isOwner && !myPayroll && (
        <p className="text-sm text-slate-400 text-center py-6">
          Belum ada slip gaji untuk periode ini.
        </p>
      )}

      {/* Owner: generate & daftar slip */}
      {isOwner && (
        <>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={busy}
            className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Hitung Ulang Gaji ({period})
          </motion.button>

          {payrolls.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Belum ada slip. Klik hitung ulang di atas.
            </p>
          ) : (
            <div className="space-y-3">
              {payrolls.map((p) => (
                <PayrollCard
                  key={p.id}
                  payroll={p}
                  showActions
                  busy={busy}
                  onStatus={handlePayrollStatus}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pinjaman menunggu (owner) */}
      {isOwner && pendingLoans.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 ml-1">
            Menunggu Persetujuan ({pendingLoans.length})
          </h3>
          <div className="space-y-2">
            {pendingLoans.map((loan) => (
              <div
                key={loan.id}
                className="bg-amber-50 rounded-2xl p-4 border border-amber-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {loan.users?.full_name ?? "Karyawan"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {LOAN_TYPE_LABEL[loan.type]} ·{" "}
                      {formatRupiah(loan.amount)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setApproving(loan);
                        setApproveMode("cicil");
                        setApproveAmount("");
                      }}
                      className="p-2 rounded-lg bg-emerald-100 text-emerald-600"
                      aria-label="Setujui"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => rejectLoan(loan)}
                      disabled={busy}
                      className="p-2 rounded-lg bg-red-100 text-red-600 disabled:opacity-60"
                      aria-label="Tolak"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar pinjaman */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
            {isOwner ? "Pinjaman Karyawan" : "Pinjaman Saya"}
          </h3>
          <button
            onClick={() => setShowLoanForm(true)}
            className="text-xs text-[#001F5B] font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {isOwner ? "Input" : "Ajukan"}
          </button>
        </div>
        {loans.filter((l) => l.status !== "ditolak").length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Tidak ada pinjaman aktif.
          </p>
        ) : (
          <div className="space-y-2">
            {loans
              .filter((l) => l.status !== "ditolak")
              .map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.02]"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {LOAN_TYPE_LABEL[loan.type]}
                        {isOwner && loan.users?.full_name
                          ? ` · ${loan.users.full_name}`
                          : ""}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatRupiah(loan.amount)}
                        {loan.remaining < loan.amount &&
                          ` · sisa ${formatRupiah(loan.remaining)}`}
                        {loan.deduction_mode &&
                          ` · ${DEDUCTION_LABEL[loan.deduction_mode]}`}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-1 rounded-full h-fit ${
                        loan.status === "disetujui"
                          ? "bg-emerald-100 text-emerald-700"
                          : loan.status === "diajukan"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {LOAN_STATUS_LABEL[loan.status]}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Form pinjaman */}
      {showLoanForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowLoanForm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-[#001F5B] mb-4">
              {isOwner ? "Input Pinjaman" : "Ajukan Pinjaman"}
            </h3>
            <div className="space-y-3">
              {isOwner && employees.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                    Karyawan
                  </label>
                  <select
                    value={loanUserId}
                    onChange={(e) => setLoanUserId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Saya sendiri</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {LOAN_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLoanType(t)}
                    className={`rounded-xl py-2 text-xs font-medium ${
                      loanType === t
                        ? "bg-[#001F5B] text-white"
                        : "bg-[#F5F5F7] text-slate-600"
                    }`}
                  >
                    {LOAN_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <input
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="Nominal (Rp)"
                inputMode="numeric"
                className={inputClass}
              />
              <input
                value={loanNote}
                onChange={(e) => setLoanNote(e.target.value)}
                placeholder="Keterangan (opsional)"
                className={inputClass}
              />
              {isOwner && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {DEDUCTION_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDeductionMode(m)}
                        className={`rounded-xl py-2 text-xs font-medium ${
                          deductionMode === m
                            ? "bg-[#001F5B] text-white"
                            : "bg-[#F5F5F7] text-slate-600"
                        }`}
                      >
                        {DEDUCTION_LABEL[m]}
                      </button>
                    ))}
                  </div>
                  {deductionMode !== "langsung" && (
                    <input
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                      placeholder="Potong per periode (Rp)"
                      inputMode="numeric"
                      className={inputClass}
                    />
                  )}
                </>
              )}
              <button
                onClick={submitLoan}
                disabled={busy}
                className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 disabled:opacity-60"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal setujui */}
      {approving && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setApproving(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl">
            <h3 className="font-semibold text-[#001F5B] mb-1">Setujui Pinjaman</h3>
            <p className="text-sm text-slate-500 mb-4">
              {approving.users?.full_name} · {formatRupiah(approving.amount)}
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {DEDUCTION_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setApproveMode(m)}
                  className={`rounded-xl py-2 text-xs font-medium ${
                    approveMode === m
                      ? "bg-[#001F5B] text-white"
                      : "bg-[#F5F5F7] text-slate-600"
                  }`}
                >
                  {DEDUCTION_LABEL[m]}
                </button>
              ))}
            </div>
            {approveMode !== "langsung" && (
              <input
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="Potong per periode (Rp)"
                inputMode="numeric"
                className={inputClass + " mb-3"}
              />
            )}
            <button
              onClick={() => submitApprove(true)}
              disabled={busy}
              className="w-full bg-emerald-600 text-white font-semibold rounded-xl py-3 disabled:opacity-60"
            >
              Setujui & Terapkan Potongan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PayrollCard({
  payroll,
  showActions,
  busy,
  onStatus,
}: {
  payroll: Payroll;
  showActions: boolean;
  busy?: boolean;
  onStatus?: (id: string, status: Payroll["status"]) => void;
}) {
  return (
    <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">
            {payroll.users?.full_name ?? "Karyawan"}
          </div>
          <div className="text-xs text-slate-400">{payroll.period}</div>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-1 rounded-full ${
            payroll.status === "dibayar"
              ? "bg-emerald-100 text-emerald-700"
              : payroll.status === "final"
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {PAYROLL_STATUS_LABEL[payroll.status]}
        </span>
      </div>

      <div className="space-y-1.5 text-sm mb-3">
        <Row label="Gaji pokok" value={formatRupiah(payroll.base_salary)} />
        <Row
          label="Komisi"
          value={formatRupiah(payroll.commission_total)}
          positive
        />
        <Row label="Hari hadir" value={String(payroll.attendance_days)} />
        {payroll.deductions > 0 && (
          <Row
            label="Potongan"
            value={`− ${formatRupiah(payroll.deductions)}`}
            negative
          />
        )}
      </div>

      <div className="border-t border-dashed border-black/[0.06] pt-3 flex justify-between items-center">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Banknote className="w-3.5 h-3.5" /> Gaji bersih
        </span>
        <span className="text-lg font-semibold text-[#001F5B]">
          {formatRupiah(payroll.net_pay)}
        </span>
      </div>

      {showActions && payroll.status === "draft" && onStatus && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onStatus(payroll.id, "final")}
            disabled={busy}
            className="flex-1 text-xs font-medium bg-[#001F5B]/10 text-[#001F5B] rounded-lg py-2 disabled:opacity-60"
          >
            Finalkan
          </button>
          <button
            onClick={() => onStatus(payroll.id, "dibayar")}
            disabled={busy}
            className="flex-1 text-xs font-medium bg-emerald-600 text-white rounded-lg py-2 disabled:opacity-60"
          >
            Tandai Dibayar
          </button>
        </div>
      )}
      {showActions && payroll.status === "final" && onStatus && (
        <button
          onClick={() => onStatus(payroll.id, "dibayar")}
          disabled={busy}
          className="w-full mt-3 text-xs font-medium bg-emerald-600 text-white rounded-lg py-2 disabled:opacity-60"
        >
          Tandai Dibayar
        </button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span
        className={
          positive
            ? "text-emerald-600"
            : negative
            ? "text-red-500"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
