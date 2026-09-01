import React, { useState, FormEvent } from 'react';
import { StoreSettings } from '../types';
import { 
  getLicenseStatus, 
  verifyAndApplyLicenseKey,
  DEFAULT_DEVELOPER_NAME,
  DEFAULT_DEVELOPER_PHONE,
  DEFAULT_MONTHLY_FEE
} from '../lib/licenseEngine';
import { 
  AlertTriangle, 
  Clock, 
  X, 
  Unlock, 
  Key, 
  CheckCircle2, 
  Copy, 
  Check, 
  Smartphone, 
  Building2,
  Sparkles
} from 'lucide-react';

interface SubscriptionAlertBannerProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  language?: 'SW' | 'EN';
}

export default function SubscriptionAlertBanner({ 
  settings, 
  onUpdateSettings,
  language = 'SW' 
}: SubscriptionAlertBannerProps) {
  const licenseStatus = getLicenseStatus(settings);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activationKeyInput, setActivationKeyInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCopiedLipa, setIsCopiedLipa] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'voda' | 'tigo' | 'airtel' | 'halo' | 'nmb' | 'crdb'>('voda');

  // Do not show banner if subscription is healthy (> 7 days remaining), lifetime, or already locked/expired (handled by SubscriptionLockModal)
  if (
    isDismissed || 
    licenseStatus.isExpired || 
    licenseStatus.isLocked || 
    licenseStatus.plan === 'LIFETIME' || 
    licenseStatus.daysRemaining > 7
  ) {
    return null;
  }

  const daysLeft = licenseStatus.daysRemaining;
  const isUrgent = daysLeft <= 3;
  const developerName = settings.developerName || DEFAULT_DEVELOPER_NAME;
  const developerLipaNamba = settings.developerPhone || DEFAULT_DEVELOPER_PHONE;
  const monthlyFee = settings.monthlyFeeAmount || DEFAULT_MONTHLY_FEE;

  const handleCopyLipaNamba = () => {
    navigator.clipboard.writeText(developerLipaNamba);
    setIsCopiedLipa(true);
    setTimeout(() => setIsCopiedLipa(false), 2000);
  };

  const handleActivateKey = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const result = verifyAndApplyLicenseKey(activationKeyInput, settings);
    if (result.success && result.updatedSettings) {
      setMessage({ type: 'success', text: result.message });
      onUpdateSettings(result.updatedSettings);
      setActivationKeyInput('');
      setTimeout(() => {
        setShowPayModal(false);
        setMessage(null);
      }, 1800);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const paymentSteps = {
    voda: {
      title: "Vodacom (M-Pesa)",
      code: "*150*00#",
      steps: [
        "Piga *150*00# kwenye simu yako",
        "Chagua 4: Lipa kwa M-Pesa",
        "Chagua 1: Kwenda Lipa Namba",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Weka kiasi: TSh ${monthlyFee.toLocaleString()}`,
        `Weka namba ya siri kuthibitisha mteja: ${developerName}`
      ]
    },
    tigo: {
      title: "Tigo Pesa",
      code: "*150*01#",
      steps: [
        "Piga *150*01# kwenye simu yako",
        "Chagua 5: Lipa kwa Tigo Pesa",
        "Chagua 2: Kwenda Mitandao Mingine",
        "Chagua 1: Vodacom (M-Pesa)",
        `Weka namba: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na uthibitishe jina ${developerName}`
      ]
    },
    airtel: {
      title: "Airtel Money",
      code: "*150*60#",
      steps: [
        "Piga *150*60#",
        "Chagua 5: Airtel Money Pay",
        "Chagua 2: Kwenda Mitandao Mingine (Vodacom)",
        `Weka Lipa Namba: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na namba ya siri`
      ]
    },
    halo: {
      title: "Halopesa",
      code: "*150*88#",
      steps: [
        "Piga *150*88#",
        "Chagua 5: HaloPoa / Lipa Hapa",
        "Chagua 2: Kwenda Mitandao Mingine (Vodacom)",
        `Weka Lipa Namba: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na namba ya siri`
      ]
    },
    nmb: {
      title: "NMB Bank App / USSD",
      code: "*150*66#",
      steps: [
        "Piga *150*66# au NMB App",
        "Chagua Lipa kwa Simu",
        "Mtandao: Vodacom M-Pesa",
        `Weka Lipa Namba: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()}`
      ]
    },
    crdb: {
      title: "CRDB SimBanking",
      code: "*150*03#",
      steps: [
        "Piga *150*03# au SimBanking App",
        "Chagua Lipa kwa Simu",
        "Mtandao: Vodacom M-Pesa",
        `Weka Lipa Namba: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()}`
      ]
    }
  };

  return (
    <>
      {/* TOP NOTIFICATION WARNING BANNER */}
      <div 
        className={`w-full py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-md border-b text-xs font-sans transition-all duration-300 animate-fade-in ${
          isUrgent 
            ? 'bg-gradient-to-r from-rose-900 via-red-800 to-rose-900 text-white border-rose-700' 
            : 'bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 text-slate-950 font-medium border-amber-500'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${isUrgent ? 'bg-rose-950 text-rose-300 animate-pulse' : 'bg-amber-900/30 text-slate-950'}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded ${
                isUrgent ? 'bg-rose-950 text-rose-200 border border-rose-700' : 'bg-slate-950/20 text-slate-950 font-bold'
              }`}>
                {language === 'SW' ? `SIKU ${daysLeft} ZIMESALIA` : `${daysLeft} DAYS REMAINING`}
              </span>
              <p className={`font-semibold text-xs truncate ${isUrgent ? 'text-white' : 'text-slate-950'}`}>
                {language === 'SW' ? (
                  <>
                    Leseni ya mwezi ya duka lako <strong className="underline decoration-wavy">{settings.storeName || 'Duka'}</strong> itaisha tarehe <strong className="font-bold">{licenseStatus.formattedExpiry}</strong>.
                  </>
                ) : (
                  <>
                    Monthly subscription for <strong className="underline">{settings.storeName || 'Store'}</strong> expires on <strong className="font-bold">{licenseStatus.formattedExpiry}</strong>.
                  </>
                )}
              </p>
            </div>
            <p className={`text-[11px] opacity-90 hidden md:block ${isUrgent ? 'text-rose-100' : 'text-slate-900'}`}>
              {language === 'SW' 
                ? 'Lipia mwezi unaofuata mapema kuzuia mfumo usijifunge na kusitisha mauzo.' 
                : 'Renew early to prevent automatic system lock and ensure smooth sales operations.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPayModal(true)}
            className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
              isUrgent 
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-950/50 animate-bounce' 
                : 'bg-slate-950 hover:bg-slate-900 text-white'
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>{language === 'SW' ? `Lipia Sasa (TSh ${monthlyFee.toLocaleString()})` : `Renew Now`}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            title="Funga taarifa hii kwa sasa"
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isUrgent ? 'hover:bg-rose-800 text-rose-200' : 'hover:bg-amber-700/40 text-slate-950'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* RENEWAL PAYMENT & KEY ENTRY MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-955/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative animate-fade-in my-auto max-h-[92vh] flex flex-col text-white text-xs">
            
            {/* MODAL HEADER */}
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-4 border-b border-indigo-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Clock size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-white tracking-wide">
                    {language === 'SW' ? 'Lipia au Ongeza Leseni ya Mwezi' : 'Renew Monthly License'}
                  </h3>
                  <p className="text-[11px] text-indigo-300">
                    Siku <strong className="text-amber-400">{daysLeft}</strong> zimesalia kwa duka la <strong className="text-white">{settings.storeName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* LIPA NAMBA DETAILS */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-wider">
                    Vodacom Lipa Namba (M-Pesa)
                  </span>
                  <span className="text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                    TSh {monthlyFee.toLocaleString()} / Mwezi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase block">Jina la Mpokeaji</span>
                    <span className="text-xs font-black text-white mt-0.5 block">{developerName}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase block">Lipa Namba</span>
                      <span className="text-xs font-mono font-black text-amber-400 mt-0.5 block">{developerLipaNamba}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLipaNamba}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {isCopiedLipa ? <><Check size={11} className="text-emerald-400" /> Kopiwa</> : <><Copy size={11} /> Kopi</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider block">
                  Chagua Mtandao Wako Kulipa:
                </span>
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[
                    { id: 'voda', label: 'Vodacom' },
                    { id: 'tigo', label: 'Tigo Pesa' },
                    { id: 'airtel', label: 'Airtel' },
                    { id: 'halo', label: 'Halotel' },
                    { id: 'nmb', label: 'NMB Bank' },
                    { id: 'crdb', label: 'CRDB Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                        selectedMethod === m.id 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-bold text-white text-[11px] uppercase flex items-center gap-1">
                      {selectedMethod.includes('nmb') || selectedMethod.includes('crdb') ? <Building2 size={13} className="text-indigo-400" /> : <Smartphone size={13} className="text-emerald-400" />}
                      {paymentSteps[selectedMethod].title}
                    </span>
                    <span className="text-[9.5px] font-mono bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded">
                      {paymentSteps[selectedMethod].code}
                    </span>
                  </div>
                  <ol className="space-y-1 text-slate-300 text-[11px] list-decimal list-inside">
                    {paymentSteps[selectedMethod].steps.map((st, sIdx) => (
                      <li key={sIdx}>{st}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* ACTIVATION KEY FORM */}
              <form onSubmit={handleActivateKey} className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                  Ingiza Key ya Leseni Ulizopewa Baada ya Kulipa (Activation Key):
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={activationKeyInput}
                      onChange={(e) => setActivationKeyInput(e.target.value)}
                      placeholder="LBX-30D-XXXX-YYYY"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
                    />
                    <Key size={14} className="absolute right-3 top-2.5 text-slate-600" />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Unlock size={14} />
                    Washa
                  </button>
                </div>

                {message && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    message.type === 'success' 
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' 
                      : 'bg-rose-950 border border-rose-800 text-rose-300'
                  }`}>
                    {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{message.text}</span>
                  </div>
                )}
              </form>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
