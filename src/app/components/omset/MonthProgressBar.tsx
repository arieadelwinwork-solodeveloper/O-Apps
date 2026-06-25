import { formatRupiah } from "../../lib/dashboard";
import type { MonthlyProgressInfo } from "../../lib/omsetAnalytics";

interface MonthProgressBarProps {
  info: MonthlyProgressInfo;
}

export function MonthProgressBar({ info }: MonthProgressBarProps) {
  const fillWidth = Math.min(info.progress, 100);

  return (
    <div className="space-y-2 mb-4 pb-4 border-b border-slate-200/60">
      <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
        <span className="text-slate-500 font-medium">Progress Bar</span>
        <span className="font-medium text-slate-700 tabular-nums">
          {info.progress}% · {formatRupiah(info.target)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#001F5B]/10">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${fillWidth}%`,
            backgroundColor: info.barColor,
          }}
        />
      </div>
    </div>
  );
}
