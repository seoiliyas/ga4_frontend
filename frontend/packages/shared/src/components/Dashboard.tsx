import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import {
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
  ChevronRight,
  Sparkles,
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
      aria-label={copied ? 'Table copied' : 'Copy table to clipboard'}
      className="absolute top-2.5 right-2.5 p-1.5 bg-[var(--surface)]/95 backdrop-blur border border-[var(--border)] rounded-lg shadow-sm opacity-0 group-hover/table:opacity-100 focus:opacity-100 transition-all hover:border-[var(--bh-cerulean)] text-[var(--muted)] hover:text-[var(--bh-nile)]"
      title="Copy table to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[var(--bh-emerald)]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CopyResponseButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
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
      aria-label={copied ? 'Response copied' : 'Copy response'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--bh-nile)] hover:bg-[var(--surface-subtle)] transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-[var(--bh-emerald)]" />
          <span className="text-[var(--bh-emerald)]">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
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
  const [retryNonce, setRetryNonce] = useState(0);
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
  }, [sessionId, chatApi, retryNonce]);

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

  useEffect(() => {
    if (!showTokenExpiredModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTokenExpiredModal(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showTokenExpiredModal]);

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
        setChatMessages((prev) => prev.filter((m) => !(m.id === modelMsgId && !m.text)));
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
      <div className="flex-1 flex flex-col justify-between bg-[var(--bg)] p-6 md:p-10" role="status">
        <div className="max-w-4xl mx-auto w-full space-y-6 pt-4">
          <div className="flex justify-end">
            <div className="h-12 w-64 rounded-2xl bg-[var(--surface-subtle)] animate-pulse" />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-subtle)] animate-pulse shrink-0" />
            <div className="flex-1 max-w-xl space-y-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
              <div className="h-3.5 w-3/4 rounded bg-[var(--surface-subtle)] animate-pulse" />
              <div className="h-3.5 w-full rounded bg-[var(--surface-subtle)] animate-pulse" />
              <div className="h-3.5 w-2/3 rounded bg-[var(--surface-subtle)] animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 pb-4 text-xs font-semibold text-[var(--muted)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--bh-nile)]" />
          <span>Loading conversation…</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg)] p-6">
        <div
          role="alert"
          className="max-w-md w-full bg-[var(--surface)] border border-[#F4C6C6] rounded-2xl p-6 text-center shadow-[var(--elev-raised)] space-y-4"
        >
          <div className="w-11 h-11 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--fg)]">Unable to load conversation</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold bg-[var(--bh-nile)] hover:bg-[var(--bh-nile-hover)] text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {isGa4 && (
        <div className="px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[var(--surface)] border-b border-[var(--border-soft)]">
          <div>
            <h2 className="font-bold text-sm text-[var(--fg)]">Chat with {expertName}</h2>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-semibold border transition-colors duration-150 ${
                showSettings
                  ? 'bg-[var(--bh-nile-soft)] border-[var(--bh-cerulean)] text-[var(--bh-nile)]'
                  : 'bg-[var(--surface-warm)] border-[var(--border)] text-[var(--fg-2)] hover:bg-white hover:border-[var(--bh-cerulean)] hover:text-[var(--bh-nile)]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  oauthStatus.connected ? 'bg-[var(--bh-emerald)]' : 'bg-[var(--bh-buttercup)]'
                }`}
              />
              <Settings className="w-3.5 h-3.5 shrink-0 text-[var(--bh-cerulean)]" />
              <span className="truncate font-mono text-[11px]">
                {ga4PropertyId ? `Property: ${ga4PropertyId}` : 'Set GA4 Property'}
              </span>
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
          <div className="absolute inset-3 z-30 bg-[#EBF5F8]/95 backdrop-blur-sm border-2 border-dashed border-[var(--bh-cerulean)] rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] border border-[#C6DCE5] flex items-center justify-center mx-auto mb-3 shadow-sm">
                <UploadCloud className="w-6 h-6 text-[var(--bh-nile)]" />
              </div>
              <p className="text-sm font-extrabold text-[var(--bh-nile)]">Drop files to attach</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Images, PDF, Excel (.xlsx), Word (.docx), CSV, JSON — up to 25MB each
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={messagesContainerRef}
            onScroll={handleContainerScroll}
            className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 bg-[var(--bg)]"
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto px-2 py-8 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--elev-raised)] mb-5">
                  <BrightHorizonLogo mode={mode} className="w-11 h-11" />
                </div>
                <div className="text-center space-y-2 max-w-lg">
                  <h2 className="text-2xl sm:text-[28px] font-light text-[var(--fg)] tracking-[-0.02em] leading-tight text-balance">
                    How can I help with your{' '}
                    <strong className="font-extrabold text-[var(--bh-nile)]">
                      {isGa4 ? 'GA4 analytics?' : 'GTM container?'}
                    </strong>
                  </h2>
                  <div className="w-11 h-1 bg-[var(--bh-buttercup)] mx-auto rounded-full" aria-hidden="true" />
                  <p className="text-sm text-[var(--muted)] pt-1 leading-relaxed">{subtitle}</p>
                </div>

                {/* Bright Horizons Router-Style Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mt-8">
                  <AnimatePresence>
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.2, ease: [0.2, 0, 0, 1] }}
                        onClick={() => {
                          setChatInput(s);
                          textareaRef.current?.focus();
                        }}
                        className="group flex flex-col justify-between gap-3 p-4 text-left bg-[var(--surface)] border border-[var(--border)] rounded-[10px] shadow-[0_1px_3px_rgba(20,38,50,0.04)] hover:border-[var(--bh-cerulean)] hover:shadow-[0_8px_24px_rgba(26,71,95,0.09)] active:scale-[0.99] transition-all duration-150"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 p-1.5 rounded-lg bg-[var(--bh-nile-soft)] text-[var(--bh-cerulean)] shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-semibold text-[var(--fg)] leading-relaxed">{s}</span>
                        </div>
                        <div className="flex items-center justify-end text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--bh-nile)]">
                          <span className="mr-1 opacity-75 group-hover:opacity-100 transition-opacity">Ask</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--bh-buttercup-hover)] group-hover:translate-x-0.5 transition-transform duration-150" />
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full space-y-4">
                <AnimatePresence mode="popLayout">
                  {chatMessages.map((msg, idx) => {
                    const isStreamingThis =
                      isStreaming && idx === chatMessages.length - 1 && msg.role === 'model';

                    return (
                      <motion.div
                        key={msg.id ?? idx}
                        ref={(el: HTMLDivElement | null) => {
                          const key = msg.id ?? `idx-${idx}`;
                          if (el) messageRefs.current.set(key, el);
                          else messageRefs.current.delete(key);
                        }}
                        data-msg-id={msg.id}
                        initial={{ opacity: 0, y: 12, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{
                          type: 'spring',
                          stiffness: 280,
                          damping: 26,
                          layout: { duration: 0.18 },
                        }}
                        layout="position"
                        className={cn('flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start gap-3')}
                      >
                        {msg.role === 'model' && (
                          <div className="shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-[0_1px_3px_rgba(20,38,50,0.05)]">
                              <BrightHorizonLogo className="w-5 h-5" mode={mode} />
                            </div>
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[92%] md:max-w-[82%] relative overflow-hidden',
                            msg.role === 'user'
                              ? 'bg-[var(--bh-nile)] text-white rounded-2xl rounded-br-sm px-5 py-3.5 shadow-[0_4px_14px_rgba(26,71,95,0.16)]'
                              : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-2)] rounded-2xl rounded-tl-sm px-5 py-4 shadow-[0_1px_3px_rgba(20,38,50,0.04)]',
                          )}
                        >
                          {msg.role === 'user' ? (
                            <div className="space-y-2.5">
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
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-white/15 border border-white/25 text-xs font-semibold hover:bg-white/25 transition-colors text-left"
                                      >
                                        {isImg ? (
                                          <AuthImage
                                            src={fileUrl}
                                            alt={att.filename}
                                            chatApi={chatApi}
                                            className="w-7 h-7 rounded-md object-cover border border-white/30"
                                          />
                                        ) : (
                                          <Icon className="w-4 h-4 shrink-0 text-[#F0BD1B]" />
                                        )}
                                        <span className="truncate max-w-[140px]">{att.filename}</span>
                                        <span className="opacity-75 text-[10px] tabular-nums">
                                          {(att.size / 1024).toFixed(0)}KB
                                        </span>
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
                              transition={{ duration: 0.25 }}
                              className="prose prose-sm max-w-none"
                            >
                              <Suspense fallback={<div className="h-10 animate-pulse bg-[var(--surface-subtle)] rounded-lg" />}>
                                <Markdown
                                  remarkPlugins={[remarkGfm, remarkBreaks]}
                                  components={{
                                    table: ({ node: _node, ...props }: any) => (
                                      <div className="relative group/table my-5">
                                        <div className="overflow-x-auto border border-[var(--border)] rounded-xl bg-[var(--surface)]">
                                          <table {...props} className="w-full text-xs border-collapse" />
                                        </div>
                                        <CopyTableButton />
                                      </div>
                                    ),
                                    thead: ({ node: _node, ...props }: any) => (
                                      <thead {...props} className="bg-[var(--bg)] border-b border-[var(--border)]" />
                                    ),
                                    th: ({ node: _node, ...props }: any) => (
                                      <th
                                        {...props}
                                        className="px-4 py-3 text-left font-bold text-[var(--bh-nile)] uppercase tracking-[0.07em] whitespace-nowrap"
                                      />
                                    ),
                                    td: ({ node: _node, ...props }: any) => (
                                      <td
                                        {...props}
                                        className="px-4 py-3 border-b border-[var(--border-soft)] text-[var(--fg-2)] font-medium"
                                      />
                                    ),
                                    tr: ({ node: _node, ...props }: any) => (
                                      <tr {...props} className="hover:bg-[var(--surface-warm)] transition-colors" />
                                    ),
                                    img: ({ node: _node, ...props }: any) => (
                                      <figure className="my-5">
                                        <AuthImage
                                          src={props.src}
                                          alt={props.alt}
                                          chatApi={chatApi}
                                          className="rounded-xl border border-[var(--border)] shadow-sm max-w-full h-auto"
                                          loading="lazy"
                                        />
                                        {props.alt && (
                                          <figcaption className="text-center text-[11px] text-[var(--muted)] mt-2 font-semibold uppercase tracking-[0.07em]">
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
                                        <h3 className="text-[17px] font-extrabold text-[var(--fg)] mt-7 mb-3" {...props}>
                                          {children}
                                        </h3>
                                      );
                                    },
                                    blockquote: ({ node: _node, ...props }: any) => (
                                      <blockquote
                                        className="border-l-4 border-[var(--bh-cerulean)] pl-4 pr-3 my-4 italic text-[var(--fg-2)] bg-[var(--bg)] py-2.5 rounded-r-xl"
                                        {...props}
                                      />
                                    ),
                                  }}
                                >
                                  {msg.text}
                                </Markdown>
                              </Suspense>

                              {isStreamingThis && !msg.text && (
                                <div className="flex items-center gap-2.5 py-1.5" role="status">
                                  <div className="flex gap-1 items-center">
                                    {[0, 0.18, 0.36].map((delay, dotIdx) => (
                                      <motion.div
                                        key={dotIdx}
                                        animate={{ opacity: [0.35, 1, 0.35] }}
                                        transition={{ repeat: Infinity, duration: 1.3, delay }}
                                        className={cn(
                                          'w-2 h-2 rounded-full',
                                          dotIdx === 1 ? 'bg-[var(--bh-buttercup)]' : 'bg-[var(--bh-cerulean)]',
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-semibold text-[var(--muted)]">Analyzing…</span>
                                </div>
                              )}

                              {/* Belt-and-suspenders: render charts that weren't in the markdown */}
                              {msg.charts && msg.charts.length > 0 && (
                                <div className="mt-4 space-y-5">
                                  {msg.charts.map((url, i) => {
                                    if (msg.text.includes(url)) return null;
                                    return (
                                      <figure key={url} className="chart-figure animate-chart-in">
                                        <AuthImage
                                          src={url}
                                          alt={`Chart ${i + 1}`}
                                          chatApi={chatApi}
                                          className="w-full rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
                                          loading="lazy"
                                        />
                                        <figcaption className="mt-2 flex items-center justify-between">
                                          <span className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-[0.07em]">
                                            Generated Chart {i + 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openAuthenticatedFile(url, chatApi).catch((err) =>
                                                addToast({ type: 'error', title: 'Unable to open chart', message: err.message }),
                                              )
                                            }
                                            className="text-[11px] text-[var(--bh-cerulean)] hover:text-[var(--bh-nile)] font-bold uppercase tracking-[0.06em]"
                                          >
                                            Open Full Size ↗
                                          </button>
                                        </figcaption>
                                      </figure>
                                    );
                                  })}
                                </div>
                              )}

                              {!isStreamingThis && msg.text && (
                                <div className="mt-3 pt-2 border-t border-[var(--border-soft)] flex items-center justify-end not-prose">
                                  <CopyResponseButton text={msg.text} />
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Grounded Bright Horizons Composer Dock */}
          <div className="shrink-0 px-4 md:px-8 py-3.5 border-t border-[var(--border)] bg-[var(--surface)] relative">
            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="max-w-4xl mx-auto mb-2.5 flex flex-wrap gap-2">
                {pendingAttachments.map((att) => {
                  const Icon = getFileIcon(att.mime_type, att.filename);
                  const isImg = att.mime_type.startsWith('image/');
                  const fileUrl = att.url || chatApi.getFileUrl(att.id);
                  return (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-[10px] bg-[var(--surface-warm)] border border-[var(--border)] text-xs font-semibold shadow-sm"
                    >
                      {isImg ? (
                        <AuthImage
                          src={fileUrl}
                          alt={att.filename}
                          chatApi={chatApi}
                          className="w-7 h-7 rounded-md object-cover border border-[var(--border)]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-white border border-[var(--border)] flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-[var(--bh-nile)]" />
                        </div>
                      )}
                      <div className="flex flex-col leading-none">
                        <span className="truncate max-w-[130px] text-[var(--fg)]">{att.filename}</span>
                        <span className="text-[10px] text-[var(--muted)] tabular-nums mt-0.5">
                          {(att.size / 1024).toFixed(0)}KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePending(att.id)}
                        aria-label={`Remove ${att.filename}`}
                        className="p-1 hover:bg-[var(--danger-soft)] rounded-md text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {isUploading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--bh-nile-soft)] border border-[#C6DCE5] text-xs font-semibold text-[var(--bh-nile)]">
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
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-end gap-2 p-2 rounded-2xl bg-[var(--surface-warm)] border border-[var(--border)] focus-within:bg-white focus-within:border-[var(--bh-cerulean)] focus-within:ring-4 focus-within:ring-[#3C889E]/12 transition-all duration-150">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSendingChat || isUploading}
                  aria-label="Attach files"
                  className="shrink-0 p-2.5 rounded-[10px] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--bh-nile)] transition-colors disabled:opacity-40"
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
                    aria-label={placeholder}
                    disabled={isSendingChat}
                    className="w-full px-2 py-2 bg-transparent outline-none text-sm font-medium text-[var(--fg)] placeholder:text-[var(--muted)] resize-none leading-relaxed max-h-40 overflow-y-auto"
                  />
                  {isStreaming && (
                    <div className="absolute right-2 bottom-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--bh-cerulean)]" />
                    </div>
                  )}
                </div>

                {isSendingChat ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    className="shrink-0 px-4 py-2.5 rounded-[10px] text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] bg-[var(--bh-nile-deep)] hover:bg-[var(--bh-nile)] shadow-sm"
                    title="Stop generating"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={(!chatInput.trim() && pendingAttachments.length === 0) || isUploading}
                    aria-label="Send message"
                    className="shrink-0 px-4 py-2.5 rounded-[10px] bg-[var(--bh-buttercup)] hover:bg-[var(--bh-buttercup-hover)] text-[var(--bh-nile-deep)] text-xs font-extrabold flex items-center gap-2 transition-all shadow-[0_2px_8px_rgba(240,189,27,0.28)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
                  >
                    <Send className="w-4 h-4 stroke-[2.25]" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                )}
              </div>
            </form>
            <p className="text-[11px] text-center text-[var(--muted)] mt-2.5 font-medium">
              Powered by BrightHorizon AI Engine • Attach images, PDFs, Excel, Word, CSV, or JSON (25MB max)
            </p>
          </div>
        </div>

        {/* Token expired re-auth modal */}
        {showTokenExpiredModal && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="token-expired-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E2633]/45 backdrop-blur-sm animate-fade-in p-4"
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--elev-modal)] max-w-md w-full overflow-hidden animate-scale-in">
              <div className="px-7 pt-7 pb-5">
                <div className="flex items-start justify-between mb-5">
                  <div className="p-3 rounded-xl bg-[var(--bh-buttercup-soft)] border border-[var(--bh-buttercup-border)]">
                    <AlertTriangle className="w-6 h-6 text-[#7D5B00]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenExpiredModal(false)}
                    aria-label="Dismiss session expired notice"
                    className="p-2 text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-subtle)] rounded-[10px] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 id="token-expired-title" className="text-lg font-extrabold text-[var(--fg)] mb-2">
                  GA4 Session Expired
                </h3>
                <p className="text-sm text-[var(--fg-2)] leading-relaxed mb-3">
                  Your Google Analytics authentication has expired or was revoked. This typically happens when:
                </p>
                <ul className="text-xs text-[var(--muted)] mb-5 space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--bh-buttercup)] shrink-0" />
                    Your Google session timed out after extended inactivity
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--bh-buttercup)] shrink-0" />
                    You changed your Google account password
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--bh-buttercup)] shrink-0" />
                    Access was revoked in your Google Account security settings
                  </li>
                </ul>
              </div>
              <div className="px-7 pb-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTokenExpiredModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--fg-2)] bg-[var(--surface-warm)] hover:bg-[var(--surface-subtle)] border border-[var(--border)] transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTokenExpiredModal(false);
                    handleConnectGA4();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-extrabold bg-[var(--bh-buttercup)] hover:bg-[var(--bh-buttercup-hover)] text-[var(--bh-nile-deep)] shadow-[0_3px_12px_rgba(240,189,27,0.28)] active:scale-[0.98] transition-all"
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
