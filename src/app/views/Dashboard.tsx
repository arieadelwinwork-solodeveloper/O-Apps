import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { EmployeeSummary } from "../components/EmployeeSummary";
import { OwnerSummary } from "../components/OwnerSummary";
import { DashboardAccordion } from "../components/DashboardAccordion";
import { PerformaSection } from "../components/PerformaSection";
import { InventoryStatusSection } from "../components/InventoryStatusSection";
import { DASHBOARD_SECTION_ICONS } from "../config/dashboardSections";
import { MenuSheet, isValidMenuId } from "../components/MenuSheet";
import { HoverSidebar } from "../components/HoverSidebar";
import {
  FullMenuPanel,
  SWIPE_CLOSE_PX,
  SWIPE_OPEN_PX,
} from "../components/FullMenuPanel";
import { findMenu } from "../config/menuItems";

const EDGE_SWIPE_PX = 28;

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fullOpen, setFullOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closeDrag, setCloseDrag] = useState(0);
  const [openDrag, setOpenDrag] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const edgeTouchX = useRef(0);
  const edgeTracking = useRef(false);

  const role = user?.role ?? "karyawan";
  const menuParam = searchParams.get("m");
  const activeMenu =
    menuParam && isValidMenuId(menuParam) && findMenu(menuParam, role)
      ? menuParam
      : null;
  const sheetOpen = activeMenu !== null;
  const activeTitle = activeMenu
    ? (findMenu(activeMenu, role)?.title ?? "")
    : "";

  const setMenu = useCallback(
    (id: string | null) => {
      if (id) {
        setSearchParams({ m: id }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams]
  );

  function openFullInstant() {
    setCloseDrag(0);
    setOpenDrag(0);
    setOpening(false);
    setFullOpen(true);
  }

  function beginOpenSwipe() {
    setCloseDrag(0);
    setOpenDrag(0);
    setOpening(true);
    setFullOpen(false);
  }

  function closeFull() {
    setFullOpen(false);
    setOpening(false);
    setCloseDrag(0);
    setOpenDrag(0);
  }

  function handleFullSelect(id: string) {
    closeFull();
    setMenu(id);
  }

  function handleCloseDragEnd() {
    const panelW = mainRef.current?.offsetWidth ?? 320;
    if (closeDrag >= SWIPE_CLOSE_PX || closeDrag > panelW * 0.35) closeFull();
    else setCloseDrag(0);
  }

  function handleOpenDragEnd() {
    const panelW = mainRef.current?.offsetWidth ?? 320;
    if (openDrag >= SWIPE_OPEN_PX || openDrag > panelW * 0.35) {
      setOpening(false);
      setOpenDrag(0);
      setFullOpen(true);
    } else {
      setOpening(false);
      setOpenDrag(0);
    }
  }

  function onMainTouchStart(e: React.TouchEvent) {
    if (fullOpen || opening) return;
    const x = e.touches[0].clientX;
    const rect = mainRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fromLeft = x - rect.left;
    if (fromLeft <= EDGE_SWIPE_PX) {
      edgeTouchX.current = x;
      edgeTracking.current = true;
      beginOpenSwipe();
    }
  }

  function onMainTouchMove(e: React.TouchEvent) {
    if (!edgeTracking.current || !opening) return;
    const delta = e.touches[0].clientX - edgeTouchX.current;
    if (delta > 0) setOpenDrag(delta);
  }

  function onMainTouchEnd() {
    if (edgeTracking.current) {
      edgeTracking.current = false;
      handleOpenDragEnd();
    }
  }

  function handleSheetOpen(open: boolean) {
    if (!open) setMenu(null);
  }

  const curtainVisible = fullOpen || opening;
  const panelW = mainRef.current?.offsetWidth ?? 320;
  const closeProgress = fullOpen ? Math.min(1, closeDrag / panelW) : 0;
  const openDragPx = opening ? openDrag : 0;
  const berandaShift = curtainVisible
    ? fullOpen
      ? `translateX(${8 * (1 - closeProgress)}%)`
      : `translateX(${Math.min(24, 8 + openDragPx * 0.12)}%)`
    : "translateX(0)";
  const berandaOpacity = curtainVisible
    ? fullOpen
      ? 0.55 + 0.45 * closeProgress
      : 0.55
    : 1;

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] relative overflow-hidden">
      <HoverSidebar
        role={role}
        activeMenu={activeMenu}
        disabled={curtainVisible}
        onSelect={handleFullSelect}
        onHome={() => setMenu(null)}
        onSwipeOpenFull={openFullInstant}
      />

      <div
        ref={mainRef}
        className="relative flex-1 min-w-0 overflow-hidden"
        onTouchStart={onMainTouchStart}
        onTouchMove={onMainTouchMove}
        onTouchEnd={onMainTouchEnd}
      >
        <div
          className="min-h-full px-4 py-5 space-y-6 pb-12 transition-all duration-300 ease-in-out"
          style={{
            transform: berandaShift,
            opacity: berandaOpacity,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-slate-500 mb-0.5">
                {role === "owner" ? "Owner" : "Karyawan"}
              </h2>
              <h1 className="text-xl font-semibold text-[#001F5B] tracking-tight truncate">
                Halo, {user?.fullName || "Pengguna"}
              </h1>
            </div>
            <button
              onClick={() => signOut()}
              className="shrink-0 w-11 h-11 bg-white border border-black/5 rounded-2xl shadow-sm flex items-center justify-center text-[#001F5B] active:scale-95 transition-all"
              aria-label="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {role === "karyawan" && <EmployeeSummary />}
          {role === "owner" && <OwnerSummary />}

          {role === "owner" && (
            <DashboardAccordion title="Performa" icon={DASHBOARD_SECTION_ICONS.performa}>
              <PerformaSection />
            </DashboardAccordion>
          )}

          <DashboardAccordion
            title="Status Inventori"
            icon={DASHBOARD_SECTION_ICONS.inventori}
          >
            <InventoryStatusSection />
          </DashboardAccordion>
        </div>

        <FullMenuPanel
          role={role}
          open={fullOpen}
          opening={opening}
          activeMenu={activeMenu}
          dragOffset={fullOpen ? closeDrag : openDrag}
          onSelect={handleFullSelect}
          onClose={closeFull}
          onDrag={setCloseDrag}
          onDragEnd={handleCloseDragEnd}
          onOpenDrag={setOpenDrag}
          onOpenDragEnd={handleOpenDragEnd}
        />
      </div>

      <MenuSheet
        menuId={activeMenu}
        title={activeTitle}
        open={sheetOpen}
        onOpenChange={handleSheetOpen}
      />
    </div>
  );
}
