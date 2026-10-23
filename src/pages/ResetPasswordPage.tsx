import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import AuthLayout from "@/layout/AuthLayout";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Landed here via the recovery-link email. The Supabace recovery session is
 * already active (link logs the user in with limited scope) — just set a new
 * password.
 */
const ResetPasswordPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!user) { setError("This page must be opened from the reset email link."); return; }

    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      toast.success("Password updated");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="You're signed in via the reset link. Choose a new password.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="password" className="text-xs text-muted-foreground">New password (min 8)</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>
        <div>
          <Label htmlFor="confirm" className="text-xs text-muted-foreground">Confirm new password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>

        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
