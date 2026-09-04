import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import type { AuthUser } from '@/data/records';

/**
 * Who is signed in, for the whole client.
 *
 * The session itself is an httpOnly cookie the browser sends on its own — this
 * holds only what the app needs to *render*: her name, her role, her stage.
 * The token is deliberately unreachable from JavaScript, so there is nothing
 * here for an XSS bug to steal.
 */

interface Ctx {
  user: AuthUser | null;
  /** null while the first session check is still in flight */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    api.getSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refresh }),
    [user, loading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * Wraps a route that needs an account.
 *
 * Renders nothing at all while the session is being checked. Showing the page
 * first and redirecting after would flash somebody else's dashboard shape at a
 * signed-out visitor, and on a slow connection that flash is long enough to
 * read.
 *
 * `from` is carried through so signing in returns her to what she was
 * actually trying to open.
 */
export function RequireAuth({
  children, role,
}: {
  children: ReactNode;
  role?: AuthUser['role'] | AuthUser['role'][];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
}
