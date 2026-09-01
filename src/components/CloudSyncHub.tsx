import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  logout, 
  auth, 
  getAccessToken 
} from '../lib/firebase';
import { db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  createSpreadsheet, 
  appendTransactionsToSheet 
} from '../lib/sheets';
import { useLanguage } from '../lib/translations';
import { DbState, Transaction, BusinessAccount } from '../types';
import { 
  Cloud, 
  CloudOff, 
  Database, 
  FileSpreadsheet, 
  User, 
  LogOut, 
  RefreshCw, 
  Check, 
  Link, 
  Plus, 
  Clock,
  ArrowUp,
  ArrowDown,
  Store,
  Mail,
  BookUser
} from 'lucide-react';
import GoogleContactsModal from './GoogleContactsModal';

interface CloudSyncHubProps {
  state: DbState;
  importDatabase: (state: DbState) => void;
  triggerAlert: (text: string, type: 'success' | 'error') => void;
  activeAccount?: BusinessAccount | null;
  currentShopId?: string;
}

interface SheetsConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  autoSync: boolean;
}

export default function CloudSyncHub({ 
  state, 
  importDatabase, 
  triggerAlert,
  activeAccount,
  currentShopId = 'default'
}: CloudSyncHubProps) {
  const { language } = useLanguage();
  
  // Storage Key Helpers per account
  const sheetsConfigKey = activeAccount 
    ? `pm_google_sheets_config_${activeAccount.id}` 
    : 'pm_google_sheets_config';
    
  const lastSyncKey = activeAccount 
    ? `pm_last_cloud_sync_${activeAccount.id}` 
    : 'pm_last_cloud_sync';

  // Firebase Auth State
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Firestore Sync States
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

  // Google Sheets Integration States
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>({
    spreadsheetId: '',
    spreadsheetTitle: '',
    autoSync: false
  });
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);

  // Listen to Auth State & load account-specific config
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await getAccessToken();
        setAccessToken(token);
      } else {
        setAccessToken(null);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Reload config when activeAccount changes
  useEffect(() => {
    const localTimestamp = localStorage.getItem(lastSyncKey);
    setLastCloudSync(localTimestamp || null);

    const savedSheetsConfig = localStorage.getItem(sheetsConfigKey);
    if (savedSheetsConfig) {
      try {
        setSheetsConfig(JSON.parse(savedSheetsConfig));
      } catch (e) {
        console.error('Failed to parse sheets config', e);
        setSheetsConfig({ spreadsheetId: '', spreadsheetTitle: '', autoSync: false });
      }
    } else {
      setSheetsConfig({ spreadsheetId: '', spreadsheetTitle: '', autoSync: false });
    }
  }, [activeAccount, sheetsConfigKey, lastSyncKey]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        triggerAlert(
          language === 'SW' ? 'Umeingia kwenye Akaunti ya Google kikamilifu!' : 'Logged in to Google Account successfully!',
          'success'
        );
      }
    } catch (error: any) {
      console.warn('[CloudSyncHub] Google Sign-In notice:', error?.message || error);
      const isNetwork = error?.isNetworkOrIframeError || 
        error?.code === 'auth/network-request-failed' ||
        String(error?.message || error).includes('network-request-failed') ||
        error?.code === 'auth/popup-blocked';

      triggerAlert(
        language === 'SW' 
          ? (isNetwork ? 'Hitilafu ya mtandao/iframe. Fungua app kwenye tab mpya ili kuingia Google.' : 'Imeshindikana kuingia kwenye Akaunti ya Google.')
          : (isNetwork ? 'Network/iframe auth restriction. Open the app in a new tab for Google login.' : 'Failed to sign in with Google.'),
        'error'
      );
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      triggerAlert(
        language === 'SW' ? 'Umetoka kwenye Akaunti ya Google.' : 'Logged out of Google Account.',
        'success'
      );
    } catch (error) {
      console.error(error);
    }
  };

  // Backup Local Data to Firebase Firestore
  const handleBackupToCloud = async () => {
    if (!user) return;
    setIsSyncingCloud(true);
    try {
      const accountDocId = activeAccount?.id || user.uid;
      const userStateDocRef = doc(db, 'users', accountDocId, 'shops', currentShopId, 'state', 'current');
      
      // Clean state of active UI parameters before saving
      const stateToSave = {
        ...state,
        currentUser: null // avoid locking cloud state to a specific cashier
      };

      await setDoc(userStateDocRef, {
        state: stateToSave,
        updatedAt: new Date().toISOString(),
        backupBy: user.displayName || user.email || activeAccount?.email,
        storeName: state.settings.storeName,
        ownerEmail: activeAccount?.email || user.email
      });

      const nowStr = new Date().toLocaleString();
      setLastCloudSync(nowStr);
      localStorage.setItem(lastSyncKey, nowStr);

      triggerAlert(
        language === 'SW' ? 'Hifadhi nakala imetengenezwa wingu (Firestore)!' : 'Database backed up to Firestore successfully!',
        'success'
      );
    } catch (error) {
      console.error(error);
      triggerAlert(
        language === 'SW' ? 'Imeshindikana kuhifadhi wingu. Angalia ruhusa.' : 'Failed to sync to cloud database. Check permissions.',
        'error'
      );
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Restore Cloud Data from Firebase Firestore
  const handleRestoreFromCloud = async () => {
    if (!user) return;
    
    const confirmRestore = window.confirm(
      language === 'SW'
        ? 'Je, una uhakika unataka kupakua data kutoka Firestore? Data za sasa zilizoko kwenye kifaa hiki zitafutwa na kubadilishwa.'
        : 'Are you sure you want to restore data from Firestore? This will overwrite the current local state on this device.'
    );
    if (!confirmRestore) return;

    setIsSyncingCloud(true);
    try {
      const accountDocId = activeAccount?.id || user.uid;
      const userStateDocRef = doc(db, 'users', accountDocId, 'shops', currentShopId, 'state', 'current');
      let docSnap = await getDoc(userStateDocRef);

      // Fallback check old path
      if (!docSnap.exists()) {
        const fallbackRef = doc(db, 'users', user.uid, 'state', 'current');
        docSnap = await getDoc(fallbackRef);
      }

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        if (cloudData.state) {
          importDatabase(cloudData.state);
          triggerAlert(
            language === 'SW' ? 'Data imerejeshwa kikamilifu kutoka wingu!' : 'Database restored from Firestore successfully!',
            'success'
          );
        } else {
          triggerAlert(
            language === 'SW' ? 'Hati ya wingu haina data halali.' : 'Cloud document does not contain valid database state.',
            'error'
          );
        }
      } else {
        triggerAlert(
          language === 'SW' ? 'Hakuna hifadhi iliyopatikana kwenye akaunti hii.' : 'No cloud backup found on this account.',
          'error'
        );
      }
    } catch (error) {
      console.error(error);
      triggerAlert(
        language === 'SW' ? 'Imeshindikana kupakua data kutoka wingu.' : 'Failed to retrieve cloud data.',
        'error'
      );
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Create a New Spreadsheet in Google Drive
  const handleCreateNewSpreadsheet = async () => {
    const token = accessToken || await getAccessToken();
    if (!token) {
      triggerAlert(
        language === 'SW' ? 'Tafadhali ingia upya kwenye akaunti kuwezesha Google Sheets.' : 'Please sign in again to enable Google Sheets.',
        'error'
      );
      return;
    }

    setIsCreatingSheet(true);
    try {
      const title = `LedgerBox Sales - ${state.settings.storeName || 'Supermarket'}`;
      const sheetId = await createSpreadsheet(token, title);
      
      const newConfig: SheetsConfig = {
        spreadsheetId: sheetId,
        spreadsheetTitle: title,
        autoSync: sheetsConfig.autoSync
      };

      setSheetsConfig(newConfig);
      localStorage.setItem(sheetsConfigKey, JSON.stringify(newConfig));

      triggerAlert(
        language === 'SW' ? `Spreadsheet "${title}" imetengenezwa kikamilifu!` : `Google Sheet "${title}" created successfully!`,
        'success'
      );
    } catch (error) {
      console.error(error);
      triggerAlert(
        language === 'SW' ? 'Imeshindikana kutengeneza Google Sheet.' : 'Failed to create Google Sheet.',
        'error'
      );
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Save Config Changes
  const updateSheetsConfig = (updates: Partial<SheetsConfig>) => {
    const newConfig = { ...sheetsConfig, ...updates };
    setSheetsConfig(newConfig);
    localStorage.setItem(sheetsConfigKey, JSON.stringify(newConfig));
  };

  // Force manual full transaction export to Google Sheet
  const handleSyncAllTransactions = async () => {
    const token = accessToken || await getAccessToken();
    if (!token) {
      triggerAlert(
        language === 'SW' ? 'Tafadhali login upya kupata access token.' : 'Please sign in again to authorize Sheets access.',
        'error'
      );
      return;
    }

    if (!sheetsConfig.spreadsheetId) {
      triggerAlert(
        language === 'SW' ? 'Tafadhali unganisha Google Sheet kwanza!' : 'Please connect a Google Sheet first!',
        'error'
      );
      return;
    }

    setIsSyncingSheets(true);
    try {
      // Send all transactions in state
      await appendTransactionsToSheet(token, sheetsConfig.spreadsheetId, state.transactions, state.settings);
      
      triggerAlert(
        language === 'SW' ? 'Mauzo yote yamesawazishwa na Google Sheets!' : 'All transactions synchronized to Google Sheets successfully!',
        'success'
      );
    } catch (error) {
      console.error(error);
      triggerAlert(
        language === 'SW' ? 'Kosa wakati wa kusawazisha na Google Sheets.' : 'Error synchronizing with Google Sheets.',
        'error'
      );
    } finally {
      setIsSyncingSheets(false);
    }
  };

  return (
    <div id="cloud-sync-hub" className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm font-sans space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-indigo-600 animate-pulse" />
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
              {language === 'SW' ? 'Wingu & Google Sheets Sync' : 'Cloud Sync & Google Sheets Hub'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'SW' 
                ? 'Hifadhi data zako salama kwenye wingu na uunganishe na Google Sheets kupata ripoti live.' 
                : 'Safely backup database states online and stream transactions to live Google Spreadsheets.'}
            </p>
          </div>
        </div>

        {user ? (
          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-extrabold uppercase">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            {language === 'SW' ? 'IMEUNGANISHWA' : 'CONNECTED'}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-extrabold uppercase">
            <CloudOff size={11} />
            {language === 'SW' ? 'NJE YA MTANDAO' : 'OFFLINE MODE'}
          </span>
        )}
      </div>

      {/* Store Account Owner Information Banner */}
      {activeAccount && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              <Store size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-indigo-950 text-xs">{activeAccount.storeName}</span>
                <span className="bg-indigo-200/60 text-indigo-800 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {activeAccount.ownerName}
                </span>
              </div>
              <p className="text-[11px] text-indigo-700 flex items-center gap-1 mt-0.5">
                <Mail size={12} className="text-indigo-500 shrink-0" />
                <span>{language === 'SW' ? 'Barua pepe ya Mwenye Duka:' : 'Store Owner Email:'}</span>
                <strong className="text-slate-900 font-semibold">{activeAccount.email}</strong>
              </p>
            </div>
          </div>
          <div className="text-[10px] text-indigo-600 bg-white/80 border border-indigo-200 px-2.5 py-1 rounded-md font-medium">
            {language === 'SW' 
              ? '✅ Kila duka lina hifadhi na Google Sheets zake tofauti.' 
              : '✅ Each store owns isolated cloud backup & Google Sheets.'}
          </div>
        </div>
      )}

      {/* Auth Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isLoadingAuth ? (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-600" />
            <span>{language === 'SW' ? 'Inapakia akaunti...' : 'Loading authentication...'}</span>
          </div>
        ) : user ? (
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-slate-300" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-extrabold text-slate-800 text-xs truncate leading-tight">{user.displayName || 'Google User'}</p>
                <p className="text-[10.5px] text-slate-500 truncate mt-0.5 leading-none">{user.email}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 text-red-650 border border-red-200 rounded-lg text-xs font-bold transition cursor-pointer text-red-600"
            >
              <LogOut size={13} />
              {language === 'SW' ? 'Badilisha / Toka' : 'Switch / Sign Out'}
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-bold text-slate-800 text-xs">
                {language === 'SW' ? 'Unganisha na Akaunti ya Google ya Mwenye Duka' : 'Connect Store Owner Google Account'}
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {language === 'SW' 
                  ? `Mwenye duka (${activeAccount?.email || 'Mtumiaji'}) anapaswa kuingia na barua pepe yake ya Google ili kutengeneza au kuhifadhi Google Sheets zake.` 
                  : `Store owner (${activeAccount?.email || 'User'}) should sign in with their own Google email to manage their Google Sheets & Cloud Sync.`}
              </p>
            </div>

            <button
              onClick={handleSignIn}
              className="gsi-material-button w-full sm:w-auto shrink-0"
              style={{ minWidth: '180px' }}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Offline-First Engine & Auto-Sync Card */}
      <div className="bg-slate-900 text-white rounded-xl p-4.5 space-y-3.5 shadow-md border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
              {language === 'SW' ? '⚡ Mfumo wa Offline-First & Auto-Sync' : '⚡ Offline-First Engine & Auto-Sync'}
            </h4>
          </div>
          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
            {language === 'SW' ? '100% Tayari Bila Mtandao' : '100% Offline Ready'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {language === 'SW'
            ? 'Makeshia wanaweza kufanya mauzo, kuchapa risiti, kusajili wateja na kuweka bidhaa stoo hata kama intaneti imekatika au ipo chini. Data zote zitahifadhiwa kwenye kifaa na kusawazishwa wingu kiotomatiki mtandao ukirudi!'
            : 'Cashiers can continuously conduct sales, print receipts, register customers, and update inventory even when offline. All local records automatically sync to cloud when internet is restored.'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">{language === 'SW' ? 'Hali ya Mtandao' : 'Network Connection'}</span>
            <span className="font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
              {navigator.onLine ? (language === 'SW' ? '🟢 Hewani (Online)' : '🟢 Online') : (language === 'SW' ? '🔴 Offline Mode' : '🔴 Offline')}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">{language === 'SW' ? 'Auto-Sync' : 'Auto-Sync Engine'}</span>
            <span className="font-extrabold text-indigo-300 flex items-center gap-1 mt-0.5">
              ⚡ {language === 'SW' ? 'Imewezeshwa (Active)' : 'Enabled'}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">{language === 'SW' ? 'Hifadhi ya Kifaa' : 'Local Persistence'}</span>
            <span className="font-extrabold text-slate-200 mt-0.5 block">
              IndexedDB / LocalStorage
            </span>
          </div>
        </div>
      </div>

      {user && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Firestore Cloud Sync Card */}
          <div className="border border-slate-200 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Cloud size={16} className="text-indigo-600" />
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                {language === 'SW' ? 'Wingu la Firestore Backup' : 'Firestore Cloud Replica'}
              </h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'SW'
                ? 'Hifadhi nakala kamili ya duka lako (bidhaa, mauzo, wateja, kodi) kwenye wingu la Google Firestore ili uweze kusawazisha vifaa vyako vyote.'
                : 'Maintain an exact, encrypted twin of your LedgerBox database in Firestore, allowing live retrieval from multiple sales registers.'}
            </p>

            <div className="bg-slate-55 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>{language === 'SW' ? 'Hali ya Wingu: ' : 'Replica Status: '}</span>
                <span className="font-bold text-slate-800">{language === 'SW' ? 'Inafanya Kazi' : 'Active'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{language === 'SW' ? 'Mara ya mwisho: ' : 'Last Sync: '}</span>
                <span className="font-mono text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                  <Clock size={11} />
                  {lastCloudSync || (language === 'SW' ? 'Bado haijasawazishwa' : 'Never Synced')}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleBackupToCloud}
                disabled={isSyncingCloud}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-3xs"
              >
                {isSyncingCloud ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <ArrowUp size={13} />
                )}
                {language === 'SW' ? 'Hifadhi Wingu' : 'Sync to Cloud'}
              </button>

              <button
                onClick={handleRestoreFromCloud}
                disabled={isSyncingCloud}
                className="flex-1 py-2 bg-white hover:bg-slate-55 text-slate-700 font-bold border border-slate-200 rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isSyncingCloud ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <ArrowDown size={13} />
                )}
                {language === 'SW' ? 'Rejesha Wingu' : 'Fetch Cloud DB'}
              </button>
            </div>
          </div>

          {/* Google Sheets Integration Card */}
          <div className="border border-slate-200 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileSpreadsheet size={16} className="text-emerald-600" />
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                {language === 'SW' ? 'Ujumuisho wa Google Sheets' : 'Google Sheets Automation'}
              </h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'SW'
                ? 'Hamisha risiti na mauzo yote moja kwa moja kwenye jedwali la Google Sheet ili uweze kutengeneza ripoti, chati na kufanya uchambuzi.'
                : 'Connect live Google Spreadsheets to stream transactions dynamically, enabling instant spreadsheets formulas, accounting, and reports.'}
            </p>

            {sheetsConfig.spreadsheetId ? (
              <div className="space-y-3">
                <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700 block truncate max-w-[200px]">
                      📂 {sheetsConfig.spreadsheetTitle || 'Google Spreadsheet'}
                    </span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline font-extrabold text-[10px] flex items-center gap-0.5 shrink-0"
                    >
                      {language === 'SW' ? 'Fungua' : 'Open'} ↗
                    </a>
                  </div>
                  <p className="text-[9.5px] font-mono text-slate-400 truncate mt-1">ID: {sheetsConfig.spreadsheetId}</p>
                </div>

                <div className="flex items-center justify-between p-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                      checked={sheetsConfig.autoSync}
                      onChange={(e) => updateSheetsConfig({ autoSync: e.target.checked })}
                    />
                    <span className="text-[11px] font-bold text-slate-700">
                      {language === 'SW' ? 'Sawazisha auto wakati wa mauzo' : 'Auto-sync on new sales'}
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSyncAllTransactions}
                    disabled={isSyncingSheets}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {isSyncingSheets ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    {language === 'SW' ? 'Sawazisha Mauzo yote' : 'Force Sheet Sync'}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(language === 'SW' ? 'Ondoa unganisho hili la Sheet?' : 'Disconnect this Google Sheet?')) {
                        updateSheetsConfig({ spreadsheetId: '', spreadsheetTitle: '' });
                      }
                    }}
                    className="px-3 py-2 text-slate-550 hover:bg-red-50 hover:text-red-650 font-bold border border-slate-200 rounded-lg text-xs transition cursor-pointer"
                  >
                    {language === 'SW' ? 'Ondoa' : 'Disconnect'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1">
                <button
                  onClick={handleCreateNewSpreadsheet}
                  disabled={isCreatingSheet}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isCreatingSheet ? (
                    <RefreshCw size={13} className="animate-spin text-emerald-600" />
                  ) : (
                    <Plus size={14} className="text-emerald-700" />
                  )}
                  {language === 'SW' ? 'Sakinisha Google Sheet Mpya' : 'Create New Google Sheet'}
                </button>

                <div className="flex items-center gap-2">
                  <div className="h-[1px] bg-slate-200 flex-1"></div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">AU / OR</span>
                  <div className="h-[1px] bg-slate-200 flex-1"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={language === 'SW' ? 'Weka Spreadsheet ID ya sasa' : 'Enter existing Spreadsheet ID'}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        const val = target.value.trim();
                        if (val) {
                          updateSheetsConfig({
                            spreadsheetId: val,
                            spreadsheetTitle: 'Linked Google Spreadsheet'
                          });
                          target.value = '';
                          triggerAlert(
                            language === 'SW' ? 'Google Sheet imeunganishwa kikamilifu!' : 'Google Sheet linked successfully!',
                            'success'
                          );
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const val = input.value.trim();
                      if (val) {
                        updateSheetsConfig({
                          spreadsheetId: val,
                          spreadsheetTitle: 'Linked Google Spreadsheet'
                        });
                        input.value = '';
                        triggerAlert(
                          language === 'SW' ? 'Google Sheet imeunganishwa kikamilifu!' : 'Google Sheet linked successfully!',
                          'success'
                        );
                      }
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    <Link size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Google Contacts Integration Card */}
          <div className="border border-slate-200 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <BookUser size={16} className="text-blue-600" />
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                {language === 'SW' ? 'Ujumuisho wa Google Contacts' : 'Google Contacts Integration'}
              </h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {language === 'SW'
                ? 'Unganisha orodha ya wateja na wasambazaji wako moja kwa moja na Google Contacts. Agiza anwani za wateja au hifadhi data zao kwenye akaunti yako ya Google.'
                : 'Directly sync customers and suppliers with Google Contacts. Import contact records, phone numbers, and emails or save local profiles to Google.'}
            </p>

            <div className="pt-1">
              <button
                onClick={() => setIsContactsModalOpen(true)}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <BookUser size={14} className="text-blue-600" />
                {language === 'SW' ? 'Fungua Google Contacts Hub' : 'Open Google Contacts Hub'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Google Contacts Hub Modal */}
      <GoogleContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        state={state}
      />

    </div>
  );
}
