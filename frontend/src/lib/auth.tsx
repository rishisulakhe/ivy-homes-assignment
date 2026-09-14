import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  api,
  clearTokens,
  loadTokens,
  login as apiLogin,
  refreshTokens,
  setAuthLostHandler,
  type Tokens,
} from "./api";

type Me = { email: string; city: string; assigned_locality?: string | undefined };

type AuthValue = {
  ready: boolean;
  email: string | null;
  me: Me | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyTokens = useCallback((t: Tokens | null) => {
    setEmail(t?.email ?? null);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const data = await api<{ user: { email: string }; city: string; assigned_locality?: string }>(
        "/v1/me",
      );
      setMe({ email: data.user.email, city: data.city, assigned_locality: data.assigned_locality });
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    setAuthLostHandler(() => {
      setEmail(null);
      setMe(null);
    });
    const t = loadTokens();
    applyTokens(t);
    setReady(true);
    if (t) void fetchMe();
    return () => setAuthLostHandler(null);
  }, [applyTokens, fetchMe]);

  // Silent background refresh: check every minute, refresh at ~12 min of a 15 min token.
  useEffect(() => {
    if (!email) return;
    const tick = async () => {
      const t = loadTokens();
      if (!t) return;
      if (Date.now() > t.expires_at - 3 * 60 * 1000) {
        try {
          const fresh = await refreshTokens();
          applyTokens(fresh);
        } catch {
          /* handled by auth-lost */
        }
      }
    };
    void tick();
    timer.current = setInterval(tick, 60 * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [email, applyTokens]);

  const signIn = useCallback(
    async (e: string, password: string) => {
      const t = await apiLogin(e, password);
      applyTokens(t);
      await fetchMe();
    },
    [applyTokens, fetchMe],
  );

  const signOut = useCallback(() => {
    clearTokens();
    setEmail(null);
    setMe(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ ready, email, me, signIn, signOut }),
    [ready, email, me, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
