import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Plus,
  UserCog,
  Mail,
  Banknote,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { inputClass } from "../components/formui";
import {
  listUsers,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  toEmployeeListItem,
} from "../lib/users";
import { listPayrolls, listLoans, formatRupiah, currentPeriod } from "../lib/payroll";
import type { EmployeeListItem } from "../types";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function EmployeesView() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [payrollMap, setPayrollMap] = useState<Record<string, number>>({});
  const [loanMap, setLoanMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [editName, setEditName] = useState("");
  const [editSalary, setEditSalary] = useState("");

  const period = currentPeriod();
  const karyawanOnly = useMemo(
    () => employees.filter((e) => e.role === "karyawan"),
    [employees]
  );

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [usersResult, payrollsResult, loansResult] = await Promise.allSettled([
        listUsers(),
        listPayrolls(period),
        listLoans(),
      ]);

      if (usersResult.status === "rejected") {
        throw usersResult.reason;
      }

      setEmployees(usersResult.value.map(toEmployeeListItem));

      if (payrollsResult.status === "fulfilled") {
        const pm: Record<string, number> = {};
        for (const p of payrollsResult.value) {
          if (p.user_id) pm[p.user_id] = p.net_pay;
        }
        setPayrollMap(pm);
      }

      if (loansResult.status === "fulfilled") {
        const lm: Record<string, number> = {};
        for (const l of loansResult.value) {
          if (l.status === "disetujui" && l.user_id) {
            lm[l.user_id] = (lm[l.user_id] ?? 0) + l.remaining;
          }
        }
        setLoanMap(lm);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat karyawan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError("Nama, email, dan password (min. 8) wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createEmployee({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        baseSalary: Number(baseSalary) || 0,
      });
      setShowForm(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setBaseSalary("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah karyawan");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await updateEmployee(editing.id, {
        fullName: editName.trim(),
        baseSalary: Number(editSalary) || 0,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui karyawan");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(emp: EmployeeListItem) {
    if (togglingId) return;
    const action = emp.isActive ? "menonaktifkan" : "mengaktifkan";
    if (!window.confirm(`Yakin ingin ${action} ${emp.name}?`)) return;
    setTogglingId(emp.id);
    setError(null);
    try {
      await updateEmployeeStatus(emp.id, !emp.isActive);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error && karyawanOnly.length === 0) {
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

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Karyawan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {karyawanOnly.filter((e) => e.isActive).length} aktif
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-[#001F5B] text-white text-xs font-medium px-3 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </motion.button>
      </div>

      {showForm && (
        <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-[#001F5B]">
            Karyawan Baru
          </h3>
          <input
            className={inputClass}
            placeholder="Nama lengkap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Email login"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password awal (min. 8)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className={inputClass}
            type="number"
            placeholder="Gaji pokok (Rp)"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 text-sm text-slate-600 rounded-xl border border-slate-200"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleCreate}
              className="flex-1 py-2.5 text-sm font-medium bg-[#001F5B] text-white rounded-xl disabled:opacity-60"
            >
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {karyawanOnly.map((emp) => (
          <div
            key={emp.id}
            className={`bg-white rounded-[20px] p-4 border shadow-sm ${
              emp.isActive
                ? "border-black/[0.03]"
                : "border-slate-200 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCog className="w-4 h-4 text-[#001F5B] shrink-0" />
                  <span className="font-semibold text-slate-800 truncate min-w-0">
                    {emp.name}
                  </span>
                  {!emp.isActive && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                      Nonaktif
                    </span>
                  )}
                </div>
                {emp.email && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 min-w-0">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  Bergabung {formatJoined(emp.joinedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(emp)}
                disabled={togglingId === emp.id}
                className="shrink-0 text-[#001F5B] p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
                aria-label={emp.isActive ? "Nonaktifkan" : "Aktifkan"}
              >
                {togglingId === emp.id ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : emp.isActive ? (
                  <ToggleRight className="w-7 h-7" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-400" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs">
                <span className="text-slate-500">Gaji bulan ini</span>
                <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  {formatRupiah(payrollMap[emp.id] ?? emp.baseSalary)}
                </div>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">Saldo pinjaman</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {formatRupiah(loanMap[emp.id] ?? 0)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditing(emp);
                setEditName(emp.name);
                setEditSalary(String(emp.baseSalary));
              }}
              className="mt-3 text-xs font-medium text-[#001F5B] py-2 -ml-1 px-1"
            >
              Edit data →
            </button>
          </div>
        ))}

        {karyawanOnly.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            Belum ada karyawan. Tambahkan karyawan pertama Anda.
          </p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup"
            onClick={() => setEditing(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-[24px] p-5 shadow-xl">
            <h3 className="font-semibold text-[#001F5B] mb-4">Edit Karyawan</h3>
            <div className="space-y-3">
              <input
                className={inputClass}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nama"
              />
              <input
                className={inputClass}
                type="number"
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
                placeholder="Gaji pokok"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleUpdate}
                className="flex-1 py-2.5 text-sm font-medium bg-[#001F5B] text-white rounded-xl"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
