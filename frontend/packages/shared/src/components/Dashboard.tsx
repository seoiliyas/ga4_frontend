import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  MessageSquare,
  Send,
  Square,
  Loader2,
  Settings,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { ChatOutline } from './ChatOutline';
import { BrightHorizonLogo } from './Sidebar';
import { AuthImage, openAuthenticatedFile } from './AuthMedia';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { ChatApi, ChatMessage, ChatAttachment, AppMode } from '../services/chatApi';
import Ga4Settings from './Ga4Settings';
import { useToast } from './Toast';

const Markdown = lazy(() => import('react-markdown'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function buildAutoTitle(text: string): string {
  const cleaned = text.trim().replace(/\n+/g, ' ');
  return cleaned.length > 46 ? `${cleaned.slice(0, 43)}…` : cleaned;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props?.children) {
    return extractText(node.props.children);
  }
  return '';
}

function CopyTableButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const wrapper = e.currentTarget.closest('.group\\/table');
    const table = wrapper?.querySelector('table');
    if (!table) return;
    const text = Array.from(table.rows)
      .map((row) => Array.from(row.cells).map((cell) => (cell as HTMLElement).innerText).join('\t'))
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permission denied */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur border border-gray-100 rounded-lg shadow-sm opacity-0 group-hover/table:opacity-100 transition-opacity hover:bg-white text-gray-400 hover:text-gray-600"
      title="Copy table to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface Props {
  sessionId: string;
  mode: AppMode;
  ga4PropertyId: string;
  selectedModel?: string;
  onFirstReply?: (sessionId: string, title: string) => void;
  onGa4PropertySaved?: (propertyId: string) => void;
  chatApi: ChatApi;
}

const GTM_SUGGESTIONS = [
  'Are there any tags with missing consent settings?',
  'Show me all triggers that fire on pageview',
  'Summarize the overall health and test artifacts in this container',
];

const GA4_SUGGESTIONS = [
  'What are my top 10 events in the last 30 days?',
  'Show me daily active users for the past week',
  'What channels are driving the most sessions?',
];

