import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, CheckCheck, Loader2, X } from 'lucide-react';

export default function InviteKeyPanel({ onClose, authApi }: { onClose: () => void, authApi: any }) {
  const [keys, setKeys] = useState<{ invite_key: string; used_by: string | null; created_at: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const existing = await authApi.getInviteKeys();
        setKeys(existing);
      } catch {
        /* silent */
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authApi]);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { invite_key: newKey } = await authApi.generateInviteKey();
      setKeys(prev => [{ invite_key: newKey, used_by: null, created_at: Date.now() }, ...prev]);
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
      /* fallback */
    }
  };

  return (
    <div className="p-4 space-y-4 rounded-2xl bg-white border border-gray-100 shadow-xl animate-zoom-in overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Team Access</p>
          <p className="text-sm font-bold text-gray-800 leading-none">Invite Member</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
           <span className="shrink-0 font-bold">Error:</span>
           <span className="truncate">{error}</span>
        </div>
      )}

      <button
        onClick={generate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
        style={{ backgroundColor: 'rgba(232, 113, 10, 0.08)', border: '1px solid rgba(232, 113, 10, 0.1)', color: '#e8710a' }}
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
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Active Keys</p>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : keys.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scroll-smooth">
            {keys.map(k => (
              <div
                key={k.invite_key}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all group/key"
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  opacity: k.used_by ? 0.6 : 1,
                }}
              >
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center border border-gray-100 shrink-0">
                   <KeyRound className="w-3 h-3 text-gray-400" />
                </div>
                <code className="text-xs font-mono font-semibold flex-1 truncate select-all text-gray-700">
                  {k.invite_key}
                </code>
                {k.used_by ? (
                  <span className="shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg bg-gray-200 text-gray-500 uppercase tracking-tighter">
                    Used
                  </span>
                ) : (
                  <button
                    onClick={() => copyKey(k.invite_key)}
                    className="shrink-0 p-1.5 transition-all bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-orange-600 hover:border-orange-100 shadow-sm active:scale-90"
                    title="Copy Key"
                  >
                    {copiedKey === k.invite_key ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl bg-gray-50/50 border border-dashed border-gray-200">
             <KeyRound className="w-8 h-8 text-gray-200 mb-2" />
             <p className="text-[11px] text-center font-medium text-gray-400">No active invite keys.<br/>Generate one to invite your team.</p>
          </div>
        )}
      </div>
    </div>
  );
}
