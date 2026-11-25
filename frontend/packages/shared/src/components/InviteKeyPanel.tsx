import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, CheckCheck, Loader2, X } from 'lucide-react';
import type { AuthApi } from '../services/authApi';
import type { AppMode } from '../services/chatApi';

interface InviteKeyPanelProps {
  onClose: () => void;
  authApi: AuthApi;
  mode?: AppMode;
}

export default function InviteKeyPanel({ onClose, authApi }: InviteKeyPanelProps) {
  const [keys, setKeys] = useState<{ invite_key: string; used_by: string | null; created_at: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await authApi.getInviteKeys();
        if (!cancelled) setKeys(existing);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load invite keys');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authApi]);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { invite_key: newKey } = await authApi.generateInviteKey();
      setKeys((prev) => [{ invite_key: newKey, used_by: null, created_at: Date.now() }, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate key');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setError('Clipboard access denied. Please copy the key manually.');
    }
  };

  return (
    <div className="p-4 space-y-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--elev-raised)] animate-zoom-in overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.08em] leading-none mb-1">
            Team Access
          </p>
          <p className="text-sm font-extrabold text-[var(--fg)] leading-none">Invite Member</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close invite panel"
          className="p-1.5 text-[var(--muted)] hover:text-[var(--bh-nile)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-[11px] text-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 rounded-[10px] border border-[#F4C6C6]"
        >
          <span className="shrink-0 font-bold">Error:</span>
          <span className="truncate">{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-xs font-bold bg-[var(--bh-nile-soft)] hover:bg-[#DCEAF0] border border-[#C6DCE5] text-[var(--bh-nile)] transition-colors disabled:opacity-50 active:scale-[0.98]"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            Create New Invite Key
          </>
        )}
      </button>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.08em] px-1">Invite Keys</p>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--bh-cerulean)]" />
          </div>
        ) : keys.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scroll-smooth">
            {keys.map((k) => (
              <div
                key={k.invite_key}
                className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 bg-[var(--surface-warm)] border border-[var(--border-soft)] transition-colors"
                style={{ opacity: k.used_by ? 0.65 : 1 }}
              >
                <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center border border-[var(--border-soft)] shrink-0">
                  <KeyRound className="w-3 h-3 text-[var(--bh-cerulean)]" />
                </div>
                <code className="text-[11px] font-mono font-semibold flex-1 truncate select-all text-[var(--fg)]">
                  {k.invite_key}
                </code>
                {k.used_by ? (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--muted)] uppercase tracking-[0.04em]">
                    Used
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => copyKey(k.invite_key)}
                    aria-label={`Copy invite key ${k.invite_key}`}
                    className="shrink-0 p-1.5 transition-colors bg-white border border-[var(--border)] rounded-lg text-[var(--muted)] hover:text-[var(--bh-nile)] hover:border-[var(--bh-cerulean)] active:scale-95"
                    title="Copy Key"
                  >
                    {copiedKey === k.invite_key ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[var(--bh-emerald)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-[var(--surface-warm)] border border-dashed border-[var(--border)]">
            <KeyRound className="w-6 h-6 text-[var(--muted)]/50 mb-2" />
            <p className="text-[11px] text-center font-medium text-[var(--muted)]">
              No invite keys yet. Generate one to invite your team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
