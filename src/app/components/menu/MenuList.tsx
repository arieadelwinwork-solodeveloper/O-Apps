import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { MENU_HOME_ICON, MENU_ICON_MAP } from "../../config/menuIcons";
import type { MenuBlock } from "./useMenuBlocks";

export function MenuList({
  blocks,
  activeMenu,
  onSelect,
  showLabels = true,
  compact = false,
}: {
  blocks: MenuBlock[];
  activeMenu: string | null;
  onSelect: (id: string) => void;
  showLabels?: boolean;
  compact?: boolean;
}) {
  return (
    <>
      {blocks.map((block, blockIdx) => (
        <div key={block.cat} className={blockIdx > 0 ? (compact ? "mt-4" : "mt-6") : ""}>
          {showLabels && (
            <p
              className={`font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                compact
                  ? "px-2 pb-1.5 text-[10px] opacity-0 max-h-0 group-hover/sidebar:opacity-100 group-hover/sidebar:max-h-8"
                  : "px-2 pb-2 text-[10px]"
              }`}
            >
              {block.label}
            </p>
          )}
          <ul
            className={
              compact
                ? "space-y-0.5 px-1"
                : "rounded-xl overflow-hidden border border-slate-200/60"
            }
          >
            {block.items.map(({ item, stripe }, itemIdx) => (
              <li key={item.id}>
                <MenuRow
                  icon={MENU_ICON_MAP[item.id]}
                  label={item.title}
                  desc={item.desc}
                  active={activeMenu === item.id}
                  stripe={stripe}
                  showLabel={showLabels}
                  compact={compact}
                  isLast={itemIdx === block.items.length - 1}
                  onClick={() => onSelect(item.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function MenuRow({
  icon: Icon,
  label,
  desc,
  active,
  stripe,
  showLabel,
  compact,
  isLast,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  desc: string;
  active: boolean;
  stripe: boolean;
  showLabel: boolean;
  compact: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const IconComp = Icon ?? MENU_HOME_ICON;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        className={`relative flex w-full items-center rounded-xl py-2.5 px-2 text-left transition-all duration-300 ease-in-out ${
          active
            ? "bg-[#001F5B]/10 text-[#001F5B]"
            : stripe
              ? "text-slate-600 hover:bg-slate-100/90"
              : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#001F5B] rounded-full" />
        )}
        <span
          className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 ${
            active ? "bg-[#001F5B]/15" : "bg-slate-100/80 group-hover/sidebar:bg-transparent"
          }`}
        >
          <IconComp className="w-[18px] h-[18px]" strokeWidth={2} />
        </span>
        <span className="ml-1 text-sm font-medium whitespace-nowrap overflow-hidden opacity-0 max-w-0 translate-x-1 group-hover/sidebar:opacity-100 group-hover/sidebar:max-w-[11rem] group-hover/sidebar:translate-x-0 transition-all duration-300 ease-in-out">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors active:opacity-90 ${
        !isLast ? "border-b border-slate-200/50" : ""
      } ${
        active
          ? "bg-[#001F5B]/10 text-[#001F5B]"
          : stripe
            ? "bg-slate-100/90"
            : "bg-white"
      }`}
    >
      <span
        className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl ${
          active ? "bg-[#001F5B]/15" : "bg-[#001F5B]/8"
        }`}
      >
        <IconComp className="w-5 h-5 text-[#001F5B]" strokeWidth={2} />
      </span>
      {showLabel && (
        <>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#001F5B]">{label}</div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{desc}</div>
          </div>
          <ChevronRight
            className={`w-4 h-4 shrink-0 ${active ? "text-[#001F5B]" : "text-slate-300"}`}
          />
        </>
      )}
    </button>
  );
}
