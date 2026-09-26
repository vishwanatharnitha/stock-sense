import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowLeftRight, ArrowUpRight, Boxes, PackageMinus, PackagePlus, PackageX, Truck, SlidersHorizontal } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/app/page";
import { OpStatusBadge, StockBadge } from "@/components/app/badges";
import { useLookups } from "@/hooks/use-lookups";
import { ledgerQuery, operationsQuery, profileQuery } from "@/services/inventory";
import { fmtAgo, fmtDate, fmtMoney, fmtNum } from "@/lib/format";
import { OpLink } from "@/components/app/OpLink";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { StockDemo } from "@/components/inventory/StockDemo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StockSense" },
      { name: "description", content: "Real-time inventory overview across warehouses and stock movements." },
      { property: "og:title", content: "Dashboard — StockSense" },
      { property: "og:description", content: "Real-time inventory overview across warehouses and stock movements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
        title="Your inventory at a glance"
        description="What's on hand, what needs attention, and where everything moved."
        actions={
          <>
             <Button asChild variant="outline"><Link to="/receipts"><PackagePlus />Receive</Link></Button>
             <Button asChild><Link to="/deliveries"><Truck />New delivery</Link></Button>
          </>
        }
      />

       <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
         <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
           <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
             <div><p className="font-mono text-xs uppercase text-primary">Recorded activity</p><h2 className="mt-1 font-mono text-lg font-semibold">Latest stock movements</h2></div>
             <Button asChild variant="ghost" size="sm"><Link to="/ledger">View history <ArrowUpRight /></Link></Button>
           </div>
           <div className="divide-y divide-border">
             {(ledger.data ?? []).slice(0, 4).map((m) => {
               const Icon = OP_ICON[m.operation as keyof typeof OP_ICON];
               return <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary"><Icon className="h-4 w-4" /></span>
                 <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{L.prodMap.get(m.product_id)?.name ?? "Product"}</p><p className="truncate text-xs text-muted-foreground">{m.operation} · {m.reference} · {fmtAgo(m.created_at)}</p></div>
                 <span className={cn("num text-sm font-medium", Number(m.quantity) >= 0 ? "text-primary" : "text-destructive")}>{Number(m.quantity) > 0 ? "+" : ""}{fmtNum(m.quantity)}</span>
               </div>;
             })}
             {!(ledger.data ?? []).length && <EmptyState title="No movements yet" hint="Confirmed stock changes will appear here." />}
           </div>
         </section>
         <section className="rounded-lg bg-sidebar p-5 text-sidebar-accent-foreground shadow-[var(--shadow-card)] sm:p-6">
           <p className="font-mono text-xs uppercase text-sidebar-primary">Stock health</p>
           <h2 className="mt-2 font-mono text-2xl font-semibold">{inv.filter((p) => p.status === "healthy").length} <span className="text-base font-normal text-sidebar-foreground">of {inv.length} products on track</span></h2>
           <div className="mt-8 space-y-5">
             <Link to="/products" search={{ status: "low" }} className="block"><div className="mb-2 flex justify-between text-sm"><span>Running low</span><span className="num text-sidebar-primary">{low.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-sidebar-accent"><div className="h-full rounded-full bg-sidebar-primary" style={{ width: `${inv.length ? low.length / inv.length * 100 : 0}%` }} /></div></Link>
             <Link to="/products" search={{ status: "out" }} className="block"><div className="mb-2 flex justify-between text-sm"><span>Out of stock</span><span className="num text-sidebar-primary">{out.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-sidebar-accent"><div className="h-full rounded-full bg-sidebar-primary" style={{ width: `${inv.length ? out.length / inv.length * 100 : 0}%` }} /></div></Link>
           </div>
           <p className="mt-9 border-t border-sidebar-border pt-4 text-xs leading-relaxed text-sidebar-foreground">Counts update when a receipt, delivery, transfer, or adjustment is completed.</p>
         </section>
       </div>

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

       <section className="mt-10 border-t border-border pt-8">
         <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs uppercase text-primary">Explore without changing stock</p><h2 className="mt-2 font-mono text-xl font-semibold">See how a product moves</h2></div><p className="max-w-md text-sm text-muted-foreground">A sample receipt, transfer and delivery, separate from your workspace.</p></div>
         <StockDemo compact />
       </section>
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
              <OpLink key={o.id} type={o.type} id={o.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-foreground/[0.025]">
                <div className="min-w-0">
                  <div className="num text-sm">{o.reference}</div>
                  <div className="truncate text-xs text-muted-foreground">{o.partner ?? `${L.locLabel(o.source_location_id)} → ${L.locLabel(o.dest_location_id)}`} · {fmtDate(o.scheduled_date)}</div>
                </div>
                <OpStatusBadge status={o.status} />
              </OpLink>
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
