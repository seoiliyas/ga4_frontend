import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { 
  Sidebar, 
  BrightHorizonLogo, 
  SidebarIcon, 
  NewChatIcon,
  Dashboard,
  AuthProvider,
  useAuth,
  createAuthApi,
  createChatApi,
  ToastProvider
} from '@brighthorizon/shared';
import { AuthPage } from './AuthPage';

const authApi = createAuthApi('ga4');
const chatApi = createChatApi('ga4', authApi.getToken);

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await chatApi.getSessions();
      setSessions(data);
      const stored = localStorage.getItem('bh_ga4_active_session');
      if (stored && data.find((s: any) => s.id === stored)) {
        setActiveSessionId(stored);
      } else if (data.length > 0) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeSessionRef = useRef<{ ga4_property_id?: string | null } | null>(null);
  
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const handleNewChat = useCallback(async () => {
    const id = crypto.randomUUID();
    try {
      let inheritedPid = null;
      const current = activeSessionRef.current;
      if (current) inheritedPid = current.ga4_property_id || null;
      
      await chatApi.createSession(id, 'New Chat', inheritedPid);
      const newSession = { 
        id, 
        title: 'New Chat', 
        mode: 'ga4', 
        ga4_property_id: inheritedPid, 
        created_at: Date.now(), 
        updated_at: Date.now() 
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(id);
      localStorage.setItem('bh_ga4_active_session', id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, []);

  const handleSessionSelect = (id: string) => {
    setActiveSessionId(id);
    localStorage.setItem('bh_ga4_active_session', id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSessionRenamed = (id: string, title: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title, updated_at: Date.now() } : s));
  };

  const handleSessionDeleted = async (id: string) => {
    try {
      await chatApi.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (id === activeSessionId) setActiveSessionId(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleGa4PropertySaved = (pid: string) => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ga4_property_id: pid } : s));
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#f0f4f8' }}>
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 z-20 shrink-0">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <div className="flex items-center gap-0.5">
              <div className="mr-3">
                <BrightHorizonLogo mode="ga4" />
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
              <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #e8710a, #f58634)' }}>
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-semibold text-[#1a2a3a]">BrightHorizon GA4 AI Chat</h1>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={isSidebarOpen}
          mode="ga4"
          onNewChat={handleNewChat}
          onSessionSelect={handleSessionSelect}
          onSessionRenamed={handleSessionRenamed}
          onSessionDeleted={handleSessionDeleted}
          chatApi={chatApi}
          authApi={authApi}
          onToggle={() => setIsSidebarOpen(prev => !prev)}
          user={user}
          onLogout={logout}
        />
        <main className="flex-1 overflow-hidden flex flex-col">
          {isLoadingSessions ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#e8710a]" />
            </div>
          ) : activeSession ? (
            <Dashboard
              key={activeSession.id}
              sessionId={activeSession.id}
              mode="ga4"
              ga4PropertyId={activeSession.ga4_property_id || ''}
              onFirstReply={(id, title) => handleSessionRenamed(id, title)}
              onGa4PropertySaved={handleGa4PropertySaved}
              chatApi={chatApi}
            />
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <div className="p-5 rounded-3xl bg-[#fcf2e8] border border-[#f5e0cc]">
                  <BarChart3 className="w-12 h-12 text-[#e8710a]" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-[#1a2a3a]">Welcome to BrightHorizon GA4 AI Chat</p>
                  <p className="text-sm text-gray-500">Analyze your Google Analytics data with AI.</p>
                </div>
                <button onClick={handleNewChat} className="px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-[#e8710a] shadow-lg shadow-orange-900/20">
                  + New Chat
                </button>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider authApi={authApi}>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <AuthPage />;
  return <AuthenticatedApp />;
}
