import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" />
        <Link to="/" className="relative"><Logo /></Link>
        <div className="relative max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">Inventory intelligence</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
            Every unit, every location, every movement — accounted for.
          </h2>
          <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {[["Receipts", "IN"], ["Transfers", "INT"], ["Deliveries", "OUT"]].map(([l, c]) => (
              <div key={l} className="bg-sidebar p-4">
                <div className="num text-xs text-primary">WH/{c}</div>
                <div className="mt-1 text-sm text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} StockSense. All movements ledgered.</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-10 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
