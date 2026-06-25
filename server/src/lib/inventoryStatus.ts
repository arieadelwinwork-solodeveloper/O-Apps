interface MovementRow {
  item_id: string;
  change_type: string;
  qty: number;
  note: string | null;
  created_at: string;
}

interface ExpenseRow {
  amount: number;
  note: string | null;
  category: string;
  created_at: string;
}

function parseIdNumber(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Ambil harga satuan dari catatan mutasi masuk. */
export function parseUnitPriceFromNote(
  note: string | null,
  qty: number
): number | null {
  if (!note?.trim() || qty <= 0) return null;

  const unitMatch = note.match(
    /(?:harga\s*satuan|@|harga)\s*:?\s*(?:Rp\s*)?([\d.,]+)/i
  );
  if (unitMatch) {
    const v = parseIdNumber(unitMatch[1]);
    return v > 0 ? v : null;
  }

  const totalMatch = note.match(
    /(?:total|bayar|biaya)\s*:?\s*(?:Rp\s*)?([\d.,]+)/i
  );
  if (totalMatch) {
    const v = parseIdNumber(totalMatch[1]);
    return v > 0 ? v / qty : null;
  }

  const rpMatch = note.match(/Rp\s*([\d.,]+)/i);
  if (rpMatch) {
    const v = parseIdNumber(rpMatch[1]);
    return v > 0 ? v / qty : null;
  }

  return null;
}

export function calcNeedToBuy(current: number, min: number): number {
  if (current >= min) return 0;
  return Math.ceil(min - current);
}

export function resolveLastUnitPrice(
  itemName: string,
  movements: MovementRow[],
  expenses: ExpenseRow[]
): number | null {
  const masukMoves = movements
    .filter((m) => m.change_type === "masuk")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  for (const m of masukMoves) {
    const fromNote = parseUnitPriceFromNote(m.note, Number(m.qty));
    if (fromNote !== null && fromNote > 0) {
      return Math.round(fromNote);
    }
  }

  const nameLower = itemName.toLowerCase();
  for (const exp of expenses) {
    const hay = `${exp.category} ${exp.note ?? ""}`.toLowerCase();
    if (!hay.includes(nameLower)) continue;

    const nearestMasuk = masukMoves.find(
      (m) =>
        Math.abs(
          new Date(m.created_at).getTime() -
            new Date(exp.created_at).getTime()
        ) <
        7 * 24 * 60 * 60 * 1000
    );
    const qty = nearestMasuk ? Number(nearestMasuk.qty) : 0;
    if (qty > 0) {
      return Math.round(Number(exp.amount) / qty);
    }
    break;
  }

  return null;
}

export interface InventoryStatusRow {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  needToBuy: number;
  lastUnitPrice: number | null;
  predictedExpense: number | null;
}

export function buildInventoryStatusRows(
  items: {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
  }[],
  movements: MovementRow[],
  expenses: ExpenseRow[]
): InventoryStatusRow[] {
  const movesByItem = new Map<string, MovementRow[]>();
  for (const m of movements) {
    const list = movesByItem.get(m.item_id) ?? [];
    list.push(m);
    movesByItem.set(m.item_id, list);
  }

  return items.map((item) => {
    const currentStock = Number(item.current_stock);
    const minStock = Number(item.min_stock);
    const needToBuy = calcNeedToBuy(currentStock, minStock);
    const lastUnitPrice = resolveLastUnitPrice(
      item.name,
      movesByItem.get(item.id) ?? [],
      expenses
    );
    const predictedExpense =
      needToBuy > 0 && lastUnitPrice !== null
        ? needToBuy * lastUnitPrice
        : null;

    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock,
      minStock,
      needToBuy,
      lastUnitPrice,
      predictedExpense,
    };
  });
}
