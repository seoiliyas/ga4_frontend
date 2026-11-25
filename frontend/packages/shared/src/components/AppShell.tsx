import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileJson, BarChart3, Loader2, Plus } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { Sidebar, BrightHorizonLogo, SidebarIcon, NewChatIcon } from './Sidebar';
import { Dashboard } from './Dashboard';
import { ModelSelector, DEFAULT_MODEL } from './ModelSelector';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider, useToast } from './Toast';
import { AuthPage } from './AuthPage';
import type { AuthApi } from '../services/authApi';
import type { AppMode, ChatApi, ChatSession } from '../services/chatApi';

interface AppShellProps {
  mode: AppMode;
  authApi: AuthApi;
  chatApi: ChatApi;
}

function AuthenticatedApp({ mode, authApi, chatApi }: AppShellProps) {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem(`bh_${mode}_selected_model`) || DEFAULT_MODEL;
  });

  const isGa4 = mode === 'ga4';
  const sessionStorageKey = `bh_${mode}_active_session`;
  const modelStorageKey = `bh_${mode}_selected_model`;

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await chatApi.getSessions();
      setSessions(data);
      const stored = localStorage.getItem(sessionStorageKey);
      if (stored && data.find((s) => s.id === stored)) {
        setActiveSessionId(stored);
      } else if (data.length > 0) {
        setActiveSessionId(data[0].id);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load chats', message: err?.message || 'Could not load sessions' });
    } finally {
      setIsLoadingSessions(false);
    }
  }, [chatApi, sessionStorageKey, addToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const activeSessionRef = useRef<ChatSession | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const handleNewChat = useCallback(async () => {
    const id = crypto.randomUUID();
    try {
      const inheritedPid = isGa4 ? activeSessionRef.current?.ga4_property_id || null : null;
      const created = await chatApi.createSession(id, 'New Chat', inheritedPid);
      setSessions((prev) => [created, ...prev]);
      setActiveSessionId(id);
      localStorage.setItem(sessionStorageKey, id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create chat', message: err?.message || 'Could not start session' });
    }
  }, [chatApi, isGa4, sessionStorageKey, addToast]);

  const handleSessionSelect = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      localStorage.setItem(sessionStorageKey, id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    },
    [sessionStorageKey],
  );

  const handleSessionRenamed = useCallback((id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title, updated_at: Date.now() } : s)));
  }, []);

  const handleSessionDeleted = useCallback(
    async (id: string) => {
      try {
        await chatApi.deleteSession(id);
        setSessions((prev) => {
          const remaining = prev.filter((s) => s.id !== id);
          if (id === activeSessionId) {
            const nextId = remaining[0]?.id ?? null;
            setActiveSessionId(nextId);
            if (nextId) localStorage.setItem(sessionStorageKey, nextId);
            else localStorage.removeItem(sessionStorageKey);
          }
          return remaining;
        });
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to delete chat', message: err?.message || 'Could not delete session' });
      }
    },
    [chatApi, activeSessionId, sessionStorageKey, addToast],
  );

  const handleGa4PropertySaved = useCallback(
    (pid: string) => {
      if (activeSessionId) {
        setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? { ...s, ga4_property_id: pid } : s)));
      }
    },
    [activeSessionId],
  );

  const Icon = isGa4 ? BarChart3 : FileJson;
  const appTitle = isGa4 ? 'BrightHorizon GA4' : 'BrightHorizon GTM';
  const modeLabel = isGa4 ? 'GA4 Analytics' : 'GTM Container';
  const emptyTagline = isGa4
    ? 'Inspect Google Analytics 4 properties, user trends, and event funnels.'
    : 'Audit Google Tag Manager containers, consent posture, and firing rules.';

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Bright Horizons 3px horizon accent bar */}
      <div className="h-[3px] w-full shrink-0 bh-horizon-strip" aria-hidden="true" />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={isSidebarOpen}
          mode={mode}
          onNewChat={handleNewChat}
          onSessionSelect={handleSessionSelect}
          onSessionRenamed={handleSessionRenamed}
          onSessionDeleted={handleSessionDeleted}
          chatApi={chatApi}
          authApi={authApi}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          user={user}
          onLogout={logout}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex items-center justify-between px-4 sm:px-5 h-14 bg-[var(--surface)] border-b border-[var(--border)] shadow-[0_1px_2px_rgba(20,38,50,0.03)] z-20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {!isSidebarOpen && (
                <div className="flex items-center gap-1 mr-1">
                  <BrightHorizonLogo mode={mode} className="w-7 h-7 mr-1.5 shrink-0" />
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--bh-nile)] rounded-[10px] transition-colors duration-150"
                    title="Expand Sidebar"
                    aria-label="Expand sidebar"
                  >
                    <SidebarIcon />
                  </button>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--bh-nile)] rounded-[10px] transition-colors duration-150"
                    title="New Chat"
                    aria-label="Start new chat"
                  >
                    <NewChatIcon />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-1 text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--bh-nile)] rounded-[10px] transition-colors duration-150"
                title="Open Menu"
                aria-label="Open navigation menu"
              >
                <SidebarIcon />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-[8px] bg-[var(--bh-nile)] text-white shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h1 className="text-sm sm:text-[15px] font-bold tracking-tight text-[var(--fg)] truncate">
                  {appTitle}
                </h1>
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-[0.02em] border shrink-0 ${
                    isGa4
                      ? 'bg-[var(--bh-buttercup-soft)] text-[#7D5B00] border-[var(--bh-buttercup-border)]'
                      : 'bg-[var(--bh-nile-soft)] text-[var(--bh-nile)] border-[#C6DCE5]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isGa4 ? 'bg-[var(--bh-buttercup)]' : 'bg-[var(--bh-cerulean)]'
                    }`}
                  />
                  {modeLabel}
                </span>
              </div>

              <div className="h-4 w-px bg-[var(--border)] mx-1 hidden sm:block shrink-0" aria-hidden="true" />

              <ModelSelector
                mode={mode}
                selectedModel={selectedModel}
                onModelChange={(m) => {
                  setSelectedModel(m);
                  localStorage.setItem(modelStorageKey, m);
                }}
                chatApi={chatApi}
              />
            </div>
          </header>

          <main className="flex-1 overflow-hidden flex flex-col">
            {isLoadingSessions ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3" role="status">
                <Loader2 className="w-7 h-7 animate-spin text-[var(--bh-nile)]" />
                <p className="text-xs font-semibold text-[var(--muted)]">Loading workspace…</p>
              </div>
            ) : activeSession ? (
              <Dashboard
                key={activeSession.id}
                sessionId={activeSession.id}
                mode={mode}
                ga4PropertyId={isGa4 ? activeSession.ga4_property_id || '' : ''}
                selectedModel={selectedModel}
                onFirstReply={handleSessionRenamed}
                onGa4PropertySaved={isGa4 ? handleGa4PropertySaved : undefined}
                chatApi={chatApi}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--elev-raised)]">
                  <BrightHorizonLogo mode={mode} className="w-11 h-11" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h2 className="text-2xl font-light text-[var(--fg)] tracking-tight">
                    Welcome to <strong className="font-extrabold text-[var(--bh-nile)]">{appTitle}</strong>
                  </h2>
                  <div className="w-12 h-1 bg-[var(--bh-buttercup)] mx-auto rounded-full" aria-hidden="true" />
                  <p className="text-sm text-[var(--muted)] leading-relaxed pt-1">{emptyTagline}</p>
                </div>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-bold text-sm bg-[var(--bh-buttercup)] hover:bg-[var(--bh-buttercup-hover)] text-[var(--bh-nile-deep)] shadow-[0_3px_12px_rgba(240,189,27,0.28)] transition-all duration-150 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  New Chat
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function AppRouter(props: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-[var(--bg)]" role="status">
        <BrightHorizonLogo mode={props.mode} className="w-10 h-10" />
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--bh-nile)]" />
          <span>Loading BrightHorizon…</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <AuthPage mode={props.mode} />;
  return <AuthenticatedApp {...props} />;
}

export function AppShell(props: AppShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider authApi={props.authApi}>
        <ToastProvider>
          <AppRouter {...props} />
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
