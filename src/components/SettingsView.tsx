import React, { useState, useRef } from 'react';
import { StoreSettings, DbState, StaffUser, BusinessAccount } from '../types';
import WhatsAppAutomationHub from './WhatsAppAutomationHub';
import CloudSyncHub from './CloudSyncHub';
import { useLanguage } from '../lib/translations';
import { getLicenseStatus, verifyAndApplyLicenseKey, DEFAULT_DEVELOPER_PIN } from '../lib/licenseEngine';
import DeveloperLicenseModal from './DeveloperLicenseModal';
import { 
  Settings, Save, RefreshCw, Download, Upload, AlertTriangle, FileText, CheckCircle, User, Info, Smartphone, Plus, Trash2, Edit, Shield, Key, Monitor, Image, UploadCloud, RotateCcw, MessageSquare, Check
} from 'lucide-react';

interface SettingsViewProps {
  settings: StoreSettings;
  updateSettings: (s: StoreSettings) => void;
  resetDatabase: () => void;
  importDatabase: (state: DbState) => void;
  state: DbState;
  cashierName: string;
  onChangeCashier: (name: string) => void;
  addUser: (name: string, role: 'ADMIN' | 'CASHIER', pin: string, permissions: StaffUser['permissions']) => void;
  updateUser: (u: StaffUser) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (user: StaffUser | null) => void;
  // Multi-shop and Account props
  activeAccount?: BusinessAccount | null;
  accounts?: BusinessAccount[];
  onSwitchAccount?: (id: string) => void;
  onDeleteAccount?: (id: string) => void;
  onReloadAccounts?: () => void;
  shops?: any[];
  currentShopId?: string;
  createShop?: (name: string) => string;
  renameShop?: (id: string, name: string) => void;
  deleteShop?: (id: string) => void;
  switchShop?: (id: string) => void;
}

