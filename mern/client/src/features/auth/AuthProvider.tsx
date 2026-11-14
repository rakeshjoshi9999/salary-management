import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { Outlet } from 'react-router';

import { api, refreshAccessToken, settledRefresh } from '../../lib/api';
import { onSessionExpired } from '../../lib/session';
import { setAccessToken } from '../../lib/token';

export type Role = 'HR_MANAGER' | 'VIEWER';
export interface User {
  id: string;
  role: Role;
}

/** `unknown` only while the session is being restored at start-up; routes never see it (M4-5). */
type Status = 'unknown' | 'authenticated' | 'anonymous';

interface State {
  status: Status;
  user: User | null;
  /** The last session ended because the refresh was refused, not by signing out (M4-7). */
  expired: boolean;
}

type Action = { type: 'signedIn'; user: User } | { type: 'signedOut' } | { type: 'expired' };

/** A pure function of (state, action): the same shape as an NgRx reducer, kept inside one provider. */
function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'signedIn':
      return { status: 'authenticated', user: action.user, expired: false };
    case 'signedOut':
      return { status: 'anonymous', user: null, expired: false };
    case 'expired':
      return { status: 'anonymous', user: null, expired: true };
  }
}

export interface AuthValue extends State {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** `inject(AuthService)` for React. Throws outside the provider, as Angular's NullInjectorError would. */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { status: 'unknown', user: null, expired: false });
  const queryClient = useQueryClient();

  // Restore at start-up: the refresh cookie may still be valid though the in-memory token is gone.
  // StrictMode runs this twice in development; both runs share one refresh (single-flight), and only
  // the run that is still mounted may dispatch.
  useEffect(() => {
    let active = true;
    refreshAccessToken()
      .then(() => (active ? api<User>('/auth/me') : null))
      .then((user) => {
        if (active && user) dispatch({ type: 'signedIn', user });
      })
      .catch(() => {
        if (!active) return;
        setAccessToken(null);
        dispatch({ type: 'signedOut' });
      });
    return () => {
      active = false;
    };
  }, []);

  // The fetch wrapper cannot reach React; it announces a refused refresh and the provider reacts.
  // Returning the unsubscribe makes it the effect's cleanup (ngOnDestroy).
  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear(); // no cached data survives the session that loaded it
        dispatch({ type: 'expired' });
      }),
    [queryClient],
  );

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await api<{ accessToken: string }>(
      '/auth/login',
      json({ email, password }),
    );
    setAccessToken(accessToken);
    try {
      const user = await api<User>('/auth/me');
      dispatch({ type: 'signedIn', user });
    } catch (error) {
      setAccessToken(null); // no token may outlive a sign-in that did not finish
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await settledRefresh(); // a refresh already running finishes first...
    // ...and none can start: with no token, a 401 is never TOKEN_EXPIRED. /auth/logout needs only the cookie.
    setAccessToken(null);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Leaving anyway: the local session ends even if the server could not be told.
    }
    queryClient.clear();
    dispatch({ type: 'signedOut' });
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);

  if (state.status === 'unknown') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p role="status" className="text-slate-600">
          Loading…
        </p>
      </div>
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The root route: every page renders inside the auth provider. */
export function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
