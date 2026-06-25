import { useRef } from "react";
import { MENU_HOME_ICON } from "../config/menuIcons";
import type { UserRole } from "../types";
import { MenuList } from "./menu/MenuList";
import { useMenuBlocks } from "./menu/useMenuBlocks";

const SWIPE_OPEN_PX = 56;

interface HoverSidebarProps {
  role: UserRole;
  activeMenu: string | null;
  disabled?: boolean;
  onSelect: (menuId: string) => void;
  onHome: () => void;
  onSwipeOpenFull: () => void;
}

export function HoverSidebar({
  role,
  activeMenu,
  disabled,
  onSelect,
  onHome,
  onSwipeOpenFull,
}: HoverSidebarProps) {
  const blocks = useMenuBlocks(role);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const tracking = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    tracking.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!tracking.current || disabled) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > SWIPE_OPEN_PX && dx > dy * 1.5) {
      tracking.current = false;
      onSwipeOpenFull();
    }
  }

  function onTouchEnd() {
    tracking.current = false;
  }

  const HomeIcon = MENU_HOME_ICON;

  return (
    <aside
      className={`group/sidebar shrink-0 flex flex-col min-h-[calc(100dvh-2rem)] w-14 hover:w-56 bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out overflow-hidden z-30 ${
        disabled ? "pointer-events-none opacity-0" : ""
      }`}
      aria-label="Menu navigasi ringkas"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="shrink-0 py-3 border-b border-slate-100 px-1">
        <button
          type="button"
          onClick={onHome}
          title="Beranda"
          className={`relative flex w-full items-center rounded-xl py-2.5 px-2 transition-all duration-300 ease-in-out ${
            activeMenu === null ? "bg-[#001F5B]/10 text-[#001F5B]" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#001F5B]/8">
            <HomeIcon className="w-[18px] h-[18px]" strokeWidth={2} />
          </span>
          <span className="ml-1 text-sm font-medium whitespace-nowrap overflow-hidden opacity-0 max-w-0 group-hover/sidebar:opacity-100 group-hover/sidebar:max-w-[11rem] transition-all duration-300 ease-in-out">
            Beranda
          </span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 [-webkit-overflow-scrolling:touch]">
        <MenuList
          blocks={blocks}
          activeMenu={activeMenu}
          onSelect={onSelect}
          showLabels
          compact
        />
      </nav>

      <p className="shrink-0 px-2 py-2 text-[9px] text-slate-400 text-center leading-tight opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
        Geser → buka penuh
      </p>
    </aside>
  );
}
