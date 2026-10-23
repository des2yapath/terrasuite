import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogIn, KeyRound } from "lucide-react";
import AuthLayout from "@/layout/AuthLayout";
import { useAuth } from "@/auth/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEMO_EMAIL = "demo@terrasuite.app";
const DEMO_PASSWORD = "terrasuite123";

const LoginPage = () => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email above, then click Forgot password.");
      return;
    }
    try {
      await resetPassword(email.trim());
      toast.success("Password reset email sent — check your inbox.");
    } catch {
      toast.error("Could not send reset email.");
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Access your parcels, analytics, and reports.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground underline"
              onClick={forgotPassword}>
              Forgot password?
            </button>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>

        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-4">
        No account? <Link to="/signup" className="text-primary hover:underline">Create one</Link>
      </p>

      {/* Evaluator convenience — keep for viva; remove before public deployment if desired */}
      <div className="mt-4 rounded-lg border border-border/60 bg-accent/10 p-2.5">
        <div className="text-[10px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
          <KeyRound className="w-3 h-3" />
          Demo account: <span className="font-mono">{DEMO_EMAIL}</span> / <span className="font-mono">{DEMO_PASSWORD}</span>
        </div>
        <button type="button" className="mt-1.5 text-[11px] text-primary hover:underline"
          onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); }}>
          Fill demo credentials
        </button>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
