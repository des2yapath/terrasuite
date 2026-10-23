import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/layout/AuthLayout";
import { useAuth } from "@/auth/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SignupPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNotice, setConfirmNotice] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password || !name.trim()) { setError("All fields are required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setBusy(true);
    try {
      const { needsEmailConfirm } = await signUp(email.trim(), password, name.trim());
      if (needsEmailConfirm) {
        setConfirmNotice(true); // page now shows "check your email" state
      } else {
        navigate("/", { replace: true }); // auto-session — straight in
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  };

  if (confirmNotice) {
    return (
      <AuthLayout title="Confirm your email" subtitle="One step left.">
        <div className="space-y-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.
            Click it, then sign in.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Your parcels and reports are tied to this account.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
          <Input id="name" autoComplete="name" placeholder="Your name"
            value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>
        <div>
          <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>
        <div>
          <Label htmlFor="password" className="text-xs text-muted-foreground">Password (min 8)</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>
        <div>
          <Label htmlFor="confirm" className="text-xs text-muted-foreground">Confirm password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 bg-secondary/50" />
        </div>

        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Already registered? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default SignupPage;
