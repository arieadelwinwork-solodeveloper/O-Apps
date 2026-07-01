import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Bell, CheckCheck } from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_TYPE_LABEL,
} from "../lib/dashboard";
import { cleanNotificationBody, extractReportId } from "../lib/reports";
import type { AppNotification, NotificationType } from "../types";

type Filter = "all" | "unread" | NotificationType;

const FILTER_OPTIONS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "unread", label: "Belum dibaca" },
  { id: "stok_menipis", label: "Stok" },
  { id: "laporan", label: "Laporan" },
  { id: "pinjaman", label: "Pinjaman" },
];

function navPathForNotification(n: AppNotification): string | null {
  if (n.type === "stok_menipis") return "/inventori";
  if (n.type === "laporan") return "/laporan";
  if (n.type === "pinjaman") return "/penggajian";
  if (n.body.includes("langganan")) return "/langganan";
  return null;
}

function emptyMessage(filter: Filter): string {
  if (filter === "all") return "Tidak ada notifikasi.";
  if (filter === "unread") return "Semua notifikasi sudah dibaca.";
  const label = FILTER_OPTIONS.find((f) => f.id === filter)?.label ?? filter;
  return `Tidak ada notifikasi bertipe "${label}".`;
}

export function NotificationsView() {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const n = await listNotifications();
      if (mountedRef.current) {
        setNotifications(n.notifications);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Gagal memuat notifikasi");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleClick(n: AppNotification) {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, is_read: true } : item
        )
      );
      try {
        await markNotificationRead(n.id);
      } catch {
        await load();
        return;
      }
    }
    const path = navPathForNotification(n);
    if (path) navigate(path);
    else if (n.type === "laporan" && extractReportId(n.body)) {
      navigate("/laporan");
    }
  }

  async function handleMarkAll() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menandai semua");
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error && notifications.length === 0) {
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

  return (
    <div className="p-4 space-y-4 pb-8">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#001F5B]" />
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Notifikasi
            </h2>
            {unreadCount > 0 && (
              <p className="text-xs text-amber-600">{unreadCount} belum dibaca</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={handleMarkAll}
            className="flex items-center gap-1 text-xs font-medium text-[#001F5B] py-2 px-1 disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Tandai semua
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === f.id
                ? "bg-[#001F5B] text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => handleClick(n)}
            className={`w-full text-left rounded-[16px] p-4 border transition-colors ${
              n.is_read
                ? "bg-white border-slate-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <div className="flex justify-between gap-2 min-w-0">
              <span className="font-medium text-slate-800 text-sm truncate min-w-0">
                {n.title}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 break-words">
              {cleanNotificationBody(n.body)}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">
              {new Date(n.created_at).toLocaleString("id-ID")}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-12">
            {emptyMessage(filter)}
          </p>
        )}
      </div>
    </div>
  );
}
