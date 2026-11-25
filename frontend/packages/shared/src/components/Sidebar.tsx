import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Users,
  LogOut,
  Search,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InviteKeyPanel from './InviteKeyPanel';
import type { AuthApi, AuthUser } from '../services/authApi';
import type { ChatApi, ChatSession, AppMode } from '../services/chatApi';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  mode: AppMode;
  onNewChat: () => void;
  onSessionSelect: (id: string) => void;
  onSessionRenamed: (id: string, title: string) => void;
  onSessionDeleted: (id: string) => void;
  chatApi: ChatApi;
  authApi: AuthApi;
  onToggle?: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupByDate(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  if (!sessions) return [];
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const buckets: { label: string; items: ChatSession[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const s of sessions) {
    const d = new Date(Number(s.updated_at));
    if (d >= today) buckets[0].items.push(s);
    else if (d >= yesterday) buckets[1].items.push(s);
    else if (d >= weekAgo) buckets[2].items.push(s);
    else buckets[3].items.push(s);
  }

  return buckets.filter((b) => b.items.length > 0);
}

function getUserInitials(user?: AuthUser | null): string {
  const source = (user?.username || user?.email || 'BH').trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// ── Brand & UI Icons ──────────────────────────────────────────────────────────

export const BrightHorizonLogo = ({
  className,
  mode,
}: {
  className?: string;
  mode?: 'gtm' | 'ga4' | 'gtm_oauth';
}) => {
  const isGa4 = mode === 'ga4';
  const hillFill = isGa4 ? '#3C889E' : '#0B8743';
  const foregroundArc = '#1A475F';

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#FFFFFF" stroke="#D8E3E8" strokeWidth="1.25" />
      {/* Sun rays */}
      <path
        d="M16 5.2V7.2M9.3 8L10.7 9.4M22.7 8L21.3 9.4M6.6 14.5H8.6M23.4 14.5H25.4"
        stroke="#F0BD1B"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Rising Buttercup Gold sun */}
      <path d="M10.5 17.8A5.5 5.5 0 0 1 21.5 17.8H10.5Z" fill="#F0BD1B" />
      {/* Mid horizon curve */}
      <path d="M4.5 21.2C9.8 17.4 22.2 17.4 27.5 21.2V25.5H4.5V21.2Z" fill={hillFill} />
      {/* Deep Nile foreground horizon */}
      <path d="M4.5 23.4C11 20.6 21 20.6 27.5 23.4V25.6C27.5 26.9 26.4 28 25.1 28H6.9C5.6 28 4.5 26.9 4.5 25.6V23.4Z" fill={foregroundArc} />
    </svg>
  );
};

export const SidebarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z"
      fill="currentColor"
    />
  </svg>
);

export const NewChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z"
      fill="currentColor"
    />
  </svg>
);

// ── SessionItem ───────────────────────────────────────────────────────────────

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  mode: AppMode;
  onSelect: () => void;
  onRenamed: (id: string, title: string) => void;
  onDeleted: (id: string) => void;
  chatApi: ChatApi;
}