export function Dashboard({
  sessionId,
  mode,
  ga4PropertyId,
  selectedModel,
  onFirstReply,
  onGa4PropertySaved,
  chatApi,
}: Props) {
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
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNewSessionRef = useRef(false);
  const hasAutoTitledRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const dragDepthRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addToast } = useToast();

  const isGa4 = mode === 'ga4';

  const checkOauthStatus = useCallback(async () => {
    if (mode !== 'ga4') return;
    try {
      const status = await chatApi.getGa4OAuthStatus();
      setOauthStatus(status);
      if (status.connected) {
        setIsLoadingProps(true);
        try {
          const propsRes = await chatApi.getGa4Properties();
          setProperties(propsRes.properties);
        } catch (propsErr: any) {
          if (
            propsErr.code === 'GA4_TOKEN_EXPIRED' ||
            propsErr.message?.includes('GA4_TOKEN_EXPIRED') ||
            propsErr.message?.includes('session has expired')
          ) {
            setOauthStatus({ connected: false });
            setProperties([]);
            setShowTokenExpiredModal(true);
            return;
          }
          throw propsErr;
        }
      } else {
        setProperties([]);
      }
    } catch (err) {
      console.error('Failed to fetch OAuth status', err);
    } finally {
      setIsLoadingProps(false);
    }
  }, [mode, chatApi]);

  useEffect(() => {
    checkOauthStatus();
  }, [checkOauthStatus]);

  useEffect(() => {
    const allowedOrigins = new Set([window.location.origin, chatApi.getApiOrigin()]);
    const handleMessage = (event: MessageEvent) => {
      if (!allowedOrigins.has(event.origin)) return;
      if (event.data?.type === 'ga4_oauth_success') {
        checkOauthStatus();
        addToast({ type: 'success', title: 'GA4 Connected', message: 'Google Analytics account linked.' });
      } else if (event.data?.type === 'ga4_oauth_error') {
        addToast({
          type: 'error',
          title: 'GA4 Connection Failed',
          message: event.data?.error || 'Could not link Google Analytics account.',
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkOauthStatus, chatApi, addToast]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingMsgs(true);
    setLoadError(null);
    setShowSettings(false);
    hasAutoTitledRef.current = false;
    isNearBottomRef.current = true;

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

    return () => {
      cancelled = true;
    };
  }, [sessionId, chatApi]);

  useEffect(() => {
    setSettingsPid(ga4PropertyId);
  }, [ga4PropertyId]);

  useEffect(() => {
    setPendingAttachments([]);
    setDragOver(false);
    dragDepthRef.current = 0;
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [sessionId]);

  // Auto-resize textarea height cleanly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [chatInput]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [chatMessages, isSendingChat, isStreaming]);

  // IntersectionObserver: re-bind only when message count or session changes (not every streamed token)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target.getAttribute('data-msg-id'))
          .filter(Boolean) as string[];
        if (visible.length > 0) {
          setActiveMessageId(visible[0]);
        }
      },
      { root: container, rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );

    messageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [chatMessages.length, sessionId]);

  const handleJumpToMessage = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveMessageId(id);
    }
  }, []);

  const handleContainerScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // ── File handling helpers ─────────────────────────────────────────────
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const getFileIcon = (mime: string, filename: string) => {
    if (mime.startsWith('image/')) return ImageIcon;
    if (mime === 'application/pdf') return FileText;
    if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xls|xlsx|csv)$/i.test(filename)) {
      return FileSpreadsheet;
    }
    if (mime.includes('word') || /\.(doc|docx)$/i.test(filename)) return FileText;
    return FileIcon;
  };

  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      for (const f of files) {
        if (f.size === 0) {
          addToast({ type: 'error', title: 'Empty file', message: `${f.name} is empty` });
          return;
        }
        if (f.size > MAX_FILE_SIZE) {
          addToast({ type: 'error', title: 'File too large', message: `${f.name} exceeds 25MB limit` });
          return;
        }
      }
      if (pendingAttachments.length + files.length > 10) {
        addToast({ type: 'error', title: 'Too many files', message: 'Max 10 files per message' });
        return;
      }
      setIsUploading(true);
      try {
        const res = await chatApi.uploadFiles(sessionId, files);
        setPendingAttachments((prev) => [...prev, ...res.files]);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Upload failed', message: err.message || 'Failed to upload files' });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [sessionId, chatApi, pendingAttachments.length, addToast],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      handleFilesUpload(files);
    },
    [handleFilesUpload],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setDragOver(false);
      const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
      handleFilesUpload(files);
    },
    [handleFilesUpload],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        handleFilesUpload(files);
      }
    },
    [handleFilesUpload],
  );

  const removePending = useCallback(
    (id: string) => {
      setPendingAttachments((prev) => prev.filter((f) => f.id !== id));
      chatApi.deleteFile(id).catch(() => {});
    },
    [chatApi],
  );

  const handleStopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleSendChat = useCallback(async () => {
    if ((!chatInput.trim() && pendingAttachments.length === 0) || isSendingChat || isUploading) return;

    const question = chatInput.trim();
    const attachmentsToSend = [...pendingAttachments];

    setChatInput('');
    setPendingAttachments([]);
    isNearBottomRef.current = true;

    const userMsgId = `msg-${Date.now()}-u`;
    const modelMsgId = `msg-${Date.now()}-m`;

    setChatMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: question || (attachmentsToSend.length ? `[${attachmentsToSend.map((a) => a.filename).join(', ')}]` : ''),
        attachments: attachmentsToSend,
        id: userMsgId,
      },
      { role: 'model', text: '', id: modelMsgId },
    ]);
    setIsSendingChat(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { charts } = await chatApi.sendMessageStream(
        sessionId,
        question,
        (chunk: string) => {
          setChatMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.id === modelMsgId) {
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + chunk,
              };
            }
            return updated;
          });
        },
        mode,
        selectedModel,
        attachmentsToSend.map((a) => a.id),
        controller.signal,
      );

      if (charts && charts.length > 0) {
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.id === modelMsgId) {
            updated[updated.length - 1] = { ...lastMsg, charts };
          }
          return updated;
        });
      }

      if (isNewSessionRef.current && !hasAutoTitledRef.current && onFirstReply) {
        hasAutoTitledRef.current = true;
        const title = buildAutoTitle(question || attachmentsToSend.map((a) => a.filename).join(', '));
        chatApi
          .renameSession(sessionId, title)
          .then(() => onFirstReply(sessionId, title))
          .catch(() => {});
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setChatMessages((prev) =>
          prev.filter((m) => !(m.id === modelMsgId && !m.text)),
        );
        return;
      }

      if (
        err.code === 'GA4_TOKEN_EXPIRED' ||
        err.message?.includes('GA4_TOKEN_EXPIRED') ||
        err.message?.includes('session has expired')
      ) {
        setOauthStatus({ connected: false });
        setProperties([]);
        setShowTokenExpiredModal(true);
        setChatMessages((prev) => prev.filter((m) => !(m.id === modelMsgId && !m.text)));
        return;
      }

      setChatMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.id === modelMsgId) {
          updated[updated.length - 1] = {
            ...lastMsg,
            text: `**Error:** ${err.message || 'Failed to get response'}`,
          };
        } else {
          updated.push({
            id: `msg-${Date.now()}-err`,
            role: 'model',
            text: `**Error:** ${err.message || 'Failed to get response'}`,
          });
        }
        return updated;
      });
    } finally {
      abortControllerRef.current = null;
      setIsSendingChat(false);
      setIsStreaming(false);
    }
  }, [chatInput, isSendingChat, isUploading, sessionId, onFirstReply, chatApi, mode, selectedModel, pendingAttachments]);

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

  const handleConnectGA4 = async () => {
    const popup = window.open('', 'ga4_oauth', 'width=500,height=600');
    if (!popup) {
      addToast({
        type: 'warning',
        title: 'Popup blocked',
        message: 'Please allow popups for this site to connect Google Analytics.',
      });
      return;
    }

    try {
      const { url } = await chatApi.getGa4OAuthUrl();
      popup.location.href = url;
    } catch (err: any) {
      popup.close();
      addToast({
        type: 'error',
        title: 'Connection failed',
        message: err.message || 'Could not start Google Analytics OAuth flow.',
      });
    }
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

  const suggestions = isGa4 ? GA4_SUGGESTIONS : GTM_SUGGESTIONS;
  const expertName = isGa4 ? 'GA4 Expert AI' : 'GTM Expert AI';
  const placeholder = isGa4 ? 'Ask about your GA4 data…' : 'Ask about your GTM container…';
  const subtitle = isGa4
    ? 'Ask questions about your Google Analytics events, users, and reports.'
    : 'Ask questions about your GTM container tags, triggers, and variables.';

  if (isLoadingMsgs) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: isGa4 ? '#e8710a' : '#1a3a5c' }} />
          <span className="text-sm" style={{ color: '#6b7d8e' }}>
            Loading conversation…
          </span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        <p className="text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-xl">Warning: {loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {isGa4 && (
        <div className="px-4 sm:px-6 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: '#1a2a3a' }}>
              Chat with {expertName}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ga4PropertyId ? `Property: ${ga4PropertyId}` : 'Set Property'}</span>
            </button>
          </div>
        </div>
      )}

      {showSettings && isGa4 && (
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

      <div
        className="flex-1 flex overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Single Drag-and-Drop Overlay */}
        {dragOver && (
          <div
            className={cn(
              'absolute inset-2 z-30 backdrop-blur-sm border-2 border-dashed rounded-2xl flex items-center justify-center pointer-events-none',
              isGa4 ? 'bg-orange-50/90 border-orange-300' : 'bg-blue-50/90 border-blue-300',
            )}
          >
            <div className="text-center">
              <UploadCloud className={cn('w-8 h-8 mx-auto mb-2', isGa4 ? 'text-orange-500' : 'text-[#1a3a5c]')} />
              <p className={cn('text-sm font-semibold', isGa4 ? 'text-orange-700' : 'text-[#1a3a5c]')}>Drop files here</p>
              <p className={cn('text-xs', isGa4 ? 'text-orange-500' : 'text-blue-600')}>
                Images, PDF, Excel (.xlsx), Word (.docx), CSV & more — up to 25MB each
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={messagesContainerRef}
            onScroll={handleContainerScroll}
            className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 bg-gray-50/50"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 opacity-75 animate-fade-in">
                <div className="p-6 rounded-[2.5rem] bg-gray-100/70 border border-gray-200/60 shadow-inner">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-gray-600">How can I help you today?</p>
                  <p className="text-xs text-gray-400">Select a suggestion below or type your own question.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl px-4 mt-4">
                  <AnimatePresence>
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => setChatInput(s)}
                        className={cn(
                          'p-3 text-left text-[11px] font-medium bg-white border border-gray-100 rounded-2xl transition-all shadow-sm active:scale-95 text-gray-600',
                          isGa4
                            ? 'hover:border-orange-200 hover:bg-orange-50/40'
                            : 'hover:border-blue-200 hover:bg-blue-50/40',
                        )}
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
                    ref={(el: HTMLDivElement | null) => {
                      const key = msg.id ?? `idx-${idx}`;
                      if (el) messageRefs.current.set(key, el);
                      else messageRefs.current.delete(key);
                    }}
                    data-msg-id={msg.id}
                    initial={{ opacity: 0, y: 15, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 25,
                      layout: { duration: 0.2 },
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
                          ? {
                              background: isGa4
                                ? 'linear-gradient(135deg, #e8710a, #f58634)'
                                : 'linear-gradient(135deg, #1a3a5c, #1e4d7b)',
                            }
                          : {}
                      }
                    >
                      {msg.role === 'user' ? (
                        <div className="space-y-2">
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {msg.attachments.map((att) => {
                                const Icon = getFileIcon(att.mime_type, att.filename);
                                const isImg = att.mime_type.startsWith('image/');
                                const fileUrl = att.url || chatApi.getFileUrl(att.id);
                                return (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() =>
                                      openAuthenticatedFile(fileUrl, chatApi).catch((err) =>
                                        addToast({ type: 'error', title: 'Unable to open file', message: err.message }),
                                      )
                                    }
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 border border-white/30 text-xs font-medium hover:bg-white/30 transition-colors text-left"
                                  >
                                    {isImg ? (
                                      <AuthImage
                                        src={fileUrl}
                                        alt={att.filename}
                                        chatApi={chatApi}
                                        className="w-8 h-8 rounded-lg object-cover border border-white/30"
                                      />
                                    ) : (
                                      <Icon className="w-4 h-4 shrink-0" />
                                    )}
                                    <span className="truncate max-w-[140px]">{att.filename}</span>
                                    <span className="opacity-60 text-[10px]">{(att.size / 1024).toFixed(0)}KB</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        </div>
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
                                table: ({ node: _node, ...props }: any) => (
                                  <div className="relative group/table my-6">
                                    <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm bg-white">
                                      <table {...props} className="w-full text-xs border-collapse" />
                                    </div>
                                    <CopyTableButton />
                                  </div>
                                ),
                                thead: ({ node: _node, ...props }: any) => (
                                  <thead {...props} className="bg-gray-50/80 border-b border-gray-100" />
                                ),
                                th: ({ node: _node, ...props }: any) => (
                                  <th
                                    {...props}
                                    className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                                  />
                                ),
                                td: ({ node: _node, ...props }: any) => (
                                  <td {...props} className="px-4 py-3 border-b border-gray-50 text-gray-700 font-medium" />
                                ),
                                tr: ({ node: _node, ...props }: any) => (
                                  <tr {...props} className="hover:bg-gray-50/50 transition-colors" />
                                ),
                                img: ({ node: _node, ...props }: any) => (
                                  <figure className="my-6">
                                    <AuthImage
                                      src={props.src}
                                      alt={props.alt}
                                      chatApi={chatApi}
                                      className="rounded-xl border border-gray-100 shadow-sm max-w-full h-auto"
                                      loading="lazy"
                                    />
                                    {props.alt && (
                                      <figcaption className="text-center text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">
                                        {props.alt}
                                      </figcaption>
                                    )}
                                  </figure>
                                ),
                                h3: ({ node: _node, children, ...props }: any) => {
                                  const text = extractText(children);
                                  let severityClass = '';
                                  if (text.includes('Critical')) severityClass = 'severity-card severity-critical';
                                  else if (text.includes('High')) severityClass = 'severity-card severity-high';
                                  else if (text.includes('Medium')) severityClass = 'severity-card severity-medium';
                                  else if (text.includes('Low')) severityClass = 'severity-card severity-low';

                                  if (severityClass) {
                                    return (
                                      <h3 className={severityClass} {...props}>
                                        {children}
                                      </h3>
                                    );
                                  }
                                  return (
                                    <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4" {...props}>
                                      {children}
                                    </h3>
                                  );
                                },
                                blockquote: ({ node: _node, ...props }: any) => (
                                  <blockquote
                                    className="border-l-4 border-gray-200 pl-4 my-4 italic text-gray-600 bg-gray-50/50 py-2 rounded-r-lg"
                                    {...props}
                                  />
                                ),
                              }}
                            >
                              {msg.text}
                            </Markdown>
                          </Suspense>

                          {isStreaming && idx === chatMessages.length - 1 && msg.role === 'model' && !msg.text && (
                            <div className="flex gap-1 items-center py-2 px-1">
                              {[0, 0.2, 0.4].map((delay, dotIdx) => (
                                <motion.div
                                  key={dotIdx}
                                  animate={{ opacity: [0.4, 1, 0.4] }}
                                  transition={{ repeat: Infinity, duration: 1.5, delay }}
                                  className={cn('w-1.5 h-1.5 rounded-full', isGa4 ? 'bg-orange-400' : 'bg-[#1a3a5c]')}
                                />
                              ))}
                            </div>
                          )}

                          {/* Belt-and-suspenders: render charts that weren't in the markdown */}
                          {msg.charts && msg.charts.length > 0 && (
                            <div className="mt-4 space-y-6">
                              {msg.charts.map((url, i) => {
                                if (msg.text.includes(url)) return null;
                                return (
                                  <figure key={url} className="chart-figure animate-chart-in">
                                    <AuthImage
                                      src={url}
                                      alt={`Chart ${i + 1}`}
                                      chatApi={chatApi}
                                      className="w-full rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                      loading="lazy"
                                    />
                                    <figcaption className="mt-2 flex items-center justify-between">
                                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                        Generated Chart {i + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openAuthenticatedFile(url, chatApi).catch((err) =>
                                            addToast({ type: 'error', title: 'Unable to open chart', message: err.message }),
                                          )
                                        }
                                        className="text-[10px] text-orange-500 hover:text-orange-600 font-bold uppercase tracking-widest"
                                      >
                                        Open Full Size ↗
                                      </button>
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

          <div className="shrink-0 px-4 md:px-8 py-4 border-t border-gray-100 bg-white/80 backdrop-blur-md relative">
            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="max-w-5xl mx-auto mb-3 flex flex-wrap gap-2">
                {pendingAttachments.map((att) => {
                  const Icon = getFileIcon(att.mime_type, att.filename);
                  const isImg = att.mime_type.startsWith('image/');
                  const fileUrl = att.url || chatApi.getFileUrl(att.id);
                  return (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium shadow-sm"
                    >
                      {isImg ? (
                        <AuthImage
                          src={fileUrl}
                          alt={att.filename}
                          chatApi={chatApi}
                          className="w-7 h-7 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex flex-col leading-none">
                        <span className="truncate max-w-[120px] text-gray-700">{att.filename}</span>
                        <span className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(0)}KB</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePending(att.id)}
                        className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {isUploading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </div>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-end gap-3 max-w-5xl mx-auto"
            >
              <div className="flex-1 relative group flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSendingChat || isUploading}
                  className="shrink-0 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200 hover:text-gray-700 transition-all disabled:opacity-40"
                  title="Attach files (images, PDF, Excel, Word, CSV, JSON)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.csv,.txt,.md,.json,.xml,.tsv,.log,.html,.htm,.xlsx,.xlsm,.docx"
                />

                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder={placeholder}
                    disabled={isSendingChat}
                    className={cn(
                      'w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 transition-all outline-none text-sm font-medium placeholder:text-gray-400 resize-none leading-relaxed max-h-40 overflow-y-auto',
                      'focus:bg-white focus:border-opacity-50',
                      isGa4
                        ? 'focus:border-orange-200 focus:ring-4 focus:ring-orange-500/5'
                        : 'focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5',
                    )}
                  />
                  {isStreaming && (
                    <div className="absolute right-4 bottom-3.5">
                      <Loader2 className={cn('w-4 h-4 animate-spin', isGa4 ? 'text-orange-500' : 'text-[#1a3a5c]')} />
                    </div>
                  )}
                </div>
              </div>

              {isSendingChat ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="px-5 py-3.5 rounded-2xl text-white font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 bg-gray-800 hover:bg-gray-900"
                  title="Stop generating"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!chatInput.trim() && pendingAttachments.length === 0) || isUploading}
                  className="px-6 py-3.5 rounded-2xl text-white font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:shadow-none"
                  style={{
                    background: isGa4
                      ? 'linear-gradient(135deg, #e8710a, #f58634)'
                      : 'linear-gradient(135deg, #1a3a5c, #1e4d7b)',
                  }}
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              )}
            </form>
            <p className="text-[9px] text-center text-gray-400 mt-3 font-medium uppercase tracking-widest opacity-50">
              Powered by BrightHorizon AI Engine • Attach images, PDFs, Excel (.xlsx), Word (.docx), CSV (25MB max)
            </p>
          </div>
        </div>

        {/* Token expired re-auth modal */}
        {showTokenExpiredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                    <AlertTriangle className="w-7 h-7 text-amber-500" />
                  </div>
                  <button
                    onClick={() => setShowTokenExpiredModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Session Expired</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-1">
                  Your Google Analytics authentication has expired or was revoked. This typically happens when:
                </p>
                <ul className="text-xs text-gray-400 mb-6 space-y-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                    Your Google session timed out (after ~6 months of inactivity)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                    You changed your Google password
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                    Access was revoked in your Google Account settings
                  </li>
                </ul>
              </div>
              <div className="px-8 pb-8 flex gap-3">
                <button
                  onClick={() => setShowTokenExpiredModal(false)}
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setShowTokenExpiredModal(false);
                    handleConnectGA4();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #e8710a, #f58634)' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect GA4
                </button>
              </div>
            </div>
          </div>
        )}

        <ChatOutline
          messages={chatMessages}
          mode={mode}
          activeMessageId={activeMessageId}
          onJumpTo={handleJumpToMessage}
        />
      </div>
    </div>
  );
}
