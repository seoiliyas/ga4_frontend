import React, { useMemo, useState } from 'react';
import type { ChatMessage, AppMode } from '../services/chatApi';

interface Props {
  messages: ChatMessage[];
  mode: AppMode;
  activeMessageId: string | null;
  onJumpTo: (id: string) => void;
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
  id: string;
  userMsg: ChatMessage;
  modelMsg?: ChatMessage;
  index: number;
}

export function ChatOutline({ messages, activeMessageId, onJumpTo }: Props) {
  const [hovered, setHovered] = useState(false);

  const turns = useMemo(() => {
    const turnsList: Turn[] = [];
    let pendingUser: ChatMessage | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        if (pendingUser) {
          turnsList.push({
            id: pendingUser.id ?? `turn-${i}`,
            userMsg: pendingUser,
            modelMsg: undefined,
            index: turnsList.length,
          });
        }
        pendingUser = msg;
      } else if (msg.role === 'model' && pendingUser) {
        turnsList.push({
          id: pendingUser.id ?? `turn-${i}`,
          userMsg: pendingUser,
          modelMsg: msg,
          index: turnsList.length,
        });
        pendingUser = null;
      }
    }

    if (pendingUser) {
      turnsList.push({
        id: pendingUser.id ?? `turn-last`,
        userMsg: pendingUser,
        modelMsg: undefined,
        index: turnsList.length,
      });
    }

    return turnsList;
  }, [messages]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute right-0 top-0 bottom-0 flex items-center z-20"
      style={{ pointerEvents: turns.length === 0 ? 'none' : 'auto' }}
    >
      {/* Expanded panel — slides in on hover */}
      <div
        className="absolute right-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--elev-modal)] min-w-[240px] max-w-[280px] max-h-[380px] overflow-y-auto p-1.5 transition-all duration-150"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0) scale(1)' : 'translateX(8px) scale(0.97)',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {turns.map((turn) => {
          const isActive =
            activeMessageId === turn.userMsg.id ||
            (turn.modelMsg && activeMessageId === turn.modelMsg.id);
          const promptTitle = truncate(turn.userMsg.text || 'Attachment');

          return (
            <button
              key={turn.id}
              type="button"
              onClick={() => onJumpTo(turn.id)}
              aria-label={`Jump to prompt ${turn.index + 1}: ${promptTitle}`}
              className={`w-full block text-left px-3 py-2 rounded-[10px] mb-1 transition-colors duration-150 ${
                isActive ? 'bg-[var(--bh-nile-soft)]' : 'hover:bg-[var(--surface-warm)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold tabular-nums ${
                    isActive
                      ? 'bg-[var(--bh-buttercup)] text-[var(--bh-nile-deep)]'
                      : 'bg-[var(--surface-subtle)] text-[var(--muted)]'
                  }`}
                >
                  {turn.index + 1}
                </span>

                <span
                  className={`text-xs leading-snug truncate flex-1 ${
                    isActive ? 'text-[var(--bh-nile)] font-bold' : 'text-[var(--fg-2)] font-medium'
                  }`}
                >
                  {promptTitle}
                </span>
              </div>

              <div
                className={`mt-1 ml-7.5 text-[10px] leading-snug truncate ${
                  turn.modelMsg ? 'text-[var(--muted)]' : 'text-[var(--bh-cerulean)] italic'
                }`}
              >
                {turn.modelMsg
                  ? `↳ ${truncateMultiline(turn.modelMsg.text, 50)}`
                  : 'Awaiting response…'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Collapsed dash indicators (one per turn) */}
      <div
        className="flex flex-col items-end gap-1.5 pr-1.5 transition-opacity duration-150 pointer-events-none"
        style={{ opacity: hovered ? 0 : 1 }}
      >
        {turns.map((turn) => {
          const isActive =
            activeMessageId === turn.userMsg.id ||
            (turn.modelMsg && activeMessageId === turn.modelMsg.id);
          return (
            <div
              key={turn.id}
              className={`h-[2.5px] rounded-full transition-all duration-200 ${
                isActive ? 'w-5 bg-[var(--bh-nile)]' : 'w-3.5 bg-[#C2D1D8]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
