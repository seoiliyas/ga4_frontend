import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileJson, BarChart3, Loader2 } from 'lucide-react';
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
  const appTitle = isGa4 ? 'BrightHorizon GA4 AI Chat' : 'BrightHorizon GTM AI Chat';
  const emptyTagline = isGa4 ? 'Analyze your Google Analytics data with AI.' : 'Analyze your GTM containers with AI.';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#f0f4f8' }}>
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 z-20 shrink-0">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <div className="flex items-center gap-0.5">
              <div className="mr-3">
                <BrightHorizonLogo mode={mode} />
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl transition-all duration-200"
                title="Expand Sidebar"
              >
                <SidebarIcon />
              </button>
              <button
                onClick={handleNewChat}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl transition-all duration-200"
                title="New Chat"
              >
                <NewChatIcon />
              </button>
            </div>
          )}
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  background: isGa4
                    ? 'linear-gradient(135deg, #e8710a, #f58634)'
                    : 'linear-gradient(135deg, #1a3a5c, #1e4d7b)',
                }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-semibold text-[#1a2a3a]">{appTitle}</h1>
            </div>
          )}
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
        <main className="flex-1 overflow-hidden flex flex-col">
          {isLoadingSessions ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className={`w-8 h-8 animate-spin ${isGa4 ? 'text-[#e8710a]' : 'text-[#1a3a5c]'}`} />
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
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div
                className={`p-5 rounded-3xl border ${
                  isGa4 ? 'bg-[#fcf2e8] border-[#f5e0cc]' : 'bg-[#e8eef4] border-[#dce4ec]'
                }`}
              >
                <Icon className={`w-12 h-12 ${isGa4 ? 'text-[#e8710a]' : 'text-[#1a3a5c]'}`} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg text-[#1a2a3a]">Welcome to {appTitle}</p>
                <p className="text-sm text-gray-500">{emptyTagline}</p>
              </div>
              <button
                onClick={handleNewChat}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg ${
                  isGa4 ? 'bg-[#e8710a] shadow-orange-900/20' : 'bg-[#1a3a5c] shadow-blue-900/20'
                }`}
              >
                + New Chat
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AppRouter(props: AppShellProps) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <AuthPage mode={props.mode} />;
  return <AuthenticatedApp {...props} />;
}

export function AppShell(props: AppShellProps) {
  return (
    <AuthProvider authApi={props.authApi}>
      <ToastProvider>
        <AppRouter {...props} />
      </ToastProvider>
    </AuthProvider>
  );
}
