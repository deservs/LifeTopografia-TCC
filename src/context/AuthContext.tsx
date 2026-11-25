import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/supabaseClient";
import {
  normalizeAccountRole,
  normalizeProfileStatus,
  type UserProfile,
} from "../types/auth.types";
import { getAvatarPublicUrl } from "../utils/users/urlConversor";
import { AuthContext, type AuthStatus } from "../hook/useAuth";

const LEGACY_PROFILE_STORAGE_KEY = "userProfile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isPasswordRecovery, setPasswordRecovery] = useState(false);

  const mountedRef = useRef(true);
  const sessionRef = useRef<Session | null>(null);
  const authEpochRef = useRef(0);
  const inFlightProfileRef = useRef<{
    userId: string;
    promise: Promise<UserProfile | null>;
  } | null>(null);

  const loadProfile = useCallback(
    async (sessionUser: User, force = false): Promise<UserProfile | null> => {
      if (!force && inFlightProfileRef.current?.userId === sessionUser.id) {
        return inFlightProfileRef.current.promise;
      }

      const promise = (async (): Promise<UserProfile | null> => {
        try {
          const { data, error } = await supabase
            .from("perfis")
            .select(
              "id, nome_ou_razao, tipo_perfil, foto_url, status, cnpj, email",
            )
            .eq("id", sessionUser.id)
            .single();

          if (error || !data) {
            console.error("Erro ao carregar perfil autenticado:", error);
            return null;
          }

          return {
            id: data.id,
            email: data.email ?? sessionUser.email ?? "",
            name: data.nome_ou_razao ?? "",
            role: normalizeAccountRole(data.tipo_perfil, data.cnpj),
            status: normalizeProfileStatus(data.status),
            cnpj: data.cnpj ?? undefined,
            avatarUrl: getAvatarPublicUrl(data.foto_url),
          };
        } finally {
          if (inFlightProfileRef.current?.userId === sessionUser.id) {
            inFlightProfileRef.current = null;
          }
        }
      })();

      inFlightProfileRef.current = { userId: sessionUser.id, promise };
      return promise;
    },
    [],
  );

  const syncSession = useCallback(
    async (nextSession: Session | null, forceProfile = false) => {
      const currentEpoch = ++authEpochRef.current;
      sessionRef.current = nextSession;

      if (!mountedRef.current) return;

      if (!nextSession?.user) {
        inFlightProfileRef.current = null;
        setSession(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      setSession(nextSession);

      const loadedProfile = await loadProfile(nextSession.user, forceProfile);
      if (!mountedRef.current || authEpochRef.current !== currentEpoch) {
        return;
      }

      if (!loadedProfile) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      setUser(loadedProfile);
      setStatus("authenticated");
    },
    [loadProfile],
  );

  useEffect(() => {
    mountedRef.current = true;
    localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mountedRef.current) return;
        if (error) {
          console.error("Erro ao verificar sessão inicial:", error);
          void syncSession(null);
          return;
        }
        void syncSession(data.session);
      })
      .catch((error) => {
        console.error("Erro inesperado ao obter sessão:", error);
        if (mountedRef.current) {
          void syncSession(null);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
      }

      window.setTimeout(() => {
        if (mountedRef.current) {
          void syncSession(nextSession, event === "USER_UPDATED");
        }
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const activeSession =
      sessionRef.current ?? (await supabase.auth.getSession()).data.session;

    if (!activeSession?.user) {
      await syncSession(null);
      return null;
    }

    const loadedProfile = await loadProfile(activeSession.user, true);
    if (!mountedRef.current) return loadedProfile;

    if (!loadedProfile) {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }

    setSession(activeSession);
    setUser(loadedProfile);
    setStatus("authenticated");
    return loadedProfile;
  }, [loadProfile, syncSession]);

  const signOut = useCallback(
    async (scope: "local" | "global" = "local") => {
      const { error } = await supabase.auth.signOut({ scope });
      if (error) {
        throw new Error(error.message);
      }
      setPasswordRecovery(false);
      await syncSession(null);
    },
    [syncSession],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        status,
        isPasswordRecovery,
        setPasswordRecovery,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
