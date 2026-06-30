import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,
  ClipboardList,
  CreditCard,
  ListOrdered,
  Users,
  Fingerprint,
  Banknote,
  Package,
  TrendingUp,
  Receipt,
  Wallet,
  FileText,
  Printer,
  LayoutGrid,
  MessageSquareWarning,
} from "lucide-react";

export const MENU_ICON_MAP: Record<string, LucideIcon> = {
  pemesanan: ShoppingCart,
  transaksi: ClipboardList,
  membership: CreditCard,
  layanan: ListOrdered,
  konsumen: Users,
  absensi: Fingerprint,
  penggajian: Banknote,
  inventori: Package,
  keuangan: TrendingUp,
  pengeluaran: Receipt,
  kas: Wallet,
  template: FileText,
  printer: Printer,
  laporan: MessageSquareWarning,
};

export const MENU_HOME_ICON = LayoutGrid;
