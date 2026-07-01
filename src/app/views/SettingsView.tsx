import { useEffect, useState } from "react";
import { Loader2, Save, Target } from "lucide-react";
import { inputClass } from "../components/formui";
import { SettingsExportTab } from "../components/settings/SettingsExportTab";
import {
  getBusinessSettings,
  updateBusinessSettings,
} from "../lib/businessSettings";
import { listUsers } from "../lib/users";
import { formatRupiah } from "../lib/dashboard";
import type { Business } from "../types";

type Tab = "profil" | "operasional" | "dashboard" | "export";

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("profil");
  const [biz, setBiz] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [workDays, setWorkDays] = useState("24");
  const [radius, setRadius] = useState("100");
  const [cashVisibility, setCashVisibility] = useState<"all" | "selected">("all");
  const [cashUserIds, setCashUserIds] = useState<string[]>([]);
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [dailyOrderTarget, setDailyOrderTarget] = useState("");
  const [autoWa, setAutoWa] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [b, users] = await Promise.all([
        getBusinessSettings(),
        listUsers(),
      ]);
      setBiz(b);
      setName(b.name ?? "");
      setAddress(b.address ?? "");
      setPhone(b.phone ?? "");
      setWhatsapp(b.whatsapp ?? "");
      setOpenTime(b.openTime ?? "08:00");
      setCloseTime(b.closeTime ?? "20:00");
      setWorkDays(String(b.workDaysTarget ?? 24));
      setRadius(String(b.attendance_radius_m ?? 100));
      setCashVisibility(b.cashDrawerVisibility ?? "all");
      setCashUserIds(b.cashDrawerUserIds ?? []);
      setMonthlyTarget(
        b.monthlyRevenueTarget ? String(b.monthlyRevenueTarget) : ""
      );
      setDailyOrderTarget(
        b.dailyOrderTarget ? String(b.dailyOrderTarget) : ""
      );
      setAutoWa(!!b.auto_send_complete_note);
      setEmployees(
        users
          .filter((u) => u.role === "karyawan")
          .map((u) => ({ id: u.id, full_name: u.full_name }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(patch: Parameters<typeof updateBusinessSettings>[0]) {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateBusinessSettings(patch);
      setBiz(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function toggleCashUser(id: string) {
    setCashUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function isTabDirty(current: Tab): boolean {
    if (!biz) return false;
    if (current === "profil") {
      return (
        name !== (biz.name ?? "") ||
        address !== (biz.address ?? "") ||
        phone !== (biz.phone ?? "") ||
        whatsapp !== (biz.whatsapp ?? "")
      );
    }
    if (current === "operasional") {
      return (
        openTime !== (biz.openTime ?? "08:00") ||
        closeTime !== (biz.closeTime ?? "20:00") ||
        workDays !== String(biz.workDaysTarget ?? 24) ||
        radius !== String(biz.attendance_radius_m ?? 100) ||
        autoWa !== !!biz.auto_send_complete_note
      );
    }
    if (current === "dashboard") {
      const savedMonthly = biz.monthlyRevenueTarget
        ? String(biz.monthlyRevenueTarget)
        : "";
      const savedDaily = biz.dailyOrderTarget
        ? String(biz.dailyOrderTarget)
        : "";
      const cashIds = biz.cashDrawerUserIds ?? [];
      return (
        monthlyTarget !== savedMonthly ||
        dailyOrderTarget !== savedDaily ||
        cashVisibility !== (biz.cashDrawerVisibility ?? "all") ||
        cashUserIds.length !== cashIds.length ||
        cashUserIds.some((id) => !cashIds.includes(id))
      );
    }
    return false;
  }

  function handleTabChange(next: Tab) {
    if (next === tab) return;
    if (isTabDirty(tab)) {
      const ok = window.confirm(
        "Perubahan belum disimpan. Pindah tab tanpa menyimpan?"
      );
      if (!ok) return;
    }
    setTab(next);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error && !biz) {
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "profil", label: "Profil" },
    { id: "operasional", label: "Operasional" },
    { id: "dashboard", label: "Dashboard" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3">
          Pengaturan berhasil disimpan.
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-[#001F5B] text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-[#001F5B]">Profil Toko</h3>
          <input
            className={inputClass}
            placeholder="Nama bisnis"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className={`${inputClass} min-h-[72px]`}
            placeholder="Alamat"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Telepon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="WhatsApp bisnis"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <SaveButton
            saving={saving}
            onClick={() =>
              save({
                name: name.trim(),
                address: address.trim(),
                phone: phone.trim(),
                whatsapp: whatsapp.trim(),
              })
            }
          />
        </div>
      )}

      {tab === "operasional" && (
        <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-[#001F5B]">Operasional</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-600">Jam buka</label>
              <input
                type="time"
                className={inputClass}
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Jam tutup</label>
              <input
                type="time"
                className={inputClass}
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
            </div>
          </div>
          <input
            className={inputClass}
            type="number"
            placeholder="Hari kerja penuh / bulan"
            value={workDays}
            onChange={(e) => setWorkDays(e.target.value)}
          />
          <input
            className={inputClass}
            type="number"
            placeholder="Radius absensi GPS (meter)"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoWa}
              onChange={(e) => setAutoWa(e.target.checked)}
              className="rounded"
            />
            Auto-kirim WA nota selesai
          </label>
          <SaveButton
            saving={saving}
            onClick={() =>
              save({
                openTime,
                closeTime,
                workDaysTarget: Number(workDays) || 24,
                attendanceRadiusM: Number(radius) || 100,
                autoSendCompleteNote: autoWa,
              })
            }
          />
        </div>
      )}

      {tab === "dashboard" && (
        <div className="space-y-3">
          <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#001F5B] flex items-center gap-2">
              <Target className="w-4 h-4" />
              Target KPI
            </h3>
            <input
              className={inputClass}
              type="number"
              placeholder="Target omset bulanan (Rp)"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
            />
            <input
              className={inputClass}
              type="number"
              placeholder="Target transaksi harian"
              value={dailyOrderTarget}
              onChange={(e) => setDailyOrderTarget(e.target.value)}
            />
            {monthlyTarget && (
              <p className="text-xs text-slate-500">
                Target: {formatRupiah(Number(monthlyTarget) || 0)}
              </p>
            )}
            <SaveButton
              saving={saving}
              onClick={() =>
                save({
                  monthlyRevenueTarget: Number(monthlyTarget) || 0,
                  dailyOrderTarget: Number(dailyOrderTarget) || 0,
                })
              }
            />
          </div>

          <div className="bg-white rounded-[20px] p-5 border border-black/[0.03] shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#001F5B]">
              Visibilitas Uang Laci
            </h3>
            <div className="flex gap-2">
              {(["all", "selected"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCashVisibility(v)}
                  className={`flex-1 py-2 text-xs rounded-xl border ${
                    cashVisibility === v
                      ? "bg-[#001F5B] text-white border-[#001F5B]"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {v === "all" ? "Semua" : "Tertentu"}
                </button>
              ))}
            </div>
            {cashVisibility === "selected" && (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2">
                {employees.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1 py-2">
                    Belum ada karyawan untuk dipilih.
                  </p>
                ) : (
                  employees.map((e) => (
                    <label
                      key={e.id}
                      className="flex items-center gap-2 text-sm text-slate-700 min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={cashUserIds.includes(e.id)}
                        onChange={() => toggleCashUser(e.id)}
                      />
                      <span className="truncate">{e.full_name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            <SaveButton
              saving={saving}
              onClick={() =>
                save({
                  cashDrawerVisibility: cashVisibility,
                  cashDrawerUserIds: cashUserIds,
                })
              }
            />
          </div>
        </div>
      )}

      {tab === "export" && <SettingsExportTab />}
    </div>
  );
}

function SaveButton({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 bg-[#001F5B] text-white text-sm font-medium rounded-xl disabled:opacity-60"
    >
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      Simpan
    </button>
  );
}
