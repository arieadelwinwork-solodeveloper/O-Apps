import { apiFetch } from "./api";
import { isUsingMockApi, mockUploadUrl } from "./mockMode";
import { supabase } from "./supabase";
import type { Attendance, AttendanceType, Business } from "../types";

export async function getTodayAttendance(): Promise<Attendance[]> {
  const { records } = await apiFetch<{ records: Attendance[] }>(
    "/api/attendance/today"
  );
  return records;
}

export async function listAttendance(userId?: string): Promise<Attendance[]> {
  const qs = userId ? `?userId=${userId}` : "";
  const { records } = await apiFetch<{ records: Attendance[] }>(
    `/api/attendance${qs}`
  );
  return records;
}

export interface CheckAttendanceInput {
  type: AttendanceType;
  lat: number;
  lng: number;
  photoUrl?: string;
}

export async function checkAttendance(
  input: CheckAttendanceInput
): Promise<{ record: Attendance; distance: number }> {
  return apiFetch("/api/attendance", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBusiness(
  patch: Partial<{
    name: string;
    address: string;
    phone: string;
    attendanceLat: number | null;
    attendanceLng: number | null;
    attendanceRadiusM: number;
  }>
): Promise<Business> {
  const { business } = await apiFetch<{ business: Business }>("/api/business", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return business;
}

/** Ambil posisi GPS sekarang (high accuracy). */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(
        new Error(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak"
            : "Gagal mendapatkan lokasi"
        )
      );
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

/** Upload foto absensi ke Supabase Storage, balikkan public URL. */
export async function uploadAttendancePhoto(file: Blob): Promise<string> {
  if (isUsingMockApi()) {
    await new Promise((r) => setTimeout(r, 300));
    return mockUploadUrl("attendance");
  }
  if (!supabase) throw new Error("Supabase belum dikonfigurasi");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from("attendance-photos")
    .upload(path, file, { upsert: false, contentType: "image/jpeg" });
  if (error) throw new Error("Gagal mengunggah foto absensi");
  const { data } = supabase.storage
    .from("attendance-photos")
    .getPublicUrl(path);
  return data.publicUrl;
}
