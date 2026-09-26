import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { locationsQuery, productsQuery, stockQuery, warehousesQuery, categoriesQuery } from "@/services/inventory";
import { buildInventory } from "@/lib/inventory-logic";

/** Shared reference data + lookup helpers used across pages. */
export function useLookups() {
  const products = useQuery(productsQuery);
  const locations = useQuery(locationsQuery);
  const warehouses = useQuery(warehousesQuery);
  const categories = useQuery(categoriesQuery);
  const stock = useQuery(stockQuery);

  return useMemo(() => {
    const locMap = new Map((locations.data ?? []).map((l) => [l.id, l]));
    const prodMap = new Map((products.data ?? []).map((p) => [p.id, p]));
    const inventory = buildInventory(products.data ?? [], stock.data ?? []);
    const locLabel = (id?: string | null) => {
      if (!id) return "—";
      const l = locMap.get(id);
      return l ? `${l.warehouse?.code ?? ""}/${l.name}` : "—";
    };
    const qtyAt = (productId: string, locationId?: string | null) =>
      Number((stock.data ?? []).find((s) => s.product_id === productId && s.location_id === locationId)?.quantity ?? 0);
    return {
      loading: products.isLoading || locations.isLoading || stock.isLoading,
      products: products.data ?? [],
      locations: locations.data ?? [],
      warehouses: warehouses.data ?? [],
      categories: categories.data ?? [],
      stock: stock.data ?? [],
      inventory,
      locMap,
      prodMap,
      locLabel,
      qtyAt,
    };
  }, [products.data, locations.data, warehouses.data, categories.data, stock.data, products.isLoading, locations.isLoading, stock.isLoading]);
}
