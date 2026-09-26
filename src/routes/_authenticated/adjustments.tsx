import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, SlidersHorizontal } from "lucide-react";
import { PageHeader, Panel, EmptyState, TableSkeleton, th, td, tr } from "@/components/app/page";
import { AdjustmentDialog } from "@/components/operations/AdjustmentDialog";
import { Button } from "@/components/ui/button";
import { adjustmentsQuery } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/adjustments")({
  head: () => ({
    meta: [
      { title: "Inventory Adjustments — StockSense" },
      { name: "description", content: "Reconcile system quantities with physical counts." },
      { property: "og:title", content: "Inventory Adjustments — StockSense" },
      { property: "og:description", content: "Reconcile system quantities with physical counts." },
    ],
  }),
  component: Page,
});

function Page() {
  const adj = useQuery(adjustmentsQuery);
  const L = useLookups();
  const rows = adj.data ?? [];
  const net = rows.reduce((a, r) => a + Number(r.difference), 0);
  return (
    <>
      <PageHeader eyebrow="Operations" title="Inventory Adjustments" description="Reconcile system stock with physical counts. Every adjustment is ledgered with before and after quantities."
        actions={<AdjustmentDialog trigger={<Button><Plus className="h-4 w-4" />New adjustment</Button>} />} />
      <div className="mb-4 grid grid-cols-3 gap-4">
        {[["Adjustments", fmtNum(rows.length)], ["Net variance", `${net > 0 ? "+" : ""}${fmtNum(net, 2)}`], ["Negative counts", fmtNum(rows.filter((r) => Number(r.difference) < 0).length)]].map(([k, v]) => (
          <div key={k} className="panel p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="num mt-1 text-2xl">{v}</div></div>
        ))}
      </div>
      <Panel>
        {adj.isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={<SlidersHorizontal className="h-5 w-5" />} title="No adjustments yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>Reference</th><th className={th}>Date</th><th className={th}>Product</th><th className={th}>Location</th><th className={`${th} text-right`}>System</th><th className={`${th} text-right`}>Counted</th><th className={`${th} text-right`}>Difference</th><th className={th}>Reason</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const d = Number(r.difference);
                  return (
                    <tr key={r.id} className={tr}>
                      <td className={`${td} num`}>{r.reference}</td>
                      <td className={`${td} text-muted-foreground`}>{fmtDateTime(r.created_at)}</td>
                      <td className={td}><Link to="/products/$id" params={{ id: r.product_id }} className="hover:text-primary">{L.prodMap.get(r.product_id)?.name}</Link></td>
                      <td className={`${td} text-muted-foreground`}>{L.locLabel(r.location_id)}</td>
                      <td className={`${td} num text-right text-muted-foreground`}>{fmtNum(r.system_qty)}</td>
                      <td className={`${td} num text-right`}>{fmtNum(r.counted_qty)}</td>
                      <td className={td + " text-right"}>
                        <span className={cn("num inline-block min-w-14 rounded-md px-2 py-0.5 text-right text-sm", d < 0 ? "bg-destructive/10 text-destructive" : d > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{d > 0 ? "+" : ""}{fmtNum(d, 2)}</span>
                      </td>
                      <td className={`${td} text-muted-foreground`}>{r.reason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
