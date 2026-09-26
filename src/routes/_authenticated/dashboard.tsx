import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowLeftRight, ArrowUpRight, Boxes, PackageMinus, PackagePlus, PackageX, Truck, SlidersHorizontal } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/app/page";
import { OpStatusBadge, StockBadge } from "@/components/app/badges";
import { useLookups } from "@/hooks/use-lookups";
import { ledgerQuery, operationsQuery, profileQuery } from "@/services/inventory";
import { fmtAgo, fmtDate, fmtMoney, fmtNum } from "@/lib/format";
import { OP_META } from "@/lib/inventory-logic";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StockSense" },
      { name: "description", content: "Real-time inventory overview across warehouses and stock movements." },
      { property: "og:title", content: "Dashboard — StockSense" },
      { property: "og:description", content: "Real-time inventory overview across warehouses and stock movements." },
    ],
  }),
  component: Dashboard,
});

const OP_ICON = { receipt: PackagePlus, delivery: Truck, transfer: ArrowLeftRight, adjustment: SlidersHorizontal } as const;

function Dashboard() {
  const { user } = Route.useRouteContext();
  const profile = useQuery(profileQuery(user.id));
  const L = useLookups();
  const ops = useQuery(operationsQuery());
  const ledger = useQuery(ledgerQuery);

  const inv = L.inventory;
  const totalUnits = inv.reduce((a, p) => a + p.total, 0);
  const value = inv.reduce((a, p) => a + p.total * Number(p.unit_cost), 0);
  const low = inv.filter((p) => p.status === "low");
  const out = inv.filter((p) => p.status === "out");
  const open = (ops.data ?? []).filter((o) => !["done", "canceled"].includes(o.status));
  const pending = (t: string) => open.filter((o) => o.type === t).length;

  const byWarehouse = L.warehouses.map((w) => ({
    name: w.code,
    full: w.name,
    units: L.stock.filter((s) => L.locMap.get(s.location_id)?.warehouse_id === w.id).reduce((a, s) => a + Number(s.quantity), 0),
  }));
  const byLocation = L.locations
    .map((l) => ({ name: l.name, units: L.stock.filter((s) => s.location_id === l.id).reduce((a, s) => a + Number(s.quantity), 0) }))
    .sort((a, b) => b.units - a.units);
  const statusData = [
    { name: "Healthy", value: inv.filter((p) => p.status === "healthy").length, color: "var(--chart-1)" },
    { name: "Low stock", value: low.length, color: "var(--warning)" },
    { name: "Out of stock", value: out.length, color: "var(--destructive)" },
  ];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (profile.data?.full_name ?? "").split(" ")[0];

  if (L.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80 bg-surface-2" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-36 bg-surface-2" /><Skeleton className="h-36 bg-surface-2" /><Skeleton className="h-36 bg-surface-2" /></div>
        <Skeleton className="h-80 bg-surface-2" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`${greet}${firstName ? `, ${firstName}` : ""}`}
        title="Inventory Overview"
        description="Real-time visibility across your warehouses and stock movements."
        actions={
          <>
            <Link to="/receipts" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm hover:bg-accent"><PackagePlus className="h-4 w-4" />Receive</Link>
            <Link to="/deliveries" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Truck className="h-4 w-4" />New delivery</Link>
          </>
        }
      />

      {/* KPI grid — hero KPI + supporting tiles */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="panel relative overflow-hidden p-6 lg:col-span-5">
          <div className="grid-bg absolute inset-0 opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Boxes className="h-3.5 w-3.5 text-primary" />Total units in stock</div>
            <div className="num mt-4 text-5xl font-medium text-foreground">{fmtNum(totalUnits)}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              across <span className="text-foreground">{inv.filter((p) => p.total > 0).length}</span> products in stock · {L.locations.length} locations
            </div>
            <div className="mt-6 flex items-center gap-6 border-t border-border pt-4 text-sm">
              <div><div className="text-xs text-muted-foreground">Inventory value</div><div className="num mt-0.5 text-primary">{fmtMoney(value)}</div></div>
              <div><div className="text-xs text-muted-foreground">Catalog</div><div className="num mt-0.5">{inv.length} SKUs</div></div>
              <div><div className="text-xs text-muted-foreground">Warehouses</div><div className="num mt-0.5">{L.warehouses.length}</div></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-7">
          <Kpi to="/products" search={{ status: "low" }} icon={AlertTriangle} label="Low stock" value={low.length} hint="below reorder level" tone={low.length ? "warning" : undefined} />
          <Kpi to="/products" search={{ status: "out" }} icon={PackageX} label="Out of stock" value={out.length} hint="need replenishment" tone={out.length ? "danger" : undefined} />
          <Kpi to="/receipts" icon={PackagePlus} label="Pending receipts" value={pending("receipt")} hint="awaiting validation" />
          <Kpi to="/deliveries" icon={PackageMinus} label="Pending deliveries" value={pending("delivery")} hint="to pick & ship" />
          <Kpi to="/transfers" icon={ArrowLeftRight} label="Internal transfers" value={pending("transfer")} hint="scheduled moves" />
          <Kpi to="/ledger" icon={SlidersHorizontal} label="Movements logged" value={(ledger.data ?? []).length} hint="in stock ledger" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel title="Stock distribution by location" className="lg:col-span-8" action={<span className="text-xs text-muted-foreground">units</span>}>
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLocation} margin={{ left: 8, right: 16 }}>
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ fill: "oklch(1 0 0 / 3%)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="units" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {byLocation.map((_, i) => <Cell key={i} fill={i === 0 ? "var(--chart-1)" : "var(--chart-3)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 border-t border-border">
            {byWarehouse.map((w) => (
              <div key={w.name} className="border-r border-border px-5 py-3 last:border-0">
                <div className="text-xs text-muted-foreground">{w.name} · {w.full}</div>
                <div className="num mt-0.5 text-lg">{fmtNum(w.units)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Inventory status" className="lg:col-span-4">
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={62} outerRadius={82} paddingAngle={3} stroke="none">
                  {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-3xl">{inv.length ? Math.round((statusData[0].value / inv.length) * 100) : 0}%</div>
              <div className="text-xs text-muted-foreground">healthy</div>
            </div>
          </div>
          <div className="space-y-2 px-5 pb-5">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />{d.name}</span>
                <span className="num">{d.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel title="Recent movements" className="lg:col-span-5" action={<Link to="/ledger" className="text-xs text-muted-foreground hover:text-primary">View ledger →</Link>}>
          <ol className="relative px-5 py-4">
            {(ledger.data ?? []).slice(0, 7).map((m, i, arr) => {
              const Icon = OP_ICON[m.operation as keyof typeof OP_ICON];
              return (
                <li key={m.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < arr.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border" />}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{L.prodMap.get(m.product_id)?.name}</span>
                      <span className={cn("num text-sm", Number(m.quantity) >= 0 ? "text-primary" : "text-destructive")}>{Number(m.quantity) > 0 ? "+" : ""}{fmtNum(m.quantity)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground"><span className="num">{m.reference}</span> · {fmtAgo(m.created_at)}</div>
                  </div>
                </li>
              );
            })}
            {!(ledger.data ?? []).length && <EmptyState title="No movements yet" />}
          </ol>
        </Panel>

        <Panel title="Pending operations" className="lg:col-span-4">
          <div className="divide-y divide-border">
            {open.slice(0, 6).map((o) => (
              <Link key={o.id} to={`${OP_META[o.type as keyof typeof OP_META].path}/$id` as "/receipts/$id"} params={{ id: o.id }} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-foreground/[0.025]">
                <div className="min-w-0">
                  <div className="num text-sm">{o.reference}</div>
                  <div className="truncate text-xs text-muted-foreground">{o.partner ?? `${L.locLabel(o.source_location_id)} → ${L.locLabel(o.dest_location_id)}`} · {fmtDate(o.scheduled_date)}</div>
                </div>
                <OpStatusBadge status={o.status} />
              </Link>
            ))}
            {!open.length && <EmptyState title="Nothing pending" hint="All operations are completed." />}
          </div>
        </Panel>

        <Panel title="Stock alerts" className="lg:col-span-3">
          <div className="divide-y divide-border">
            {[...out, ...low].slice(0, 6).map((p) => (
              <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="block px-5 py-3 hover:bg-foreground/[0.025]">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm">{p.name}</span></div>
                <div className="mt-1.5 flex items-center justify-between">
                  <StockBadge status={p.status} />
                  <span className="num text-xs text-muted-foreground">{fmtNum(p.total)}/{fmtNum(p.reorder_level)}</span>
                </div>
              </Link>
            ))}
            {!low.length && !out.length && <EmptyState title="All healthy" hint="No product is below its reorder level." />}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Kpi({ to, search, icon: Icon, label, value, hint, tone }: { to: string; search?: Record<string, string>; icon: typeof Boxes; label: string; value: number; hint: string; tone?: "warning" | "danger" }) {
  return (
    <Link to={to} search={search as never} className="panel group flex flex-col justify-between p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="flex items-center justify-between">
        <Icon className={cn("h-4 w-4", tone === "warning" ? "text-warning" : tone === "danger" ? "text-destructive" : "text-muted-foreground")} strokeWidth={1.75} />
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-5">
        <div className={cn("num text-3xl", tone === "warning" && "text-warning", tone === "danger" && "text-destructive")}>{fmtNum(value)}</div>
        <div className="mt-1 text-[13px] text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </Link>
  );
}
