import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

/**
 * Middleware validasi body memakai Zod (Security PRD 3.9).
 * Data tervalidasi disimpan di res.locals.body.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Data tidak valid",
        issues: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    res.locals.body = result.data as ZodInfer<T>;
    next();
  };
}
