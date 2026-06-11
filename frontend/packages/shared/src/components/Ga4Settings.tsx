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
    <div className="px-6 py-6 shrink-0 shadow-inner bg-[#fcfdfe] border-b border-gray-100 animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Analytics Connection</h3>
          <p className="text-[10px] text-gray-400">Configure your Google Analytics 4 integration.</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Status</span>
             <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${oauthStatus.connected ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${oauthStatus.connected ? "bg-green-500" : "bg-red-500"}`} />
               {oauthStatus.connected ? "Connected" : "Disconnected"}
             </div>
          </div>
          
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
               <LinkIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold text-gray-700 truncate">{oauthStatus.email || 'No account linked'}</p>
               <p className="text-[11px] text-gray-400 truncate">Google Analytics API</p>
            </div>
          </div>

          {oauthStatus.connected ? (
            <button onClick={handleDisconnectGA4} className="w-full text-xs text-red-600 hover:text-red-700 font-bold px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-all border border-red-100/50">
              Disconnect Account
            </button>
          ) : (
            <button onClick={handleConnectGA4} className="w-full flex items-center justify-center gap-2 text-xs text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95" style={{ backgroundColor: '#e8710a' }}>
              <LinkIcon className="w-3.5 h-3.5" />
              Connect GA4 Account
            </button>
          )}
        </div>

        {oauthStatus.connected && (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Property Selection</span>
            
            <div className="space-y-4">
              <div className="relative group">
                <select
                  value={settingsPid}
                  onChange={e => setSettingsPid(e.target.value)}
                  disabled={isLoadingProps}
                  className="w-full text-sm font-medium rounded-xl px-4 py-2.5 outline-none appearance-none cursor-pointer truncate transition-all bg-gray-50 border border-gray-100 focus:bg-white focus:border-orange-500/30"
                  style={{ color: '#1a2a3a', paddingRight: '2.5rem' }}
                >
                  <option value="">Select a property...</option>
                  {properties.map(p => (
                    <option key={p.propertyId} value={p.propertyId}>
                      {p.accountName} › {p.propertyName}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none pr-1">
                  {isLoadingProps ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" /> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                   <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Property ID</p>
                   <p className="text-xs font-mono font-medium text-gray-600">{settingsPid || 'None selected'}</p>
                </div>
                <button
                  onClick={handleSavePropertyId}
                  disabled={isSavingPid || !settingsPid || settingsPid === ga4PropertyId}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/10 active:scale-95"
                  style={{ backgroundColor: '#10b981', color: '#ffffff' }}
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
  );
}
