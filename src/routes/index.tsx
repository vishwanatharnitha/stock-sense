import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, ArrowRight, History, PackagePlus, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { StockDemo } from "@/components/inventory/StockDemo";
import warehouse from "@/assets/warehouse-banner.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockSense — Know what's in stock, wherever it is" },
      { name: "description", content: "See stock across warehouses, follow every receipt, delivery and transfer, and try an interactive sample without changing real inventory." },
      { property: "og:title", content: "StockSense — Know what's in stock, wherever it is" },
      { property: "og:description", content: "A clear view of products and every stock movement, from arrival to delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  { icon: PackagePlus, title: "Receive", text: "Add incoming goods to the right warehouse." },
  { icon: Truck, title: "Deliver", text: "Send orders out with a clear view of what's available." },
  { icon: ArrowLeftRight, title: "Move", text: "Transfer goods between locations without losing track." },
  { icon: History, title: "Trace", text: "See what changed, when it changed, and where it went." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm"><Link to="/dashboard">Open app <ArrowRight /></Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-sidebar text-sidebar-accent-foreground">
          <img src={warehouse} width={1600} height={912} alt="Organized warehouse shelves with goods ready to move" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-sidebar/80 sm:bg-sidebar/65" />
          <div className="mx-auto flex min-h-[530px] max-w-7xl flex-col justify-center px-5 py-20 sm:min-h-[590px] sm:px-8">
            <div className="mb-6 flex items-center gap-2 font-mono text-xs uppercase text-sidebar-primary"><span className="h-2 w-2 rounded-full bg-sidebar-primary" />StockSense / Warehouse inventory</div>
            <h1 className="max-w-3xl font-mono text-4xl font-semibold leading-[1.18] sm:text-5xl lg:text-6xl">StockSense</h1>
            <p className="mt-4 max-w-2xl font-mono text-2xl font-medium leading-snug sm:text-3xl">Know what's in stock. Know where it is.</p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-sidebar-foreground">One clear place for products, incoming goods, deliveries, transfers and every change in between.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"><a href="#demo">Try the demo <ArrowRight /></a></Button>
              <Button asChild size="lg" variant="outline" className="border-sidebar-foreground/50 bg-sidebar/30 text-sidebar-accent-foreground hover:bg-sidebar-accent"><Link to="/auth">Sign in to your workspace</Link></Button>
            </div>
          </div>
        </section>

        <section id="demo" className="scroll-mt-8 border-b border-border bg-background py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-8 max-w-2xl"><p className="font-mono text-xs uppercase text-primary">See it in action</p><h2 className="mt-3 font-mono text-2xl font-semibold sm:text-3xl">From arrival to delivery, nothing gets lost.</h2><p className="mt-3 text-muted-foreground">Step through a sample product's journey and watch the numbers update.</p></div>
            <StockDemo />
          </div>
        </section>

        <section className="border-b border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-xs uppercase text-primary">The everyday flow</p><h2 className="mt-3 font-mono text-2xl font-semibold sm:text-3xl">A simpler way to keep moving.</h2></div><Button asChild variant="outline"><Link to="/dashboard">Explore the workspace <ArrowRight /></Link></Button></div>
            <div className="grid gap-6 border-t border-border pt-7 sm:grid-cols-2 lg:grid-cols-4">{features.map((feature, index) => <div key={feature.title} className="pr-4"><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><feature.icon className="mt-5 h-6 w-6 text-primary" strokeWidth={1.6} /><h3 className="mt-4 font-mono text-lg font-semibold">{feature.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p></div>)}</div>
            <div className="mt-12 flex items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" />Real stock only changes when an operation is confirmed. Each change is recorded.</div>
          </div>
        </section>
      </main>
      <footer className="bg-background"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-7 text-xs text-muted-foreground sm:px-8"><Logo compact /><span>© {new Date().getFullYear()} StockSense</span></div></footer>
    </div>
  );
}