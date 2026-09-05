import React, { useState, useMemo } from 'react';
import { DbState, StaffUser, BusinessAccount } from '../types';
import { 
  Search, Lock, User, Shield, Smartphone, Monitor, Download, ArrowRight, ShoppingBag, 
  UserPlus, LogIn, Store, Users, CheckCircle, CheckCircle2, HelpCircle, LogOut, Sparkles, Phone, Mail,
  AlertCircle, ExternalLink, FileText
} from 'lucide-react';
import { useLanguage } from '../lib/translations';
import { googleSignIn } from '../lib/firebase';
import OfflinePwaInstallModal from './OfflinePwaInstallModal';
import SystemDocumentationModal from './SystemDocumentationModal';
import PrivacyPolicyView from './PrivacyPolicyView';
import { FileCheck, ShieldAlert } from 'lucide-react';

interface LoginViewProps {
  state: DbState;
  setCurrentUser: (user: StaffUser | null) => void;
  accounts?: BusinessAccount[];
  activeAccount?: BusinessAccount | null;
  registerAccount?: (email: string, ownerName: string, storeName: string, password?: string, phone?: string) => BusinessAccount;
  loginAccount?: (emailOrPhoneOrName: string, password?: string) => boolean;
  logoutAccount?: () => void;
  switchAccount?: (accountId: string) => void;
}

