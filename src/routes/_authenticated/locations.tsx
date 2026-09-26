import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader, Panel, th, td, tr } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveLocation } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtNum, friendlyError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/locations")({
  head: () => ({
    meta: [
      { title: "Locations — StockSense" },
      { name: "description", content: "Racks, stores and floors where stock is held." },
      { property: "og:title", content: "Locations — StockSense" },
      { property: "og:description", content: "Racks, stores and floors where stock is held." },
    ],
  }),
  component: Page,
});

function Page() {
  const L = useLookups();
  const qc = useQueryClient();
  const [f, setF] = useState({ wh: "", code: "", name: "" });
  const add = useMutation({
    mutationFn: () => saveLocation({ warehouse_id: f.wh, code: f.code.trim(), name: f.name.trim() }),
    onSuccess: () => { toast.success("Location created"); setF({ wh: f.wh, code: "", name: "" }); qc.invalidateQueries(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Locations" description="Internal storage locations within each warehouse." />
      <Panel className="mb-4">
        <form className="grid gap-2 p-4 sm:grid-cols-[1.5fr_1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); if (!f.wh || !f.code.trim() || !f.name.trim()) return toast.error("Warehouse, code and name are required."); add.mutate(); }}>
          <Select value={f.wh} onValueChange={(v) => setF({ ...f, wh: v })}><SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger><SelectContent>{L.warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Code (RACK-C)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="num uppercase" />
          <Input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Button type="submit"><Plus className="h-4 w-4" />Add location</Button>
        </form>
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={th}>Location</th><th className={th}>Code</th><th className={th}>Warehouse</th><th className={`${th} text-right`}>Products</th><th className={`${th} text-right`}>Units</th></tr></thead>
            <tbody>
              {L.locations.map((l) => {
                const rows = L.stock.filter((s) => s.location_id === l.id && Number(s.quantity) > 0);
                return (
                  <tr key={l.id} className={tr}>
                    <td className={td}>{l.name}</td>
                    <td className={`${td} num text-muted-foreground`}>{l.warehouse?.code}/{l.code}</td>
                    <td className={`${td} text-muted-foreground`}>{l.warehouse?.name}</td>
                    <td className={`${td} num text-right`}>{rows.length}</td>
                    <td className={`${td} num text-right`}>{fmtNum(rows.reduce((a, s) => a + Number(s.quantity), 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
