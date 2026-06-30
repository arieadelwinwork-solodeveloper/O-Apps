import { lazy, Suspense, type ComponentType } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";

const MENU_VIEWS: Record<string, React.LazyExoticComponent<ComponentType>> = {
  pemesanan: lazy(() =>
    import("../views/OrderView").then((m) => ({ default: m.OrderView }))
  ),
  transaksi: lazy(() =>
    import("../views/TrackingView").then((m) => ({ default: m.TrackingView }))
  ),
  absensi: lazy(() =>
    import("../views/AttendanceView").then((m) => ({
      default: m.AttendanceView,
    }))
  ),
  kas: lazy(() =>
    import("../views/CashShiftView").then((m) => ({ default: m.CashShiftView }))
  ),
  pengeluaran: lazy(() =>
    import("../views/ExpensesView").then((m) => ({ default: m.ExpensesView }))
  ),
  penggajian: lazy(() =>
    import("../views/PayrollView").then((m) => ({ default: m.PayrollView }))
  ),
  inventori: lazy(() =>
    import("../views/InventoryView").then((m) => ({
      default: m.InventoryView,
    }))
  ),
  konsumen: lazy(() =>
    import("../views/CustomersView").then((m) => ({
      default: m.CustomersView,
    }))
  ),
  printer: lazy(() =>
    import("../views/PrinterView").then((m) => ({ default: m.PrinterView }))
  ),
  keuangan: lazy(() =>
    import("../views/FinanceView").then((m) => ({ default: m.FinanceView }))
  ),
  layanan: lazy(() =>
    import("../views/ServicesView").then((m) => ({ default: m.ServicesView }))
  ),
  template: lazy(() =>
    import("../views/TemplatesView").then((m) => ({
      default: m.TemplatesView,
    }))
  ),
  membership: lazy(() =>
    import("../views/MembershipView").then((m) => ({
      default: m.MembershipView,
    }))
  ),
  laporan: lazy(() =>
    import("../views/ReportsView").then((m) => ({
      default: m.ReportsView,
    }))
  ),
};

function MenuLoading() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

interface MenuSheetProps {
  menuId: string | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuSheet({
  menuId,
  title,
  open,
  onOpenChange,
}: MenuSheetProps) {
  const View = menuId ? MENU_VIEWS[menuId] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] max-h-[100dvh] w-full max-w-md mx-auto left-0 right-0 rounded-none p-0 gap-0 border-0 flex flex-col min-h-0 overflow-hidden [&>button]:hidden data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-white shrink-0 z-10">
          <SheetTitle className="text-base font-semibold text-[#001F5B]">
            {title}
          </SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y bg-[#F5F5F7] [-webkit-overflow-scrolling:touch]">
          {View && (
            <Suspense fallback={<MenuLoading />}>
              <View />
            </Suspense>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function isValidMenuId(id: string): boolean {
  return id in MENU_VIEWS;
}