export default function LoginView({ 
  state, 
  setCurrentUser,
  accounts = [],
  activeAccount,
  registerAccount,
  loginAccount,
  logoutAccount,
  switchAccount
}: LoginViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const { users = [], products = [], categories = [], settings } = state;

  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && (
        window.location.search.toLowerCase().includes('privacy') || 
        window.location.hash.toLowerCase().includes('privacy') ||
        window.location.pathname.toLowerCase().includes('privacy')
      );
    } catch {
      return false;
    }
  });

  // Mode state: 'PIN_CASHIER' | 'REGISTER_ACCOUNT' | 'SWITCH_ACCOUNT'
  const [authMode, setAuthMode] = useState<'PIN_CASHIER' | 'REGISTER_ACCOUNT' | 'SWITCH_ACCOUNT'>(() => {
    if (!activeAccount || accounts.length === 0) {
      return 'REGISTER_ACCOUNT';
    }
    return 'PIN_CASHIER';
  });

  React.useEffect(() => {
    if (!activeAccount || accounts.length === 0) {
      setAuthMode('REGISTER_ACCOUNT');
    }
  }, [activeAccount, accounts.length]);

  // Login related state
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedPinUser, setSelectedPinUser] = useState<StaffUser | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register New Store Account Form
  const [regStoreName, setRegStoreName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  // Login Existing Store Account Form
  const [loginTerm, setLoginTerm] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [accountError, setAccountError] = useState('');

  // Public Search related state
  const [productSearchText, setProductSearchText] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchText.toLowerCase())
    );
  }, [users, userSearchText]);

  // Filter products for public price checker
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(productSearchText.toLowerCase()) ||
                            p.barcode.includes(productSearchText);
      const matchesCategory = activeCategoryFilter === 'ALL' || p.category === activeCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearchText, activeCategoryFilter]);

  // Keypad actions for PIN
  const handleKeypadPress = (num: string) => {
    setLoginError('');
    if (enteredPin.length < 6) {
      setEnteredPin(prev => prev + num);
    }
  };

  const handleKeypadBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPinUser) return;

    if (enteredPin === selectedPinUser.pin) {
      setCurrentUser(selectedPinUser);
    } else {
      setLoginError(t('invalidPin'));
      setEnteredPin('');
    }
  };

  // Submit New Business Account Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    if (!regStoreName.trim() || !regOwnerName.trim()) {
      setAccountError(language === 'SW' ? 'Tafadhali jaza Jina la Duka na Mwenye Duka.' : 'Please enter Store Name and Owner Name.');
      return;
    }

    if (registerAccount) {
      const emailToUse = regEmail.trim() || `${regStoreName.toLowerCase().replace(/\s+/g, '')}@duka.tz`;
      const created = registerAccount(emailToUse, regOwnerName.trim(), regStoreName.trim(), regPassword || '123456', regPhone.trim());
      setRegSuccessMsg(
        language === 'SW' 
          ? `Akaunti ya "${created.storeName}" imetengenezwa kikamilifu! Stoo na miamala viko tupu (0). Ingia kama Admin kutumia PIN "1234".` 
          : `Account for "${created.storeName}" created successfully! Store and transactions are fresh & empty (0). Log in as Admin using PIN "1234".`
      );
      setAuthMode('PIN_CASHIER');
      // Reset form
      setRegStoreName('');
      setRegOwnerName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
    }
  };

  // Submit Existing Store Account Login
  const handleAccountLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    if (!loginTerm.trim()) {
      setAccountError(language === 'SW' ? 'Weka barua pepe, namba ya simu au jina la duka.' : 'Enter email, phone, or store name.');
      return;
    }

    if (loginAccount) {
      const ok = loginAccount(loginTerm.trim(), loginPassword);
      if (ok) {
        setAccountError('');
        setAuthMode('PIN_CASHIER');
      } else {
        setAccountError(language === 'SW' ? 'Akaunti haijapatikana au nenosiri si sahihi.' : 'Account not found or invalid password.');
      }
    }
  };

  // Google Sign-In Handler
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAuthErrorDetails, setGoogleAuthErrorDetails] = useState<{ message: string; isNetworkOrIframe: boolean } | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setAccountError('');
      setGoogleAuthErrorDetails(null);
      const res = await googleSignIn();
      if (res && res.user) {
        const email = res.user.email || `google_${res.user.uid}@duka.tz`;
        const name = res.user.displayName || 'Mwenye Duka';
        const storeName = `Duka la ${name}`;

        if (loginAccount && loginAccount(email)) {
          setAuthMode('PIN_CASHIER');
        } else if (registerAccount) {
          registerAccount(email, name, storeName, 'google_auth');
          setAuthMode('PIN_CASHIER');
        }
      }
    } catch (err: any) {
      const isNetwork = err?.isNetworkOrIframeError || 
        err?.code === 'auth/network-request-failed' || 
        String(err?.message || err).includes('network-request-failed') ||
        err?.code === 'auth/popup-blocked';

      console.warn('[LoginView] Google sign in notice:', err?.message || err);
      
      setGoogleAuthErrorDetails({
        message: language === 'SW'
          ? (isNetwork
              ? 'Kuingia na Google kumezuiwa na kivinjari au mtandao kwenye sanduku la preview (iframe). Unaweza kufungua kwenye Tab Mpya au kutumia usajili wa kawaida wa duka hapa chini unaofanya kazi 100% bila mtandao.'
              : 'Imeshindikana kuingia na Akaunti ya Google. Tafadhali jaribu tena au tumia fomu ya duka.')
          : (isNetwork
              ? 'Google Sign-in popup was blocked or unable to reach auth network inside iframe preview. You can open in a new tab or use direct store registration below (100% offline-ready).'
              : 'Failed to sign in with Google. Please retry or register store directly below.'),
        isNetworkOrIframe: !!isNetwork
      });

      setAccountError(
        language === 'SW'
          ? 'Imefeli kuingia na Google. Tumia usajili wa duka au fungua tab mpya.'
          : 'Google sign-in failed. Use store registration or open in a new tab.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans flex flex-col md:flex-row select-none overflow-y-auto md:overflow-hidden">
      
      {/* LEFT COLUMN: MULTI-USER AUTHENTICATION & POS PIN SYSTEM */}
      <div className="w-full md:w-[480px] bg-slate-900/70 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 z-10 shrink-0 md:h-screen md:overflow-y-auto scrollbar-thin">
        
        {/* Brand Header */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <img 
                src={settings?.logoUrl || '/logo.png'} 
                alt={settings?.storeName || 'LedgerBox Logo'} 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shadow-lg border border-indigo-500/80 shadow-indigo-950 bg-slate-950 shrink-0" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div className="min-w-0">
                <h1 className="font-black text-sm sm:text-base tracking-tight leading-none uppercase text-white truncate">
                  {settings?.storeName || 'LEDGERBOX'}
                </h1>
                <p className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase mt-1">
                  {language === 'SW' ? 'Mfumo wa Duka & Mauzo' : 'Multi-User POS System'}
                </p>
              </div>
            </div>

            {/* Language & PWA Offline Install Switcher */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <button
                onClick={() => setIsPwaModalOpen(true)}
                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="Sakinisha App Offline"
              >
                <Download size={11} className="text-emerald-400 shrink-0" />
                <span>{language === 'SW' ? 'Sakinisha App' : 'Install App'}</span>
              </button>

              <button
                onClick={() => setIsDocModalOpen(true)}
                className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="Mwongozo wa Mfumo PDF"
              >
                <FileCheck size={11} className="text-indigo-400 shrink-0" />
                <span>{language === 'SW' ? 'Mwongozo PDF' : 'PDF Specs'}</span>
              </button>

              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setLanguage('SW')}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition cursor-pointer ${language === 'SW' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}
                >
                  SW
                </button>
                <button
                  onClick={() => setLanguage('EN')}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition cursor-pointer ${language === 'EN' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE ACCOUNT BANNER */}
          {activeAccount && (
            <div className="mb-4 bg-slate-950 p-2.5 rounded-xl border border-indigo-900/60 flex items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 flex items-center justify-center shrink-0">
                  <Store size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-indigo-400 uppercase font-black tracking-wider leading-none">
                    {language === 'SW' ? 'Akaunti ya Duka Iliyopo' : 'Active Store Account'}
                  </p>
                  <h4 className="text-xs font-bold text-white truncate mt-0.5">
                    {activeAccount.storeName} ({activeAccount.ownerName})
                  </h4>
                </div>
              </div>

              <button
                onClick={() => {
                  setAuthMode('SWITCH_ACCOUNT');
                  setSelectedPinUser(null);
                }}
                className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Users size={12} />
                {language === 'SW' ? 'Badilisha' : 'Switch'}
              </button>
            </div>
          )}

          {/* AUTHENTICATION MODE TABS */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
            <button
              onClick={() => {
                setAuthMode('PIN_CASHIER');
                setAccountError('');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'PIN_CASHIER' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield size={13} />
              {language === 'SW' ? 'Log In Mfanyakazi' : 'Cashier PIN'}
            </button>

            <button
              onClick={() => {
                setAuthMode('REGISTER_ACCOUNT');
                setSelectedPinUser(null);
                setAccountError('');
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'REGISTER_ACCOUNT' || authMode === 'SWITCH_ACCOUNT'
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={13} />
              {language === 'SW' ? '+ Sajili Duka Jipya' : '+ New Store'}
            </button>
          </div>
        </div>

        {/* Dynamic State 1: STAFF PIN LOGIN FOR ACTIVE STORE ACCOUNT */}
        {authMode === 'PIN_CASHIER' && (
          <>
            {!selectedPinUser ? (
              <div className="space-y-4 my-auto">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Shield size={16} className="text-indigo-400" />
                    {t('loginTitle')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{t('chooseUser')}</p>
                </div>

                {regSuccessMsg && (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-medium">
                    {regSuccessMsg}
                  </div>
                )}

                {/* Search staff user */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    id="login-staff-search"
                    type="text"
                    placeholder={t('searchProductPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
                    value={userSearchText}
                    onChange={e => setUserSearchText(e.target.value)}
                  />
                </div>

                {/* Staff Card selector */}
                <div className="space-y-2 max-h-[220px] md:max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(usr => (
                      <button
                        key={usr.id}
                        onClick={() => {
                          setSelectedPinUser(usr);
                          setEnteredPin('');
                          setLoginError('');
                        }}
                        className="w-full p-3 bg-slate-950/60 hover:bg-slate-950 hover:border-slate-700 transition border border-slate-850 rounded-xl flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400 border border-slate-700">
                            {usr.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs block text-slate-200">{usr.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">{usr.role}</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-500 hover:text-indigo-400" />
                      </button>
                    ))
                  ) : (
                    <p className="text-[11px] text-center text-slate-500 py-4 font-mono">
                      {language === 'SW' ? 'Hakuna mfanyakazi aliyepatikana kwa jina hilo.' : 'No staff member found.'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* PIN DIAL PAD INTERFACE */
              <div className="space-y-4 my-auto animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedPinUser(null);
                      setEnteredPin('');
                      setLoginError('');
                    }}
                    className="text-xs text-indigo-450 hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {language === 'SW' ? '← Rudi kwenye Orodha' : '← Back to List'}
                  </button>
                  <span className="text-[9px] bg-indigo-900/60 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-800">
                    {selectedPinUser.role}
                  </span>
                </div>

                <div className="text-center py-1">
                  <p className="text-[10px] text-slate-450 uppercase tracking-widest font-black">
                    {language === 'SW' ? 'Mhudumu wa Mauzo' : 'Sales Cashier'}
                  </p>
                  <h3 className="text-base font-black text-white mt-0.5">{selectedPinUser.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t('enterPin')}</p>
                </div>

                {/* Password Code display dots */}
                <div className="flex justify-center gap-3 py-1 bg-slate-950 rounded-2xl p-4 border border-slate-850">
                  {[0, 1, 2, 3, 4, 5].map(idx => {
                    const isActive = idx < enteredPin.length;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition duration-150 ${
                          isActive 
                            ? 'bg-indigo-500 scale-110 shadow-md shadow-indigo-500/50' 
                            : 'bg-slate-800 border border-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Error notifications */}
                {loginError && (
                  <p className="text-[10px] font-black text-red-500 text-center animate-bounce leading-none">{loginError}</p>
                )}

                {/* Standard Grid Keypad pad layout */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto w-full">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-11 bg-slate-950 text-white font-black text-base hover:bg-slate-850 active:bg-indigo-900 border border-slate-855 rounded-xl flex items-center justify-center cursor-pointer transition shadow-sm font-mono"
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-11 bg-slate-950 text-slate-400 font-bold text-xs hover:bg-slate-850 rounded-xl flex items-center justify-center cursor-pointer transition border border-slate-855"
                  >
                    {language === 'SW' ? 'Futa' : 'Clear'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-11 bg-slate-950 text-white font-black text-base hover:bg-slate-850 border border-slate-855 rounded-xl flex items-center justify-center cursor-pointer transition font-mono"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyPin()}
                    disabled={enteredPin.length < 4}
                    className={`h-11 font-black text-xs rounded-xl flex items-center justify-center cursor-pointer transition ${
                      enteredPin.length >= 4
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow shadow-indigo-500/20'
                        : 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    {t('loginBtn')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dynamic State 2: REGISTER NEW STORE OWNER ACCOUNT */}
        {authMode === 'REGISTER_ACCOUNT' && (
          <div className="space-y-4 my-auto animate-fade-in">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <UserPlus size={16} />
                  {language === 'SW' ? 'Sajili Akaunti Mpya ya Duka' : 'Register New Store Account'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Shield size={11} className="text-emerald-400" />
                  <span>{language === 'SW' ? 'Sera ya Faragha' : 'Privacy Policy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'SW' 
                  ? 'Tengeneza akaunti ya duka ili kutenganisha bidhaa na taarifa zako na watumiaji wengine.'
                  : 'Create a separate store account to keep your products and sales independent.'}
              </p>
            </div>

            {/* PRIVACY POLICY & GOOGLE VERIFICATION NOTICE EMBEDDED DIRECTLY IN THE REGISTRATION FORM */}
            <div className="p-3 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold text-[11px] uppercase tracking-wide">
                  <Shield size={13} className="text-emerald-400 shrink-0" />
                  <span>{language === 'SW' ? 'Sera ya Faragha & Usalama wa Data' : 'Privacy Policy & Data Security'}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">
                  Google Verified
                </span>
              </div>
              
              <p className="text-[10px] text-slate-300 leading-relaxed">
                {language === 'SW'
                  ? 'Taarifa zako na za wateja zinalindwa kwa usimbaji fiche (TLS 1.3 & AES-256). Matumizi ya data za Google yanazingatia Google API Services User Data Policy (Limited Use) — hatuuzi wala kugawa data zako kamwe.'
                  : 'Your store records are secured with TLS 1.3 & AES-256 encryption. Google user data strictly adheres to Google API Services User Data Policy (Limited Use) — no data selling or third-party ads.'}
              </p>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={11} />
                  <span>{language === 'SW' ? 'Soma Sera Kamili ya Faragha (Privacy Policy)' : 'Read Complete Privacy Policy'}</span>
                </button>

                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-indigo-300 text-[9.5px] font-mono flex items-center gap-1 transition"
                  title="Fungua faili la HTML"
                >
                  <span>privacy.html</span>
                  <ExternalLink size={9} />
                </a>
              </div>
            </div>

            {accountError && (
              <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold">
                {accountError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                  {language === 'SW' ? 'Jina la Duka (Store Name) *' : 'Store Name *'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Store size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={language === 'SW' ? 'mf. Duka la Anna / Frame B' : 'e.g. Anna Supermarket'}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                    value={regStoreName}
                    onChange={e => setRegStoreName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                  {language === 'SW' ? 'Jina la Mwenye Duka / Msimamizi *' : 'Owner Name *'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={language === 'SW' ? 'mf. Anna Joseph' : 'e.g. Anna Joseph'}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                    value={regOwnerName}
                    onChange={e => setRegOwnerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                    {language === 'SW' ? 'Barua Pepe (Email)' : 'Email'}
                  </label>
                  <input
                    type="email"
                    placeholder="anna@duka.tz"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                    {language === 'SW' ? 'Namba ya Simu' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    placeholder="0712345678"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                  {language === 'SW' ? 'Nenosiri / PIN ya Mwenye Duka' : 'Store Password'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>

              {/* CONSENT NOTICE ABOVE FORM SUBMIT BUTTON */}
              <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start gap-1.5 text-[9.5px] text-slate-400">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  {language === 'SW' ? (
                    <>
                      Kwa kutengeneza akaunti, unakubaliana na{' '}
                      <button
                        type="button"
                        onClick={() => setIsPrivacyModalOpen(true)}
                        className="text-emerald-400 hover:underline font-bold"
                      >
                        Sera ya Faragha (Privacy Policy)
                      </button>{' '}
                      na ulinzi wa taarifa za biashara yako.
                    </>
                  ) : (
                    <>
                      By registering, you agree to our{' '}
                      <button
                        type="button"
                        onClick={() => setIsPrivacyModalOpen(true)}
                        className="text-emerald-400 hover:underline font-bold"
                      >
                        Privacy Policy
                      </button>{' '}
                      and secure data protection terms.
                    </>
                  )}
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus size={15} />
                {language === 'SW' ? 'Tengeneza Akaunti ya Duka' : 'Create Store Account'}
              </button>
            </form>

            {googleAuthErrorDetails && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs space-y-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px] text-amber-200">
                    {googleAuthErrorDetails.message}
                  </p>
                </div>
                {googleAuthErrorDetails.isNetworkOrIframe && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <ExternalLink size={11} />
                      {language === 'SW' ? 'Fungua kwenye Tab Mpya ya Kivinjari' : 'Open in New Browser Tab'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (registerAccount) {
                          registerAccount('mwenyeduka@pos.tz', 'Mwenye Duka', 'Duka Kuu', 'google_auth');
                          setAuthMode('PIN_CASHIER');
                        }
                        setGoogleAuthErrorDetails(null);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer transition flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 size={11} />
                      {language === 'SW' ? 'Ingia Moja kwa Moja (Instant Demo Login)' : 'Instant 1-Click Store Login'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegOwnerName('Mwenye Duka');
                        setRegStoreName('Duka Kuu');
                        setRegEmail('duka@pos.tz');
                        setRegPassword('123456');
                        setGoogleAuthErrorDetails(null);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition"
                    >
                      {language === 'SW' ? 'Jaza Fomu ya Duka' : 'Fill Store Form'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="relative py-1 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <span className="relative bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase">
                {language === 'SW' ? 'au ingia na Google' : 'or Google Login'}
              </span>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              type="button"
              className="w-full py-2 bg-slate-950 hover:bg-slate-850 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition border border-slate-800 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              )}
              {language === 'SW' 
                ? (isGoogleLoading ? 'Inaunganisha Google...' : 'Sajili / Ingia na Akaunti ya Google') 
                : (isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google')}
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => setAuthMode('SWITCH_ACCOUNT')}
                className="text-xs text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                {language === 'SW' ? 'Tayari una akaunti? Ingia hapa →' : 'Already have an account? Sign In →'}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic State 3: SWITCH / LOGIN TO EXISTING STORE ACCOUNT */}
        {authMode === 'SWITCH_ACCOUNT' && (
          <div className="space-y-4 my-auto animate-fade-in">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <LogIn size={16} />
                {language === 'SW' ? 'Ingia au Badilisha Akaunti ya Duka' : 'Switch or Sign In Store Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'SW' ? 'Chagua akaunti iliyotengenezwa hapo awali au ingia na taarifa zako.' : 'Select an existing store account or log in with credentials.'}
              </p>
            </div>

            {accountError && (
              <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold">
                {accountError}
              </div>
            )}

            {/* List of registered accounts on this device */}
            {accounts.length > 0 && (
              <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-1">
                  {language === 'SW' ? 'Akaunti Zilizopo Kwenye Device Hii:' : 'Saved Accounts on Device:'}
                </span>
                {accounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      activeAccount?.id === acc.id 
                        ? 'bg-indigo-950/60 border-indigo-600/80 text-white' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs truncate">{acc.storeName}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{acc.ownerName} ({acc.email})</p>
                    </div>

                    <button
                      onClick={() => {
                        if (switchAccount) switchAccount(acc.id);
                        setAuthMode('PIN_CASHIER');
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shrink-0 ml-2"
                    >
                      {activeAccount?.id === acc.id 
                        ? (language === 'SW' ? 'Ipo Tayari' : 'Active') 
                        : (language === 'SW' ? 'Fungua Duka' : 'Open Store')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleAccountLoginSubmit} className="space-y-2.5 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                  {language === 'SW' ? 'Barua Pepe / Simu / Jina la Duka' : 'Email / Phone / Store Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="anna@duka.tz"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition font-medium"
                  value={loginTerm}
                  onChange={e => setLoginTerm(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-300 uppercase font-extrabold block mb-1">
                  {language === 'SW' ? 'Nenosiri' : 'Password'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition font-medium"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 mt-1"
              >
                <LogIn size={15} />
                {language === 'SW' ? 'Ingia Kwenye Duka Hili' : 'Login to Store Account'}
              </button>
            </form>

            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <button
                onClick={() => setAuthMode('REGISTER_ACCOUNT')}
                className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                {language === 'SW' ? '+ Sajili Akaunti Mpya ya Duka →' : '+ Register New Store Account →'}
              </button>
              
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer font-medium"
              >
                <Shield size={11} className="text-emerald-400" />
                <span>{language === 'SW' ? 'Sera ya Faragha (Privacy Policy)' : 'Privacy Policy & Terms'}</span>
              </button>
            </div>
          </div>
        )}

        {/* PUBLIC PWA APP INSTALLATION INSTRUCTIONS CARD */}
        <div className="mt-5 pt-3 border-t border-slate-800/80">
          <div className="bg-[#111827] border border-indigo-950 p-2.5 rounded-xl">
            <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase flex items-center gap-1.5 mb-1">
              <Smartphone size={13} />
              {language === 'SW' ? 'Pakua App Kwenye Device Zote' : 'Install App on Devices'}
            </span>
            <p className="text-[9.5px] text-slate-400 leading-relaxed font-sans">
              {language === 'SW' 
                ? 'Watu tofauti wanaweza kutengeneza akaunti na kutumia mfumo huu offline kwenye PC, Android, au iPhone kando kando!'
                : 'Multiple store owners can create independent accounts and run this app offline on PC, Android, or iPhone!'}
            </p>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SEARCH WEBSITE / PRICE BROWSER & HOW-TO GUIDE */}
      <div className="flex-1 bg-[#0b0f19] p-4 lg:p-7 flex flex-col justify-between overflow-y-auto md:h-screen">
        
        {/* TOP COMPONENT: PRODUCT PRICE SEARCH WEBSITE PORTAL */}
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShoppingBag size={18} className="text-sky-400" />
                {language === 'SW' ? 'Vinjari Bidhaa & Bei Mauzo (Price Checker Website)' : 'Browse Products & Prices (Price Checker)'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'SW' 
                  ? 'Vinjari au tafuta bei ya bidhaa zilizopo kwenye duka hili bila kulogin.'
                  : 'Browse or search current product prices on this store without logging in.'}
              </p>
            </div>
            
            <div className="bg-slate-900/40 px-3 py-1 rounded-full border border-slate-800 text-[10px] text-sky-400 font-mono font-bold self-start">
              {language === 'SW' ? 'Bidhaa Zinazopatikana' : 'Available Products'}: {products.length}
            </div>
          </div>

          {/* Search Inputs and Category filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            <div className="relative sm:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={15} />
              </span>
              <input
                id="public-product-search-bar"
                type="text"
                placeholder={t('searchProductPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition font-medium"
                value={productSearchText}
                onChange={e => setProductSearchText(e.target.value)}
              />
            </div>

            <select
              className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 px-3.5 py-2.5 focus:outline-none focus:border-sky-500 font-bold"
              value={activeCategoryFilter}
              onChange={e => setActiveCategoryFilter(e.target.value)}
            >
              <option value="ALL">{language === 'SW' ? 'Kundi Yote (All categories)' : 'All Categories'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Real-time searched results grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] md:max-h-[360px] pr-1.5 scrollbar-thin">
            {filteredProducts.length > 0 ? (
              filteredProducts.slice(0, 15).map(prod => {
                const limitAlert = prod.stock <= prod.minStock;
                const catObj = categories.find(c => c.id === prod.category);
                return (
                  <div
                    key={prod.id}
                    className="p-3.5 bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-xl flex flex-col justify-between transition h-[115px] hover:bg-slate-900/60"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2.5 mb-1">
                        <h4 className="font-bold text-[11px] text-white tracking-tight truncate leading-tight line-clamp-2 max-w-[70%]">
                          {prod.name}
                        </h4>
                        <span className="text-[8.5px] px-1.5 py-0.5 rounded-md font-extrabold uppercase bg-slate-800 text-slate-300 truncate">
                          {catObj ? catObj.name : 'Nyingine'}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 font-mono">
                        SKU/Barcode: <strong className="text-slate-400">{prod.barcode || 'N/A'}</strong>
                      </p>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-800/80 pt-2 mt-2">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase leading-none font-medium">
                          {language === 'SW' ? 'Bei Mauzo' : 'Price'}
                        </span>
                        <strong className="text-xs text-emerald-400 font-black font-mono">
                          {settings.currencySymbol} {prod.sellingPrice.toLocaleString()}
                        </strong>
                      </div>

                      <div className="text-right">
                        {prod.stock === 0 ? (
                          <span className="text-[8.5px] text-red-500 bg-red-950/40 px-1.5 py-0.5 rounded font-black uppercase">
                            {language === 'SW' ? 'Imeisha stoo' : 'Out of Stock'}
                          </span>
                        ) : limitAlert ? (
                          <span className="text-[8.5px] text-amber-500 bg-amber-950/40 px-1.5 py-0.5 rounded font-black uppercase">
                            {language === 'SW' ? `Chache: ${prod.stock} tu` : `Low: ${prod.stock} left`}
                          </span>
                        ) : (
                          <span className="text-[8.5px] text-emerald-500 bg-emerald-950/40 px-1.5 py-0.5 rounded font-black uppercase">
                            {language === 'SW' ? `Ipo: ${prod.stock} up` : `In Stock: ${prod.stock}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center text-slate-500">
                <HelpCircle size={28} className="mx-auto text-slate-700 mb-2" />
                <p className="text-[11px] font-sans">
                  {language === 'SW' ? 'Hakuna bidhaa inayolingana na jina hilo kwa sasa.' : 'No matching products found.'}
                </p>
              </div>
            )}
            
            {filteredProducts.length > 15 && (
              <div className="col-span-full text-center text-[10px] text-slate-500 pt-2 border-t border-slate-850">
                Inaonyesha matokeo 15 ya mwanzo. Boresha neno uliloandika kupata yote!
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM COMPONENT: IMMERSIVE APP STORE/PWA INSTALLER GUIDE */}
        <div className="bg-[#111827]/40 border border-slate-850 p-4 rounded-xl mt-6">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-3">
            <Download size={16} className="text-indigo-400 animate-bounce" />
            <span className="font-extrabold text-white text-xs uppercase tracking-wide">
              {language === 'SW' ? 'Mwongozo wa Kupakua & Sakinisha Kwenye Device Zote' : 'PWA Installation Guide (All Devices)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Laptops/PC Guide */}
            <div className="p-3 bg-slate-950/30 rounded-lg border border-slate-900">
              <span className="text-[10px] text-indigo-400 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1">
                <Monitor size={12} />
                {language === 'SW' ? '1. Kwenye Laptop & PC' : '1. Laptop & Desktop PC'}
              </span>
              <p className="text-[9.5px] text-slate-400 leading-relaxed font-sans">
                {language === 'SW'
                  ? 'Fungua mfumo huu ukitumia browser ya Google Chrome au M. Edge. Angalia upande wa kulia wa Address bar, gusa alama ya "+" (Sakinisha/Install).'
                  : 'Open in Google Chrome or Microsoft Edge. On the right side of the address bar, click the "+" icon (Install App) for offline PWA.'}
              </p>
            </div>

            {/* Android phones Guide */}
            <div className="p-3 bg-slate-950/30 rounded-lg border border-slate-900">
              <span className="text-[10px] text-indigo-400 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1">
                <Smartphone size={12} />
                {language === 'SW' ? '2. Kwenye Simu za Android' : '2. Android Smartphones'}
              </span>
              <p className="text-[9.5px] text-slate-400 leading-relaxed font-sans">
                {language === 'SW'
                  ? 'Fungua anwani hii kupitia browser ya Google Chrome ya simu yako. Gusa alama ya nukta tatu (...) na chagua "Sakinisha Programu" (Install App).'
                  : 'Open this link in Chrome on your phone. Tap the three dots (...) menu, then select "Install App" or "Add to Home Screen".'}
              </p>
            </div>

            {/* iPhone/Safari Guide */}
            <div className="p-3 bg-[#131026]/40 rounded-lg border border-indigo-950/60">
              <span className="text-[10px] text-pink-400 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1">
                <Smartphone size={12} className="text-pink-400" />
                {language === 'SW' ? '3. Kwenye iPhone au iPad' : '3. iOS iPhone & iPad'}
              </span>
              <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                {language === 'SW'
                  ? 'Fungua anwani hii ukitumia kivinjari cha Safari. Gusa alama ya Kushiriki (Share icon - mshare wa juu), chagua "Add to Home Screen".'
                  : 'Open this URL in Safari browser. Tap the "Share" button at the bottom (arrow up icon) and select "Add to Home Screen".'}
              </p>
            </div>

          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle size={12} className="text-emerald-500" />
              {t('activeOffline')}
            </span>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer flex items-center gap-1"
            >
              <Shield size={11} />
              <span>{language === 'SW' ? 'Sera ya Faragha & Usalama wa Data (Google Verification)' : 'Privacy Policy & Data Protection (Google Verification)'}</span>
            </button>
            <span className="font-mono text-indigo-450 uppercase font-black tracking-widest">LEDGERBOX POS v1.2</span>
          </div>
        </div>

      </div>

      <OfflinePwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

      <SystemDocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col">
          <PrivacyPolicyView onClose={() => {
            setIsPrivacyModalOpen(false);
            try {
              if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                const url = new URL(window.location.href);
                url.searchParams.delete('privacy');
                if (url.hash.includes('privacy')) url.hash = '';
                window.history.replaceState({}, document.title, url.pathname);
              }
            } catch (e) {
              console.warn('URL cleanup skipped:', e);
            }
          }} />
        </div>
      )}

    </div>
  );
}
