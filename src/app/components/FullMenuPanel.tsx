import { useRef } from "react";
import { X } from "lucide-react";
import type { UserRole } from "../types";
import { MenuList } from "./menu/MenuList";
import { useMenuBlocks } from "./menu/useMenuBlocks";

export const SWIPE_CLOSE_PX = 72;
export const SWIPE_OPEN_PX = 72;

interface FullMenuPanelProps {
  role: UserRole;
  open: boolean;
  activeMenu: string | null;
  dragOffset: number;
  opening: boolean;
  onSelect: (menuId: string) => void;
  onClose: () => void;
  onDrag: (offset: number) => void;
  onDragEnd: () => void;
  onOpenDrag: (offset: number) => void;
  onOpenDragEnd: () => void;
}

export function FullMenuPanel({
  role,
  open,
  activeMenu,
  dragOffset,
  opening,
  onSelect,
  onClose,
  onDrag,
  onDragEnd,
  onOpenDrag,
  onOpenDragEnd,
}: FullMenuPanelProps) {
  const blocks = useMenuBlocks(role);
  const touchStartX = useRef(0);
  const mode = useRef<"close" | "open" | null>(null);

  const visible = open || opening;
  const transform = (() => {
    if (open && dragOffset > 0) return `translateX(-${dragOffset}px)`;
    if (opening) return `translateX(calc(-100% + ${dragOffset}px))`;
    if (open) return "translateX(0)";
    return "translateX(-100%)";
  })();

  function handleTouchStart(clientX: number) {
    touchStartX.current = clientX;
    mode.current = open ? "close" : opening ? "open" : null;
  }

  function handleTouchMove(clientX: number) {
    if (mode.current === "close" && open) {
      const delta = clientX - touchStartX.current;
      if (delta < 0) onDrag(Math.abs(delta));
    }
    if (mode.current === "open" && opening) {
      const delta = clientX - touchStartX.current;
      if (delta > 0) onOpenDrag(delta);
    }
  }

  function handleTouchEnd() {
    if (mode.current === "close") onDragEnd();
    if (mode.current === "open") onOpenDragEnd();
    mode.current = null;
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-white shadow-2xl"
      style={{
        transform,
        transition:
          dragOffset > 0 && (open || opening)
            ? "none"
            : "transform 300ms ease-in-out",
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
      onTouchStart={(e) => handleTouchStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-[#001F5B]">Menu</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Geser ke kiri untuk kembali ke Beranda
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-500 active:scale-95 transition-transform"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-3 [-webkit-overflow-scrolling:touch]">
        <MenuList
          blocks={blocks}
          activeMenu={activeMenu}
          onSelect={onSelect}
          showLabels
          compact={false}
        />
      </nav>
    </div>
  );
}
