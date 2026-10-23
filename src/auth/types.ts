import { createContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
}

export type SignUpResult = {
  /** true when Supabase is in "confirm email" mode and no session was created */
  needsEmailConfirm: boolean;
};

export interface AuthContextValue {
  user: AuthUser | null;
  /** true until the initial getSession() resolves — gate UI on this, not on user */
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
