import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — StockSense" },
      { name: "description", content: "Choose a new password for your StockSense account." },
      { property: "og:title", content: "Set new password — StockSense" },
      { property: "og:description", content: "Choose a new password for your StockSense account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }
  return (
    <AuthLayout title="Set a new password" subtitle="Use at least 8 characters.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p">New password</Label>
          <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 bg-surface" />
        </div>
        <Button type="submit" className="h-10 w-full">Update password</Button>
      </form>
    </AuthLayout>
  );
}
