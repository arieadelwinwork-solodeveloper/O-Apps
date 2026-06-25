import { apiFetch } from "./api";
import type { Commission, CommissionSummary } from "../types";

export async function listCommissions(
  period?: string
): Promise<{ commissions: Commission[]; total: number }> {
  const qs = period ? `?period=${period}` : "";
  return apiFetch(`/api/commissions${qs}`);
}

export async function commissionSummary(
  period?: string
): Promise<CommissionSummary[]> {
  const qs = period ? `?period=${period}` : "";
  const { summary } = await apiFetch<{ summary: CommissionSummary[] }>(
    `/api/commissions/summary${qs}`
  );
  return summary;
}
