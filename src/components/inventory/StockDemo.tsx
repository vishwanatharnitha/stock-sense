import { useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, RotateCcw, ArrowLeftRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type Move = { kind: "receipt" | "delivery" | "transfer"; label: string; detail: string; north: number; south: number };

const initial = { north: 32, south: 18 };
const steps: Move[] = [
  { kind: "receipt", label: "Receive 12 units", detail: "Supplier → North warehouse", north: 12, south: 0 },
  { kind: "transfer", label: "Move 8 units", detail: "North → South warehouse", north: -8, south: 8 },
  { kind: "delivery", label: "Deliver 5 units", detail: "South warehouse → Customer", north: 0, south: -5 },
];
const icons = { receipt: ArrowDownLeft, transfer: ArrowLeftRight, delivery: ArrowUpRight };

export function StockDemo({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const north = initial.north + steps.slice(0, count).reduce((sum, s) => sum + s.north, 0);
  const south = initial.south + steps.slice(0, count).reduce((sum, s) => sum + s.south, 0);

  function advance() {
    setCount((current) => Math.min(current + 1, steps.length));
  }
  function play() {
    setCount(0);
    setPlaying(true);
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1;
      setCount(next);
      if (next >= steps.length) {
        window.clearInterval(timer);
        setPlaying(false);
      }
    }, 850);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase text-primary">Interactive sample · no real stock changes</p>
          <h3 className="mt-1 font-mono text-base font-semibold sm:text-lg">Follow a stock movement</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => { setCount(0); setPlaying(false); }} disabled={playing || count === 0} title="Reset sample" aria-label="Reset sample"><RotateCcw /></Button>
          <Button variant="outline" size="icon" onClick={play} disabled={playing} title="Play sample" aria-label="Play sample"><Play /></Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="p-5 sm:p-7 lg:border-r lg:border-border">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary"><span className="font-mono text-lg font-bold">B</span></div>
            <div><p className="font-medium">Packing boxes</p><p className="font-mono text-xs text-muted-foreground">BOX-001 · Sample product</p></div>
            <span className="ml-auto rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">IN STOCK</span>
          </div>
          <div className="grid grid-cols-3 gap-3 py-7 text-center">
            <div><p className="text-xs text-muted-foreground">North warehouse</p><p aria-live="polite" className="num mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{north}</p></div>
            <div className="flex items-center justify-center text-muted-foreground"><ArrowLeftRight className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">South warehouse</p><p aria-live="polite" className="num mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{south}</p></div>
          </div>
          <div className="flex items-end justify-between gap-4 border-t border-border pt-5">
            <div><p className="text-xs text-muted-foreground">Total available</p><p aria-live="polite" className="num mt-1 text-4xl font-semibold text-primary">{north + south}<span className="ml-2 text-sm font-normal text-muted-foreground">units</span></p></div>
            <Button onClick={advance} disabled={count >= steps.length || playing} className="shrink-0">{count >= steps.length ? "Complete" : "Next movement"}<ArrowRight /></Button>
          </div>
        </div>
        <div className="border-t border-border p-5 sm:p-7 lg:border-t-0">
          <p className="mb-4 font-mono text-xs uppercase text-muted-foreground">Movement history</p>
          <ol className="space-y-1">
            {steps.map((step, index) => {
              const Icon = icons[step.kind];
              const done = index < count;
              return (
                <li key={step.kind} className={`flex items-center gap-3 rounded-md border px-3 py-3 transition-colors ${done ? "border-primary/25 bg-primary/10" : "border-border bg-surface/50"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${done ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{step.label}</p><p className="truncate text-xs text-muted-foreground">{step.detail}</p></div>
                  <span className={`font-mono text-xs ${done ? "text-primary" : "text-muted-foreground"}`}>{done ? "Done" : `0${index + 1}`}</span>
                </li>
              );
            })}
          </ol>
          {!compact && <p className="mt-5 text-xs leading-relaxed text-muted-foreground">A receipt adds stock, a transfer moves it between warehouses, and a delivery removes it. Every completed step has a matching record.</p>}
        </div>
      </div>
    </div>
  );
}