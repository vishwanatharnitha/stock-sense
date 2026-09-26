import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/inventory-logic";
import type { OpStatus } from "@/services/inventory";

const base = "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap";

export function StockBadge({ status }: { status: StockStatus }) {
  const map = {
    healthy: ["In stock", "border-primary/25 bg-primary/10 text-primary"],
    low: ["Low stock", "border-warning/30 bg-warning/10 text-warning"],
    out: ["Out of stock", "border-destructive/30 bg-destructive/10 text-destructive"],
  } as const;
  const [label, cls] = map[status];
  return (
    <span className={cn(base, cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function OpStatusBadge({ status }: { status: OpStatus | string }) {
  const map: Record<string, string> = {
    draft: "border-border bg-muted text-muted-foreground",
    waiting: "border-warning/30 bg-warning/10 text-warning",
    ready: "border-foreground/20 bg-foreground/5 text-foreground",
    done: "border-primary/25 bg-primary/10 text-primary",
    canceled: "border-destructive/25 bg-destructive/10 text-destructive",
  };
  return <span className={cn(base, map[status] ?? map.draft)}>{status}</span>;
}

export function OpTypeTag({ type }: { type: string }) {
  const map: Record<string, string> = {
    receipt: "text-primary",
    delivery: "text-warning",
    transfer: "text-foreground",
    adjustment: "text-muted-foreground",
  };
  return <span className={cn("text-xs font-medium capitalize", map[type])}>{type}</span>;
}
