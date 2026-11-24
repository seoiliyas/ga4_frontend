const BASE = import.meta.env.DEV
  ? ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? 'http://localhost:8787')
  : ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? '');

export type AppMode = 'gtm' | 'ga4';

export interface ChatSession {
  id: string;
  title: string;
  mode: AppMode;
  ga4_property_id?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ChatAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  url: string;
  created_at?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  charts?: string[];
  attachments?: ChatAttachment[];
  id?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: 'sparkles' | 'zap' | 'cpu' | 'brain';
  badge?: string;
}

export function createChatApi(app: AppMode, getToken: () => string | null) {
  function authHeaders(includeJsonContentType = true): Record<string, string> {
    const headers: Record<string, string> = {
      'X-BrightHorizon-App': app,
    };
    if (includeJsonContentType) {
      headers['Content-Type'] = 'application/json';
    }
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: { ...authHeaders(), ...((opts?.headers as Record<string, string>) ?? {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data as any).error || `HTTP ${res.status}`);
      (err as any).code = (data as any).code;
      throw err;
    }
    return data as T;
  }

  function getApiOrigin(): string {
    if (BASE) {
      try {
        return new URL(BASE, window.location.origin).origin;
      } catch {
        return window.location.origin;
      }
    }
    return window.location.origin;
  }

  function isProtectedFileUrl(urlOrPath: string): boolean {
    if (!urlOrPath) return false;
    if (urlOrPath.startsWith('/api/files/')) return true;
    if (BASE && urlOrPath.startsWith(`${BASE}/api/files/`)) return true;
    return false;
  }

  function resolveFileEndpoint(urlOrId: string): string {
    if (urlOrId.startsWith('/api/files/')) return `${BASE}${urlOrId}`;
    if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) return urlOrId;
    return `${BASE}/api/files/${urlOrId}`;
  }

  return {
    getApiOrigin,
    isProtectedFileUrl,
    getToken,

    getSessions(): Promise<ChatSession[]> {
      return apiFetch(`/api/sessions?mode=${app}`);
    },

    createSession(id: string, title = 'New Chat', ga4PropertyId?: string | null): Promise<ChatSession> {
      const body: Record<string, unknown> = { id, title, mode: app };
      if (app === 'ga4' && ga4PropertyId) {
        body.ga4_property_id = ga4PropertyId;
      }
      return apiFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    renameSession(id: string, title: string): Promise<{ success: boolean }> {
      return apiFetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
    },

    deleteSession(id: string): Promise<{ success: boolean }> {
      return apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
    },

    getMessages(sessionId: string): Promise<ChatMessage[]> {
      return apiFetch(`/api/sessions/${sessionId}/messages`);
    },

    setSessionGa4Property(
      sessionId: string,
      propertyId: string | null,
    ): Promise<{ success: boolean; ga4_property_id: string | null }> {
      return apiFetch(`/api/sessions/${sessionId}/property`, {
        method: 'PUT',
        body: JSON.stringify({ ga4_property_id: propertyId }),
      });
    },

    getGa4OAuthStatus(): Promise<{ connected: boolean; email?: string | null }> {
      return apiFetch('/api/ga4/oauth/status');
    },

    getGa4OAuthUrl(): Promise<{ url: string }> {
      return apiFetch('/api/ga4/oauth/authorize?format=json');
    },

    disconnectGa4OAuth(): Promise<{ success: boolean }> {
      return apiFetch('/api/ga4/oauth/disconnect', { method: 'POST' });
    },

    getGa4Properties(): Promise<{
      properties: { account: string; accountName: string; propertyId: string; propertyName: string }[];
    }> {
      return apiFetch('/api/ga4/properties');
    },

    getModels(): Promise<{ gemini: ModelOption[] }> {
      return apiFetch('/api/models');
    },

    async uploadFiles(sessionId: string, files: File[]): Promise<{ files: ChatAttachment[] }> {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      for (const f of files) formData.append('files', f);

      // Don't set Content-Type — let fetch set multipart boundary
      const res = await fetch(`${BASE}/api/files/upload`, {
        method: 'POST',
        headers: authHeaders(false),
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || `Upload failed (${res.status})`);
      return data as { files: ChatAttachment[] };
    },

    getFileUrl(attachmentId: string): string {
      return `${BASE}/api/files/${attachmentId}`;
    },

    async fetchFileBlob(urlOrId: string): Promise<Blob> {
      const endpoint = resolveFileEndpoint(urlOrId);
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders(false),
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch file (${res.status})`);
      }
      return res.blob();
    },

    deleteFile(attachmentId: string): Promise<{ success: boolean }> {
      return apiFetch(`/api/files/${attachmentId}`, { method: 'DELETE' });
    },

    async sendMessageStream(
      sessionId: string,
      question: string,
      onChunk: (text: string) => void,
      chatModeOverride?: 'gtm' | 'ga4',
      model?: string,
      attachmentIds?: string[],
      signal?: AbortSignal,
    ): Promise<{ fullAnswer: string; charts?: string[] }> {
      const effectiveMode = chatModeOverride ?? app;
      const body: Record<string, unknown> = { sessionId, question, chatMode: effectiveMode };
      if (model) body.model = model;
      if (attachmentIds && attachmentIds.length) body.attachmentIds = attachmentIds;

      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error((data as any).error || `HTTP ${res.status}`);
        (err as any).code = (data as any).code;
        throw err;
      }

      // GA4 mode: non-streaming endpoint returns full JSON response (potentially with charts)
      if (effectiveMode === 'ga4') {
        const data = (await res.json()) as { answer: string; charts?: string[] };
        const fullAnswer = data.answer || '';
        const charts = data.charts || [];
        onChunk(fullAnswer);
        return { fullAnswer, charts };
      }

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') return { fullAnswer };

          let parsed: { error?: string; text?: string };
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            fullAnswer += parsed.text;
            onChunk(parsed.text);
          }
        }
      }
      return { fullAnswer };
    },
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
