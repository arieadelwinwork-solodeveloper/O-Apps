import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

export type AuthUser = {
  id: string;
  email: string | undefined;
  businessId: string;
  role: "owner" | "karyawan";
  fullName: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      accessToken?: string;
    }
  }
}

/**
 * Validasi JWT Supabase + muat profil dari public.users.
 * Security PRD 3.3: token wajib divalidasi di setiap protected route.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Token tidak valid" });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("business_id, role, full_name")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "Profil pengguna tidak ditemukan" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      businessId: profile.business_id,
      role: profile.role,
      fullName: profile.full_name,
    };
    req.accessToken = token;
    next();
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Batasi akses ke role tertentu (mis. requireRole("owner")).
 * Security PRD 3.4: role check terpisah untuk endpoint sensitif.
 */
export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Akses ditolak" });
    }
    next();
  };
}
