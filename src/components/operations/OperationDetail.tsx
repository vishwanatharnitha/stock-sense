import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowLeft, Check, CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { Panel, EmptyState, th, td, tr } from "@/components/app/page";
import { OpStatusBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addLine, cancelOperation, confirmOperation, operationQuery, removeLine, validateOperation, type OpType } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { OP_META } from "@/lib/inventory-logic";
import { fmtDate, fmtDateTime, fmtNum, friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

const FLOW: Record<OpType, string[]> = {
  receipt: ["Draft", "Ready", "Validated", "Stock increased"],
  delivery: ["Draft", "Pick & pack", "Validated", "Stock decreased"],
  transfer: ["Draft", "Ready", "Validated", "Stock moved"],
};

export function OperationDetail({ type, id }: { type: OpType; id: string }) {
  const meta = OP_META[type];
  const op = useQuery(operationQuery(id));
  const L = useLookups();
  const qc = useQueryClient();
  const [newProduct, setNewProduct] = useState("");
  const [newQty, setNewQty] = useState("");

  const act = (fn: () => Promise<unknown>, ok: string) => ({
    mutationFn: fn,
    onSuccess: () => { toast.success(ok); qc.invalidateQueries(); },
    onError: (e: unknown) => toast.error(friendlyError(e)),
  });
  const confirm = useMutation({
    ...act(() => confirmOperation(id), "Availability checked"),
    onSuccess: (s) => { qc.invalidateQueries(); s === "waiting" ? toast.warning("Waiting — not enough stock at the source yet") : toast.success("Marked as ready"); },
  });
  const validate = useMutation(act(() => validateOperation(id), "Validated — stock and ledger updated"));
  const cancel = useMutation(act(() => cancelOperation(id), "Document canceled"));
  const add = useMutation({
    ...act(() => addLine(id, newProduct, Number(newQty)), "Line added"),
    onSuccess: () => { setNewProduct(""); setNewQty(""); qc.invalidateQueries(); },
  });
  const del = useMutation({ mutationFn: removeLine, onSuccess: () => qc.invalidateQueries(), onError: (e) => toast.error(friendlyError(e)) });

  if (op.isLoading || L.loading) return <Skeleton className="h-96 bg-surface-2" />;
  const o = op.data;
  if (!o || o.type !== type) return <EmptyState title="Document not found" />;

  const open = !["done", "canceled"].includes(o.status);
  const src = o.source_location_id;
  const lines = o.lines.map((l) => {
    const avail = src ? L.qtyAt(l.product_id, src) : null;
    return { ...l, avail, short: avail !== null && open && avail < Number(l.quantity) };
  });
  const shortages = lines.filter((l) => l.short);
  const totalUnits = lines.reduce((a, l) => a + Number(l.quantity), 0);
  const stepIdx = o.status === "done" ? 3 : o.status === "ready" ? 1 : o.status === "waiting" ? 1 : 0;

  return (
    <>
      <Link to={meta.path} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />{meta.plural}</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{meta.label}</div>
          <h1 className="num flex items-center gap-3 text-2xl font-medium tracking-tight sm:text-3xl">{o.reference} <OpStatusBadge status={o.status} /></h1>
        </div>
        {open && (
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><X className="h-3.5 w-3.5" />Cancel</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Cancel {o.reference}?</AlertDialogTitle><AlertDialogDescription>No stock will move. Canceled documents can't be reopened.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel><AlertDialogAction onClick={() => cancel.mutate()}>Cancel document</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {(o.status === "draft" || o.status === "waiting") && (
              <Button variant="outline" size="sm" onClick={() => confirm.mutate()} disabled={confirm.isPending}>
                <Check className="h-3.5 w-3.5" />{type === "receipt" ? "Mark as ready" : "Check availability"}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" disabled={!lines.length || validate.isPending}><CheckCircle2 className="h-3.5 w-3.5" />Validate</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Validate {o.reference}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {type === "receipt" && `${fmtNum(totalUnits)} units will be added to ${L.locLabel(o.dest_location_id)}.`}
                    {type === "delivery" && `${fmtNum(totalUnits)} units will be removed from ${L.locLabel(src)}.`}
                    {type === "transfer" && `${fmtNum(totalUnits)} units will move from ${L.locLabel(src)} to ${L.locLabel(o.dest_location_id)}.`}
                    {" "}A ledger entry is recorded for every line. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {shortages.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                    {shortages.length} line(s) exceed available stock. Validation will be rejected until stock is available.
                  </div>
                )}
                <AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={() => validate.mutate()}>Validate</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* progress rail */}
      <div className="panel mb-4 grid grid-cols-4 overflow-hidden">
        {FLOW[type].map((s, i) => (
          <div key={s} className={cn("relative border-r border-border px-4 py-3 last:border-0", o.status === "canceled" && "opacity-40")}>
            <div className={cn("absolute inset-x-0 top-0 h-[2px]", i <= stepIdx && o.status !== "canceled" ? "bg-primary" : "bg-transparent")} />
            <div className="num text-[10px] text-muted-foreground">0{i + 1}</div>
            <div className={cn("text-xs sm:text-sm", i <= stepIdx ? "text-foreground" : "text-muted-foreground")}>{s}</div>
          </div>
        ))}
      </div>

      {shortages.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>Insufficient stock at {L.locLabel(src)} for: {shortages.map((s) => `${s.product?.name} (${fmtNum(s.avail)} of ${fmtNum(s.quantity)})`).join(", ")}.</div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          {type === "transfer" ? (
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</div>
              <div className="mt-1 font-medium">{L.locLabel(src)}</div>
              <div className="my-3 flex flex-col items-center text-primary"><ArrowDown className="h-4 w-4" /><span className="num text-sm">{fmtNum(totalUnits)} units</span><ArrowDown className="h-4 w-4" /></div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Destination</div>
              <div className="mt-1 font-medium">{L.locLabel(o.dest_location_id)}</div>
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-3"><dt className="text-muted-foreground">{meta.partner}</dt><dd>{o.partner}</dd></div>
              <div className="flex justify-between border-b border-border pb-3"><dt className="text-muted-foreground">{type === "receipt" ? "Receive into" : "Ship from"}</dt><dd>{L.locLabel(src ?? o.dest_location_id)}</dd></div>
            </dl>
          )}
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-3"><dt className="text-muted-foreground">Scheduled</dt><dd>{fmtDate(o.scheduled_date)}</dd></div>
            <div className="flex justify-between border-b border-border pb-3"><dt className="text-muted-foreground">Created</dt><dd>{fmtDateTime(o.created_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Validated</dt><dd>{fmtDateTime(o.validated_at)}</dd></div>
          </dl>
        </Panel>

        <Panel title="Product lines" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>Product</th><th className={th}>SKU</th>{src && open && <th className={`${th} text-right`}>Available</th>}<th className={`${th} text-right`}>Quantity</th>{open && <th className={th}></th>}</tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className={tr}>
                    <td className={td}>{l.product?.name}</td>
                    <td className={`${td} num text-muted-foreground`}>{l.product?.sku}</td>
                    {src && open && <td className={cn(td, "num text-right", l.short ? "text-warning" : "text-muted-foreground")}>{fmtNum(l.avail)}</td>}
                    <td className={`${td} num text-right`}>{fmtNum(l.quantity)} <span className="text-xs text-muted-foreground">{l.product?.uom}</span></td>
                    {open && <td className={`${td} w-10`}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>}
                  </tr>
                ))}
                {!lines.length && <tr><td colSpan={5}><EmptyState title="No lines yet" hint="Add products below." /></td></tr>}
              </tbody>
            </table>
          </div>
          {open && (
            <form
              className="grid grid-cols-[1fr_100px_auto] gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newProduct) return toast.error("Select a product.");
                if (!(Number(newQty) > 0)) return toast.error("Quantity must be greater than zero.");
                add.mutate();
              }}
            >
              <Select value={newProduct} onValueChange={setNewProduct}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Add product…" /></SelectTrigger>
                <SelectContent>{L.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" min={0} step="any" placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="num h-9" />
              <Button type="submit" variant="outline" size="sm" className="h-9"><Plus className="h-3.5 w-3.5" />Add</Button>
            </form>
          )}
          <div className="flex justify-between border-t border-border px-5 py-3 text-sm"><span className="text-muted-foreground">Total units</span><span className="num">{fmtNum(totalUnits)}</span></div>
        </Panel>
      </div>
    </>
  );
}
