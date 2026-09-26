import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveProduct, type ProductInput } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { friendlyError } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  sku: z.string().trim().min(2, "SKU is required").max(40).regex(/^[A-Za-z0-9-_.]+$/, "SKU may only contain letters, numbers, - _ ."),
  category_id: z.string().nullable(),
  uom: z.string().trim().min(1, "Unit of measure is required"),
  reorder_level: z.number({ invalid_type_error: "Reorder level must be a number" }).min(0, "Reorder level cannot be negative"),
  unit_cost: z.number({ invalid_type_error: "Unit cost must be a number" }).min(0, "Unit cost cannot be negative"),
});

type Existing = Partial<ProductInput> & { id?: string };

export function ProductFormDialog({ trigger, product }: { trigger: ReactNode; product?: Existing }) {
  const [open, setOpen] = useState(false);
  const L = useLookups();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", sku: "", category_id: "", uom: "Units", reorder_level: "0", unit_cost: "0" });

  useEffect(() => {
    if (open)
      setF({
        name: product?.name ?? "",
        sku: product?.sku ?? "",
        category_id: product?.category_id ?? "",
        uom: product?.uom ?? "Units",
        reorder_level: String(product?.reorder_level ?? 0),
        unit_cost: String(product?.unit_cost ?? 0),
      });
  }, [open, product]);

  const m = useMutation({
    mutationFn: (v: ProductInput) => saveProduct(v, product?.id),
    onSuccess: () => {
      toast.success(product?.id ? "Product updated" : "Product created");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...f,
      category_id: f.category_id || null,
      reorder_level: f.reorder_level === "" ? NaN : Number(f.reorder_level),
      unit_cost: f.unit_cost === "" ? NaN : Number(f.unit_cost),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    m.mutate(parsed.data as ProductInput);
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product?.id ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>Products are stocked per location. Opening stock is added through a receipt.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Product name</Label><Input value={f.name} onChange={set("name")} placeholder="e.g. Steel Rods 12mm" /></div>
          <div className="space-y-1.5"><Label>SKU / Code</Label><Input value={f.sku} onChange={set("sku")} className="num uppercase" placeholder="RM-STL-012" /></div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={f.category_id} onValueChange={(v) => setF((s) => ({ ...s, category_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{L.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Unit of measure</Label><Input value={f.uom} onChange={set("uom")} placeholder="Units, kg, Rolls…" /></div>
          <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" min={0} value={f.reorder_level} onChange={set("reorder_level")} className="num" /></div>
          <div className="space-y-1.5"><Label>Unit cost (USD)</Label><Input type="number" min={0} step="0.01" value={f.unit_cost} onChange={set("unit_cost")} className="num" /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{product?.id ? "Save changes" : "Create product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
