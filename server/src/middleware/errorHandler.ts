import type { NextFunction, Request, Response } from "express";

/**
 * Error terstruktur yang aman dikirim ke client (pesan sudah generik).
 */
export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Resource tidak ditemukan" });
}

/**
 * Error handler global. Security PRD 3.7:
 * - Log detail LENGKAP hanya di server.
 * - Response ke user GENERIK, tanpa stack/nama tabel/detail query.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isApp = err instanceof AppError;
  const status = isApp ? err.status : 500;

  console.error("[UNHANDLED ERROR]", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Pesan AppError aman ditampilkan (sudah dikurasi). Selain itu generik.
  const message = isApp ? err.message : "Terjadi kesalahan sistem";
  res.status(status).json({ error: message });
}
