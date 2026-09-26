import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</div>
        )}
        <h1 className="font-mono text-2xl font-semibold text-foreground sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children, title, action }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-mono text-sm font-medium text-foreground">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-lg border border-border bg-surface-2 p-2.5 text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full bg-surface-2" />
      ))}
    </div>
  );
}

export const th = "px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap";
export const td = "px-4 py-3 text-sm whitespace-nowrap";
export const tr = "border-t border-border transition-colors hover:bg-foreground/[0.025]";
