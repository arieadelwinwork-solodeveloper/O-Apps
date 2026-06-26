import { isUsingMockApi } from "../lib/mockMode";

export function DemoModeBanner() {
  if (!isUsingMockApi()) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 text-center text-xs font-medium py-1.5 px-3 shadow-sm">
      Mode Demo — data simulasi. Backend tidak diperlukan untuk preview fitur.
    </div>
  );
}
