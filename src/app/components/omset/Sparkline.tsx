import { useId, useMemo } from "react";
import { cn } from "../ui/utils";

interface SparklineProps {
  /** Nilai revenue per titik (mis. 7 hari terakhir dari chartDaily). */
  values: number[];
  /** Warna garis & gradient — default brand navy transparan. */
  color?: string;
  className?: string;
}

const PADDING = 2;

function buildSparklinePath(
  values: number[],
  width: number,
  height: number
): { linePath: string; areaPath: string } | null {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const innerW = width - PADDING * 2;
  const innerH = height - PADDING * 2;

  const coords = values.map((v, i) => {
    const x = PADDING + (i / (values.length - 1)) * innerW;
    const y = PADDING + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const linePath = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${height - PADDING} L ${coords[0].x.toFixed(2)} ${height - PADDING} Z`;

  return { linePath, areaPath };
}

/**
 * Mini sparkline dekoratif — ditempatkan absolut di belakang konten card.
 * Tidak interaktif; hanya visual konteks tren 7 hari.
 */
export function Sparkline({
  values,
  color = "#001F5B",
  className,
}: SparklineProps) {
  const gradientId = useId();
  const width = 200;
  const height = 48;

  const paths = useMemo(
    () => buildSparklinePath(values, width, height),
    [values]
  );

  const isEmpty = values.every((v) => v === 0);

  if (!paths || isEmpty) {
    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-30",
          className
        )}
      />
    );
  }

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-[0.18]",
        className
      )}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={paths.areaPath} fill={`url(#${gradientId})`} />
      <path
        d={paths.linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
