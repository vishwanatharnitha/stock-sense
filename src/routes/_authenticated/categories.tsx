import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Tags, Trash2 } from "lucide-react";
import { PageHeader, Panel, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCategory, saveCategory } from "@/services/inventory";
import { useLookups } from "@/hooks/use-lookups";
import { fmtNum, friendlyError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categories — StockSense" },
      { name: "description", content: "Organise products into categories." },
      { property: "og:title", content: "Categories — StockSense" },
      { property: "og:description", content: "Organise products into categories." },
    ],
  }),
  component: Page,
});

function Page() {
  const L = useLookups();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const add = useMutation({
    mutationFn: () => saveCategory(name.trim(), desc.trim() || null),
    onSuccess: () => { toast.success("Category created"); setName(""); setDesc(""); qc.invalidateQueries(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const del = useMutation({ mutationFn: deleteCategory, onSuccess: () => { toast.success("Category removed"); qc.invalidateQueries(); }, onError: (e) => toast.error(friendlyError(e)) });

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Categories" description="Group products for filtering and reporting." />
      <Panel className="mb-4">
        <form className="flex flex-col gap-2 p-4 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return toast.error("Category name is required."); add.mutate(); }}>
          <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} className="sm:w-60" />
          <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={add.isPending}><Plus className="h-4 w-4" />Add category</Button>
        </form>
      </Panel>
      {L.categories.length === 0 ? <Panel><EmptyState icon={<Tags className="h-5 w-5" />} title="No categories yet" /></Panel> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {L.categories.map((c) => {
            const items = L.inventory.filter((p) => p.category_id === c.id);
            return (
              <div key={c.id} className="panel group p-5 transition-colors hover:border-foreground/15">
                <div className="flex items-start justify-between">
                  <div><div className="font-medium">{c.name}</div><div className="mt-1 text-sm text-muted-foreground">{c.description ?? "—"}</div></div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => del.mutate(c.id)} aria-label="Delete category"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="mt-5 flex gap-6 border-t border-border pt-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Products</div><div className="num">{items.length}</div></div>
                  <div><div className="text-xs text-muted-foreground">Units</div><div className="num">{fmtNum(items.reduce((a, p) => a + p.total, 0))}</div></div>
                  <div><div className="text-xs text-muted-foreground">Alerts</div><div className="num text-warning">{items.filter((p) => p.status !== "healthy").length}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
