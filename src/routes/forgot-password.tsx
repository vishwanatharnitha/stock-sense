import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — StockSense" },
      { name: "description", content: "Reset your StockSense password with a one-time code." },
      { property: "og:title", content: "Reset password — StockSense" },
      { property: "og:description", content: "Recover access to your StockSense workspace." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("We sent a verification code and reset link to your email.");
    setStep("otp");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
      if (error) throw error;
      const { error: e2 } = await supabase.auth.updateUser({ password });
      if (e2) throw e2;
      toast.success("Password updated.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={step === "email" ? "Reset your password" : "Enter verification code"}
      subtitle={step === "email" ? "We'll email you a one-time code." : `Code sent to ${email}. You can also use the link in the email.`}
      footer={<Link to="/auth" className="hover:text-primary">← Back to sign in</Link>}
    >
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 bg-surface" />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-5">
          <div className="space-y-2">
            <Label>6-digit code</Label>
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-11 w-11 bg-surface" />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 bg-surface" />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={busy || code.length < 6}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Verify & update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
