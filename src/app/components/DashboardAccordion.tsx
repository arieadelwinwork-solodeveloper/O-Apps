import { useId, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "./ui/utils";

export interface DashboardAccordionProps {
  title: string;
  /** Ikon di sebelah kiri judul (sesuai konteks section). */
  icon?: LucideIcon;
  children: ReactNode;
  /** Secara bawaan tertutup. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Folder accordion untuk section dashboard (Performa, Inventori, dll).
 * Konten tersembunyi default; mekar/tutup dengan animasi slide halus.
 */
export function DashboardAccordion({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  className,
}: DashboardAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const triggerId = useId();

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white overflow-hidden",
        className
      )}
    >
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-all duration-300 ease-in-out hover:bg-slate-50/80 active:bg-slate-50"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {Icon && (
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#001F5B]/10 text-[#001F5B]"
              aria-hidden
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
          )}
          <span className="text-lg font-semibold text-[#001F5B] tracking-tight truncate">
            {title}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-slate-400 transition-transform duration-300 ease-in-out",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 transition-all duration-300 ease-in-out">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
