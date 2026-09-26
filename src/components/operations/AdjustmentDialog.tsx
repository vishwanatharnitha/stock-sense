import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyAdjustment } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtNum, friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

const REASONS = ["Cycle count", "Damaged goods", "Lost / missing", "Found stock", "Expired", "Data correction"];

export function AdjustmentDialog({ trigger, presetProduct }: { trigger: ReactNode; presetProduct?: string }) {
  const [open, setOpen] = useState(false);
  const L = useLookups();
  const qc = useQueryClient();
  const [product, setProduct] = useState(presetProduct ?? "");
  const [loc, setLoc] = useState("");
  const [count, setCount] = useState("");
  const [reason, setReason] = useState(REASONS[0]);

  useEffect(() => {
    if (open) { setProduct(presetProduct ?? ""); setLoc(""); setCount(""); setReason(REASONS[0]); }
  }, [open, presetProduct]);

  const system = product && loc ? L.qtyAt(product, loc) : null;
  const diff = system !== null && count !== "" ? Number(count) - system : null;

  const m = useMutation({
    mutationFn: () => applyAdjustment(product, loc, Number(count), reason),
    onSuccess: () => {
      toast.success("Stock adjusted and logged in the ledger");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !loc) return toast.error("Select a product and location.");
    const n = Number(count);
    if (count === "" || !Number.isFinite(n) || n < 0) return toast.error("Physical count must be zero or more.");
    if (diff === 0) return toast.error("Physical count matches system quantity — nothing to adjust.");
    m.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inventory adjustment</DialogTitle>
          <DialogDescription>Reconcile system stock with a physical count. The difference is written to the ledger.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{L.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={loc} onValueChange={setLoc}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>{L.locations.map((l) => <SelectItem key={l.id} value={l.id}>{L.locLabel(l.id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border">
            <div className="bg-surface p-4">
              <div className="text-xs text-muted-foreground">System quantity</div>
              <div className="num mt-1 text-2xl">{system === null ? "—" : fmtNum(system)}</div>
            </div>
            <div className="border-x border-border bg-surface p-4">
              <Label className="text-xs font-normal text-muted-foreground">Physical count</Label>
              <Input type="number" min={0} step="any" value={count} onChange={(e) => setCount(e.target.value)} className="num mt-1 h-9 text-lg" />
            </div>
            <div className={cn("p-4", diff === null ? "bg-surface" : diff < 0 ? "bg-destructive/10" : diff > 0 ? "bg-primary/10" : "bg-surface")}>
              <div className="text-xs text-muted-foreground">Difference</div>
              <div className={cn("num mt-1 text-2xl", diff !== null && diff < 0 && "text-destructive", diff !== null && diff > 0 && "text-primary")}>
                {diff === null ? "—" : `${diff > 0 ? "+" : ""}${fmtNum(diff, 2)}`}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>Validate adjustment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
