import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, ArrowRight, History, PackagePlus, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockSense — Inventory intelligence, in real time" },
      { name: "description", content: "Enterprise inventory management: receipts, deliveries, internal transfers, adjustments and an immutable stock ledger across every warehouse." },
      { property: "og:title", content: "StockSense — Inventory intelligence, in real time" },
      { property: "og:description", content: "Receipts, deliveries, transfers and a complete stock ledger across every warehouse." },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: PackagePlus, title: "Receipts", text: "Receive supplier goods into any location. Stock rises only when validated." },
  { icon: Truck, title: "Delivery orders", text: "Pick, pack and ship with hard checks against available stock." },
  { icon: ArrowLeftRight, title: "Internal transfers", text: "Move stock between racks and sites. Company totals never drift." },
  { icon: History, title: "Stock ledger", text: "Every movement recorded with before and after quantities, user and time." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/auth" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/dashboard" className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Open app</Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />Inventory intelligence, in real time
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Control every unit across every warehouse.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            StockSense replaces spreadsheets and manual registers with a single, validated system of record for stock — from dock to shelf to customer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Get started <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/dashboard" className="inline-flex h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm hover:bg-accent">View dashboard</Link>
          </div>

          <div className="panel mt-16 grid grid-cols-2 divide-x divide-border overflow-hidden sm:grid-cols-4">
            {[["WH/IN", "Receipt validated", "+800"], ["WH/INT", "Rack B → North Store", "8"], ["WH/OUT", "Delivery to customer", "−10"], ["WH/ADJ", "Cycle count variance", "−3"]].map(([r, l, q]) => (
              <div key={r} className="p-5">
                <div className="num text-xs text-primary">{r}</div>
                <div className="mt-2 text-sm text-muted-foreground">{l}</div>
                <div className="num mt-3 text-2xl">{q}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-background p-6">
              <f.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />Stock can only change through validated operations — never by hand.
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <Logo compact /><span>© {new Date().getFullYear()} StockSense</span>
        </div>
      </footer>
    </div>
  );
}
