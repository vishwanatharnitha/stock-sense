import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowDownUp, ChevronLeft, ChevronRight, Package, Plus, Search } from "lucide-react";
import { PageHeader, Panel, EmptyState, TableSkeleton, th, td, tr } from "@/components/app/page";
import { StockBadge } from "@/components/app/badges";
import { ProductFormDialog } from "@/components/inventory/ProductFormDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLookups } from "@/hooks/use-lookups";
import { fmtNum } from "@/lib/format";

const searchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["all", "healthy", "low", "out"]).optional(),
});

export const Route = createFileRoute("/_authenticated/products/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Products — StockSense" },
      { name: "description", content: "Product catalog with live stock levels, locations and reorder status." },
      { property: "og:title", content: "Products — StockSense" },
      { property: "og:description", content: "Product catalog with live stock levels, locations and reorder status." },
    ],
  }),
  component: ProductsPage,
});

const PAGE = 10;

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });
  const L = useLookups();
  const [q, setQ] = useState(search.q ?? "");
  const [cat, setCat] = useState("all");
  const [wh, setWh] = useState("all");
  const [loc, setLoc] = useState("all");
  const status = search.status ?? "all";
  const [sort, setSort] = useState<{ k: "name" | "sku" | "total"; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return L.inventory
      .map((p) => {
        const scoped = p.rows.filter((r) => {
          const l = L.locMap.get(r.location_id);
          return (wh === "all" || l?.warehouse_id === wh) && (loc === "all" || r.location_id === loc);
        });
        const qty = wh === "all" && loc === "all" ? p.total : scoped.reduce((a, r) => a + Number(r.quantity), 0);
        return { ...p, qty, scoped };
      })
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
      .filter((p) => cat === "all" || p.category_id === cat)
      .filter((p) => (wh === "all" && loc === "all") || p.scoped.length > 0)
      .filter((p) => status === "all" || p.status === status)
      .sort((a, b) => {
        const av = sort.k === "total" ? a.qty : a[sort.k];
        const bv = sort.k === "total" ? b.qty : b[sort.k];
        return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
      });
  }, [L, q, cat, wh, loc, status, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const toggleSort = (k: typeof sort.k) => setSort((s) => ({ k, dir: s.k === k ? ((s.dir * -1) as 1 | -1) : 1 }));
  const locOptions = L.locations.filter((l) => wh === "all" || l.warehouse_id === wh);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description={`${L.inventory.length} products · ${L.inventory.filter((p) => p.status !== "healthy").length} need attention`}
        actions={<ProductFormDialog trigger={<Button><Plus className="h-4 w-4" />New product</Button>} />}
      />
      <Panel>
        <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search by name or SKU" className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/40" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <Filter value={cat} onChange={(v) => { setCat(v); setPage(0); }} placeholder="Category" options={L.categories.map((c) => [c.id, c.name])} all="All categories" />
            <Filter value={wh} onChange={(v) => { setWh(v); setLoc("all"); setPage(0); }} placeholder="Warehouse" options={L.warehouses.map((w) => [w.id, `${w.code} · ${w.name}`])} all="All warehouses" />
            <Filter value={loc} onChange={(v) => { setLoc(v); setPage(0); }} placeholder="Location" options={locOptions.map((l) => [l.id, L.locLabel(l.id)])} all="All locations" />
            <Filter value={status} onChange={(v) => { navigate({ search: (s) => ({ ...s, status: v as "all" }) }); setPage(0); }} placeholder="Status" options={[["healthy", "In stock"], ["low", "Low stock"], ["out", "Out of stock"]]} all="All statuses" />
          </div>
        </div>

        {L.loading ? <TableSkeleton /> : rows.length === 0 ? (
          <EmptyState icon={<Package className="h-5 w-5" />} title="No products match" hint="Try adjusting your search or filters." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead><tr>
                  <th className={th}><button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">Product <ArrowDownUp className="h-3 w-3" /></button></th>
                  <th className={th}><button onClick={() => toggleSort("sku")} className="inline-flex items-center gap-1 hover:text-foreground">SKU <ArrowDownUp className="h-3 w-3" /></button></th>
                  <th className={th}>Category</th>
                  <th className={th}>Location</th>
                  <th className={`${th} text-right`}><button onClick={() => toggleSort("total")} className="inline-flex items-center gap-1 hover:text-foreground">Available <ArrowDownUp className="h-3 w-3" /></button></th>
                  <th className={`${th} text-right`}>Reorder</th>
                  <th className={th}>Status</th>
                  <th className={th}></th>
                </tr></thead>
                <tbody>
                  {view.map((p) => (
                    <tr key={p.id} className={tr}>
                      <td className={td}><Link to="/products/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.name}</Link></td>
                      <td className={`${td} num text-muted-foreground`}>{p.sku}</td>
                      <td className={`${td} text-muted-foreground`}>{p.category?.name ?? "—"}</td>
                      <td className={`${td} text-muted-foreground`}>
                        {(p.scoped.length ? p.scoped : p.rows).length === 0 ? "—" : (p.scoped.length ? p.scoped : p.rows).length > 1 ? `${(p.scoped.length ? p.scoped : p.rows).length} locations` : L.locLabel((p.scoped[0] ?? p.rows[0]).location_id)}
                      </td>
                      <td className={`${td} num text-right`}>{fmtNum(p.qty)} <span className="text-xs text-muted-foreground">{p.uom}</span></td>
                      <td className={`${td} num text-right text-muted-foreground`}>{fmtNum(p.reorder_level)}</td>
                      <td className={td}><StockBadge status={p.status} /></td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Link to="/products/$id" params={{ id: p.id }} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">View</Link>
                          <ProductFormDialog product={p} trigger={<button className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">Edit</button>} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {view.map((p) => (
                <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-medium">{p.name}</div><div className="num text-xs text-muted-foreground">{p.sku} · {p.category?.name ?? "—"}</div></div>
                    <StockBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">Available</span><span className="num">{fmtNum(p.qty)} {p.uom}</span></div>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>{page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

function Filter({ value, onChange, placeholder, options, all }: { value: string; onChange: (v: string) => void; placeholder: string; options: (readonly [string, string] | string[])[]; all: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 bg-surface text-sm lg:w-40"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
