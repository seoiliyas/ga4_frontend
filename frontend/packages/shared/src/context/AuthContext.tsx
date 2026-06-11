import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../services/authApi';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string, inviteKey: string) => Promise<void>;
  bootstrap: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

interface AuthProviderProps {
  children: React.ReactNode;
  authApi: any; // Factory created authApi
}

export function AuthProvider({ children, authApi }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check existing token on mount
  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then(({ user }: { user: AuthUser }) => setUser(user))
      .catch(() => {
        authApi.clearToken(); // token is invalid/expired
      })
      .finally(() => setIsLoading(false));
  }, [authApi]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    authApi.setToken(token);
    setUser(user);
  }, [authApi]);

  const signup = useCallback(
    async (username: string, email: string, password: string, inviteKey: string) => {
      const { token, user } = await authApi.signup(username, email, password, inviteKey);
      authApi.setToken(token);
      setUser(user);
    },
    [authApi],
  );

  const bootstrap = useCallback(
    async (username: string, email: string, password: string) => {
      const { token, user } = await authApi.bootstrap(username, email, password);
      authApi.setToken(token);
      setUser(user);
    },
    [authApi],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* best-effort */
    }
    authApi.clearToken();
    setUser(null);
  }, [authApi]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        bootstrap,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
