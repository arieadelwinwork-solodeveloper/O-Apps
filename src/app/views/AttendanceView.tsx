import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  Camera,
  MapPin,
  CheckCircle2,
  LogIn,
  LogOut,
  Crosshair,
  X,
} from "lucide-react";
import {
  getTodayAttendance,
  checkAttendance,
  uploadAttendancePhoto,
  getCurrentPosition,
  updateBusiness,
} from "../lib/attendance";
import { getBusiness } from "../lib/printDevices";
import { inputClass } from "../components/formui";
import { useAuth } from "../hooks/useAuth";
import type { Attendance, AttendanceType, Business } from "../types";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceView() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [records, setRecords] = useState<Attendance[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Owner config
  const [radius, setRadius] = useState("100");
  const [savingCfg, setSavingCfg] = useState(false);

  async function load() {
    setError(null);
    try {
      const [recs, biz] = await Promise.all([
        getTodayAttendance(),
        getBusiness().catch(() => null),
      ]);
      setRecords(recs);
      setBusiness(biz);
      if (biz?.attendance_radius_m) setRadius(String(biz.attendance_radius_m));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat absensi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hasMasuk = records.some((r) => r.type === "masuk");
  const hasPulang = records.some((r) => r.type === "pulang");
  const nextType: AttendanceType | null = !hasMasuk
    ? "masuk"
    : !hasPulang
    ? "pulang"
    : null;

  const pointSet =
    business?.attendance_lat != null && business?.attendance_lng != null;

  async function submit() {
    if (!nextType) return;
    setError(null);
    setInfo(null);
    if (!photo) {
      setError("Ambil foto dulu");
      return;
    }
    setBusy(true);
    try {
      const pos = await getCurrentPosition();
      const photoUrl = await uploadAttendancePhoto(photo);
      const { distance } = await checkAttendance({
        type: nextType,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        photoUrl,
      });
      setInfo(
        `Absen ${nextType} berhasil (${distance} m dari titik). Selamat ${
          nextType === "masuk" ? "bekerja" : "beristirahat"
        }!`
      );
      setPhoto(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal absen");
    } finally {
      setBusy(false);
    }
  }

  async function lockHere() {
    setError(null);
    setInfo(null);
    setSavingCfg(true);
    try {
      const pos = await getCurrentPosition();
      const biz = await updateBusiness({
        attendanceLat: pos.coords.latitude,
        attendanceLng: pos.coords.longitude,
        attendanceRadiusM: Number(radius) || 100,
      });
      setBusiness(biz);
      setInfo("Titik absensi dikunci di lokasi ini");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunci titik");
    } finally {
      setSavingCfg(false);
    }
  }

  async function saveRadius() {
    setSavingCfg(true);
    setError(null);
    try {
      const biz = await updateBusiness({
        attendanceRadiusM: Number(radius) || 100,
      });
      setBusiness(biz);
      setInfo("Radius diperbarui");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan radius");
    } finally {
      setSavingCfg(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {info}
        </div>
      )}

      {/* Status hari ini */}
      <div className="bg-[#001F5B] rounded-[20px] p-6 text-white shadow-[0_8px_16px_rgba(0,31,91,0.2)]">
        <h2 className="text-white/80 text-sm font-medium mb-3">Absensi Hari Ini</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
              <LogIn className="w-3.5 h-3.5" /> Masuk
            </div>
            <div className="text-lg font-semibold">
              {hasMasuk
                ? timeLabel(records.find((r) => r.type === "masuk")!.created_at)
                : "—"}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
              <LogOut className="w-3.5 h-3.5" /> Pulang
            </div>
            <div className="text-lg font-semibold">
              {hasPulang
                ? timeLabel(records.find((r) => r.type === "pulang")!.created_at)
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Aksi absen */}
      {!pointSet ? (
        <div className="bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3">
          Titik absensi belum diatur owner.
          {isOwner ? " Kunci titik di bawah." : " Hubungi owner."}
        </div>
      ) : nextType ? (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            Absen {nextType === "masuk" ? "Masuk" : "Pulang"}
          </h3>
          <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            Wajib foto & berada dalam radius{" "}
            {business?.attendance_radius_m ?? 100} m.
          </p>

          {photo ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2.5 text-sm mb-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{photo.name || "Foto siap"}</span>
              <button onClick={() => setPhoto(null)} aria-label="Hapus foto">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-[#F5F5F7] text-slate-600 rounded-xl px-3 py-3 text-sm mb-3"
            >
              <Camera className="w-4 h-4" /> Ambil Foto di Tempat
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={submit}
            disabled={busy}
            className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Absen {nextType === "masuk" ? "Masuk" : "Pulang"}
          </motion.button>
        </div>
      ) : (
        <div className="bg-white rounded-[20px] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm text-slate-600">
            Absensi hari ini lengkap. Terima kasih!
          </p>
        </div>
      )}

      {/* Konfigurasi owner */}
      {isOwner && (
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
          <h3 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-[#001F5B]" /> Titik Absensi (Owner)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {pointSet
              ? `Terkunci: ${business?.attendance_lat?.toFixed(
                  5
                )}, ${business?.attendance_lng?.toFixed(5)}`
              : "Belum diatur. Berdiri di lokasi usaha lalu kunci titik."}
          </p>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
            Radius (meter)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              inputMode="numeric"
              className={inputClass}
            />
            <button
              onClick={saveRadius}
              disabled={savingCfg}
              className="px-4 rounded-xl bg-[#001F5B]/10 text-[#001F5B] text-sm font-medium shrink-0 disabled:opacity-60"
            >
              Simpan
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={lockHere}
            disabled={savingCfg}
            className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {savingCfg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            Kunci Titik di Lokasi Saya
          </motion.button>
        </div>
      )}

      {/* Riwayat singkat hari ini */}
      {records.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Catatan Hari Ini
          </h3>
          <div className="space-y-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-3 shadow-sm border border-black/[0.02] flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    r.type === "masuk"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {r.type === "masuk" ? (
                    <LogIn className="w-4 h-4" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800 capitalize">
                    {r.type}
                  </div>
                  <div className="text-xs text-slate-400">
                    {timeLabel(r.created_at)} · {r.distance_m ?? "?"} m
                  </div>
                </div>
                {r.photo_url && (
                  <img
                    src={r.photo_url}
                    alt="Foto absen"
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
