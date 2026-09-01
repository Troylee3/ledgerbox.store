import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldCheck, Database, Zap, ArrowUp, AlertCircle, X } from 'lucide-react';

interface OfflineSyncBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  onForceSync: () => Promise<void>;
  language: 'SW' | 'EN';
  shopName?: string;
}

export default function OfflineSyncBanner({
  isOnline,
  isSyncing,
  pendingSyncCount,
  lastSyncTime,
  onForceSync,
  language,
  shopName
}: OfflineSyncBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Auto-clear success toast after 6 seconds
  useEffect(() => {
    if (syncSuccessToast) {
      const timer = setTimeout(() => {
        setSyncSuccessToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [syncSuccessToast]);

  const handleManualSync = async () => {
    try {
      await onForceSync();
      setSyncSuccessToast(
        language === 'SW'
          ? ' Data zote za mauzo na stoo zimesawazishwa kikamilifu na wingu (Firestore & Google Sheets)!'
          : ' All offline sales and inventory data successfully synced to the cloud!'
      );
    } catch (e) {
      console.error('Manual sync error:', e);
    }
  };

  if (syncSuccessToast) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md animate-fadeIn z-30 font-sans">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-200 shrink-0" />
          <span>{syncSuccessToast}</span>
        </div>
        <button
          onClick={() => setSyncSuccessToast(null)}
          className="p-1 hover:bg-emerald-700 rounded text-emerald-100 transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // 1. OFFLINE BANNER
  if (!isOnline && !isDismissed) {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2.5 text-xs shadow-md z-30 font-sans border-b border-amber-500/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-400/30 flex items-center justify-center shrink-0">
              <WifiOff size={16} className="text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-amber-100 uppercase tracking-wider text-[11px] bg-amber-950/60 px-2 py-0.5 rounded border border-amber-400/30">
                  {language === 'SW' ? '🔴 BILA MTANDAO (OFFLINE MODE)' : '🔴 OFFLINE MODE'}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="bg-white text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <Zap size={11} className="text-amber-600 fill-amber-500" />
                    {pendingSyncCount} {language === 'SW' ? 'miamala inasubiri wingu' : 'sales pending sync'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-100 mt-0.5 font-medium leading-tight">
                {language === 'SW'
                  ? 'Mfumo unafanya kazi 100%! Unaweza kufanya mauzo, kutoa risiti, na kubadilisha stoo bila wasiwasi. Data zitahifadhiwa kwenye wingu punde mtandao utakaporudi.'
                  : 'System is 100% operational offline! Make sales, print receipts, and manage inventory seamlessly. Data auto-syncs when reconnected.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-white text-amber-950 hover:bg-amber-100 font-black text-[11px] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin text-amber-700' : 'text-amber-700'} />
              <span>{language === 'SW' ? 'Jaribu Kusawazisha' : 'Retry Sync'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-amber-800/60 rounded text-amber-200 transition cursor-pointer"
              title={language === 'SW' ? 'Funga Ilani' : 'Dismiss Banner'}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE SYNCING BANNER
  if (isOnline && isSyncing) {
    return (
      <div className="bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-md z-30 font-sans border-b border-indigo-500/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={14} className="animate-spin text-indigo-200 shrink-0" />
            <span className="font-extrabold uppercase tracking-wide text-[11px] text-indigo-100">
              {language === 'SW' ? '⚡ INASAWAZISHA NA WINGU...' : '⚡ AUTO-SYNCING TO CLOUD...'}
            </span>
            <span className="text-[11px] text-indigo-200 hidden sm:inline">
              {language === 'SW'
                ? 'Mtandao umerudi. Inapakia data za mauzo na stoo kwenye wingu na Google Sheets...'
                : 'Connection restored. Uploading offline sales and stock logs to Cloud...'}
            </span>
          </div>
          <span className="text-[10px] bg-indigo-900/70 border border-indigo-400/30 px-2 py-0.5 rounded font-mono text-indigo-200 font-bold">
            {shopName || 'LedgerBox POS'}
          </span>
        </div>
      </div>
    );
  }

  // 3. ONLINE COMPACT INDICATOR (When pending count exists or after offline return)
  if (isOnline && pendingSyncCount > 0) {
    return (
      <div className="bg-emerald-700 text-white px-4 py-2 text-xs shadow-md z-30 font-sans border-b border-emerald-500/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Wifi size={14} className="text-emerald-300 shrink-0" />
            <div>
              <span className="font-bold text-emerald-100">
                {language === 'SW' ? 'Mtandao umerudi!' : 'Connection restored!'}
              </span>
              <span className="text-[11px] text-emerald-200 ml-2">
                {language === 'SW'
                  ? `Kuna miamala ${pendingSyncCount} iliyofanyika offline inayotakiwa kusawazishwa.`
                  : `${pendingSyncCount} offline sales ready to sync to cloud.`}
              </span>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold text-[11px] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUp size={12} className="text-emerald-700" />
            <span>{language === 'SW' ? 'Sawazisha Sasa' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
