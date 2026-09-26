import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOperation, type OpType } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { OP_META } from "@/lib/inventory-logic";
import { fmtNum, friendlyError } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = { product_id: string; quantity: string };

export function NewOperationDialog({ type, trigger, presetProduct }: { type: OpType; trigger: ReactNode; presetProduct?: string }) {
  const meta = OP_META[type];
  const [open, setOpen] = useState(false);
  const L = useLookups();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [partner, setPartner] = useState("");
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Line[]>([{ product_id: presetProduct ?? "", quantity: "" }]);

  useEffect(() => {
    if (open) {
      setPartner(""); setSrc(""); setDst(""); setDate(today);
      setLines([{ product_id: presetProduct ?? "", quantity: "" }]);
    }
  }, [open, presetProduct, today]);

  const needsSrc = type !== "receipt";
  const needsDst = type !== "delivery";

  const m = useMutation({
    mutationFn: createOperation,
    onSuccess: (op) => {
      toast.success(`${op.reference} created`);
      qc.invalidateQueries();
      setOpen(false);
      const to = type === "receipt" ? "/receipts/$id" : type === "delivery" ? "/deliveries/$id" : "/transfers/$id";
      navigate({ to, params: { id: op.id } });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (meta.partner && !partner.trim()) return toast.error(`${meta.partner} is required.`);
    if (needsSrc && !src) return toast.error("Select a source location.");
    if (needsDst && !dst) return toast.error("Select a destination location.");
    if (type === "transfer" && src === dst) return toast.error("Source and destination must be different.");
    const clean = lines.filter((l) => l.product_id);
    if (!clean.length) return toast.error("Add at least one product.");
    for (const l of clean) {
      const q = Number(l.quantity);
      if (!Number.isFinite(q) || q <= 0) return toast.error("Quantities must be greater than zero.");
    }
    m.mutate({
      type,
      partner: meta.partner ? partner.trim() : null,
      source_location_id: needsSrc ? src : null,
      dest_location_id: needsDst ? dst : null,
      scheduled_date: date,
      lines: clean.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
    });
  }

  const LocSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
        <SelectContent>{L.locations.map((l) => <SelectItem key={l.id} value={l.id}>{L.locLabel(l.id)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New {meta.label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            {type === "receipt" && "Record incoming goods from a supplier. Stock increases when validated."}
            {type === "delivery" && "Ship goods to a customer. Stock decreases when validated."}
            {type === "transfer" && "Move stock between locations. Company total stays unchanged."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {meta.partner && (
              <div className="space-y-1.5"><Label>{meta.partner}</Label><Input value={partner} onChange={(e) => setPartner(e.target.value)} placeholder={type === "receipt" ? "Supplier name" : "Customer name"} /></div>
            )}
            <div className="space-y-1.5"><Label>Scheduled date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          {type === "transfer" ? (
            <div className="grid items-end gap-3 rounded-xl border border-border bg-surface p-4">
              <LocSelect value={src} onChange={setSrc} label="From" />
              <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-primary" /></div>
              <LocSelect value={dst} onChange={setDst} label="To" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {needsSrc && <LocSelect value={src} onChange={setSrc} label="Source location" />}
              {needsDst && <LocSelect value={dst} onChange={setDst} label="Destination location" />}
            </div>
          )}

          <div>
            <Label>Product lines</Label>
            <div className="mt-2 space-y-2">
              {lines.map((l, i) => {
                const avail = needsSrc && src && l.product_id ? L.qtyAt(l.product_id, src) : null;
                const over = avail !== null && Number(l.quantity) > avail;
                return (
                  <div key={i} className="grid grid-cols-[1fr_110px_36px] items-start gap-2">
                    <div>
                      <Select value={l.product_id} onValueChange={(v) => setLines((s) => s.map((x, j) => (j === i ? { ...x, product_id: v } : x)))}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>{L.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
                      </Select>
                      {avail !== null && (
                        <div className={cn("mt-1 text-xs", over ? "text-warning" : "text-muted-foreground")}>
                          {fmtNum(avail)} available at source{over && " — exceeds available stock"}
                        </div>
                      )}
                    </div>
                    <Input type="number" min={0} step="any" placeholder="Qty" value={l.quantity} className={cn("num", over && "border-warning/60")} onChange={(e) => setLines((s) => s.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                    <Button type="button" variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((s) => s.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={() => setLines((s) => [...s, { product_id: "", quantity: "" }])}><Plus className="h-4 w-4" />Add line</Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>Create draft</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
