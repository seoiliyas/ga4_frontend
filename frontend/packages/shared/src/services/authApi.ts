const BASE = import.meta.env.DEV
  ? ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? 'http://localhost:8787')
  : ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? '');

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  app: 'gtm' | 'ga4';
  created_at: number;
}

export interface InviteKey {
  invite_key: string;
  created_by: string;
  used_by: string | null;
  used_at: number | null;
  created_at: number;
}

export function createAuthApi(app: 'gtm' | 'ga4') {
  const TOKEN_KEY = `bh_${app}_token`;

  function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function authFetch<T>(
    path: string,
    opts?: RequestInit,
    includeAuth = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BrightHorizon-App': app,
      ...(opts?.headers as Record<string, string> ?? {}),
    };

    if (includeAuth) {
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error((data as any).error || `HTTP ${res.status}`);
    }

    return data as T;
  }

  return {
    getToken,
    setToken,
    clearToken,
    
    bootstrap(username: string, email: string, password: string) {
      return authFetch<{ token: string; user: AuthUser }>('/api/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, app }),
      });
    },

    signup(username: string, email: string, password: string, inviteKey: string) {
      return authFetch<{ token: string; user: AuthUser }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, inviteKey, app }),
      });
    },

    login(email: string, password: string) {
      return authFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, app }),
      });
    },

    logout() {
      return authFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }, true);
    },

    getMe() {
      return authFetch<{ user: AuthUser }>('/api/auth/me', { method: 'GET' }, true);
    },

    generateInviteKey() {
      return authFetch<{ invite_key: string }>('/api/auth/invite', { method: 'POST' }, true);
    },

    getInviteKeys() {
      return authFetch<InviteKey[]>('/api/auth/invite-keys', { method: 'GET' }, true);
    },
  };
}
