import { apiFetch } from "./api";
import type {
  Loan,
  LoanType,
  DeductionMode,
  Payroll,
  PayrollStatus,
} from "../types";

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
export { rupiah as formatRupiah };

// ---------- Loans ----------
export async function listLoans(userId?: string): Promise<Loan[]> {
  const qs = userId ? `?userId=${userId}` : "";
  const { loans } = await apiFetch<{ loans: Loan[] }>(`/api/loans${qs}`);
  return loans;
}

export interface CreateLoanInput {
  userId?: string;
  type: LoanType;
  amount: number;
  note?: string;
  deductionMode?: DeductionMode;
  deductionAmount?: number;
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const { loan } = await apiFetch<{ loan: Loan }>("/api/loans", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return loan;
}

export async function approveLoan(
  id: string,
  input: {
    status: "disetujui" | "ditolak";
    deductionMode?: DeductionMode;
    deductionAmount?: number;
  }
): Promise<void> {
  await apiFetch(`/api/loans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ---------- Payrolls ----------
export async function listPayrolls(
  period?: string,
  userId?: string
): Promise<Payroll[]> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (userId) params.set("userId", userId);
  const qs = params.toString() ? `?${params}` : "";
  const { payrolls } = await apiFetch<{ payrolls: Payroll[] }>(
    `/api/payrolls${qs}`
  );
  return payrolls;
}

export async function generatePayrolls(period: string): Promise<void> {
  await apiFetch("/api/payrolls/generate", {
    method: "POST",
    body: JSON.stringify({ period }),
  });
}

export async function updatePayrollStatus(
  id: string,
  status: PayrollStatus
): Promise<void> {
  await apiFetch(`/api/payrolls/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  pinjaman: "Pinjaman",
  hutang: "Hutang",
  kerugian: "Kerugian",
};

export const LOAN_STATUS_LABEL: Record<string, string> = {
  diajukan: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  lunas: "Lunas",
};

export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = {
  draft: "Draft",
  final: "Final",
  dibayar: "Dibayar",
};

export const DEDUCTION_LABEL: Record<DeductionMode, string> = {
  langsung: "Sekaligus",
  cicil: "Cicil",
  berkala: "Berkala",
};
