import { apiFetch } from "./api";
import type { CashShift, ShiftBreakdown, Expense } from "../types";

export interface CurrentShift {
  shift: CashShift | null;
  breakdown?: ShiftBreakdown;
}

export async function getCurrentShift(): Promise<CurrentShift> {
  return apiFetch<CurrentShift>("/api/cash-shifts/current");
}

export async function listShifts(): Promise<CashShift[]> {
  const { shifts } = await apiFetch<{ shifts: CashShift[] }>("/api/cash-shifts");
  return shifts;
}

export async function openShift(
  openingCash: number,
  note?: string
): Promise<CashShift> {
  const { shift } = await apiFetch<{ shift: CashShift }>(
    "/api/cash-shifts/open",
    { method: "POST", body: JSON.stringify({ openingCash, note }) }
  );
  return shift;
}

export async function closeShift(
  closingCash: number,
  note?: string
): Promise<{ shift: CashShift; expected: number; variance: number }> {
  return apiFetch("/api/cash-shifts/close", {
    method: "POST",
    body: JSON.stringify({ closingCash, note }),
  });
}

export async function listExpenses(): Promise<Expense[]> {
  const { expenses } = await apiFetch<{ expenses: Expense[] }>("/api/expenses");
  return expenses;
}

export interface ExpenseInput {
  category: string;
  amount: number;
  isCash: boolean;
  note?: string;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { expense } = await apiFetch<{ expense: Expense }>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
}
