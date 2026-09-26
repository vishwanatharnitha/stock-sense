import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { PageHeader, Panel, EmptyState, th, td, tr } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewOperationDialog } from "@/components/operations/NewOperationDialog";
import { deleteReorderRule, reorderRulesQuery, saveReorderRule } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtNum, friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reordering")({
  head: () => ({
    meta: [
      { title: "Reordering Rules — StockSense" },
      { name: "description", content: "Min/max replenishment rules per product and location." },
      { property: "og:title", content: "Reordering Rules — StockSense" },
      { property: "og:description", content: "Min/max replenishment rules per product and location." },
    ],
  }),
  component: Page,
});

function Page() {
  const rules = useQuery(reorderRulesQuery);
  const L = useLookups();
  const qc = useQueryClient();
  const [f, setF] = useState({ product: "", location: "any", min: "", max: "" });
  const add = useMutation({
    mutationFn: () => saveReorderRule({ product_id: f.product, location_id: f.location === "any" ? null : f.location, min_qty: Number(f.min), max_qty: Number(f.max) }),
    onSuccess: () => { toast.success("Rule created"); setF({ product: "", location: "any", min: "", max: "" }); qc.invalidateQueries(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const del = useMutation({ mutationFn: deleteReorderRule, onSuccess: () => qc.invalidateQueries() });

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Reordering Rules" description="When on-hand stock drops below the minimum, StockSense suggests replenishing up to the maximum." />
      <Panel className="mb-4">
        <form className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr_auto]" onSubmit={(e) => {
          e.preventDefault();
          if (!f.product) return toast.error("Select a product.");
          if (!(Number(f.min) >= 0) || !(Number(f.max) > 0) || f.min === "") return toast.error("Enter valid min and max quantities.");
          if (Number(f.max) < Number(f.min)) return toast.error("Max must be greater than or equal to min.");
          add.mutate();
        }}>
          <Select value={f.product} onValueChange={(v) => setF((s) => ({ ...s, product: v }))}><SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger><SelectContent>{L.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
          <Select value={f.location} onValueChange={(v) => setF((s) => ({ ...s, location: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">All locations</SelectItem>{L.locations.map((l) => <SelectItem key={l.id} value={l.id}>{L.locLabel(l.id)}</SelectItem>)}</SelectContent></Select>
          <Input type="number" min={0} placeholder="Min" value={f.min} onChange={(e) => setF((s) => ({ ...s, min: e.target.value }))} className="num" />
          <Input type="number" min={0} placeholder="Max" value={f.max} onChange={(e) => setF((s) => ({ ...s, max: e.target.value }))} className="num" />
          <Button type="submit"><Plus className="h-4 w-4" />Add rule</Button>
        </form>
      </Panel>
      <Panel>
        {(rules.data ?? []).length === 0 ? <EmptyState icon={<RefreshCcw className="h-5 w-5" />} title="No rules yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>Product</th><th className={th}>Location</th><th className={`${th} text-right`}>On hand</th><th className={`${th} text-right`}>Min</th><th className={`${th} text-right`}>Max</th><th className={`${th} text-right`}>Suggested order</th><th className={th}></th></tr></thead>
              <tbody>
                {(rules.data ?? []).map((r) => {
                  const p = L.inventory.find((x) => x.id === r.product_id);
                  const onHand = r.location_id ? L.qtyAt(r.product_id, r.location_id) : p?.total ?? 0;
                  const suggest = onHand < Number(r.min_qty) ? Number(r.max_qty) - onHand : 0;
                  return (
                    <tr key={r.id} className={tr}>
                      <td className={td}><Link to="/products/$id" params={{ id: r.product_id }} className="hover:text-primary">{p?.name}</Link></td>
                      <td className={`${td} text-muted-foreground`}>{r.location_id ? L.locLabel(r.location_id) : "All locations"}</td>
                      <td className={cn(td, "num text-right", suggest > 0 && "text-warning")}>{fmtNum(onHand)}</td>
                      <td className={`${td} num text-right text-muted-foreground`}>{fmtNum(r.min_qty)}</td>
                      <td className={`${td} num text-right text-muted-foreground`}>{fmtNum(r.max_qty)}</td>
                      <td className={`${td} text-right`}>
                        {suggest > 0 ? (
                          <NewOperationDialog type="receipt" presetProduct={r.product_id} trigger={<button className="num rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20">Order {fmtNum(suggest)} →</button>} />
                        ) : <span className="text-xs text-muted-foreground">Sufficient</span>}
                      </td>
                      <td className={`${td} w-10`}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
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
