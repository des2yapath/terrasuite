import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/auth/types";
import type { AuthContextValue, AuthUser } from "@/auth/types";

function toUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  return { id: u.id, email: u.email ?? "" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session restore (persistSession: true keeps it in localStorage)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(toUser(data.session));
      })
      .finally(() => setLoading(false));

    // Stay fresh across token refresh, sign-in in other tabs, sign-out
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name ?? null } }, // → profiles row via trigger (Module 02)
    });
    if (error) throw error;
    // If email confirmation is ON, Supabase returns no session — tell the page.
    return { needsEmailConfirm: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error; // page surfaces error.message ("Invalid login credentials")
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const value: AuthContextValue = { user, loading, signUp, signIn, signOut, resetPassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
