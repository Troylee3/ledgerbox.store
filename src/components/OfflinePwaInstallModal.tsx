import { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, CheckCircle2, ShieldCheck, Wifi, WifiOff, X, HelpCircle, ExternalLink } from 'lucide-react';
import { useLanguage } from '../lib/translations';

interface OfflinePwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfflinePwaInstallModal({ isOpen, onClose }: OfflinePwaInstallModalProps) {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Check if app is already running in standalone PWA display mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      alert(
        language === 'SW'
          ? "Ili kusakinisha App, gusa vituko 3 vya menu ya Browser yako (Majuu kulia) kisha chagua 'Install LedgerBox' au 'Add to Home Screen' / 'Sakinisha Kwenye Skrini'."
          : "To install as an app, click your browser menu (top right 3 dots) and select 'Install LedgerBox' or 'Add to Home Screen'."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans relative my-auto">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 p-5 flex justify-between items-start border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
              <Download size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  {language === 'SW' ? 'Pakua & Sakinisha LedgerBox App' : 'Install LedgerBox Standalone App'}
                </h3>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5 font-medium">
                {language === 'SW' ? 'Kufanya kazi 100% Offline bila haja ya AI Studio' : 'Run 100% Offline without Google AI Studio'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">

          {/* Status Badge */}
          <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">
                  <Wifi size={12} />
                  {language === 'SW' ? 'Mtandao: Upo Hewani (Online)' : 'Status: Online'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-[10px]">
                  <WifiOff size={12} />
                  {language === 'SW' ? 'Mtandao: Nje ya Mtandao (Offline)' : 'Status: Offline'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              {language === 'SW' ? 'Hifadhi: Kwenye Kifaa Chako (Local Storage)' : 'Storage: On-Device Storage'}
            </span>
          </div>

          {/* Core Feature Highlights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex flex-col gap-1.5">
              <Monitor size={18} className="text-indigo-400" />
              <span className="font-extrabold text-white text-xs">
                {language === 'SW' ? 'Bila Google AI Studio' : 'No AI Studio Needed'}
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {language === 'SW'
                  ? 'Ukisha-install App hii, unaifungua moja kwa moja kwenye Laptop au Simu yako kama WhatsApp au Word.'
                  : 'Open directly on your laptop or phone screen like any standard desktop program.'}
              </p>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex flex-col gap-1.5">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span className="font-extrabold text-white text-xs">
                {language === 'SW' ? '100% Offline App' : '100% Offline Capability'}
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {language === 'SW'
                  ? 'Kukata risiti, kuweka bidhaa, na kuona ripoti hakuhitaji MB wala mtandao wa intaneti.'
                  : 'Checkouts, restock, and receipts work seamlessly offline without data fees.'}
              </p>
            </div>
          </div>

          {/* Installation Steps */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <HelpCircle size={14} className="text-indigo-400" />
              {language === 'SW' ? 'Hatua za Kusakinisha (Steps to Install):' : 'How to Install as App:'}
            </h4>

            <ol className="space-y-2 text-[11px] text-slate-300 list-decimal list-inside">
              <li className="leading-normal">
                {language === 'SW' ? (
                  <>Bofya kitufe cha <strong className="text-indigo-300">"Sakinisha App Sasa"</strong> hapa chini.</>
                ) : (
                  <>Click the <strong className="text-indigo-300">"Install App Now"</strong> button below.</>
                )}
              </li>
              <li className="leading-normal">
                {language === 'SW' ? (
                  <>Kama hutokiona kisanduku, fungua menu ya browser yako (Chrome/Edge/Brave) kisha chagua <strong className="text-white">"Install LedgerBox"</strong> au <strong className="text-white">"Add to Home Screen"</strong>.</>
                ) : (
                  <>Or open browser menu (3 dots) and select <strong className="text-white">"Install LedgerBox"</strong> or <strong className="text-white">"Add to Home Screen"</strong>.</>
                )}
              </li>
              <li className="leading-normal">
                {language === 'SW' ? (
                  <>Anza kutumia LedgerBox bure kwenye laptop au simu yako bila haja ya kufungua Google AI Studio tena!</>
                ) : (
                  <>Launch LedgerBox anytime directly from your desktop icon offline!</>
                )}
              </li>
            </ol>
          </div>

          {/* Primary Install Trigger Button */}
          {isInstalled ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center justify-center gap-2 font-bold text-xs">
              <CheckCircle2 size={18} />
              {language === 'SW' ? 'LedgerBox Ishasakinishwa Kwenye Kifaa Hiki!' : 'LedgerBox is Installed on this Device!'}
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-950/60 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Download size={16} />
              {language === 'SW' ? 'Sakinisha App Sasa (Install Offline App)' : 'Install Standalone App Now'}
            </button>
          )}

        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500 font-medium flex justify-between items-center">
          <span>LedgerBox POS & Store Engine v3.0</span>
          <span>100% Local Browser Engine</span>
        </div>

      </div>
    </div>
  );
}
