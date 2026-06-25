import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env, corsOrigins } from "./lib/env.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { servicesRouter } from "./routes/services.js";
import { templatesRouter } from "./routes/templates.js";
import { ordersRouter } from "./routes/orders.js";
import { customersRouter } from "./routes/customers.js";
import { cashRouter } from "./routes/cash.js";
import { expensesRouter } from "./routes/expenses.js";
import { commissionsRouter } from "./routes/commissions.js";
import { businessRouter } from "./routes/business.js";
import { printDevicesRouter } from "./routes/printDevices.js";
import { attendanceRouter } from "./routes/attendance.js";
import { loansRouter } from "./routes/loans.js";
import { payrollsRouter } from "./routes/payrolls.js";
import { membershipsRouter } from "./routes/memberships.js";
import { inventoryRouter } from "./routes/inventory.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { notificationsRouter } from "./routes/notifications.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// --- Security headers (Security PRD 3.8) ---
app.use(helmet());

// --- CORS allowlist (Security PRD 3.6) ---
app.use(
  cors({
    origin(origin, callback) {
      // izinkan tools tanpa origin (curl/health check) & origin terdaftar
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin tidak diizinkan"));
    },
    credentials: true,
  })
);

// --- Body parser dengan limit (Security PRD 3.6) ---
app.use(express.json({ limit: "10mb" }));

// --- Rate limiting global (Security PRD 3.6) ---
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Terlalu banyak request, coba lagi nanti" },
  })
);

// Rate limit lebih ketat untuk endpoint auth (anti brute-force).
app.use(
  ["/api/auth/register", "/api/auth/login"],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Terlalu banyak percobaan, coba lagi nanti" },
  })
);

// --- Health check ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Routes ---
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/services", servicesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/cash-shifts", cashRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/commissions", commissionsRouter);
app.use("/api/business", businessRouter);
app.use("/api/print-devices", printDevicesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/loans", loansRouter);
app.use("/api/payrolls", payrollsRouter);
app.use("/api/memberships", membershipsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/notifications", notificationsRouter);

// --- 404 + error handler (terakhir) ---
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[server] listening on http://localhost:${env.PORT}`);
});