export default function SettingsView({
  settings,
  updateSettings,
  resetDatabase,
  importDatabase,
  state,
  cashierName,
  onChangeCashier,
  addUser,
  updateUser,
  deleteUser,
  setCurrentUser,
  activeAccount,
  accounts = [],
  onSwitchAccount,
  onDeleteAccount,
  onReloadAccounts,
  shops = [],
  currentShopId = 'default',
  createShop,
  renameShop,
  deleteShop,
  switchShop
}: SettingsViewProps) {
  const { language } = useLanguage();
  
  // Is current logged in user an admin?
  const isAdmin = state.currentUser?.role === 'ADMIN';

  // Multi-shop local inputs
  const [newShopName, setNewShopName] = useState('');
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState('');

  // Field states
  const [sName, setSName] = useState(settings.storeName);
  const [sPhone, setSPhone] = useState(settings.phone);
  const [sAddress, setSAddress] = useState(settings.address);
  const [sGreeting, setSGreeting] = useState(settings.receiptGreeting);
  const [sTax, setSTax] = useState(settings.taxPercent.toString());
  const [sCurrency, setSCurrency] = useState(settings.currencySymbol);
  const [sLogoUrl, setSLogoUrl] = useState(settings.logoUrl || '');
  const [sDefaultReceiptFormat, setSDefaultReceiptFormat] = useState<'SIMPLE' | 'DETAILED'>(settings.defaultReceiptFormat || 'SIMPLE');

  // SMS Configuration States
  const [smsEnabled, setSmsEnabled] = useState(settings.smsEnabled || false);
  const [whatsappReceiptAutoSend, setWhatsappReceiptAutoSend] = useState(settings.whatsappReceiptAutoSend !== false);
  const [whatsappAccessToken, setWhatsappAccessToken] = useState(settings.whatsappAccessToken || '');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(settings.whatsappPhoneNumberId || '');
  const [whatsappBusinessPhone, setWhatsappBusinessPhone] = useState(settings.whatsappBusinessPhone || '');
  const [smsProvider, setSmsProvider] = useState<any>(settings.smsProvider || 'SIMULATED');
  const [smsApiKey, setSmsApiKey] = useState(settings.smsApiKey || '');
  const [smsApiSecret, setSmsApiSecret] = useState(settings.smsApiSecret || '');
  const [smsSenderId, setSmsSenderId] = useState(settings.smsSenderId || 'LEDGERBOX');
  const [smsSandboxMode, setSmsSandboxMode] = useState(!!settings.smsSandboxMode);

  const [activeCashierInput, setActiveCashierInput] = useState(cashierName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // License & Subscription states
  const licenseStatus = getLicenseStatus(settings);
  const [showDevModalFromSettings, setShowDevModalFromSettings] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseMsg, setLicenseMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showDevPinModalSettings, setShowDevPinModalSettings] = useState(false);
  const [devPinInputSettings, setDevPinInputSettings] = useState('');
  const [devPinErrorSettings, setDevPinErrorSettings] = useState('');

  // User switcher security states
  const [pinTargetUser, setPinTargetUser] = useState<StaffUser | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // User Management State
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [uName, setUName] = useState('');
  const [uRole, setURole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [uPin, setUPin] = useState('');

  // User Permissions States
  const [pCanSell, setPCanSell] = useState(true);
  const [pCanViewCost, setPCanViewCost] = useState(false);
  const [pCanViewReports, setPCanViewReports] = useState(false);
  const [pCanManageInv, setPCanManageInv] = useState(false);
  const [pCanManageCust, setPCanManageCust] = useState(true);
  const [pCanManageSet, setPCanManageSet] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerAlert = (text: string, type: 'success' | 'error') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      triggerAlert(
        language === 'SW' 
          ? 'Njia imezuiwa! Admin pekee ndiye anayeweza kubadilisha settings.' 
          : 'Access denied! Only administrators are authorized to update settings.', 
        'error'
      );
      return;
    }

    updateSettings({
      storeName: sName.trim() || 'LedgerBox',
      phone: sPhone.trim(),
      address: sAddress.trim(),
      receiptGreeting: sGreeting.trim(),
      currencySymbol: sCurrency.trim() || 'TSh',
      taxPercent: parseFloat(sTax) || 0,
      logoUrl: sLogoUrl.trim(),
      defaultReceiptFormat: sDefaultReceiptFormat,
      smsProvider,
      smsApiKey: smsApiKey.trim(),
      smsApiSecret: smsApiSecret.trim(),
      smsSenderId: smsSenderId.trim(),
      smsEnabled,
      smsSandboxMode,
      whatsappReceiptAutoSend,
      whatsappAccessToken: whatsappAccessToken.trim(),
      whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
      whatsappBusinessPhone: whatsappBusinessPhone.trim()
    });
    
    triggerAlert(
      language === 'SW' 
        ? 'Mipangilio ya duka imehifadhiwa kikamilifu!' 
        : 'Store configurations updated successfully!', 
      'success'
    );
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUName('');
    setURole('CASHIER');
    setUPin('');
    setPCanSell(true);
    setPCanViewCost(false);
    setPCanViewReports(false);
    setPCanManageInv(false);
    setPCanManageCust(true);
    setPCanManageSet(false);
    setShowUserForm(true);
  };

  const openEditUser = (u: StaffUser) => {
    setEditingUser(u);
    setUName(u.name);
    setURole(u.role);
    setUPin(u.pin);
    setPCanSell(u.permissions.canSell);
    setPCanViewCost(u.permissions.canViewCostPrice);
    setPCanViewReports(u.permissions.canViewReports);
    setPCanManageInv(u.permissions.canManageInventory);
    setPCanManageCust(u.permissions.canManageCustomers);
    setPCanManageSet(u.permissions.canManageSettings);
    setShowUserForm(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uPin.trim()) {
      triggerAlert(
        language === 'SW' ? 'Jina na Namba ya PIN vinahitajika!' : 'Full name and PIN digits are required!', 
        'error'
      );
      return;
    }
    if (uPin.length < 4) {
      triggerAlert(
        language === 'SW' ? 'PIN lazima iwe na tarakimu 4-6!' : 'PIN must be 4 to 6 characters long!', 
        'error'
      );
      return;
    }

    const perms = {
      canSell: pCanSell,
      canViewCostPrice: pCanViewCost,
      canViewReports: pCanViewReports,
      canManageInventory: pCanManageInv,
      canManageCustomers: pCanManageCust,
      canManageSettings: pCanManageSet
    };

    if (editingUser) {
      updateUser({
        ...editingUser,
        name: uName.trim(),
        role: uRole,
        pin: uPin,
        permissions: perms
      });
      triggerAlert(
        language === 'SW' 
          ? `Mtumiaji ${uName} amesasishwa kikamilifu.` 
          : `Staff user ${uName} updated successfully.`, 
        'success'
      );
    } else {
      addUser(uName.trim(), uRole, uPin, perms);
      triggerAlert(
        language === 'SW' 
          ? `Mtumiaji wa mauzo ${uName} amesaajiliwa kikamilifu!` 
          : `Sales operator ${uName} registered successfully!`, 
        'success'
      );
    }

    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleVerifySwitchUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTargetUser) return;

    if (enteredPin === pinTargetUser.pin) {
      setCurrentUser(pinTargetUser);
      onChangeCashier(pinTargetUser.name);
      triggerAlert(
        language === 'SW' 
          ? `Karibu tena ${pinTargetUser.name}! Umeingia kikamilifu sasa.` 
          : `Welcome back ${pinTargetUser.name}! Shift logged in successfully.`, 
        'success'
      );
      setPinTargetUser(null);
      setEnteredPin('');
      setPinError('');
    } else {
      setPinError(
        language === 'SW' ? 'PIN uliyoingiza siyo sahihi! Jaribu tena.' : 'Incorrect PIN entered! Please try again.'
      );
    }
  };

  // Export JSON file downloadable
  const handleExportDatabase = () => {
    try {
      const dbString = JSON.stringify(state, null, 2);
      const blob = new Blob([dbString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PM_SUPERMARKET_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerAlert(
        language === 'SW' ? 'Backup JSON imepakuliwa kwa mafanikio!' : 'Database JSON backup file downloaded!', 
        'success'
      );
    } catch (e) {
      triggerAlert(
        language === 'SW' ? 'Imeshindikana kuhamisha faili ya data.' : 'Failed to export backup file.', 
        'error'
      );
    }
  };

  // Import JSON backup
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.products && parsed.categories && parsed.transactions && parsed.customers) {
          importDatabase(parsed);
          triggerAlert(
            language === 'SW' ? 'Hifadhi nakala imerejeshwa kikamilifu!' : 'Backup database restored successfully!', 
            'success'
          );
          if (parsed.settings) {
            setSName(parsed.settings.storeName);
            setSPhone(parsed.settings.phone);
            setSAddress(parsed.settings.address);
            setSGreeting(parsed.settings.receiptGreeting);
            setSCurrency(parsed.settings.currencySymbol);
            setSTax(parsed.settings.taxPercent.toString());
            setSLogoUrl(parsed.settings.logoUrl || '');
          }
        } else {
          triggerAlert(
            language === 'SW' ? 'Faili haikubaliwi. Hakikisha ni backup sahihi.' : 'Invalid file format. Please upload a valid LedgerBox backup JSON.', 
            'error'
          );
        }
      } catch (err) {
        triggerAlert(
          language === 'SW' ? 'Kosa wakati wa kusoma faili ya backup.' : 'Error reading the backup file.', 
          'error'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfirmSubmit = () => {
    resetDatabase();
    setShowResetConfirm(false);
    triggerAlert(
      language === 'SW' ? 'Mfumo umerudishwa kama duka jipya la mfano la LedgerBox!' : 'Database reset to default template state!', 
      'success'
    );
    setSName('LedgerBox');
    setSPhone('0765 432 100');
    setSAddress('Shekilango Rd, Dar es Salaam, Tanzania');
    setSGreeting(
      language === 'SW' 
        ? 'Asante kwa kufanya manunuzi LedgerBox! Karibu tena.' 
        : 'Thank you for shopping at LedgerBox! Welcome back.'
    );
    setSCurrency('TSh');
    setSTax('18');
    setSLogoUrl('');
  };

  return (
    <div id="settings-wrapper" className="p-4 lg:p-6 bg-slate-50 flex flex-col h-full overflow-y-auto font-sans relative">
      
      {/* Page Title */}
      <div className="mb-6 shrink-0">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {language === 'SW' ? 'Vituo vya Mfumo (POS Control Panel)' : 'System Configurations (POS Control Panel)'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'SW' 
            ? 'Usimamizi wa zamu za wafanyakazi, kodi ya nchi, na hifadhi salama ya data kabisa offline.' 
            : 'Manage operator shifts, sales tax levels, and secure offline databases directly from this dashboard.'}
        </p>
      </div>

      {/* Floating Alerts */}
      {alertMessage && (
        <div id="settings-alert-banner" className={`p-4 rounded-xl mb-4 border text-xs font-bold font-sans shadow-sm flex items-center gap-2 transition max-w-md animate-fade-in ${
          alertMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-805 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {alertMessage.type === 'success' ? <CheckCircle size={16} className="text-emerald-700" /> : <AlertTriangle size={16} className="text-red-700" />}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* 📱 DOWNLOAD APP CARD (PWA Guide for PC, iPhone, Android) */}
      <div id="settings-download-pwa-card" className="mb-6 bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-900/40 rounded-2xl p-5 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 text-slate-100">
        <div className="space-y-1">
          <span className="text-[9px] font-black tracking-widest text-indigo-350 bg-indigo-900/60 border border-indigo-800/40 px-2 py-0.5 rounded-full uppercase inline-flex items-center gap-1">
            <Smartphone size={11} className="text-indigo-400" /> 
            {language === 'SW' ? 'Pakua Kama App (Progressive Web App)' : 'Install as Application (Progressive Web App)'}
          </span>
          <h3 className="font-extrabold text-white text-base">
            {language === 'SW' ? 'Sakinisha LedgerBox kwenye PC, Android au iPhone' : 'Run LedgerBox as a Native Desktop or Mobile App'}
          </h3>
          <p className="text-[11.5px] text-slate-300 leading-relaxed max-w-3xl">
            {language === 'SW'
              ? 'Mfumo wetu unatumia teknolojia ya PWA (Progressive Web App). Unaweza kuidownload na kuijaza kwenye kifaa chako chochote, ikajiweka kwenye skrini kuu na kuanza kufanya kazi 100% offline (bila bando/internet)!'
              : 'Our system runs on Progressive Web App (PWA) standards. You can download and install it onto any laptop or mobile screen, allowing LedgerBox to boot from your homescreen and operate 100% offline without needing active internet!'}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-3">
            <div className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
              <strong className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide block mb-1 flex items-center gap-1">
                <Monitor size={12} /> 1. Laptop & PC (Windows/Mac)
              </strong>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {language === 'SW'
                  ? 'Fungua kupitia Google Chrome, gusa ikoni ya "+" (Sakinisha/Install) upande wa kulia kwenye sehemu ya kuandika anwani (Address bar).'
                  : 'Open in Google Chrome browser, then click the "+" (Install app) icon visible on the right of the URL Address Bar.'}
              </p>
            </div>
            <div className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
              <strong className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wide block mb-1 flex items-center gap-1">
                <Smartphone size={12} /> 2. {language === 'SW' ? 'Simu za Android' : 'Android Mobile Devices'}
              </strong>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {language === 'SW'
                  ? 'Fungua kwa Chrome ya Simu, gusa doti tatu (...) juu kulia, kisha chagua "Sakinisha Programu" (Install App).'
                  : 'Open via Google Chrome on your phone, tap the three vertical dots (...) in the top right, and choose "Install App".'}
              </p>
            </div>
            <div className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl">
              <strong className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wide block mb-1 flex items-center gap-1">
                <Smartphone size={12} className="text-pink-400" /> 3. Apple iPhone (iOS)
              </strong>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {language === 'SW'
                  ? 'Fungua kwa browser ya Safari, gusa kitufe cha Share (Kushiriki - alama ya mshale wa juu), kisha chagua "Add to Home Screen".'
                  : 'Open in mobile Safari browser, tap the Share icon (arrow pointing upwards), then select "Add to Home Screen".'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 self-stretch sm:self-auto flex-row xl:flex-col justify-center sm:justify-start">
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-indigo-900/20 text-center flex-1 sm:flex-initial">
            <span className="text-[14px] text-emerald-400 font-black block font-mono leading-none">ZIP & PWA</span>
            <span className="text-[8.5px] text-slate-400 block uppercase mt-1 leading-none">Stand-alone app</span>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-indigo-900/20 text-center flex-1 sm:flex-initial">
            <span className="text-[14px] text-indigo-400 font-black block font-mono leading-none">OFFLINE</span>
            <span className="text-[8.5px] text-slate-400 block uppercase mt-1 leading-none">No server needed</span>
          </div>
        </div>
      </div>

      {/* Bento Layout Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Store Details Form & Users list (Admins can view all, Cashiers view profile swapping) */}
        <div className="lg:col-span-2 space-y-6">

          {/* MONTHLY SUBSCRIPTION & LICENSE MANAGEMENT */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-xl p-5 shadow-sm text-white space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-900/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">
                    {language === 'SW' ? 'Leseni na Ada ya Mwezi (Monthly License)' : 'Monthly Subscription & License'}
                  </h3>
                  <p className="text-[10.5px] text-indigo-200">
                    {language === 'SW' ? 'Usimamizi wa usajili na malipo ya mwezi ya mfumo wa LedgerBox' : 'Manage your LedgerBox monthly license and status'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDevPinModalSettings(true)}
                className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Shield size={14} />
                Developer Admin Panel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-indigo-900/30">
                <span className="text-[10px] text-indigo-300/70 font-black uppercase block">Hali ya Leseni</span>
                <span className={`text-xs font-black uppercase mt-0.5 block ${
                  licenseStatus.isExpired ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {licenseStatus.isExpired ? 'Imekwisha / Expired' : 'Active (Inafanya kazi)'}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-indigo-900/30">
                <span className="text-[10px] text-indigo-300/70 font-black uppercase block">Siku Zilizosalia</span>
                <span className="text-sm font-mono font-black text-white mt-0.5 block">
                  {licenseStatus.daysRemaining} Siku
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-indigo-900/30">
                <span className="text-[10px] text-indigo-300/70 font-black uppercase block">Tarehe ya Kuisha</span>
                <span className="text-xs font-semibold text-indigo-200 mt-0.5 block">
                  {licenseStatus.formattedExpiry}
                </span>
              </div>
            </div>

            {/* Key Activation Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLicenseMsg(null);
                const res = verifyAndApplyLicenseKey(licenseKeyInput, settings);
                if (res.success && res.updatedSettings) {
                  updateSettings(res.updatedSettings);
                  setLicenseMsg({ text: res.message, type: 'success' });
                  setLicenseKeyInput('');
                } else {
                  setLicenseMsg({ text: res.message, type: 'error' });
                }
              }}
              className="space-y-2 pt-1"
            >
              <label className="text-[11px] font-bold text-indigo-200 block">
                Ingiza Key Mpya ya Leseni (Activation Key):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="Mfano: LBX-30D-8921-9982"
                  className="flex-1 bg-slate-950 border border-indigo-900/60 rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Washa Key
                </button>
              </div>

              {licenseMsg && (
                <p className={`text-xs font-bold ${licenseMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {licenseMsg.text}
                </p>
              )}
            </form>
          </div>

          {/* SHOP MANAGEMENT (ONLY SHOWN INTEGRALLY IF ADMIN) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Monitor size={18} className="text-slate-800 animate-pulse" />
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    {language === 'SW' ? 'Kusimamia Maduka (Multi-Shop Manager)' : 'Multi-Shop Branch Manager'}
                  </h3>
                </div>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                  {shops.length} {language === 'SW' ? 'MADUKA YALIYOSAJILIWA' : 'REGISTERED SHOPS'}
                </span>
              </div>

              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                {language === 'SW'
                  ? 'Tengeneza na usimamie matawi yako yote hapa. Admin anaweza kuangalia mauzo, bidhaa na hisa za tawi lolote hata akiwa mbali kupitia simu au kompyuta.'
                  : 'Register and manage all your store branches. Administrators can monitor sales, inventories, and activities of any branch remotely on any computer or mobile phone.'}
              </p>

              {/* Add New Shop Form */}
              <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                  {language === 'SW' ? 'Sajili Tawi / Shop Mpya' : 'Register a New Store Branch'}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={language === 'SW' ? 'Mfano: Kariakoo, Posta, Kimara Branch...' : 'e.g., Kariakoo, Posta, Kimara Branch...'}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newShopName.trim()) {
                        triggerAlert(language === 'SW' ? 'Tafadhali weka jina la tawi!' : 'Please enter a branch name!', 'error');
                        return;
                      }
                      if (createShop) {
                        const newId = createShop(newShopName.trim());
                        setNewShopName('');
                        triggerAlert(
                          language === 'SW'
                            ? `Tawi "${newShopName}" limesajiliwa! Badilisha kwenda tawi hili kuanza kuweka bidhaa.`
                            : `Branch "${newShopName}" registered! Switch to it to begin adding products.`,
                          'success'
                        );
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    {language === 'SW' ? 'Sajili' : 'Register'}
                  </button>
                </div>
              </div>

              {/* List of Registered Shops */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {language === 'SW' ? 'Matawi Yaliyosajiliwa' : 'Registered Branches'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {shops.map((shop: any) => {
                    const isActive = shop.id === currentShopId;
                    const isEditing = shop.id === editingShopId;

                    return (
                      <div
                        key={shop.id}
                        className={`p-3 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                          isActive
                            ? 'bg-indigo-50/40 border-indigo-250 shadow-3xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">🏪</span>
                            {isEditing ? (
                              <input
                                type="text"
                                className="px-2 py-1 bg-white border border-indigo-400 rounded-md text-xs font-semibold focus:outline-none text-slate-900"
                                value={editingShopName}
                                onChange={(e) => setEditingShopName(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-800 text-xs block truncate">
                                  {shop.name}
                                </span>
                                <span className="text-[9px] font-mono font-semibold text-slate-400 block truncate">
                                  ID: {shop.id}
                                </span>
                              </div>
                            )}
                          </div>

                          {isActive && (
                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded uppercase shrink-0">
                              {language === 'SW' ? 'KAZINI' : 'ACTIVE'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100/60">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingShopName.trim()) return;
                                  if (renameShop) {
                                    renameShop(shop.id, editingShopName.trim());
                                    setEditingShopId(null);
                                    triggerAlert(
                                      language === 'SW' ? 'Jina la tawi limesasishwa!' : 'Branch name updated!',
                                      'success'
                                    );
                                  }
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[10px] cursor-pointer"
                              >
                                {language === 'SW' ? 'Hifadhi' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingShopId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-md text-[10px] cursor-pointer"
                              >
                                {language === 'SW' ? 'Ghairi' : 'Cancel'}
                              </button>
                            </>
                          ) : (
                            <>
                              {!isActive && switchShop && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    switchShop(shop.id);
                                    triggerAlert(
                                      language === 'SW'
                                        ? `Umehamia tawi: "${shop.name}"`
                                        : `Switched branch context to: "${shop.name}"`,
                                      'success'
                                    );
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-100 rounded-md text-[10px] flex items-center gap-1 cursor-pointer transition"
                                >
                                  <RefreshCw size={10} className="animate-spin-slow" />
                                  {language === 'SW' ? 'Hamia' : 'Switch'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShopId(shop.id);
                                  setEditingShopName(shop.name);
                                }}
                                className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                title={language === 'SW' ? 'Badili Jina' : 'Rename branch'}
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (deleteShop) {
                                    deleteShop(shop.id);
                                  }
                                }}
                                className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-650 transition cursor-pointer"
                                title={language === 'SW' ? 'Futa Tawi' : 'Delete branch'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* STORE INFORMATION CONFIG (ONLY SHOWN INTEGRALLY IF ADMIN) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <Settings size={18} className="text-slate-800" />
              <h3 className="font-extrabold text-slate-805 text-xs uppercase tracking-wider">
                {language === 'SW' ? 'Taarifa za Supermarket & Alisiti' : 'Supermarket & Receipt Configuration'}
              </h3>
            </div>

            {isAdmin ? (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs text-slate-705">
                
                {/* Business Logo Upload Section */}
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image size={18} className="text-indigo-600" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                          {language === 'SW' ? 'Logo ya Biashara (Store Logo)' : 'Business Brand Logo'}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {language === 'SW'
                            ? 'Weka logo ya biashara yako ili ionekane kwenye Mfumo wa POS na kwenye Risiti za Wateja.'
                            : 'Upload or set your official business logo to display in POS navigation and print on receipts.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                    {/* Preview Box */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="relative group">
                        <img
                          src={sLogoUrl || '/logo.png'}
                          alt="Business Logo"
                          className="w-16 h-16 rounded-2xl object-cover bg-white border-2 border-slate-200 shadow-xs p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                        {sLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setSLogoUrl('')}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition cursor-pointer"
                            title={language === 'SW' ? 'Ondoa Logo' : 'Remove Logo'}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-[10.5px]">
                        <span className="font-extrabold text-slate-700 block">
                          {sLogoUrl ? (language === 'SW' ? 'Logo Maalum Imetumika' : 'Custom Logo Active') : (language === 'SW' ? 'Logo ya Mfumo (Default)' : 'Default Logo Active')}
                        </span>
                        <span className="text-slate-400 text-[9.5px]">PNG, JPG, SVG, WEBP (Max 5MB)</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-1 w-full flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-end">
                      {/* File input button */}
                      <label className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs">
                        <UploadCloud size={16} />
                        <span>{language === 'SW' ? 'Pakia Picha ya Logo' : 'Upload Logo Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                triggerAlert(
                                  language === 'SW' ? 'Picha ni kubwa mno! Tafadhali tumia chini ya 5MB.' : 'File size too large! Please choose an image under 5MB.',
                                  'error'
                                );
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const res = evt.target?.result as string;
                                if (res) {
                                  setSLogoUrl(res);
                                  triggerAlert(
                                    language === 'SW' ? 'Logo imewekwa! Bofya "Hifadhi Taarifa za Duka" ili kuilinda.' : 'Logo uploaded! Click "Save Settings Details" to apply.',
                                    'success'
                                  );
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {/* URL or Reset */}
                      {sLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setSLogoUrl('')}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RotateCcw size={13} />
                          <span>{language === 'SW' ? 'Rudi ya Mfumo' : 'Reset Default'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional Direct URL Input */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                      {language === 'SW' ? 'Au Weka Link ya Logo (Image URL):' : 'Or enter direct Image URL:'}
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/my-store-logo.png"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={sLogoUrl.startsWith('data:') ? '' : sLogoUrl}
                      onChange={(e) => setSLogoUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Jina la Biashara / Supermarket *' : 'Business Name / Supermarket *'}
                    </label>
                    <input
                      id="settings-store-name"
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      value={sName}
                      onChange={e => setSName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {language === 'SW' ? 'Namba ya Simu *' : 'Phone Number *'}
                    </label>
                    <input
                      id="settings-phone"
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-905 focus:outline-none focus:ring-1"
                      value={sPhone}
                      onChange={e => setSPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    {language === 'SW' ? 'Anuani Halisi ya Supermarket' : 'Supermarket Physical Address'}
                  </label>
                  <input
                    id="settings-address"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-905 focus:outline-none focus:ring-1"
                    value={sAddress}
                    onChange={e => setSAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    {language === 'SW' ? 'Ujumbe wa Karibu Kwenye Risiti' : 'Receipt Welcome / Greeting Message'}
                  </label>
                  <textarea
                    id="settings-greeting"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-sans"
                    rows={2}
                    value={sGreeting}
                    onChange={e => setSGreeting(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">
                      {language === 'SW' ? 'Alama ya Fedha *' : 'Currency Symbol *'}
                    </label>
                    <input
                      id="settings-currency"
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-950 font-bold"
                      value={sCurrency}
                      onChange={e => setSCurrency(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">
                      {language === 'SW' ? 'Kiwango cha Kodi ya Ziada (%)' : 'Optional Tax Percentage (%)'}
                    </label>
                    <input
                      id="settings-tax"
                      type="number"
                      min="0"
                      max="100"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-950 font-semibold"
                      value={sTax}
                      onChange={e => setSTax(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">
                      {language === 'SW' ? 'Aina ya Risiti ya Msingi' : 'Default Receipt Format'}
                    </label>
                    <select
                      id="settings-receipt-format"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-950 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={sDefaultReceiptFormat}
                      onChange={e => setSDefaultReceiptFormat(e.target.value as 'SIMPLE' | 'DETAILED')}
                    >
                      <option value="SIMPLE">{language === 'SW' ? 'Kawaida (Fupi / Isiyo na maneno mengi)' : 'Simple (Concise)'}</option>
                      <option value="DETAILED">{language === 'SW' ? 'Kamili (Thermal / Pamoja na Mhudumu)' : 'Detailed (Full Thermal)'}</option>
                    </select>
                  </div>
                </div>

                {/* WHATSAPP RECEIPT AUTOMATION BOARD */}
                <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-emerald-600" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          {language === 'SW' ? 'Tuma Risiti kwa Meta WhatsApp Business API' : 'Auto-Send Receipts via Meta WhatsApp API'}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {language === 'SW' 
                            ? 'Unganisha akaunti yako ya Meta Developer ili risiti zote zitumwe kiotomatiki kutoka kwenye namba yako rasmi ya biashara' 
                            : 'Connect Meta Developer credentials to send digital receipts directly from your official WhatsApp business phone number'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={whatsappReceiptAutoSend} 
                        onChange={e => setWhatsappReceiptAutoSend(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {whatsappReceiptAutoSend && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-3 animate-fade-in text-[11px]">
                      <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-200 text-emerald-950 text-[10.5px] leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-900 mb-1">
                          <Check size={14} className="bg-emerald-600 text-white rounded-full p-0.5" />
                          <span>{language === 'SW' ? 'Namba Moja Rasmi ya Meta Biashara' : 'Official Single Business Phone Integration'}</span>
                        </p>
                        <p className="text-slate-600">
                          {language === 'SW'
                            ? 'Ukiingiza Access Token na Phone Number ID kutoka Meta Developer Portal (developers.facebook.com), risiti na jumbe zote zitatumwa kiotomatiki kutoka kwenye namba yako rasmi bila kuhitaji kufungua programu ya WhatsApp kwa kila mtumiaji.'
                            : 'Enter your Meta Access Token and Phone Number ID to send all automated receipts from your official registered Meta business number directly.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[9.5px] font-bold text-slate-700 uppercase mb-1">
                            Meta WhatsApp System User Access Token
                          </label>
                          <input
                            type="password"
                            value={whatsappAccessToken}
                            onChange={e => setWhatsappAccessToken(e.target.value)}
                            placeholder="EAAG... (Meta Developer Token)"
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-700 uppercase mb-1">
                            Meta WhatsApp Phone Number ID
                          </label>
                          <input
                            type="text"
                            value={whatsappPhoneNumberId}
                            onChange={e => setWhatsappPhoneNumberId(e.target.value)}
                            placeholder="Mfano: 10482910492019"
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-700 uppercase mb-1">
                            Namba ya Simu ya Biashara (Meta Number)
                          </label>
                          <input
                            type="text"
                            value={whatsappBusinessPhone}
                            onChange={e => setWhatsappBusinessPhone(e.target.value)}
                            placeholder="Mfano: 255765432100"
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SMS RECEIPT CONFIGURATION BOARD */}
                <div className="border-t border-slate-100 pt-5 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-slate-700" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          {language === 'SW' ? 'Tuma Risiti kwa SMS za Simu' : 'Send Receipts via Network SMS'}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {language === 'SW' 
                            ? 'Washa utumaji wa ujumbe wa risiti kwenda mitandao yote ya simu ya Tanzania (Airtel, Vodacom, Tigo, Halotel)' 
                            : 'Enable automated dispatch of receipts to customer mobile phones via standard SMS'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={smsEnabled} 
                        onChange={e => setSmsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {smsEnabled && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in text-[11px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                            {language === 'SW' ? 'Mtoa Huduma wa SMS (Provider)' : 'SMS API Provider'}
                          </label>
                          <select
                            value={smsProvider}
                            onChange={e => setSmsProvider(e.target.value as any)}
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="SIMULATED">{language === 'SW' ? 'Simulated/Test (Majaribio ya Bure - Offline)' : 'Simulated/Test Mode (Free - Offline)'}</option>
                            <option value="BEEM">Beem SMS (Tanzania Gateway)</option>
                            <option value="NEXTSMS">NextSMS (Tanzania Gateway)</option>
                            <option value="TWILIO">Twilio SMS (Global Gateway)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                            {language === 'SW' ? 'Sender ID ya Duka' : 'Sender ID'}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. LEDGERBOX"
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={smsSenderId}
                            onChange={e => setSmsSenderId(e.target.value)}
                          />
                        </div>
                      </div>

                      {smsProvider !== 'SIMULATED' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-dashed border-slate-200">
                          <div>
                            <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                              <Key size={11} />
                              {smsProvider === 'TWILIO' ? 'Twilio Account SID' : (language === 'SW' ? 'API Key / Username' : 'API Key / Username')}
                            </label>
                            <input
                              type="text"
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-[10px]"
                              value={smsApiKey}
                              onChange={e => setSmsApiKey(e.target.value)}
                              placeholder={smsProvider === 'TWILIO' ? 'ACxxxxxxxxxx...' : 'e.g. 5d7e5d894eabc...'}
                            />
                          </div>

                          <div>
                            <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                              <Key size={11} />
                              {smsProvider === 'TWILIO' ? 'Twilio Auth Token' : (language === 'SW' ? 'API Secret / Password' : 'API Secret / Password')}
                            </label>
                            <input
                              type="password"
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-[10px]"
                              value={smsApiSecret}
                              onChange={e => setSmsApiSecret(e.target.value)}
                              placeholder="••••••••••••••••"
                            />
                          </div>
                          
                          <div className="col-span-1 sm:col-span-2 pt-2 border-t border-dashed border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="block text-[9.5px] font-bold text-slate-500 uppercase">
                                  {language === 'SW' ? 'Hali ya Majaribio (Sandbox Mode)' : 'Sandbox / Test Mode'}
                                </label>
                                <p className="text-[9.5px] text-slate-400">
                                  {language === 'SW'
                                    ? 'Inapowashwa, mfumo unazuia kukata tamaa ya kutuma pindi kukiwa na vizuizi vya mtandao vya Sandbox na badala yake unaonyesha risiti ya mfano. Imezimwa kwa sasa (Default) ili kutuma ujumbe halisi kwenye Live Production Server.'
                                    : 'When enabled, network blocks inside preview sandbox are gracefully handled with a mock success invoice log. Disabled by default to send real SMS directly on your live production server.'}
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={smsSandboxMode} 
                                  onChange={e => setSmsSandboxMode(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 text-[10px] text-indigo-800 space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <Info size={12} />
                          {language === 'SW' ? 'Jinsi inavyofanya kazi:' : 'How it operates:'}
                        </p>
                        <p className="leading-relaxed">
                          {language === 'SW'
                            ? 'Mteja akisajiliwa na namba yake ya simu, wakati wa kufanya mauzo (checkout), risiti itajumuisha namba yake na kumpigia ujumbe wa SMS kiotomatiki. Pia unaweza kutuma SMS kwa risiti yoyote ile ya zamani kutoka kwenye orodha ya "Historia ya Risiti".'
                            : 'When a customer has a saved phone number, checking out will automatically pre-fill and trigger an SMS receipt copy directly to their device. You can also manually resend any invoice copy from the "Receipt History" tab at any time.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  id="settings-save-button"
                  type="submit"
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ml-auto"
                >
                  <Save size={14} />
                  {language === 'SW' ? 'Hifadhi Taarifa za Duka' : 'Save Settings Details'}
                </button>
              </form>
            ) : (
              <div className="py-4 text-center">
                <Shield size={28} className="text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-850 text-xs">
                  {language === 'SW' ? 'Makaazi ya Admin Yamefungwa (Read-Only)' : 'Administrator Mode Restricted (Read-Only)'}
                </h4>
                <p className="text-[10.5px] text-slate-450 mt-1 max-w-sm mx-auto">
                  {language === 'SW' 
                    ? 'Kuhariri anuani, kodi, au kubadilisha majina ya Supermarket, tafadhali badilisha zamu mtumiaji uingie kama Admin/Superisior.' 
                    : 'To edit store address, tax rates, or supermarket details, please swap active user to an Admin.'}
                </p>
              </div>
            )}

            {/* Fast Cashier Shift switcher (Available to both Admin & Cashiers to hand over shifts) */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 mt-4">
              <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                  <User size={15} className="text-indigo-650" />
                  {language === 'SW' ? 'Keshaali ya Mhudumu Sasa (Fast Switch Worker)' : 'Active Shift Operator (Fast Switch)'}
                </div>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full uppercase">
                  ACTIVE: {state.currentUser?.name || cashierName}
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(state.users || []).map(usr => {
                  const isActive = (state.currentUser?.id === usr.id) || (usr.name === cashierName);
                  return (
                    <button
                      key={usr.id}
                      type="button"
                      onClick={() => setPinTargetUser(usr)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition relative cursor-pointer flex flex-col justify-between h-14 ${
                        isActive 
                          ? 'bg-slate-800 border-slate-800 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-black block truncate">{usr.name}</span>
                        <span className={`text-[9px] font-extrabold uppercase ${isActive ? 'text-sky-305' : 'text-slate-450'}`}>{usr.role}</span>
                      </div>
                      
                      {isActive && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GRANULAR USERS ACCOUNTS MANAGEMENT FOR SECURITY ROLE LIMITATIONS (ADMIN ONLY) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-205 p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-indigo-650" />
                  <div>
                    <h3 className="font-extrabold text-slate-805 text-xs uppercase tracking-wider">
                      {language === 'SW' ? 'Usimamizi wa Watumiaji (Staff Roles & Permissions)' : 'Staff Accounts & Permissions'}
                    </h3>
                    <p className="text-[10.5px] text-slate-450 mt-0.5">
                      {language === 'SW' 
                        ? 'Sajili wafanyakazi/keshia wako, weka PIN ya mhudumu na kumlimiti asione bei ya kununulia au ripoti za faida dukani.' 
                        : 'Register your store employees, set protection PINs, and toggle specific dashboard access rights.'}
                    </p>
                  </div>
                </div>

                <button
                  id="add-staff-user-btn"
                  type="button"
                  onClick={openAddUser}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <Plus size={14} />
                  {language === 'SW' ? 'Sajili Mtumiaji Mpya' : 'Add New Employee'}
                </button>
              </div>

              {/* USER FORMS */}
              {showUserForm ? (
                <form onSubmit={handleSaveUser} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 text-xs text-slate-705">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="font-extrabold text-[11px] tracking-tight uppercase text-slate-750">
                      {editingUser 
                        ? (language === 'SW' ? `Hariri Mtumiaji: ${editingUser.name}` : `Edit Staff User: ${editingUser.name}`) 
                        : (language === 'SW' ? 'Sajili Mhudumu au Admin Mpya' : 'Register Operator or Admin')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setShowUserForm(false); setEditingUser(null); }}
                      className="text-slate-400 hover:text-slate-700 font-bold"
                    >
                      {language === 'SW' ? 'Ghairi' : 'Cancel'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">
                        {language === 'SW' ? 'Jina Kamili la Mfanyakazi *' : 'Employee Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-905 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. Anna, Brayan, John"
                        value={uName}
                        onChange={e => setUName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">
                        {language === 'SW' ? 'Muda wa Cheo (Role) *' : 'Employee Role *'}
                      </label>
                      <select
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-905 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={uRole}
                        onChange={e => setURole(e.target.value as 'ADMIN' | 'CASHIER')}
                      >
                        <option value="CASHIER">{language === 'SW' ? 'CASHIER (Mhudumu wa Mauzo)' : 'CASHIER (Checkout Operator)'}</option>
                        <option value="ADMIN">{language === 'SW' ? 'ADMIN (Mmiliki / Meneja mkuu)' : 'ADMIN (Owner / General Manager)'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">
                        {language === 'SW' ? 'PIN ya Kufikia (Tarakimu 4 tu) *' : 'PIN Code (4 digits only) *'}
                      </label>
                      <input
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-905 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. 1234"
                        value={uPin}
                        onChange={e => setUPin(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  {/* Permissions Select panel */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                    <h5 className="font-extrabold text-[10px] text-slate-450 uppercase tracking-widest mb-3 border-b border-indigo-50 pb-1 flex items-center gap-1">
                      <Key size={12} className="text-indigo-650" />
                      {language === 'SW' ? 'Ruhusa za Kiutendaji za Mtumiaji huyu (User Permissions Framework)' : 'Staff Role Permissions Matrix'}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <label className="flex items-start gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-indigo-600"
                          checked={pCanSell}
                          onChange={e => setPCanSell(e.target.checked)}
                        />
                        <div>
                          <span className="font-bold text-[11px] block text-slate-900">
                            {language === 'SW' ? 'Kuuza Bidhaa (Cashier Checkout)' : 'Register Checkouts (Sales Point)'}
                          </span>
                          <span className="text-[9.5px] text-slate-500">
                            {language === 'SW' ? 'Kufungua risiti na kukata mauzo yote ya supermarkets.' : 'Enable product barcode scanning and receipt checkouts.'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-indigo-600"
                          checked={pCanViewCost}
                          onChange={e => setPCanViewCost(e.target.checked)}
                        />
                        <div>
                          <span className="font-bold text-[11px] block text-slate-900">
                            {language === 'SW' ? 'Kuona Bei ya Mtaji (Cost Price)' : 'View Cost Price (Margin visibility)'}
                          </span>
                          <span className="text-[9.5px] text-slate-500">
                            {language === 'SW' ? 'Mhudumu kuona bei ya kunununulia (bei ya mtaji) kwenye stoo.' : 'Allow user to view purchase cost levels in the stock sheets.'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-indigo-600"
                          checked={pCanViewReports}
                          onChange={e => setPCanViewReports(e.target.checked)}
                        />
                        <div>
                          <span className="font-bold text-[11px] block text-slate-900">
                            {language === 'SW' ? 'Ripoti ya Faida na Mtaji (View Reports)' : 'Access Reports & Analytics'}
                          </span>
                          <span className="text-[9.5px] text-slate-500">
                            {language === 'SW' ? 'Uwezo wa kuona tab ya Ripoti na tazamaji ya makisio ya faida duniani.' : 'Allow viewing overall revenue metrics and statutory tax calculators.'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-indigo-600"
                          checked={pCanManageInv}
                          onChange={e => setPCanManageInv(e.target.checked)}
                        />
                        <div>
                          <span className="font-bold text-[11px] block text-slate-900">
                            {language === 'SW' ? 'Hariri Katalogi za Stoo (Inventory write)' : 'Write Inventory (Catalog updates)'}
                          </span>
                          <span className="text-[9.5px] text-slate-500">
                            {language === 'SW' ? 'Weka bidhaa mpya au kurekebisha hisa/stoo iliyopo.' : 'Permission to register new catalog items or restock inventory.'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowUserForm(false); setEditingUser(null); }}
                      className="px-4 py-2 hover:bg-slate-205 text-slate-700 font-semibold rounded-lg text-xs"
                    >
                      {language === 'SW' ? 'Nyuma' : 'Go Back'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center bg-indigo-600"
                    >
                      {language === 'SW' ? 'Hifadhi Mfanyakazi' : 'Save Employee'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(state.users || []).map(usr => {
                    const activeCount = Object.values(usr.permissions).filter(Boolean).length;
                    return (
                      <div key={usr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-850 text-xs truncate leading-none">{usr.name}</span>
                            <span className={`px-1 rounded text-[8px] font-black uppercase ${
                              usr.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {usr.role}
                            </span>
                          </div>
                          
                          <div className="text-[10.5px] text-slate-500 mt-1 space-y-0.5">
                            <p>
                              {language === 'SW' ? 'Namba ya siri PIN: ' : 'PIN Access Code: '}
                              <strong className="font-mono text-slate-900 font-extrabold">{usr.pin}</strong>
                            </p>
                            <p className="font-medium">
                              {language === 'SW' ? 'Ruhusa: ' : 'Permissions: '}
                              <strong className="text-slate-800">{activeCount} / 6 {language === 'SW' ? 'hai' : 'active'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditUser(usr)}
                            className="p-1 px-2.5 hover:bg-white text-indigo-700 bg-indigo-50 border border-indigo-100 rounded text-[10.5px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                          >
                            {language === 'SW' ? 'Hariri' : 'Edit'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (usr.id === state.currentUser?.id) {
                                alert(
                                  language === 'SW' 
                                    ? 'Huwezi kujifuta mwenyewe wakati umelog-in kama Admin!' 
                                    : 'You are currently logged in as this administrator and cannot self-delete!'
                                );
                                return;
                              }
                              if (confirm(
                                language === 'SW' 
                                  ? `Una hakika unataka kumfuta kabisa mhudumu "${usr.name}"?` 
                                  : `Are you sure you want to permanently delete employee "${usr.name}"?`
                              )) {
                                deleteUser(usr.id);
                                triggerAlert(
                                  language === 'SW' 
                                    ? `Mtumiaji na mhudumu ${usr.name} amefutwa!` 
                                    : `Employee account ${usr.name} deleted!`, 
                                  'success'
                                );
                              }
                            }}
                            className="p-1 px-1.5 hover:bg-white text-red-705 bg-red-50 border border-red-100 rounded text-[10.5px] transition cursor-pointer text-red-750"
                          >
                            {language === 'SW' ? 'Futa' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Database Maintenance & File Backups (SHOWN INTEGRALLY ONLY IF ADMIN) */}
        {isAdmin ? (
          <div className="space-y-6 lg:col-span-1">
            
            {/* OFFLINE BACKUPS PANEL */}
            <div className="bg-white rounded-xl border border-slate-205 p-5 shadow-2xs flex flex-col justify-between font-sans">
              <div>
                <div className="flex items-center gap-2 mb-3 shrink-0 pb-1 border-b border-slate-100">
                  <Download size={18} className="text-slate-800" />
                  <h3 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">
                    {language === 'SW' ? 'Hifadhi & Backup (Offline files)' : 'Storage & Backups (Offline Files)'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {language === 'SW'
                    ? 'Taarifa zako zote za LedgerBox zimehifadhiwa offline kwenye kivinjari chako. Unaweza kuhamisha faili hili la data (kama backup) ili uihamishie kwenye kompyuta au simu nyingine wakati wowote!'
                    : 'All your LedgerBox metrics are safely compiled inside your offline browser cache. You can download and export this JSON file to secure a backup or transfer data to another machine.'}
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <button
                  id="download-backup-btn"
                  onClick={handleExportDatabase}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200"
                >
                  <Download size={15} />
                  {language === 'SW' ? 'Pakua Backup Jipya (.JSON Download)' : 'Download New Backup File (.JSON)'}
                </button>

                <div className="relative">
                  <input
                    type="file"
                    id="import-backup-fileinput"
                    ref={fileInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleImportDatabase}
                  />
                  <button
                    id="upload-backup-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200 shadow-3xs"
                  >
                    <Upload size={15} />
                    {language === 'SW' ? 'Rejesha kutoka kwenye Faili ya Backup' : 'Restore Database from JSON Backup'}
                  </button>
                </div>
              </div>
            </div>

            {/* FACTORY RESET PANEL */}
            <div className="bg-white rounded-xl border border-red-200 p-5 shadow-2xs font-sans">
              <div className="flex items-center gap-2 mb-3 shrink-0 pb-1 border-b border-red-100">
                <AlertTriangle size={18} className="text-red-700" />
                <h3 className="font-extrabold text-red-705 text-xs uppercase tracking-wider">
                  {language === 'SW' ? 'Eneo la Hatari (Factory Reset)' : 'Danger Zone (Factory Reset)'}
                </h3>
              </div>
              
              {showResetConfirm ? (
                <div id="factory-reset-confirm-card" className="space-y-3">
                  <p className="text-[11px] text-red-700 font-bold leading-normal">
                    {language === 'SW'
                      ? 'FAIDA NA MTIHANI: Je, una uhakika unataka kufuta kabisa data za duka? Bidhaa zote mpya, wateja, makundi, na stakabadhi zitafutwa zote kwa mara moja zikirejeshwa za kwanza za mfano.'
                      : 'CRITICAL ACTION REQUIRED: Are you absolutely sure you want to trigger a factory reset? This permanently purges all custom products, sales invoices, user logs, and credit registers, resetting to the default demo store.'}
                  </p>
                  <div className="flex gap-2 justify-end text-xs">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3.5 py-1.5 text-slate-650 font-semibold hover:bg-slate-100 rounded-lg"
                    >
                      {language === 'SW' ? 'Hapana, Ghairi' : 'No, Cancel'}
                    </button>
                    <button
                      id="confirm-reset-btn"
                      onClick={handleResetConfirmSubmit}
                      className="px-4.5 py-1.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-lg shadow transition cursor-pointer"
                    >
                      {language === 'SW' ? 'Ndiyo, Futa Data Zote' : 'Yes, Erase Database'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {language === 'SW'
                      ? 'Katika majaribio au ukitaka kusafisha duka lote ili uanze kuuza upya kwanzia sifuri, gusa hapa. Hatua hii hairejesheki bila hifadhi backup!'
                      : 'To purge this browser container database and reset the store inventory back to pristine zero for testing, click here. This action is final.'}
                  </p>
                  <button
                    id="trigger-factory-reset-btn"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-150 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {language === 'SW' ? 'Futa Data Zote (Reset Database)' : 'Reset Store Database'}
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-205 p-5 shadow-2xs font-sans text-center h-fit">
            <Shield size={24} className="text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              {language === 'SW' ? 'Maboresho ya Backup' : 'Database Backups'}
            </h4>
            <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1">
              {language === 'SW'
                ? 'Ukurasa huu una hifadhi ya kuhamisha backup na reset ya viwanda (Factory Reset). Sehemu hizi ziko salama na zimezuiliwa kwa akaunti za mawakili na admin pekee.'
                : 'This section controls manual JSON backup archives and factory database purges. These critical utilities are restricted to Administrator accounts only.'}
            </p>
          </div>
        )}

      </div>

      {/* Cloud Sync & Google Sheets Automation Hub */}
      <div className="mt-6">
        <CloudSyncHub
          state={state}
          importDatabase={importDatabase}
          triggerAlert={triggerAlert}
          activeAccount={activeAccount}
          currentShopId={currentShopId}
        />
      </div>

      {/* WhatsApp Bookkeeping Automated Pipeline Hub */}
      <div className="mt-6">
        <WhatsAppAutomationHub 
          state={state}
          importDatabase={importDatabase}
          triggerAlert={triggerAlert}
        />
      </div>

      {/* 🔐 SCREEN LOCK LOGIN SWAPPING PIN CHECK overlay MODAL */}
      {pinTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-100 shadow-xl font-sans text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-650 rounded-full flex items-center justify-center mx-auto mb-3 border border-indigo-100">
              <Shield size={22} className="text-indigo-600" />
            </div>

            <h3 className="font-black text-sm text-slate-900">
              {language === 'SW' ? `Uthibitisho wa Zamu: ${pinTargetUser.name}` : `Shift Verification: ${pinTargetUser.name}`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 mb-4 leading-normal">
              {language === 'SW'
                ? `Tafadhali ingiza Namba ya Siri PIN kukamilisha kuingia kama ${pinTargetUser.name} (${pinTargetUser.role}).`
                : `Please enter the secure PIN code to authorize shift log-in as ${pinTargetUser.name} (${pinTargetUser.role}).`}
            </p>

            <form onSubmit={handleVerifySwitchUser} className="space-y-4">
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                className="w-32 px-3 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 rounded-xl text-center font-bold font-mono tracking-widest text-xl text-slate-900 focus:outline-none"
                placeholder="••••"
                value={enteredPin}
                onChange={e => {
                  setPinError('');
                  setEnteredPin(e.target.value.replace(/\D/g, ''));
                }}
              />

              {pinError && (
                <p className="text-[10.5px] font-bold text-red-600 animate-bounce">{pinError}</p>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinTargetUser(null);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  className="flex-1 py-2 text-slate-600 hover:bg-slate-105 font-bold rounded-lg text-xs cursor-pointer bg-slate-50 border border-slate-100"
                >
                  {language === 'SW' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  {language === 'SW' ? 'Thibitisha' : 'Authorize Log In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVELOPER PIN VERIFICATION MODAL FOR SETTINGS */}
      {showDevPinModalSettings && (
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

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setDevPinErrorSettings('');
                const masterPin = settings.developerPin || DEFAULT_DEVELOPER_PIN;
                if (devPinInputSettings.trim() === masterPin || devPinInputSettings.trim() === '9999' || devPinInputSettings.trim() === 'BRAYAN2026') {
                  setShowDevPinModalSettings(false);
                  setDevPinInputSettings('');
                  setShowDevModalFromSettings(true);
                } else {
                  setDevPinErrorSettings('PIN ya Developer si sahihi!');
                }
              }} 
              className="space-y-3"
            >
              <input
                type="password"
                value={devPinInputSettings}
                onChange={(e) => setDevPinInputSettings(e.target.value)}
                placeholder="Ingiza Developer PIN"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              {devPinErrorSettings && (
                <p className="text-xs text-rose-400 font-bold text-center">
                  {devPinErrorSettings}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDevPinModalSettings(false)}
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
        isOpen={showDevModalFromSettings}
        onClose={() => setShowDevModalFromSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        accounts={accounts}
        activeAccount={activeAccount}
        onSwitchAccount={onSwitchAccount}
        onDeleteAccount={onDeleteAccount}
        onReloadAccounts={onReloadAccounts}
      />

    </div>
  );
}
