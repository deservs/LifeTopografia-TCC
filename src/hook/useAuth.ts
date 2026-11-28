import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "../types/auth.types";
import {} from "react";
import { useContext, createContext } from "react";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  status: AuthStatus;
  isPasswordRecovery: boolean;
  setPasswordRecovery: (active: boolean) => void;
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: (scope?: "local" | "global") => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider.");
  }
  return context;
}
