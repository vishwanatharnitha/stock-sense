import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { PageHeader, Panel, EmptyState, TableSkeleton, th, td, tr } from "@/components/app/page";
import { OpTypeTag, OpStatusBadge } from "@/components/app/badges";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ledgerQuery } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "Move History — StockSense" },
      { name: "description", content: "Complete, immutable stock ledger of every inventory movement." },
      { property: "og:title", content: "Move History — StockSense" },
      { property: "og:description", content: "Complete, immutable stock ledger of every inventory movement." },
    ],
  }),
  component: Page,
});

function Page() {
  const ledger = useQuery(ledgerQuery);
  const L = useLookups();
  const [q, setQ] = useState("");
  const [op, setOp] = useState("all");
  const [prod, setProd] = useState("all");
  const [wh, setWh] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return (ledger.data ?? []).filter((m) => {
      if (op !== "all" && m.operation !== op) return false;
      if (prod !== "all" && m.product_id !== prod) return false;
      if (wh !== "all") {
        const ws = [m.source_location_id, m.dest_location_id].map((l) => (l ? L.locMap.get(l)?.warehouse_id : null));
        if (!ws.includes(wh)) return false;
      }
      if (from && m.created_at < from) return false;
      if (to && m.created_at > to + "T23:59:59") return false;
      if (t && !m.reference.toLowerCase().includes(t) && !(L.prodMap.get(m.product_id)?.name ?? "").toLowerCase().includes(t)) return false;
      return true;
    });
  }, [ledger.data, q, op, prod, wh, from, to, L]);

  return (
    <>
      <PageHeader eyebrow="Operations" title="Move History" description="The stock ledger — every validated movement with quantities before and after. Records are immutable." />
      <Panel>
        <div className="grid gap-2 border-b border-border p-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference or product" className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/40" />
          </div>
          <Sel value={op} onChange={setOp} all="All operations" opts={[["receipt", "Receipts"], ["delivery", "Deliveries"], ["transfer", "Transfers"], ["adjustment", "Adjustments"]]} />
          <Sel value={prod} onChange={setProd} all="All products" opts={L.products.map((p) => [p.id, p.name])} />
          <Sel value={wh} onChange={setWh} all="All warehouses" opts={L.warehouses.map((w) => [w.id, w.code])} />
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 bg-surface text-xs" aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 bg-surface text-xs" aria-label="To date" />
          </div>
        </div>
        {ledger.isLoading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={<History className="h-5 w-5" />} title="No movements match" /> : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Date / Time</th><th className={th}>Reference</th><th className={th}>Product</th><th className={th}>Operation</th><th className={th}>Source</th><th className={th}>Destination</th>
                  <th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Before</th><th className={`${th} text-right`}>After</th><th className={th}>User</th><th className={th}>Status</th>
                </tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className={tr}>
                      <td className={`${td} text-muted-foreground`}>{fmtDateTime(m.created_at)}</td>
                      <td className={`${td} num`}>{m.reference}</td>
                      <td className={td}><Link to="/products/$id" params={{ id: m.product_id }} className="hover:text-primary">{L.prodMap.get(m.product_id)?.name}</Link></td>
                      <td className={td}><OpTypeTag type={m.operation} /></td>
                      <td className={`${td} text-muted-foreground`}>{m.operation === "receipt" ? "Supplier" : L.locLabel(m.source_location_id)}</td>
                      <td className={`${td} text-muted-foreground`}>{m.operation === "delivery" ? "Customer" : L.locLabel(m.dest_location_id)}</td>
                      <td className={cn(td, "num text-right", Number(m.quantity) >= 0 ? "text-primary" : "text-destructive")}>{Number(m.quantity) > 0 ? "+" : ""}{fmtNum(m.quantity, 2)}</td>
                      <td className={`${td} num text-right text-muted-foreground`}>{fmtNum(m.before_qty, 2)}</td>
                      <td className={`${td} num text-right`}>{fmtNum(m.after_qty, 2)}</td>
                      <td className={`${td} text-muted-foreground`}>{m.user_name}</td>
                      <td className={td}><OpStatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol className="p-4 lg:hidden">
              {rows.map((m) => (
                <li key={m.id} className="relative border-l border-border pb-5 pl-5 last:pb-0">
                  <span className={cn("absolute -left-[4px] top-1.5 h-2 w-2 rounded-full", Number(m.quantity) >= 0 ? "bg-primary" : "bg-destructive")} />
                  <div className="flex justify-between gap-2"><span className="text-sm">{L.prodMap.get(m.product_id)?.name}</span><span className={cn("num text-sm", Number(m.quantity) >= 0 ? "text-primary" : "text-destructive")}>{Number(m.quantity) > 0 ? "+" : ""}{fmtNum(m.quantity)}</span></div>
                  <div className="mt-0.5 text-xs text-muted-foreground"><span className="num">{m.reference}</span> · <OpTypeTag type={m.operation} /> · {fmtDateTime(m.created_at)}</div>
                  <div className="num mt-0.5 text-xs text-muted-foreground">{fmtNum(m.before_qty)} → {fmtNum(m.after_qty)}</div>
                </li>
              ))}
            </ol>
          </>
        )}
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{rows.length} movements</div>
      </Panel>
    </>
  );
}

function Sel({ value, onChange, all, opts }: { value: string; onChange: (v: string) => void; all: string; opts: string[][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 bg-surface text-sm"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">{all}</SelectItem>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
