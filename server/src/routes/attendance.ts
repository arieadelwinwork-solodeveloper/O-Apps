import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  checkAttendanceSchema,
  type CheckAttendanceInput,
} from "../schemas/attendance.js";

export const attendanceRouter = Router();

const COLS =
  "id, user_id, type, photo_url, lat, lng, distance_m, is_valid, created_at";

/** Jarak haversine antara dua titik (meter). */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function todayStartISO(): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).toISOString();
}

/** GET /api/attendance/today — absensi user hari ini (masuk/pulang). */
attendanceRouter.get(
  "/today",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("attendances")
      .select(COLS)
      .eq("business_id", req.user!.businessId)
      .eq("user_id", req.user!.id)
      .gte("created_at", todayStartISO())
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[ATTENDANCE TODAY ERROR]", error);
      throw new AppError(500, "Gagal memuat absensi");
    }
    res.json({ records: data });
  }
);

/**
 * GET /api/attendance — riwayat absensi.
 * Karyawan: miliknya. Owner: semua (filter ?userId=).
 */
attendanceRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const isOwner = req.user!.role === "owner";
  let query = supabaseAdmin
    .from("attendances")
    .select(`${COLS}, users(full_name)`)
    .eq("business_id", req.user!.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!isOwner) query = query.eq("user_id", req.user!.id);
  else if (req.query.userId) query = query.eq("user_id", req.query.userId as string);

  const { data, error } = await query;
  if (error) {
    console.error("[ATTENDANCE LIST ERROR]", error);
    throw new AppError(500, "Gagal memuat riwayat absensi");
  }
  res.json({ records: data });
});

/**
 * POST /api/attendance — absen masuk/pulang.
 * Radius divalidasi di server memakai titik kunci bisnis.
 */
attendanceRouter.post(
  "/",
  authMiddleware,
  validateBody(checkAttendanceSchema),
  async (req: Request, res: Response) => {
    const body = res.locals.body as CheckAttendanceInput;
    const businessId = req.user!.businessId;

    const { data: biz, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("attendance_lat, attendance_lng, attendance_radius_m")
      .eq("id", businessId)
      .maybeSingle();
    if (bizErr) {
      console.error("[ATTENDANCE BIZ ERROR]", bizErr);
      throw new AppError(500, "Gagal memuat konfigurasi absensi");
    }
    if (biz?.attendance_lat == null || biz?.attendance_lng == null) {
      throw new AppError(
        400,
        "Titik absensi belum diatur owner. Hubungi owner."
      );
    }

    const radius = biz.attendance_radius_m ?? 100;
    const distance = haversineMeters(
      biz.attendance_lat,
      biz.attendance_lng,
      body.lat,
      body.lng
    );
    const isValid = distance <= radius;

    if (!isValid) {
      throw new AppError(
        400,
        `Di luar radius absensi (${distance} m dari titik, maksimal ${radius} m)`
      );
    }

    const { data, error } = await supabaseAdmin
      .from("attendances")
      .insert({
        business_id: businessId,
        user_id: req.user!.id,
        type: body.type,
        photo_url: body.photoUrl ?? null,
        lat: body.lat,
        lng: body.lng,
        distance_m: distance,
        is_valid: isValid,
      })
      .select(COLS)
      .single();
    if (error) {
      console.error("[ATTENDANCE CREATE ERROR]", error);
      throw new AppError(500, "Gagal menyimpan absensi");
    }
    res.status(201).json({ record: data, distance });
  }
);
