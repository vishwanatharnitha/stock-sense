import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Plus, Search } from "lucide-react";
import { PageHeader, Panel, EmptyState, TableSkeleton, th, td, tr } from "@/components/app/page";
import { OpStatusBadge } from "@/components/app/badges";
import { OpLink } from "@/components/app/OpLink";
import { NewOperationDialog } from "./NewOperationDialog";
import { Button } from "@/components/ui/button";
import { operationsQuery, type OpType } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { OP_META } from "@/lib/inventory-logic";
import { fmtDate, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUSES = ["all", "draft", "waiting", "ready", "done", "canceled"] as const;

export function OperationsList({ type, description }: { type: OpType; description: string }) {
  const meta = OP_META[type];
  const ops = useQuery(operationsQuery(type));
  const L = useLookups();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return (ops.data ?? [])
      .filter((o) => status === "all" || o.status === status)
      .filter((o) => !t || o.reference?.toLowerCase().includes(t) || (o.partner ?? "").toLowerCase().includes(t));
  }, [ops.data, status, q]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, s === "all" ? (ops.data ?? []).length : (ops.data ?? []).filter((o) => o.status === s).length]));

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title={meta.plural}
        description={description}
        actions={<NewOperationDialog type={type} trigger={<Button><Plus className="h-4 w-4" />New {meta.label.toLowerCase()}</Button>} />}
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={cn("whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs capitalize transition-colors", status === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {s} <span className="num ml-1 text-muted-foreground">{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference or partner" className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary/40" />
          </div>
        </div>
        {ops.isLoading ? <TableSkeleton /> : rows.length === 0 ? (
          <EmptyState icon={<FileText className="h-5 w-5" />} title={`No ${meta.plural.toLowerCase()} found`} hint="Create a new document to get started." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Reference</th>
                  {meta.partner && <th className={th}>{meta.partner}</th>}
                  <th className={th}>{type === "transfer" ? "Route" : "Location"}</th>
                  <th className={th}>Scheduled</th>
                  <th className={`${th} text-right`}>Lines</th>
                  <th className={`${th} text-right`}>Units</th>
                  <th className={th}>Status</th>
                </tr></thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className={tr}>
                      <td className={td}><OpLink type={type} id={o.id} className="num font-medium hover:text-primary">{o.reference}</OpLink></td>
                      {meta.partner && <td className={td}>{o.partner}</td>}
                      <td className={`${td} text-muted-foreground`}>
                        {type === "transfer" ? (
                          <span className="inline-flex items-center gap-2">{L.locLabel(o.source_location_id)} <ArrowRight className="h-3 w-3 text-primary" /> {L.locLabel(o.dest_location_id)}</span>
                        ) : L.locLabel(o.source_location_id ?? o.dest_location_id)}
                      </td>
                      <td className={`${td} text-muted-foreground`}>{fmtDate(o.scheduled_date)}</td>
                      <td className={`${td} num text-right`}>{o.lines.length}</td>
                      <td className={`${td} num text-right`}>{fmtNum(o.lines.reduce((a, l) => a + Number(l.quantity), 0))}</td>
                      <td className={td}><OpStatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {rows.map((o) => (
                <OpLink key={o.id} type={type} id={o.id} className="block p-4">
                  <div className="flex items-center justify-between"><span className="num font-medium">{o.reference}</span><OpStatusBadge status={o.status} /></div>
                  <div className="mt-1 text-sm text-muted-foreground">{o.partner ?? `${L.locLabel(o.source_location_id)} → ${L.locLabel(o.dest_location_id)}`}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{fmtDate(o.scheduled_date)} · {o.lines.length} lines</div>
                </OpLink>
              ))}
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
