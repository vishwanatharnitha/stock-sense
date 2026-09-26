import { cn } from "@/lib/utils";

/** StockSense mark: stacked inventory blocks with a tracking pulse cutting through. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-primary" />
      <rect x="8" y="8" width="7" height="7" rx="1.5" className="fill-primary-foreground" />
      <rect x="17" y="8" width="7" height="7" rx="1.5" className="fill-primary-foreground" opacity=".45" />
      <rect x="8" y="17" width="7" height="7" rx="1.5" className="fill-primary-foreground" opacity=".45" />
      <path d="M17 22.5h2.2l1.6-3.5 1.8 5 1.4-1.5H26" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Stock<span className="text-primary">Sense</span>
        </span>
      )}
    </div>
  );
}
