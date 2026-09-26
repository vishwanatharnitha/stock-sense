import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowLeftRight, Pencil, PackagePlus, SlidersHorizontal, Truck } from "lucide-react";
import { PageHeader, Panel, EmptyState, th, td, tr } from "@/components/app/page";
import { StockBadge, OpTypeTag } from "@/components/app/badges";
import { ProductFormDialog } from "@/components/inventory/ProductFormDialog";
import { NewOperationDialog } from "@/components/operations/NewOperationDialog";
import { AdjustmentDialog } from "@/components/operations/AdjustmentDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLookups } from "@/hooks/use-lookups";
import { ledgerQuery } from "@/services/inventory";
import { fmtDateTime, fmtMoney, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/products/$id")({
  head: () => ({
    meta: [
      { title: "Product details — StockSense" },
      { name: "description", content: "Stock by location, reorder level and movement history for this product." },
      { property: "og:title", content: "Product details — StockSense" },
      { property: "og:description", content: "Stock by location, reorder level and movement history." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const L = useLookups();
  const ledger = useQuery(ledgerQuery);
  const p = L.inventory.find((x) => x.id === id);
  const moves = (ledger.data ?? []).filter((m) => m.product_id === id);

  if (L.loading) return <Skeleton className="h-96 bg-surface-2" />;
  if (!p) return <EmptyState title="Product not found" action={<Link to="/products" className="text-primary">Back to products</Link>} />;

  const pct = Math.min(100, p.reorder_level > 0 ? (p.total / (Number(p.reorder_level) * 3)) * 100 : 100);

  return (
    <>
      <Link to="/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Products</Link>
      <PageHeader
        eyebrow={p.category?.name ?? "Uncategorised"}
        title={<span className="flex flex-wrap items-center gap-3">{p.name} <StockBadge status={p.status} /></span>}
        description={<span className="num">{p.sku}</span>}
        actions={
          <>
            <ProductFormDialog product={p} trigger={<Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5" />Edit</Button>} />
            <AdjustmentDialog presetProduct={p.id} trigger={<Button variant="outline" size="sm"><SlidersHorizontal className="h-3.5 w-3.5" />Adjust</Button>} />
            <NewOperationDialog type="transfer" presetProduct={p.id} trigger={<Button variant="outline" size="sm"><ArrowLeftRight className="h-3.5 w-3.5" />Transfer</Button>} />
            <NewOperationDialog type="delivery" presetProduct={p.id} trigger={<Button variant="outline" size="sm"><Truck className="h-3.5 w-3.5" />Deliver</Button>} />
            <NewOperationDialog type="receipt" presetProduct={p.id} trigger={<Button size="sm"><PackagePlus className="h-3.5 w-3.5" />Receive</Button>} />
          </>
        }
      />

      {p.status !== "healthy" && (
        <div className={cn("mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm", p.status === "out" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning")}>
          <AlertTriangle className="h-4 w-4" />
          {p.status === "out" ? "This product is out of stock across all locations." : `Stock is below the reorder level of ${fmtNum(p.reorder_level)} ${p.uom}. Consider creating a receipt.`}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current stock</div>
          <div className="num mt-3 text-4xl">{fmtNum(p.total)} <span className="text-base text-muted-foreground">{p.uom}</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", p.status === "healthy" ? "bg-primary" : p.status === "low" ? "bg-warning" : "bg-destructive")} style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            {[["Reorder level", `${fmtNum(p.reorder_level)} ${p.uom}`], ["Unit of measure", p.uom], ["Unit cost", fmtMoney(p.unit_cost)], ["Stock value", fmtMoney(p.total * Number(p.unit_cost))], ["Locations", String(p.rows.length)]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-3 last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="num">{v}</dd></div>
            ))}
          </dl>
        </Panel>

        <Panel title="Stock by location" className="lg:col-span-2">
          {p.rows.length === 0 ? <EmptyState title="No stock on hand" hint="Receive goods to add stock to a location." /> : (
            <div className="space-y-3 p-5">
              {p.rows.sort((a, b) => b.quantity - a.quantity).map((r) => {
                const l = L.locMap.get(r.location_id);
                const share = p.total ? (Number(r.quantity) / p.total) * 100 : 0;
                return (
                  <div key={r.location_id}>
                    <div className="flex items-center justify-between text-sm">
                      <span><span className="num text-xs text-muted-foreground">{l?.warehouse?.code}</span> <span className="ml-1">{l?.name}</span></span>
                      <span className="num">{fmtNum(r.quantity)} <span className="text-xs text-muted-foreground">· {share.toFixed(0)}%</span></span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary/70" style={{ width: `${share}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent movements" className="mt-4">
        {moves.length === 0 ? <EmptyState title="No movements recorded yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>Date</th><th className={th}>Reference</th><th className={th}>Operation</th><th className={th}>From → To</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Before → After</th><th className={th}>User</th></tr></thead>
              <tbody>
                {moves.slice(0, 15).map((m) => (
                  <tr key={m.id} className={tr}>
                    <td className={`${td} text-muted-foreground`}>{fmtDateTime(m.created_at)}</td>
                    <td className={`${td} num`}>{m.reference}</td>
                    <td className={td}><OpTypeTag type={m.operation} /></td>
                    <td className={`${td} text-muted-foreground`}>{L.locLabel(m.source_location_id)} → {L.locLabel(m.dest_location_id)}</td>
                    <td className={cn(td, "num text-right", Number(m.quantity) >= 0 ? "text-primary" : "text-destructive")}>{Number(m.quantity) > 0 ? "+" : ""}{fmtNum(m.quantity)}</td>
                    <td className={`${td} num text-right text-muted-foreground`}>{fmtNum(m.before_qty)} → <span className="text-foreground">{fmtNum(m.after_qty)}</span></td>
                    <td className={`${td} text-muted-foreground`}>{m.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
