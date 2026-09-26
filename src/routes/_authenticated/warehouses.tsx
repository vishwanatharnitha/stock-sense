import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { saveWarehouse } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtNum, friendlyError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/warehouses")({
  head: () => ({
    meta: [
      { title: "Warehouses — StockSense" },
      { name: "description", content: "Warehouses, their locations and where inventory physically sits." },
      { property: "og:title", content: "Warehouses — StockSense" },
      { property: "og:description", content: "Warehouses, their locations and where inventory physically sits." },
    ],
  }),
  component: Page,
});

function Page() {
  const L = useLookups();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: "", name: "", address: "" });
  const add = useMutation({
    mutationFn: () => saveWarehouse({ code: f.code.trim(), name: f.name.trim(), address: f.address.trim() || null }),
    onSuccess: () => { toast.success("Warehouse created"); setOpen(false); setF({ code: "", name: "", address: "" }); qc.invalidateQueries(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Warehouses" description="Physical sites and the internal locations inside them."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" />New warehouse</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New warehouse</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!f.code.trim() || !f.name.trim()) return toast.error("Code and name are required."); add.mutate(); }}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="num uppercase" placeholder="WH03" /></div>
                  <div className="col-span-2 space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
                <DialogFooter><Button type="submit" disabled={add.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        } />
      <div className="grid gap-4 lg:grid-cols-2">
        {L.warehouses.map((w, i) => {
          const locs = L.locations.filter((l) => l.warehouse_id === w.id);
          const units = (lid: string) => L.stock.filter((s) => s.location_id === lid).reduce((a, s) => a + Number(s.quantity), 0);
          const total = locs.reduce((a, l) => a + units(l.id), 0);
          const skus = new Set(L.stock.filter((s) => locs.some((l) => l.id === s.location_id) && Number(s.quantity) > 0).map((s) => s.product_id)).size;
          return (
            <div key={w.id} className="panel overflow-hidden">
              <div className="relative border-b border-border p-6">
                <div className="grid-bg absolute inset-0 opacity-50 [mask-image:linear-gradient(to_left,black,transparent)]" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="num text-xs text-primary">WAREHOUSE {String(i + 1).padStart(2, "0")} · {w.code}</div>
                    <div className="mt-1.5 text-lg font-medium">{w.name}</div>
                    <div className="text-sm text-muted-foreground">{w.address ?? "—"}</div>
                  </div>
                  <Warehouse className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="relative mt-5 flex gap-8 text-sm">
                  <div><div className="text-xs text-muted-foreground">Units</div><div className="num text-xl">{fmtNum(total)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Products</div><div className="num text-xl">{skus}</div></div>
                  <div><div className="text-xs text-muted-foreground">Locations</div><div className="num text-xl">{locs.length}</div></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                {locs.map((l) => (
                  <div key={l.id} className="bg-card p-4">
                    <div className="flex items-center gap-1.5 text-sm"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{l.name}</div>
                    <div className="num mt-0.5 text-xs text-muted-foreground">{l.code}</div>
                    <div className="num mt-3 text-base">{fmtNum(units(l.id))}</div>
                  </div>
                ))}
                {!locs.length && <div className="col-span-full bg-card p-4 text-sm text-muted-foreground">No locations — <Link to="/locations" className="text-primary">add one</Link>.</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
