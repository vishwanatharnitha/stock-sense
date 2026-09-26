/**
 * Inventory data service — the single API layer between UI and the database.
 * Reads go through row-level security; every stock-changing action goes through
 * a validated database procedure (confirm/validate/cancel/apply_adjustment) so
 * stock and ledger always change together, atomically.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OpType = "receipt" | "delivery" | "transfer";
export type OpStatus = "draft" | "waiting" | "ready" | "done" | "canceled";

async function run<R extends { data: unknown; error: unknown }>(p: PromiseLike<R>): Promise<NonNullable<R["data"]>> {
  const { data, error } = await p;
  if (error) throw error;
  return data as NonNullable<R["data"]>;
}

// ---------- Reads ----------
export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => run(supabase.from("categories").select("*").order("name")),
});

export const warehousesQuery = queryOptions({
  queryKey: ["warehouses"],
  queryFn: () => run(supabase.from("warehouses").select("*").order("code")),
});

export const locationsQuery = queryOptions({
  queryKey: ["locations"],
  queryFn: () =>
    run(supabase.from("locations").select("*, warehouse:warehouses(id, code, name)").order("name")),
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () =>
    run(supabase.from("products").select("*, category:categories(id, name)").order("name")),
});

export const stockQuery = queryOptions({
  queryKey: ["stock"],
  queryFn: () => run(supabase.from("stock").select("*")),
});

export const reorderRulesQuery = queryOptions({
  queryKey: ["reorder_rules"],
  queryFn: () => run(supabase.from("reorder_rules").select("*").order("created_at")),
});

export const operationsQuery = (type?: OpType) =>
  queryOptions({
    queryKey: ["operations", type ?? "all"],
    queryFn: () => {
      let q = supabase
        .from("operations")
        .select("*, lines:operation_lines(id, quantity, product_id)")
        .order("created_at", { ascending: false });
      if (type) q = q.eq("type", type);
      return run(q);
    },
  });

export const operationQuery = (id: string) =>
  queryOptions({
    queryKey: ["operation", id],
    queryFn: () =>
      run(
        supabase
          .from("operations")
          .select("*, lines:operation_lines(id, quantity, product_id, product:products(id, name, sku, uom))")
          .eq("id", id)
          .maybeSingle(),
      ),
  });

export const adjustmentsQuery = queryOptions({
  queryKey: ["adjustments"],
  queryFn: () => run(supabase.from("adjustments").select("*").order("created_at", { ascending: false })),
});

export const ledgerQuery = queryOptions({
  queryKey: ["ledger"],
  queryFn: () =>
    run(supabase.from("stock_ledger").select("*").order("created_at", { ascending: false }).limit(1000)),
});

export const profileQuery = (id: string) =>
  queryOptions({
    queryKey: ["profile", id],
    queryFn: () => run(supabase.from("profiles").select("*").eq("id", id).maybeSingle()),
  });

// ---------- Writes ----------
export type ProductInput = {
  name: string;
  sku: string;
  category_id: string | null;
  uom: string;
  reorder_level: number;
  unit_cost: number;
  description?: string | null;
};

export async function saveProduct(input: ProductInput, id?: string) {
  const payload = { ...input, sku: input.sku.trim().toUpperCase(), name: input.name.trim() };
  if (id) return run(supabase.from("products").update(payload).eq("id", id).select().single());
  return run(supabase.from("products").insert(payload).select().single());
}

export async function createOperation(input: {
  type: OpType;
  partner: string | null;
  source_location_id: string | null;
  dest_location_id: string | null;
  scheduled_date: string;
  notes?: string | null;
  lines: { product_id: string; quantity: number }[];
}) {
  const { lines, ...header } = input;
  const op = await run(supabase.from("operations").insert(header).select().single());
  if (lines.length) {
    const { error } = await supabase
      .from("operation_lines")
      .insert(lines.map((l) => ({ ...l, operation_id: op.id })));
    if (error) {
      await supabase.from("operations").delete().eq("id", op.id);
      throw error;
    }
  }
  return op;
}

export const addLine = (operation_id: string, product_id: string, quantity: number) =>
  run(supabase.from("operation_lines").insert({ operation_id, product_id, quantity }));
export const removeLine = (id: string) => run(supabase.from("operation_lines").delete().eq("id", id));

export const confirmOperation = (id: string) => run(supabase.rpc("confirm_operation", { _id: id }));
export const validateOperation = (id: string) => run(supabase.rpc("validate_operation", { _id: id }));
export const cancelOperation = (id: string) => run(supabase.rpc("cancel_operation", { _id: id }));

export const applyAdjustment = (product: string, location: string, counted: number, reason: string) =>
  run(
    supabase.rpc("apply_adjustment", {
      _product: product,
      _location: location,
      _counted: counted,
      _reason: reason,
    }),
  );

export const saveCategory = (name: string, description: string | null, id?: string) =>
  id
    ? run(supabase.from("categories").update({ name, description }).eq("id", id))
    : run(supabase.from("categories").insert({ name, description }));
export const deleteCategory = (id: string) => run(supabase.from("categories").delete().eq("id", id));

export const saveWarehouse = (v: { code: string; name: string; address: string | null }) =>
  run(supabase.from("warehouses").insert({ ...v, code: v.code.toUpperCase() }));
export const saveLocation = (v: { warehouse_id: string; code: string; name: string }) =>
  run(supabase.from("locations").insert({ ...v, code: v.code.toUpperCase() }));

export const saveReorderRule = (v: {
  product_id: string;
  location_id: string | null;
  min_qty: number;
  max_qty: number;
}) => run(supabase.from("reorder_rules").insert(v));
export const deleteReorderRule = (id: string) => run(supabase.from("reorder_rules").delete().eq("id", id));

export const updateProfile = (id: string, v: { full_name: string; job_title: string }) =>
  run(supabase.from("profiles").update(v).eq("id", id));
