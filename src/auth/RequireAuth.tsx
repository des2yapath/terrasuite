import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Loader2, Leaf } from "lucide-react";

/**
 * Route guard. NOTE (report-worthy): this is a UX gate, not the security
 * boundary. Real authorization is Row Level Security (Module 02) and
 * JWT verification on edge functions (Module 15).
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-surface-outer flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-border flex items-center justify-center">
          <Leaf className="w-7 h-7 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Restoring your session…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
