/** Pure derivations over database rows (no fetching). */
export type StockStatus = "healthy" | "low" | "out";

export type StockRow = { product_id: string; location_id: string; quantity: number };
export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  uom: string;
  reorder_level: number;
  unit_cost: number;
  category_id: string | null;
  category?: { id: string; name: string } | null;
};

export function stockStatus(qty: number, reorder: number): StockStatus {
  if (qty <= 0) return "out";
  if (qty < reorder) return "low";
  return "healthy";
}

export function buildInventory<P extends ProductRow>(products: P[], stock: StockRow[]) {
  const byProduct = new Map<string, StockRow[]>();
  for (const s of stock) {
    const arr = byProduct.get(s.product_id) ?? [];
    arr.push(s);
    byProduct.set(s.product_id, arr);
  }
  return products.map((p) => {
    const rows = (byProduct.get(p.id) ?? []).filter((r) => Number(r.quantity) > 0);
    const total = rows.reduce((a, r) => a + Number(r.quantity), 0);
    return { ...p, total, rows, status: stockStatus(total, Number(p.reorder_level)) };
  });
}

export const OP_META = {
  receipt: { label: "Receipt", plural: "Receipts", partner: "Supplier", path: "/receipts" },
  delivery: { label: "Delivery Order", plural: "Delivery Orders", partner: "Customer", path: "/deliveries" },
  transfer: { label: "Internal Transfer", plural: "Internal Transfers", partner: null, path: "/transfers" },
} as const;
