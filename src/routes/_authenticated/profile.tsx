import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ledgerQuery, profileQuery, updateProfile } from "@/services/inventory";
import { fmtDate, friendlyError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — StockSense" },
      { name: "description", content: "Manage your StockSense account details." },
      { property: "og:title", content: "My Profile — StockSense" },
      { property: "og:description", content: "Manage your StockSense account details." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = Route.useRouteContext();
  const profile = useQuery(profileQuery(user.id));
  const ledger = useQuery(ledgerQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (profile.data) { setName(profile.data.full_name ?? ""); setTitle(profile.data.job_title ?? ""); }
  }, [profile.data]);
  const save = useMutation({
    mutationFn: () => updateProfile(user.id, { full_name: name.trim(), job_title: title.trim() }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const mine = (ledger.data ?? []).filter((m) => m.user_id === user.id).length;

  return (
    <>
      <PageHeader eyebrow="Account" title="My Profile" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-lg font-semibold text-primary">{(name || user.email || "U").slice(0, 2).toUpperCase()}</div>
          <div className="mt-4 text-lg font-medium">{name || "—"}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Member since</dt><dd>{fmtDate(user.created_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Movements validated</dt><dd className="num">{mine}</dd></div>
          </dl>
        </Panel>
        <Panel title="Details" className="lg:col-span-2">
          <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return toast.error("Name is required."); save.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Job title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={user.email ?? ""} disabled /></div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">Change password</Link>
              <Button type="submit" disabled={save.isPending}>Save changes</Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
