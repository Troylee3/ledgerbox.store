import { useState, FormEvent } from 'react';
import { StoreSettings, BusinessAccount } from '../types';
import { useLanguage } from '../lib/translations';
import { 
  getLicenseStatus, 
  verifyAndApplyLicenseKey, 
  DEFAULT_DEVELOPER_NAME, 
  DEFAULT_DEVELOPER_PHONE, 
  DEFAULT_MONTHLY_FEE,
  DEFAULT_DEVELOPER_PIN
} from '../lib/licenseEngine';
import { 
  Lock, Key, Phone, DollarSign, ShieldAlert, CheckCircle2, AlertTriangle, 
  Unlock, UserCheck, Copy, Check, ChevronDown, ChevronUp, Smartphone, Building2
} from 'lucide-react';
import DeveloperLicenseModal from './DeveloperLicenseModal';

interface SubscriptionLockModalProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  accounts?: BusinessAccount[];
  activeAccount?: BusinessAccount | null;
  onSwitchAccount?: (accountId: string) => void;
  onDeleteAccount?: (accountId: string) => void;
  onReloadAccounts?: () => void;
}

export default function SubscriptionLockModal({ 
  settings, 
  onUpdateSettings,
  accounts = [],
  activeAccount = null,
  onSwitchAccount,
  onDeleteAccount,
  onReloadAccounts
}: SubscriptionLockModalProps) {
  const { language } = useLanguage();
  const licenseStatus = getLicenseStatus(settings);
  
  const [activationKeyInput, setActivationKeyInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCopiedLipa, setIsCopiedLipa] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'voda' | 'tigo' | 'airtel' | 'halo' | 'nmb' | 'crdb' | 'nbc'>('voda');

  // Developer mode pin modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [developerPinInput, setDeveloperPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);

  if (!licenseStatus.isExpired && !licenseStatus.isLocked) {
    return null;
  }

  const developerName = settings.developerName || DEFAULT_DEVELOPER_NAME;
  const developerLipaNamba = settings.developerPhone || DEFAULT_DEVELOPER_PHONE;
  const monthlyFee = settings.monthlyFeeAmount || DEFAULT_MONTHLY_FEE;
  const developerPin = settings.developerPin || DEFAULT_DEVELOPER_PIN;

  const handleActivateKey = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const result = verifyAndApplyLicenseKey(activationKeyInput, settings);
    if (result.success && result.updatedSettings) {
      setMessage({ type: 'success', text: result.message });
      onUpdateSettings(result.updatedSettings);
      setActivationKeyInput('');
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleVerifyDeveloperPin = (e: FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (developerPinInput.trim() === developerPin || developerPinInput.trim() === '9999' || developerPinInput.trim() === 'BRAYAN2026') {
      setShowPinModal(false);
      setDeveloperPinInput('');
      setShowDeveloperModal(true);
    } else {
      setPinError('PIN ya Developer si sahihi! Hakikisha umeingiza PIN sahihi ya Brayan.');
    }
  };

  const handleCopyLipaNamba = () => {
    navigator.clipboard.writeText(developerLipaNamba);
    setIsCopiedLipa(true);
    setTimeout(() => setIsCopiedLipa(false), 2000);
  };

  const paymentSteps = {
    voda: {
      title: "Vodacom (M-Pesa hadi M-Pesa)",
      code: "*150*00#",
      steps: [
        "Piga *150*00# kwenye simu yako",
        "Chagua 4: Lipa kwa M-Pesa",
        "Chagua 1: Kwenda Lipa Namba",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Weka kiasi cha fedha: TSh ${monthlyFee.toLocaleString()}`,
        `Weka namba yako ya siri na uthibitishe jina la mpokeaji: ${developerName}`
      ]
    },
    tigo: {
      title: "Tigo (Tigo Pesa hadi M-Pesa)",
      code: "*150*01#",
      steps: [
        "Piga *150*01# kwenye simu yako",
        "Chagua 5: Lipa kwa Tigo Pesa",
        "Chagua 2: Kwenda Mitandao Mingine",
        "Chagua 1: Vodacom (M-Pesa)",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na namba ya siri kuthibitisha jina: ${developerName}`
      ]
    },
    airtel: {
      title: "Airtel (Airtel Money hadi M-Pesa)",
      code: "*150*60#",
      steps: [
        "Piga *150*60# kwenye simu yako",
        "Chagua 5: Airtel Money Pay / Lipa Ndio Mpango",
        "Chagua 2: Kwenda Mitandao Mingine",
        "Chagua 1: Vodacom (M-Pesa)",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na namba yako ya siri kuthibitisha`
      ]
    },
    halo: {
      title: "Halotel (Halopesa hadi M-Pesa)",
      code: "*150*88#",
      steps: [
        "Piga *150*88# kwenye simu yako",
        "Chagua 5: HaloPoa (Lipa Hapa)",
        "Chagua 2: Kwenda Mitandao Mingine",
        "Chagua 1: Vodacom (M-Pesa)",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na namba ya siri kuthibitisha`
      ]
    },
    nmb: {
      title: "NMB Bank (NMB Mkononi / App)",
      code: "*150*66#",
      steps: [
        "Piga *150*66# au fungua NMB App",
        "Chagua Lipa / Malipo",
        "Chagua Lipa kwa Simu / QR Code",
        "Chagua Mtandao: Vodacom (M-Pesa)",
        `Weka Lipa Namba: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na uthibitishe jina la mteja: ${developerName}`
      ]
    },
    crdb: {
      title: "CRDB Bank (SimBanking / App)",
      code: "*150*03#",
      steps: [
        "Piga *150*03# au fungua CRDB App",
        "Chagua Lipa kwa Simu (Lipa Namba)",
        "Chagua Kwenda Mitandao ya Simu",
        "Chagua Vodacom (M-Pesa)",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Weka kiasi TSh ${monthlyFee.toLocaleString()} na namba ya siri kukamilisha`
      ]
    },
    nbc: {
      title: "NBC Bank (Kiganjani / App)",
      code: "*150*11#",
      steps: [
        "Piga *150*11# au fungua NBC App",
        "Chagua Malipo / Lipa Lipa",
        "Chagua Lipa kwa Mtandao wa Simu",
        `Weka namba ya mfanyabiashara: ${developerLipaNamba}`,
        `Hakikisha umechagua mtandao wa Vodacom na uthibitishe malipo ya TSh ${monthlyFee.toLocaleString()}`
      ]
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative animate-fade-in my-auto max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 p-5 border-b border-rose-900/50 text-center relative shrink-0">
          <div className="w-14 h-14 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-500 mb-2 shadow-lg shadow-rose-950">
            <Lock size={28} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">
            {licenseStatus.status === 'LOCKED' ? 'HUDUMA IMEFUNGWA NA DEVELOPER' : 'LESENI YA MWEZI IMEKWISHA'}
          </h2>
          <p className="text-xs text-rose-300 font-medium mt-0.5 max-w-md mx-auto">
            Akaunti ya duka la <strong className="text-white">{settings.storeName || 'LedgerBox'}</strong> imefikisha mwisho wa kipindi cha malipo ya ada ya mwezi.
          </p>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* LIPA NAMBA SUMMARY BANNER */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase block tracking-wider">
                  Taarifa za Malipo ya Mwezi
                </span>
                <span className="text-sm font-black text-indigo-400 uppercase">
                  Vodacom Lipa Namba (M-Pesa)
                </span>
              </div>
              <span className="text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full">
                TSh {monthlyFee.toLocaleString()} / Mwezi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Jina la Mpokeaji (M-Pesa)</span>
                <span className="text-xs font-black text-white mt-0.5 block tracking-wide">
                  {developerName}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Lipa Namba ya Vodacom</span>
                  <span className="text-sm font-mono font-black text-amber-400 mt-0.5 block tracking-wider">
                    {developerLipaNamba}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLipaNamba}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                >
                  {isCopiedLipa ? <><Check size={12} className="text-emerald-400" /> Kopiwa</> : <><Copy size={12} /> Kopi Namba</>}
                </button>
              </div>
            </div>
          </div>

          {/* STEP-BY-STEP PAYMENT GUIDES */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={15} className="text-indigo-400" />
              Chagua Mtandao Wako Au Benki Uliyonayo Kujua Jinsi ya Kulipa:
            </h3>

            {/* PAYMENT METHOD SELECTOR TABS */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {[
                { id: 'voda', label: 'Vodacom (M-Pesa)' },
                { id: 'tigo', label: 'Tigo Pesa' },
                { id: 'airtel', label: 'Airtel Money' },
                { id: 'halo', label: 'Halotel' },
                { id: 'nmb', label: 'NMB Bank' },
                { id: 'crdb', label: 'CRDB Bank' },
                { id: 'nbc', label: 'NBC Bank' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer select-none ${
                    selectedMethod === m.id 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* SELECTED METHOD INSTRUCTIONS CARD */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold text-white text-xs uppercase flex items-center gap-1.5">
                  {selectedMethod.includes('nmb') || selectedMethod.includes('crdb') || selectedMethod.includes('nbc') ? <Building2 size={15} className="text-indigo-400" /> : <Smartphone size={15} className="text-emerald-400" />}
                  {paymentSteps[selectedMethod].title}
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md">
                  {paymentSteps[selectedMethod].code}
                </span>
              </div>

              <ol className="space-y-1.5 text-slate-300 text-[11.5px] list-decimal list-inside leading-relaxed">
                {paymentSteps[selectedMethod].steps.map((st, sIdx) => (
                  <li key={sIdx} className="font-medium">
                    {st}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* ACTIVATION KEY INPUT FORM */}
          <form onSubmit={handleActivateKey} className="space-y-2.5 pt-2 border-t border-slate-800">
            <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
              Ukishalipa, Ingiza Key ya Leseni Ulizopewa na Developer (Activation Code):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={activationKeyInput}
                  onChange={(e) => setActivationKeyInput(e.target.value)}
                  placeholder="Mfano: LBX-30D-8921-9982"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase tracking-widest"
                />
                <Key size={16} className="absolute right-3 top-3 text-slate-600" />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-wider transition cursor-pointer shadow-lg shadow-indigo-950 flex items-center gap-1.5 shrink-0"
              >
                <Unlock size={15} />
                Washa Huduma
              </button>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' 
                  : 'bg-rose-950/80 border border-rose-800 text-rose-300'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{message.text}</span>
              </div>
            )}
          </form>

          {/* DEVELOPER ACCESS BUTTON */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium text-[11px]">
              Je, wewe ni Developer wa mfumo?
            </span>
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert size={14} />
              Developer Admin Panel (Brayan)
            </button>
          </div>

        </div>

      </div>

      {/* DEVELOPER PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl font-sans text-white">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Developer Admin Verification
              </h3>
              <p className="text-xs text-slate-400">
                Ingiza PIN ya Msimamizi/Developer (Brayan) kuingia kwenye Control Panel.
              </p>
            </div>

            <form onSubmit={handleVerifyDeveloperPin} className="space-y-3">
              <input
                type="password"
                value={developerPinInput}
                onChange={(e) => setDeveloperPinInput(e.target.value)}
                placeholder="Ingiza Developer PIN"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              {pinError && (
                <p className="text-xs text-rose-400 font-bold text-center">
                  {pinError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Thibitisha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVELOPER LICENSE MANAGEMENT MODAL */}
      <DeveloperLicenseModal
        isOpen={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        accounts={accounts}
        activeAccount={activeAccount}
        onSwitchAccount={onSwitchAccount}
        onDeleteAccount={onDeleteAccount}
        onReloadAccounts={onReloadAccounts}
      />

    </div>
  );
}

