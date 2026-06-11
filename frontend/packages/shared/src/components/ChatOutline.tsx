import React, { useMemo, useState } from 'react';
import type { ChatMessage, AppMode } from '../services/chatApi';

interface Props {
  messages: ChatMessage[];
  mode: AppMode;
  activeMessageId: string | null;
  onJumpTo: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function truncate(text: string, maxLen = 38): string {
  const cleaned = text.replace(/\n+/g, ' ').trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}…` : cleaned;
}

function truncateMultiline(text: string, maxLen = 48): string {
  const cleaned = text.replace(/\n+/g, ' ').trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}…` : cleaned;
}

interface Turn {
  id: string; // composite or user message id
  userMsg: ChatMessage;
  modelMsg?: ChatMessage;
  index: number;
}

export function ChatOutline({ messages, mode, activeMessageId, onJumpTo }: Props) {
  const [hovered, setHovered] = useState(false);

  // Build conversation turns: (user -> optional model)
  const turns = useMemo(() => {
    const turnsList: Turn[] = [];
    let pendingUser: ChatMessage | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        if (pendingUser) {
          turnsList.push({
            id: pendingUser.id!,
            userMsg: pendingUser,
            modelMsg: undefined,
            index: turnsList.length,
          });
        }
        pendingUser = msg;
      } else if (msg.role === 'model' && pendingUser) {
        turnsList.push({
          id: pendingUser.id!,
          userMsg: pendingUser,
          modelMsg: msg,
          index: turnsList.length,
        });
        pendingUser = null;
      }
    }

    if (pendingUser) {
      turnsList.push({
        id: pendingUser.id!,
        userMsg: pendingUser,
        modelMsg: undefined,
        index: turnsList.length,
      });
    }

    return turnsList;
  }, [messages]);

  const accentColor = mode === 'ga4' ? '#e8710a' : '#1a3a5c';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        zIndex: 20,
        pointerEvents: turns.length === 0 ? 'none' : 'auto',
      }}
    >
      {/* Expanded panel — slides in on hover */}
      <div
        style={{
          position: 'absolute',
          right: 14,
          background: '#ffffff',
          border: '0.5px solid #e5e7eb',
          borderRadius: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          minWidth: 240,
          maxWidth: 280,
          maxHeight: 380,
          overflowY: 'auto',
          padding: '8px 4px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0) scale(1)' : 'translateX(8px) scale(0.97)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {turns.map((turn) => {
          const isActive =
            activeMessageId === turn.userMsg.id ||
            (turn.modelMsg && activeMessageId === turn.modelMsg.id);

          return (
            <button
              key={turn.id}
              onClick={() => onJumpTo(turn.userMsg.id!)}
              style={{
                width: '100%',
                display: 'block',
                textAlign: 'left',
                padding: '7px 12px',
                borderRadius: 9,
                border: 'none',
                background: isActive
                  ? mode === 'ga4'
                    ? 'rgba(232,113,10,0.07)'
                    : 'rgba(26,58,92,0.07)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
                marginBottom: 4,
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Number badge */}
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    color: isActive ? accentColor : '#9ca3af',
                    background: isActive ? 'transparent' : '#f3f4f6',
                  }}
                >
                  {turn.index + 1}
                </span>

                {/* Question preview */}
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: isActive ? accentColor : '#4a5a6a',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}
                >
                  {truncate(turn.userMsg.text)}
                </span>
              </div>

              {/* Model output preview (if exists) */}
              <div
                style={{
                  marginTop: 6,
                  marginLeft: 30,
                  fontSize: 10,
                  lineHeight: 1.3,
                  color: '#9ca3af',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontStyle: turn.modelMsg ? 'normal' : 'italic',
                }}
              >
                {turn.modelMsg
                  ? `↳ ${truncateMultiline(turn.modelMsg.text, 50)}`
                  : '⌛ awaiting response…'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Collapsed dash indicators (one per turn) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          paddingRight: 4,
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
        }}
      >
        {turns.map((turn) => {
          const isActive =
            activeMessageId === turn.userMsg.id ||
            (turn.modelMsg && activeMessageId === turn.modelMsg.id);
          return (
            <div
              key={turn.id}
              style={{
                width: isActive ? 20 : 14,
                height: 2,
                borderRadius: 2,
                background: isActive ? accentColor : '#d1d5db',
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
