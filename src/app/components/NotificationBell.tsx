import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_TYPE_LABEL,
} from "../lib/dashboard";
import {
  cleanNotificationBody,
  extractReportId,
  getReport,
  REPORT_CATEGORY_LABEL,
  formatReportDate,
} from "../lib/reports";
import type { AppNotification, OperationalReport } from "../types";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OperationalReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    try {
      const n = await listNotifications();
      setNotifications(n.notifications);
      setUnreadCount(n.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRead(id: string) {
    await markNotificationRead(id);
    await load();
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    await load();
  }

  async function openReportFromNotification(n: AppNotification) {
    const reportId = extractReportId(n.body);
    if (!reportId) return;
    if (!n.is_read) await handleRead(n.id);
    setDetailLoading(true);
    setOpen(false);
    try {
      setDetail(await getReport(reportId));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleNotificationClick(n: AppNotification) {
    if (n.type === "laporan") {
      await openReportFromNotification(n);
      return;
    }
    if (!n.is_read) await handleRead(n.id);
  }

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 text-slate-500 relative active:scale-95 transition-transform"
          aria-label="Notifikasi"
          aria-expanded={open}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Tutup notifikasi"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,20rem)] bg-white rounded-[20px] p-4 shadow-lg border border-black/[0.06]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReadAll}
                    className="text-xs text-[#001F5B] font-medium"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Memuat…
                </p>
              ) : notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Tidak ada notifikasi.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left rounded-xl p-3 text-sm ${
                        n.is_read
                          ? "bg-slate-50"
                          : "bg-amber-50 border border-amber-100"
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-slate-800">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {cleanNotificationBody(n.body)}
                      </p>
                      {n.type === "laporan" && (
                        <span className="text-[10px] text-[#001F5B] font-medium mt-1 inline-block">
                          Ketuk untuk baca lengkap →
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup detail laporan"
            onClick={() => {
              setDetail(null);
              setDetailLoading(false);
            }}
          />
          <div className="relative w-full max-w-md bg-white rounded-[24px] p-5 shadow-xl max-h-[80dvh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : detail ? (
              <>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="font-semibold text-[#001F5B]">
                    {REPORT_CATEGORY_LABEL[detail.category]}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {detail.users?.full_name && (
                  <p className="text-xs text-slate-500 mb-1">
                    Dari: {detail.users.full_name}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mb-3">
                  {formatReportDate(detail.created_at)}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {detail.message}
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
