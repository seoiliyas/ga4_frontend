import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { MessageSquare, Send, Loader2, Settings, Copy } from 'lucide-react';
import { ChatOutline } from './ChatOutline';
import { BrightHorizonLogo } from './Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { ChatMessage, AppMode } from '../services/chatApi';
import Ga4Settings from './Ga4Settings';
import { useToast } from './Toast';

// Phase 3: Lazy-load react-markdown (external heavy dep)
const Markdown = lazy(() => import('react-markdown'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function buildAutoTitle(text: string): string {
  const cleaned = text.trim().replace(/\n+/g, ' ');
  return cleaned.length > 46 ? `${cleaned.slice(0, 43)}…` : cleaned;
}

// Sanitize markdown content to prevent XSS
function sanitizeMarkdown(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

interface Props {
  sessionId: string;
  mode: AppMode;
  ga4PropertyId: string;
  onFirstReply?: (sessionId: string, title: string) => void;
  onGa4PropertySaved?: (propertyId: string) => void;
  chatApi: any; // Injected
}

const GTM_SUGGESTIONS = [
  'What containers do I have access to?',
  'List all tags in my default workspace',
  'Show me all triggers that fire on pageview',
];

const GA4_SUGGESTIONS = [
  'What are my top 10 events in the last 30 days?',
  'Show me daily active users for the past week',
  'What channels are driving the most sessions?',
];

export function Dashboard({ sessionId, mode, ga4PropertyId, onFirstReply, onGa4PropertySaved, chatApi }: Props) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPid, setSettingsPid] = useState(ga4PropertyId);
  const [isSavingPid, setIsSavingPid] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{ connected: boolean; email?: string | null }>({ connected: false });
  const [properties, setProperties] = useState<{ propertyId: string; propertyName: string; accountName: string }[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNewSessionRef = useRef(false);
  const hasAutoTitledRef = useRef(false);
  const { addToast } = useToast();

  const checkOauthStatus = useCallback(async () => {
    if (mode === 'ga4') {
      try {
        const status = await chatApi.getGa4OAuthStatus();
        setOauthStatus(status);
        if (status.connected) {
          setIsLoadingProps(true);
          const propsRes = await chatApi.getGa4Properties();
          setProperties(propsRes.properties);
        } else {
          setProperties([]);
        }
      } catch (err) {
        console.error('Failed to fetch OAuth status', err);
      } finally {
        setIsLoadingProps(false);
      }
    }
  }, [mode, chatApi]);

  useEffect(() => {
    checkOauthStatus();
  }, [checkOauthStatus]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ga4_oauth_success') {
        checkOauthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkOauthStatus]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingMsgs(true);
    setLoadError(null);
    setShowSettings(false);

    chatApi
      .getMessages(sessionId)
      .then((msgs: ChatMessage[]) => {
        if (cancelled) return;
        const withIds = msgs.map((m: ChatMessage, i: number) => ({ ...m, id: m.id ?? `msg-${i}` }));
        setChatMessages(withIds);
        isNewSessionRef.current = msgs.length === 0;
      })
      .catch((err: any) => {
        if (!cancelled) setLoadError(err.message || 'Failed to load messages');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMsgs(false);
      });

    return () => { cancelled = true; };
  }, [sessionId, chatApi]);

  useEffect(() => {
    setSettingsPid(ga4PropertyId);
  }, [ga4PropertyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSendingChat, isStreaming]);

  // IntersectionObserver: track which user message is in view
  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .map(e => e.target.getAttribute('data-msg-id'))
          .filter(Boolean) as string[];
        if (visible.length > 0) {
          setActiveMessageId(visible[0]);
        }
      },
      { root: container, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );

    messageRefs.current.forEach((el, id) => { if (el) observer.observe(el); });

    return () => observer.disconnect();
  }, [chatMessages]);

  const handleJumpToMessage = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveMessageId(id);
    }
  }, []);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || isSendingChat) return;

    const question = chatInput.trim();

    setChatInput('');
    const userMsgId = `msg-${Date.now()}-u`;
    setChatMessages(prev => [...prev, { role: 'user', text: question, id: userMsgId }]);
    setIsSendingChat(true);
    setIsStreaming(true);

    const modelMsgId = `msg-${Date.now()}-m`;
    setChatMessages(prev => [...prev, { role: 'model', text: '', id: modelMsgId }]);

    const effectiveChatMode = mode;

    try {
      const { charts } = await chatApi.sendMessageStream(
        sessionId,
        question,
        (chunk: string) => {
          setChatMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + chunk,
              };
            }
            return updated;
          });
        },
        effectiveChatMode,
      );

      if (charts && charts.length > 0) {
        setChatMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'model') {
            updated[updated.length - 1] = { ...lastMsg, charts };
          }
          return updated;
        });
      }

      if (isNewSessionRef.current && !hasAutoTitledRef.current && onFirstReply) {
        hasAutoTitledRef.current = true;
        const title = buildAutoTitle(question);
        chatApi
          .renameSession(sessionId, title)
          .then(() => onFirstReply(sessionId, title))
          .catch(() => { });
      }
    } catch (err: any) {
      setChatMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'model') {
          updated[updated.length - 1] = {
            ...lastMsg,
            text: `**Error:** ${err.message || 'Failed to get response'}`,
          };
        } else {
          updated.push({
            role: 'model',
            text: `**Error:** ${err.message || 'Failed to get response'}`,
          });
        }
        return updated;
      });
    } finally {
      setIsSendingChat(false);
      setIsStreaming(false);
    }
  }, [chatInput, isSendingChat, sessionId, onFirstReply, chatApi, mode]);

  const handleSavePropertyId = async () => {
    if (!settingsPid.trim()) return;
    setIsSavingPid(true);
    try {
      await chatApi.setSessionGa4Property(sessionId, settingsPid.trim());
      onGa4PropertySaved?.(settingsPid.trim());
      setShowSettings(false);
      addToast({ type: 'success', title: 'Property saved', message: `GA4 property ${settingsPid.trim()} has been saved.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to save', message: err.message || 'Failed to save property' });
    } finally {
      setIsSavingPid(false);
    }
  };

  const handleConnectGA4 = () => {
    const workerUrl = import.meta.env.DEV
      ? ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? 'http://localhost:8787')
      : ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? '');
    const authUrl = `${workerUrl}/api/ga4/oauth/authorize`;
    const token = chatApi.getToken();
    window.open(`${authUrl}?token=${token}`, 'ga4_oauth', 'width=500,height=600');
  };

  const handleDisconnectGA4 = async () => {
    try {
      await chatApi.disconnectGa4OAuth();
      setOauthStatus({ connected: false });
      setProperties([]);
      onGa4PropertySaved?.('');
      addToast({ type: 'success', title: 'Disconnected', message: 'GA4 account has been disconnected.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to disconnect', message: err.message || 'Failed to disconnect GA4 account' });
    }
  };


  const suggestions = mode === 'ga4' ? GA4_SUGGESTIONS : GTM_SUGGESTIONS;
  const expertName = mode === 'ga4' ? 'GA4 Expert AI' : 'GTM Expert AI';
  const placeholder = mode === 'ga4'
    ? 'Ask about your GA4 data…'
    : 'Ask about your GTM container…';
  const subtitle = mode === 'ga4'
    ? 'Ask questions about your Google Analytics events, users, and reports.'
    : 'Ask questions about your GTM container tags, triggers, and variables.';

  if (isLoadingMsgs) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: mode === 'ga4' ? '#e8710a' : '#1a3a5c' }} />
          <span className="text-sm" style={{ color: '#6b7d8e' }}>Loading conversation…</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        <p className="text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
          Warning: {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {mode === 'ga4' && (
        <div className="px-4 sm:px-6 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: '#1a2a3a' }}>Chat with {expertName}</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ga4PropertyId ? `Property: ${ga4PropertyId}` : 'Set Property'}</span>
            </button>
          </div>
        </div>
      )}

      {showSettings && mode === 'ga4' && (
        <Ga4Settings
          onClose={() => setShowSettings(false)}
          oauthStatus={oauthStatus}
          handleDisconnectGA4={handleDisconnectGA4}
          handleConnectGA4={handleConnectGA4}
          isLoadingProps={isLoadingProps}
          settingsPid={settingsPid}
          setSettingsPid={setSettingsPid}
          properties={properties}
          handleSavePropertyId={handleSavePropertyId}
          isSavingPid={isSavingPid}
          ga4PropertyId={ga4PropertyId}
        />
      )}

      <div className="flex-1 flex overflow-hidden" style={{ position: 'relative' }}>
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 bg-gray-50/50">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 opacity-40 animate-fade-in">
            <div className="p-6 rounded-[2.5rem] bg-gray-100/50 border border-gray-200/50 shadow-inner">
               <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-gray-500">How can I help you today?</p>
              <p className="text-xs text-gray-400">Select a suggestion below or type your own question.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl px-4 mt-4">
              <AnimatePresence>
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => { setChatInput(s); }}
                    className="p-3 text-left text-[11px] font-medium bg-white border border-gray-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50/30 transition-all shadow-sm active:scale-95"
                  >
                    {s}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {chatMessages.map((msg, idx) => (
              <motion.div
                key={msg.id ?? idx}
                ref={(el: any) => { if (el) messageRefs.current.set(msg.id!, el); else messageRefs.current.delete(msg.id!); }}
                data-msg-id={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 260,
                  damping: 25,
                  layout: { duration: 0.2 }
                }}
                layout="position"
                className={cn('flex w-full mb-2', msg.role === 'user' ? 'justify-end' : 'justify-start gap-3')}
              >
                {msg.role === 'model' && (
                  <div className="shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm">
                      <BrightHorizonLogo className="w-5 h-5" mode={mode} />
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[90%] md:max-w-[80%] rounded-[1.5rem] px-5 py-4 shadow-sm relative overflow-hidden',
                    msg.role === 'user' ? 'text-white' : 'bg-white border border-gray-100 text-gray-900',
                  )}
                  style={
                    msg.role === 'user'
                      ? { background: mode === 'ga4' ? 'linear-gradient(135deg, #e8710a, #f58634)' : 'linear-gradient(135deg, #1a3a5c, #1e4d7b)' }
                      : {}
                  }
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-gray-800 prose-strong:text-gray-800"
                    >
                      <Suspense fallback={<div className="h-10 animate-pulse bg-gray-100 rounded" />}>
                        <Markdown 
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            table: ({node, ...props}: any) => (
                              <div className="relative group/table my-6">
                                <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm bg-white">
                                  <table {...props} className="w-full text-xs border-collapse" />
                                </div>
                                <button 
                                  onClick={(e) => {
                                    const table = (e.currentTarget.previousSibling as HTMLElement).querySelector('table');
                                    if (table) {
                                      const text = Array.from(table.rows).map(row => 
                                        Array.from(row.cells).map(cell => (cell as HTMLElement).innerText).join('\t')
                                      ).join('\n');
                                      navigator.clipboard.writeText(text);
                                      const btn = e.currentTarget;
                                      const originalContent = btn.innerHTML;
                                      btn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                      setTimeout(() => btn.innerHTML = originalContent, 2000);
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur border border-gray-100 rounded-lg shadow-sm opacity-0 group-hover/table:opacity-100 transition-opacity hover:bg-white text-gray-400 hover:text-gray-600"
                                  title="Copy table to clipboard"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ),
                            thead: ({node, ...props}: any) => (
                              <thead {...props} className="bg-gray-50/80 border-b border-gray-100" />
                            ),
                            th: ({node, ...props}: any) => (
                              <th {...props} className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap" />
                            ),
                            td: ({node, ...props}: any) => (
                              <td {...props} className="px-4 py-3 border-b border-gray-50 text-gray-700 font-medium" />
                            ),
                            tr: ({node, ...props}: any) => (
                              <tr {...props} className="hover:bg-gray-50/50 transition-colors" />
                            ),
                            img: ({node, ...props}: any) => (
                              <figure className="my-6">
                                <img {...props} className="rounded-xl border border-gray-100 shadow-sm max-w-full h-auto" loading="lazy" />
                                {props.alt && <figcaption className="text-center text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">{props.alt}</figcaption>}
                              </figure>
                            ),
                            h3: ({ node, children, ...props }: any) => {
                              const text = String(children);
                              let severityClass = '';
                              if (text.includes('Critical')) severityClass = 'severity-card severity-critical';
                              else if (text.includes('High')) severityClass = 'severity-card severity-high';
                              else if (text.includes('Medium')) severityClass = 'severity-card severity-medium';
                              else if (text.includes('Low')) severityClass = 'severity-card severity-low';
                              
                              if (severityClass) {
                                return <h3 className={severityClass} {...props}>{children}</h3>;
                              }
                              return <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4" {...props}>{children}</h3>;
                            },
                            blockquote: ({ node, ...props }: any) => (
                              <blockquote className="border-l-4 border-gray-200 pl-4 my-4 italic text-gray-600 bg-gray-50/50 py-2 rounded-r-lg" {...props} />
                            ),
                          }}
                        >
                          {sanitizeMarkdown(msg.text)}
                        </Markdown>
                      </Suspense>

                      {isStreaming && idx === chatMessages.length - 1 && msg.role === 'model' && !msg.text && (
                        <div className="flex gap-1 items-center py-2 px-1">
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-1.5 h-1.5 rounded-full bg-orange-400"
                          />
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-orange-400"
                          />
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                            className="w-1.5 h-1.5 rounded-full bg-orange-400"
                          />
                        </div>
                      )}

                      {/* Belt-and-suspenders: render charts that weren't in the markdown */}
                      {msg.charts && msg.charts.length > 0 && (
                        <div className="mt-4 space-y-6">
                          {msg.charts.map((url, i) => {
                            // Check if this URL is already present in the markdown text
                            const isEmbedded = msg.text.includes(url);
                            if (isEmbedded) return null;

                            return (
                              <figure key={url} className="chart-figure animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <img
                                  src={url}
                                  alt={`Chart ${i + 1}`}
                                  className="w-full rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                  loading="lazy"
                                />
                                <figcaption className="mt-2 flex items-center justify-between">
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Generated Chart {i + 1}</span>
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-orange-500 hover:text-orange-600 font-bold uppercase tracking-widest"
                                  >
                                    Open Full Size ↗
                                  </a>
                                </figcaption>
                              </figure>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 px-4 md:px-8 py-6 border-t border-gray-100 bg-white/80 backdrop-blur-md">
        <form
          onSubmit={e => { e.preventDefault(); handleSendChat(); }}
          className="flex gap-3 max-w-5xl mx-auto"
        >
          <div className="flex-1 relative group">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={placeholder}
              disabled={isSendingChat}
              className={cn(
                "w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 transition-all outline-none text-sm font-medium placeholder:text-gray-400",
                "focus:bg-white focus:border-opacity-50",
                mode === 'ga4' 
                  ? "focus:border-orange-200 focus:ring-4 focus:ring-orange-500/5" 
                  : "focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5"
              )}
            />
            {isStreaming && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className={cn("w-4 h-4 animate-spin", mode === 'ga4' ? "text-orange-500" : "text-blue-500")} />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!chatInput.trim() || isSendingChat}
            className="px-6 py-4 rounded-2xl text-white font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:shadow-none"
            style={{
              background: mode === 'ga4' ? 'linear-gradient(135deg, #e8710a, #f58634)' : 'linear-gradient(135deg, #1a3a5c, #1e4d7b)',
            }}
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-[9px] text-center text-gray-400 mt-3 font-medium uppercase tracking-widest opacity-50">Powered by BrightHorizon AI Engine</p>
      </div>
    </div>

    {/* ChatOutline sits here — outside the scroll div, inside the relative wrapper */}
    <ChatOutline
      messages={chatMessages}
      mode={mode}
      activeMessageId={activeMessageId}
      onJumpTo={handleJumpToMessage}
      isOpen={showOutline}
      onToggle={() => setShowOutline(false)}
    />
  </div>
</div>
  );
}