import type { WorkStatus } from "../../types";

const STEPS: { id: WorkStatus; label: string }[] = [
  { id: "proses", label: "Proses" },
  { id: "selesai", label: "Selesai" },
  { id: "diambil", label: "Diambil" },
];

function pipelineStatus(status: WorkStatus): WorkStatus {
  return status === "antri" ? "proses" : status;
}

function stepIndex(status: WorkStatus): number {
  const idx = STEPS.findIndex((x) => x.id === pipelineStatus(status));
  return idx >= 0 ? idx : 0;
}

interface TrackingPipelineProps {
  workStatus: WorkStatus;
}

export function TrackingPipeline({ workStatus }: TrackingPipelineProps) {
  const idx = stepIndex(workStatus);

  return (
    <div className="flex items-start w-[255px] min-w-[255px] max-w-full shrink-0 mt-1 mb-1">
      {STEPS.map((step, i) => {
        const reached = i <= idx;
        const current = i === idx;
        const segmentDone = i > 0 && idx >= i;

        return (
          <div key={step.id} className="contents">
            {i > 0 && (
              <div className="flex-1 flex items-center min-w-[4px] pt-3">
                <div
                  className={`h-0.5 w-full rounded-full transition-colors duration-500 ${
                    segmentDone ? "bg-[#001F5B]" : "bg-slate-200"
                  }`}
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-1 shrink-0 w-10">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white text-[9px] font-semibold transition-colors duration-300 ${
                  reached
                    ? "border-[#001F5B] bg-[#001F5B] text-white"
                    : "border-slate-200 text-slate-300"
                } ${current && idx < STEPS.length - 1 ? "ring-2 ring-[#001F5B]/20" : ""}`}
              >
                {i + 1}
              </div>
              <span
                className={`text-[9px] font-medium text-center leading-tight ${
                  current
                    ? "text-[#001F5B]"
                    : reached
                      ? "text-slate-600"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
