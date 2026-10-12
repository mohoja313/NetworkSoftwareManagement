import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getStoredUser, getToken, clearAuth, setAuth } from './api';

export interface SessionUser {
  email: string;
  displayName: string;
  isAdmin?: boolean;
  role?: string;
}

interface AuthCtx {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, email: string, displayName: string, extra?: { isAdmin?: boolean; role?: string }) => void;
  logout: () => void;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<SessionUser | null>(() => getStoredUser());
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const onStorage = () => {
      setToken(getToken());
      setUser(getStoredUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSession = useCallback(
    (tok: string, email: string, displayName: string, extra?: { isAdmin?: boolean; role?: string }) => {
      setAuth(tok, email, displayName, extra);
      setToken(tok);
      setUser({ email, displayName, ...extra });
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ token, user, setSession, logout, authOpen, setAuthOpen }), [token, user, setSession, logout, authOpen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
