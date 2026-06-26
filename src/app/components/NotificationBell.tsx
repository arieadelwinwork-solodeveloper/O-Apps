import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_TYPE_LABEL,
} from "../lib/dashboard";
import type { AppNotification } from "../types";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  return (
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
              <h3 className="text-sm font-semibold text-slate-800">Notifikasi</h3>
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
              <p className="text-xs text-slate-400 text-center py-4">Memuat…</p>
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
                    onClick={() => !n.is_read && handleRead(n.id)}
                    className={`w-full text-left rounded-xl p-3 text-sm ${
                      n.is_read
                        ? "bg-slate-50"
                        : "bg-amber-50 border border-amber-100"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-slate-800">{n.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {n.body.replace(/item_id:[a-f0-9-]+/gi, "").trim()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
