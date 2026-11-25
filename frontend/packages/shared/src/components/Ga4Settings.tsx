import React from 'react';
import { X, Loader2, Link as LinkIcon, ChevronDown, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  oauthStatus: { connected: boolean; email?: string | null };
  handleDisconnectGA4: () => void;
  handleConnectGA4: () => void;
  isLoadingProps: boolean;
  settingsPid: string;
  setSettingsPid: (pid: string) => void;
  properties: { propertyId: string; propertyName: string; accountName: string }[];
  handleSavePropertyId: () => void;
  isSavingPid: boolean;
  ga4PropertyId: string;
}

export default function Ga4Settings({
  onClose,
  oauthStatus,
  handleDisconnectGA4,
  handleConnectGA4,
  isLoadingProps,
  settingsPid,
  setSettingsPid,
  properties,
  handleSavePropertyId,
  isSavingPid,
  ga4PropertyId,
}: Props) {
  return (
    <div className="px-4 sm:px-6 py-5 shrink-0 bg-[var(--bg)] border-b border-[var(--border)] animate-slide-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-[var(--fg)]">Analytics Connection</h3>
            <p className="text-xs text-[var(--muted)]">Configure your Google Analytics 4 OAuth link and active property.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics settings"
            className="p-2 text-[var(--muted)] hover:text-[var(--bh-nile)] hover:bg-[var(--surface)] rounded-[10px] border border-transparent hover:border-[var(--border)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-[0_1px_3px_rgba(20,38,50,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.08em]">
                Account Status
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  oauthStatus.connected
                    ? 'bg-[var(--bh-emerald-soft)] text-[var(--bh-emerald)] border-[var(--bh-emerald-border)]'
                    : 'bg-[var(--danger-soft)] text-[var(--danger)] border-[#F4C6C6]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    oauthStatus.connected ? 'bg-[var(--bh-emerald)]' : 'bg-[var(--danger)]'
                  }`}
                />
                {oauthStatus.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--bh-nile-soft)] flex items-center justify-center border border-[#C6DCE5] shrink-0">
                <LinkIcon className="w-4 h-4 text-[var(--bh-nile)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--fg)] truncate">
                  {oauthStatus.email || 'No account linked'}
                </p>
                <p className="text-xs text-[var(--muted)] truncate">Google Analytics Data API</p>
              </div>
            </div>

            {oauthStatus.connected ? (
              <button
                type="button"
                onClick={handleDisconnectGA4}
                className="w-full text-xs text-[var(--danger)] font-bold px-4 py-2.5 rounded-[10px] bg-[var(--danger-soft)] hover:bg-[#FDE4E4] border border-[#F4C6C6] transition-colors"
              >
                Disconnect Account
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGA4}
                className="w-full flex items-center justify-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-[10px] bg-[var(--bh-buttercup)] hover:bg-[var(--bh-buttercup-hover)] text-[var(--bh-nile-deep)] shadow-[0_2px_8px_rgba(240,189,27,0.28)] active:scale-[0.98] transition-all"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Connect GA4 Account
              </button>
            )}
          </div>

          {oauthStatus.connected && (
            <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-[0_1px_3px_rgba(20,38,50,0.04)]">
              <label
                htmlFor="ga4-property-select"
                className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.08em] block mb-4"
              >
                Property Selection
              </label>

              <div className="space-y-4">
                <div className="relative group">
                  <select
                    id="ga4-property-select"
                    value={settingsPid}
                    onChange={(e) => setSettingsPid(e.target.value)}
                    disabled={isLoadingProps}
                    className="w-full text-sm font-semibold text-[var(--fg)] rounded-[10px] pl-3.5 pr-10 py-2.5 outline-none appearance-none cursor-pointer truncate transition-colors bg-[var(--surface-warm)] border border-[var(--border)] focus:bg-white focus:border-[var(--bh-cerulean)]"
                  >
                    <option value="">Select a property…</option>
                    {properties.map((p) => (
                      <option key={p.propertyId} value={p.propertyId}>
                        {p.accountName} › {p.propertyName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isLoadingProps ? (
                      <Loader2 className="w-4 h-4 text-[var(--bh-cerulean)] animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--bh-nile)] transition-colors" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 px-3 py-2 rounded-[10px] bg-[var(--surface-warm)] border border-[var(--border-soft)]">
                    <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-[0.06em]">Property ID</p>
                    <p className="text-xs font-mono font-semibold text-[var(--fg)] tabular-nums mt-0.5">
                      {settingsPid || 'None selected'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSavePropertyId}
                    disabled={isSavingPid || !settingsPid || settingsPid === ga4PropertyId}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[10px] text-xs font-bold bg-[var(--bh-nile)] hover:bg-[var(--bh-nile-hover)] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isSavingPid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
