import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  User,
  MoreHorizontal,
  Users,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InviteKeyPanel from './InviteKeyPanel';
import type { ChatSession, AppMode } from '../services/chatApi';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isOpen: boolean;
  mode: AppMode;
  onNewChat: () => void;
  onSessionSelect: (id: string) => void;
  onSessionRenamed: (id: string, title: string) => void;
  onSessionDeleted: (id: string) => void;
  chatApi: any;
  authApi: any;
  onToggle?: () => void;
  user?: any;
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
    const d = new Date(s.updated_at);
    if (d >= today) buckets[0].items.push(s);
    else if (d >= yesterday) buckets[1].items.push(s);
    else if (d >= weekAgo) buckets[2].items.push(s);
    else buckets[3].items.push(s);
  }

  return buckets.filter(b => b.items.length > 0);
}

// ── Icons ────────────────────────────────────────────────────────────────────

export const BrightHorizonLogo = ({ className, mode }: { className?: string; mode?: 'gtm' | 'ga4' | 'gtm_oauth' }) => {
  const isGa4 = mode === 'ga4';
  const color = isGa4 ? '#e8710a' : '#1a3a5c';
  const secondaryColor = isGa4 ? '#ff9d4d' : '#4facfe';
  
  return (
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <rect x="4" y="8" width="20" height="16" rx="4" fill={color} />
      <path d="M24 16L28 12V20L24 16Z" fill={color} />
      <circle cx="9" cy="16" r="2" fill="white" />
      <path 
        d="M22 6L23.5 9L26.5 10.5L23.5 12L22 15L20.5 12L17.5 10.5L20.5 9L22 6Z" 
        fill={secondaryColor} 
      />
    </svg>
  );
};


export const SidebarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z" fill="currentColor" />
  </svg>
);

export const NewChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor" />
  </svg>
);

// ── SessionItem ───────────────────────────────────────────────────────────────

function SessionItem({ session, isActive, mode, onSelect, onRenamed, onDeleted, chatApi }: any) {
  const [uiMode, setUiMode] = useState<'idle' | 'editing' | 'confirming-delete'>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(session.title);
    setUiMode('editing');
    setShowMenu(false);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirmEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = editValue.trim();
    if (!trimmed) return;
    try {
      await chatApi.renameSession(session.id, trimmed);
      onRenamed(session.id, trimmed);
    } catch { /* silent */ } finally { setUiMode('idle'); }
  };

  const startDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUiMode('confirming-delete');
    setShowMenu(false);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleted(session.id);
  };

  const activeColor = mode === 'ga4' ? '#e8710a' : '#1a3a5c';
  const activeBg = mode === 'ga4' ? 'rgba(232, 113, 10, 0.08)' : 'rgba(26, 58, 92, 0.08)';

  return (
    <div
      onClick={uiMode === 'idle' ? onSelect : undefined}
      className={`group relative flex flex-col rounded-xl px-3 py-3 mb-0.5 cursor-pointer select-none transition-all duration-150 border border-transparent ${isActive ? '' : 'hover:bg-gray-50'}`}
      style={isActive ? { backgroundColor: activeBg } : {}}
    >
      {uiMode === 'editing' ? (
        <form onSubmit={confirmEdit} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => confirmEdit()}
            className="flex-1 min-w-0 text-xs rounded-lg px-2 py-1 outline-none bg-white border border-gray-200"
            autoFocus
          />
        </form>
      ) : uiMode === 'confirming-delete' ? (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <span className="text-[10px] text-red-600 font-medium flex-1">Delete chat?</span>
          <button onClick={confirmDelete} className="px-2 py-1 text-[10px] bg-red-500 text-white rounded-lg">Yes</button>
          <button onClick={e => { e.stopPropagation(); setUiMode('idle'); }} className="px-2 py-1 text-[10px] bg-gray-100 rounded-lg">No</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate flex-1 leading-snug" style={{ color: isActive ? activeColor : '#4a5a6a' }}>
            {session.title}
          </p>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className={`p-1 text-gray-400 hover:text-gray-600 transition-opacity ${isActive || showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1 animate-zoom-in">
                <button onClick={startEdit} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"><Pencil className="w-3 h-3" /> Rename</button>
                <button onClick={startDelete} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar Content ───────────────────────────────────────────────────────────

function SidebarContent({ sessions, activeSessionId, mode, onNewChat, onSessionSelect, onSessionRenamed, onSessionDeleted, chatApi, authApi, onToggle, user, onLogout }: any) {
  const [showInvite, setShowInvite] = useState(false);
  const grouped = groupByDate(sessions);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="font-bold text-sm tracking-tight text-gray-500">Chats</span>
        <button
          onClick={onToggle}
          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl transition-all duration-200"
          title="Toggle Sidebar"
        >
          <SidebarIcon />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-4 pt-1 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100/50 transition-all active:scale-[0.98]"
        >
          <div className="text-gray-500"><Plus className="w-4 h-4" /></div>
          <span>New chat</span>
        </button>
      </div>

      {/* Sessions List */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scroll-smooth">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 opacity-30">
            <p className="text-xs font-medium">No conversations yet</p>
          </div>
        ) : (
          grouped.map(group => (
            <section key={group.label} className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 mb-2 text-gray-400/80">{group.label}</p>
              {group.items.map((session: any) => (
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
      <div className="p-3 border-t border-gray-50 mt-auto bg-white/50 backdrop-blur-sm">
        {showInvite && (
          <div className="mb-3 animate-slide-in">
            <InviteKeyPanel onClose={() => setShowInvite(false)} authApi={authApi} />
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="flex-1 group flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors overflow-hidden">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 border border-gray-100">
               <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700 truncate leading-tight">{user?.username || 'Guest User'}</p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{user?.email || 'Sign in to sync'}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInvite(!showInvite)}
            className={`p-2.5 rounded-xl transition-all duration-200 ${showInvite ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
            title="Invite Team Members"
          >
            <Users className="w-4 h-4" />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl transition-all duration-200 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Sign Out"
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
  const { isOpen } = props;

  return (
    <>
      <motion.aside 
        initial={false}
        animate={{ 
          width: isOpen ? 288 : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-gray-100 overflow-hidden bg-white"
      >
        <SidebarContent {...props} />
      </motion.aside>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-30 flex flex-col w-72 bg-white shadow-2xl md:hidden"
          >
            <SidebarContent {...props} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