function SessionItem({ session, isActive, onSelect, onRenamed, onDeleted, chatApi }: SessionItemProps) {
  const [uiMode, setUiMode] = useState<'idle' | 'editing' | 'confirming-delete'>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const savingEditRef = useRef(false);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    savingEditRef.current = false;
    setEditValue(session.title);
    setUiMode('editing');
    setShowMenu(false);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirmEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (savingEditRef.current) return;
    savingEditRef.current = true;

    const trimmed = editValue.trim();
    if (!trimmed || trimmed === session.title) {
      setUiMode('idle');
      savingEditRef.current = false;
      return;
    }

    try {
      await chatApi.renameSession(session.id, trimmed);
      onRenamed(session.id, trimmed);
    } catch {
      /* ignore */
    } finally {
      setUiMode('idle');
      savingEditRef.current = false;
    }
  };

  const cancelEdit = () => {
    savingEditRef.current = true;
    setEditValue(session.title);
    setUiMode('idle');
  };

  const startDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUiMode('confirming-delete');
    setShowMenu(false);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleted(session.id);
  };

  return (
    <div
      onClick={uiMode === 'idle' ? onSelect : undefined}
      role={uiMode === 'idle' ? 'button' : undefined}
      tabIndex={uiMode === 'idle' ? 0 : undefined}
      aria-current={isActive ? 'page' : undefined}
      onKeyDown={(e) => {
        if (uiMode === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex flex-col rounded-[10px] px-3 py-2.5 mb-1 cursor-pointer select-none transition-colors duration-150 ${
        isActive
          ? 'bg-[var(--bh-nile-soft)] text-[var(--bh-nile)]'
          : 'text-[var(--fg-2)] hover:bg-[var(--surface-warm)]'
      }`}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-[var(--bh-buttercup)]"
        />
      )}

      {uiMode === 'editing' ? (
        <form onSubmit={confirmEdit} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => confirmEdit()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
            }}
            aria-label="Rename conversation"
            className="flex-1 min-w-0 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none bg-white border border-[var(--bh-cerulean)] text-[var(--fg)]"
            autoFocus
          />
        </form>
      ) : uiMode === 'confirming-delete' ? (
        <div className="flex items-center gap-2 pl-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-[var(--danger)] font-semibold flex-1">Delete chat?</span>
          <button
            type="button"
            onClick={confirmDelete}
            className="px-2.5 py-1 text-[11px] font-semibold bg-[var(--danger)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUiMode('idle');
            }}
            className="px-2.5 py-1 text-[11px] font-medium bg-[var(--surface-subtle)] text-[var(--fg-2)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pl-1">
          <p
            className={`text-[13px] truncate flex-1 leading-snug ${
              isActive ? 'font-bold text-[var(--bh-nile)]' : 'font-medium text-[var(--fg-2)]'
            }`}
          >
            {session.title}
          </p>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label={`Options for ${session.title}`}
              aria-expanded={showMenu}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`p-1 rounded-md text-[var(--muted)] hover:text-[var(--bh-nile)] hover:bg-white/80 transition-all ${
                isActive || showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--surface)] rounded-[10px] shadow-lg border border-[var(--border)] z-50 overflow-hidden py-1 animate-zoom-in">
                <button
                  type="button"
                  onClick={startEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--fg-2)] hover:bg-[var(--surface-subtle)] hover:text-[var(--bh-nile)] transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button
                  type="button"
                  onClick={startDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar Content ───────────────────────────────────────────────────────────

function SidebarContent({
  sessions,
  activeSessionId,
  mode,
  onNewChat,
  onSessionSelect,
  onSessionRenamed,
  onSessionDeleted,
  chatApi,
  authApi,
  onToggle,
  user,
  onLogout,
}: Omit<SidebarProps, 'isOpen'>) {
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const grouped = useMemo(() => groupByDate(filteredSessions), [filteredSessions]);
  const initials = getUserInitials(user);

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border-soft)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrightHorizonLogo mode={mode} className="w-7 h-7 shrink-0" />
          <div className="min-w-0">
            <span className="font-extrabold text-sm tracking-tight text-[var(--bh-nile)] block leading-none">
              BrightHorizon
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)] block mt-0.5">
              {mode === 'ga4' ? 'GA4 Analyst' : 'GTM Auditor'}
            </span>
          </div>
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="p-2 text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--bh-nile)] rounded-[10px] transition-colors duration-150"
            title="Collapse Sidebar"
            aria-label="Collapse sidebar"
          >
            <SidebarIcon />
          </button>
        )}
      </div>

      {/* New Chat CTA & Optional Filter */}
      <div className="px-3 pt-3 pb-3 space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-bold text-white bg-[var(--bh-nile)] hover:bg-[var(--bh-nile-hover)] shadow-[0_2px_8px_rgba(26,71,95,0.18)] transition-all duration-150 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.25]" />
          <span>New Chat</span>
        </button>

        {sessions.length >= 5 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter chats…"
              aria-label="Filter conversations"
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--surface-warm)] border border-[var(--border)] rounded-[10px] text-[var(--fg)] placeholder:text-[var(--muted)] outline-none focus:bg-white focus:border-[var(--bh-cerulean)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--fg)] p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sessions List */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 scroll-smooth" aria-label="Conversation history">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <p className="text-xs font-semibold text-[var(--muted)]">
              {searchQuery ? 'No matching chats' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <p className="text-[11px] text-[var(--muted)]/80 mt-1">
                Start a new audit chat above.
              </p>
            )}
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.label} className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] px-3 mb-1.5 text-[var(--muted)]">
                {group.label}
              </p>
              {group.items.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  mode={mode}
                  onSelect={() => onSessionSelect(session.id)}
                  onRenamed={onSessionRenamed}
                  onDeleted={onSessionDeleted}
                  chatApi={chatApi}
                />
              ))}
            </section>
          ))
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-[var(--border-soft)] mt-auto bg-[var(--surface-warm)]">
        {showInvite && (
          <div className="mb-3 animate-slide-in">
            <InviteKeyPanel onClose={() => setShowInvite(false)} authApi={authApi} mode={mode} />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] bg-white border border-[var(--border-soft)] overflow-hidden">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--bh-nile-soft)] border border-[#C6DCE5] flex items-center justify-center shrink-0">
              <span className="text-xs font-extrabold text-[var(--bh-nile)]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--fg)] truncate leading-tight">
                {user?.username || 'Guest User'}
              </p>
              <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                {user?.email || 'Sign in to sync'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(!showInvite)}
            className={`p-2.5 rounded-[10px] border transition-colors duration-150 ${
              showInvite
                ? 'bg-[var(--bh-nile-soft)] border-[#C6DCE5] text-[var(--bh-nile)]'
                : 'bg-white border-[var(--border-soft)] text-[var(--muted)] hover:border-[var(--bh-cerulean)] hover:text-[var(--bh-nile)]'
            }`}
            title="Invite Team Members"
            aria-label="Invite team members"
            aria-expanded={showInvite}
          >
            <Users className="w-4 h-4" />
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2.5 rounded-[10px] bg-white border border-[var(--border-soft)] text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:border-[#F4C6C6] hover:text-[var(--danger)] transition-colors duration-150"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const { isOpen, onToggle } = props;

  return (
    <>
      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? 288 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-[var(--border)] overflow-hidden bg-[var(--surface)]"
      >
        <SidebarContent {...props} />
      </motion.aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 z-20 bg-[#0E2633]/35 backdrop-blur-[2px] md:hidden"
            />
            <motion.aside
              key="mobile-drawer"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-30 flex flex-col w-72 bg-[var(--surface)] shadow-2xl md:hidden"
            >
              <SidebarContent {...props} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
