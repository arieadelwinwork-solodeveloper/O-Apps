import type { Customer } from "../types";

const MAX_SUGGESTIONS = 8;

function normName(s: string): string {
  return s.trim().toLowerCase();
}

function phoneDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Prefix pada nama (case-insensitive). Ketik "A" → Arie, … */
export function filterCustomersByNamePrefix(
  customers: Customer[],
  query: string
): Customer[] {
  const q = normName(query);
  if (!q) return [];
  return customers
    .filter((c) => normName(c.name).startsWith(q))
    .slice(0, MAX_SUGGESTIONS);
}

/** Prefix pada nomor (digit). Ketik "08" → 0809…, 0812… */
export function filterCustomersByPhonePrefix(
  customers: Customer[],
  query: string
): Customer[] {
  const raw = query.trim();
  const digits = phoneDigits(raw);
  if (!digits && !raw) return [];

  return customers
    .filter((c) => {
      if (!c.phone) return false;
      const p = c.phone;
      const pDigits = phoneDigits(p);
      if (digits && pDigits.startsWith(digits)) return true;
      return raw.length > 0 && p.startsWith(raw);
    })
    .slice(0, MAX_SUGGESTIONS);
}

export function formatCustomerPhone(phone: string | null): string {
  return phone?.trim() || "—";
}
