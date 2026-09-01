import { useState, useEffect, FormEvent } from 'react';
import { StoreSettings, BusinessAccount } from '../types';
import { INITIAL_SETTINGS } from '../data/initialData';
import { useLanguage } from '../lib/translations';
import { 
  extendSubscription, 
  generateLicenseKey, 
  getLicenseStatus, 
  DEFAULT_DEVELOPER_NAME, 
  DEFAULT_DEVELOPER_PHONE, 
  DEFAULT_MONTHLY_FEE,
  DEFAULT_DEVELOPER_PIN
} from '../lib/licenseEngine';
import { 
  ShieldCheck, Calendar, Key, Copy, Check, Lock, Unlock, X, RefreshCw, 
  Phone, DollarSign, UserCheck, Sparkles, AlertTriangle, Users, Store,
  Mail, Search, Trash2, ExternalLink, Clock, MessageSquare, Send, Smartphone,
  CheckCircle2, Globe, Wifi, Laptop, Zap, Activity, Edit3, PlusCircle, Save
} from 'lucide-react';
import { RemoteStoreRecord, fetchRemoteStoresFromCloud, updateRemoteStoreInCloud, deleteRemoteStoreFromCloud, syncAllLocalStoresToCloud } from '../lib/remoteStoreTracker';

interface DeveloperLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  accounts?: BusinessAccount[];
  activeAccount?: BusinessAccount | null;
  onSwitchAccount?: (accountId: string) => void;
  onDeleteAccount?: (accountId: string) => void;
  onReloadAccounts?: () => void;
}

// Helper to get StoreSettings for a specific account ID
function getAccountSettings(account: BusinessAccount, currentActiveAccount: BusinessAccount | null, activeSettings: StoreSettings): StoreSettings {
  if (currentActiveAccount && account.id === currentActiveAccount.id) {
    return activeSettings;
  }

  // 1. Check direct settings key for account
  const directSettingsRaw = localStorage.getItem(`pm_settings_${account.id}`);
  if (directSettingsRaw) {
    try {
      const parsed = JSON.parse(directSettingsRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
  }

  // 2. Build list of potential database keys for this account
  const candidateKeys: string[] = [
    `pm_db_${account.id}_default`,
    `pm_db_${account.id}_shop-default`
  ];

  if (account.id === 'acc_default_main') {
    candidateKeys.push('pm_supermarket_offline_db');
  }

  // Check if shops list exists for this account
  const shopsRaw = localStorage.getItem(`pm_shops_${account.id}`);
  if (shopsRaw) {
    try {
      const shops = JSON.parse(shopsRaw);
      if (Array.isArray(shops)) {
        for (const s of shops) {
          if (s && s.id) {
            candidateKeys.unshift(`pm_db_${account.id}_${s.id}`);
          }
        }
      }
    } catch (e) {}
  }

  // Try reading from candidate keys
  for (const key of candidateKeys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.settings) return parsed.settings;
      } catch (e) {}
    }
  }

  // Fallback default settings initialized with account's metadata
  return {
    ...INITIAL_SETTINGS,
    storeName: account.storeName || INITIAL_SETTINGS.storeName,
    phone: account.phone || INITIAL_SETTINGS.phone,
    address: account.address || INITIAL_SETTINGS.address,
    receiptGreeting: account.ownerName || INITIAL_SETTINGS.receiptGreeting
  };
}

// Helper to save StoreSettings for a specific account ID
function saveAccountSettings(
  account: BusinessAccount, 
  newSettings: StoreSettings, 
  currentActiveAccount: BusinessAccount | null, 
  onUpdateSettings: (s: StoreSettings) => void
) {
  if (currentActiveAccount && account.id === currentActiveAccount.id) {
    onUpdateSettings(newSettings);
  }

  // 1. Save direct settings backup for account
  try {
    localStorage.setItem(`pm_settings_${account.id}`, JSON.stringify(newSettings));
  } catch (e) {}

  // 2. Identify all possible db storage keys to update
  const targetKeys = new Set<string>([
    `pm_db_${account.id}_default`,
    `pm_db_${account.id}_shop-default`
  ]);

  if (account.id === 'acc_default_main') {
    targetKeys.add('pm_supermarket_offline_db');
  }

  const shopsRaw = localStorage.getItem(`pm_shops_${account.id}`);
  if (shopsRaw) {
    try {
      const shops = JSON.parse(shopsRaw);
      if (Array.isArray(shops)) {
        for (const s of shops) {
          if (s && s.id) targetKeys.add(`pm_db_${account.id}_${s.id}`);
        }
      }
    } catch (e) {}
  }

  // 3. Write to all target keys
  for (const key of targetKeys) {
    const raw = localStorage.getItem(key);
    let dbData: any = {};
    if (raw) {
      try {
        dbData = JSON.parse(raw);
      } catch (e) {
        dbData = {};
      }
    }
    dbData.settings = newSettings;
    try {
      localStorage.setItem(key, JSON.stringify(dbData));
    } catch (e) {}
  }

  // 4. Update cloud remote store record if online
  const license = getLicenseStatus(newSettings);
  updateRemoteStoreInCloud(account.id, {
    subscriptionExpiresAt: newSettings.subscriptionExpiryDate || license.expiryDateStr,
    subscriptionStatus: license.isLocked ? 'LOCKED' : license.isExpired ? 'EXPIRED' : 'ACTIVE',
    storeName: newSettings.storeName || account.storeName,
    phone: newSettings.phone || account.phone
  }).catch(() => {});
}

export default function DeveloperLicenseModal({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings,
  accounts = [],
  activeAccount = null,
  onSwitchAccount,
  onDeleteAccount,
  onReloadAccounts
}: DeveloperLicenseModalProps) {
  const { language } = useLanguage();

  const licenseStatus = getLicenseStatus(settings);

  const [activeTab, setActiveTab] = useState<'REMOTE_STORES' | 'ACCOUNTS' | 'QUICK_GRANT' | 'KEY_GEN' | 'SETTINGS'>('REMOTE_STORES');
  const [customDays, setCustomDays] = useState<string>('30');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [generatedType, setGeneratedType] = useState<'30_DAYS' | '90_DAYS' | '365_DAYS' | 'LIFETIME'>('30_DAYS');
  const [copiedKeyMsg, setCopiedKeyMsg] = useState<boolean>(false);

  // Live Cloud Remote Stores State
  const [remoteStores, setRemoteStores] = useState<RemoteStoreRecord[]>([]);
  const [isLoadingRemoteStores, setIsLoadingRemoteStores] = useState<boolean>(false);
  const [searchRemoteTerm, setSearchRemoteTerm] = useState<string>('');
  const [remoteFilter, setRemoteFilter] = useState<'ALL' | 'ONLINE_TODAY' | 'ACTIVE' | 'EXPIRED' | 'LOCKED'>('ALL');
  
  // Developer configurable settings
  const [devNameInput, setDevNameInput] = useState(settings.developerName || DEFAULT_DEVELOPER_NAME);
  const [devPhoneInput, setDevPhoneInput] = useState(settings.developerPhone || DEFAULT_DEVELOPER_PHONE);
  const [devFeeInput, setDevFeeInput] = useState((settings.monthlyFeeAmount || DEFAULT_MONTHLY_FEE).toString());
  const [devPinInput, setDevPinInput] = useState(settings.developerPin || DEFAULT_DEVELOPER_PIN);
  const [saveDevSettingsSuccess, setSaveDevSettingsSuccess] = useState(false);

  // Accounts search & filter state
  const [searchAccountTerm, setSearchAccountTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'LOCKED'>('ALL');
  const [accountCustomDays, setAccountCustomDays] = useState<{ [accId: string]: string }>({});
  const [accountGenKeys, setAccountGenKeys] = useState<{ [accId: string]: string }>({});
  const [copiedAccKeyId, setCopiedAccKeyId] = useState<string | null>(null);
  const [actionNotification, setActionNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Edit Account Modal State
  const [editingAccount, setEditingAccount] = useState<BusinessAccount | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Create New Account Modal State
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newInitialDays, setNewInitialDays] = useState('30');

  // Deletion Confirmation States
  const [accountToDelete, setAccountToDelete] = useState<BusinessAccount | null>(null);
  const [remoteStoreToDelete, setRemoteStoreToDelete] = useState<RemoteStoreRecord | null>(null);
  const [shopToDelete, setShopToDelete] = useState<{ accountId: string; accountName: string; shopId: string; shopName: string } | null>(null);

  // Helper to read all branch shops of an account
  const getAccountShops = (accountId: string, fallbackName: string) => {
    try {
      const raw = localStorage.getItem(`pm_shops_${accountId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [{ id: 'default', name: fallbackName || 'Duka Kuu', createdAt: new Date().toISOString() }];
  };

  // Local accounts state for real-time refresh capability
  const [localAccounts, setLocalAccounts] = useState<BusinessAccount[]>(accounts);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);

  // Keep localAccounts synced when props change or from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pm_registered_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalAccounts(parsed);
          return;
        }
      }
    } catch (e) {}

    if (accounts && accounts.length > 0) {
      setLocalAccounts(accounts);
    }
  }, [accounts]);

  const handleLoadRemoteStores = async () => {
    setIsLoadingRemoteStores(true);
    try {
      await syncAllLocalStoresToCloud();
      const stores = await fetchRemoteStoresFromCloud();
      setRemoteStores(stores);

      // Auto-populate accounts list with any remote stores discovered in cloud
      try {
        const saved = localStorage.getItem('pm_registered_accounts');
        let currentLocalAccs: BusinessAccount[] = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(currentLocalAccs)) currentLocalAccs = [];

        let addedAny = false;
        for (const store of stores) {
          const exists = currentLocalAccs.some(a => a.id === store.accountId || a.id === store.id || a.storeName.toLowerCase() === store.storeName.toLowerCase());
          if (!exists && store.storeName) {
            const newAcc: BusinessAccount = {
              id: store.accountId || store.id || `acc_${Date.now()}`,
              email: `${store.storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'duka'}@pos.tz`,
              password: '1234',
              storeName: store.storeName,
              ownerName: store.ownerName || 'Mwenye Duka',
              phone: store.phone !== 'Haina Namba' ? store.phone : '0700000000',
              createdAt: store.lastActiveAt || new Date().toISOString()
            };
            currentLocalAccs.push(newAcc);
            addedAny = true;
          }
        }

        if (addedAny) {
          localStorage.setItem('pm_registered_accounts', JSON.stringify(currentLocalAccs));
          setLocalAccounts(currentLocalAccs);
          if (onReloadAccounts) onReloadAccounts();
        }
      } catch (e) {}

    } catch (e) {
      console.error('Error loading remote stores:', e);
    } finally {
      setIsLoadingRemoteStores(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleLoadRemoteStores();
      const interval = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          fetchRemoteStoresFromCloud().then(setRemoteStores).catch(() => {});
        }
      }, 25000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleUpdateRemoteStoreSubscription = async (store: RemoteStoreRecord, daysToAdd: number) => {
    const currentExpiry = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : new Date();
    const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 86400000).toISOString();

    const success = await updateRemoteStoreInCloud(store.id, {
      subscriptionExpiresAt: newExpiry,
      subscriptionStatus: 'ACTIVE'
    });

    if (success) {
      showNotification(`Duka la "${store.storeName}" limeongezwa siku ${daysToAdd} ya huduma!`);
      handleLoadRemoteStores();
    }
  };

  const handleToggleRemoteStoreLock = async (store: RemoteStoreRecord, newStatus: 'ACTIVE' | 'LOCKED') => {
    const success = await updateRemoteStoreInCloud(store.id, {
      subscriptionStatus: newStatus
    });

    if (success) {
      showNotification(
        newStatus === 'LOCKED' 
          ? `Duka la "${store.storeName}" limefungwa (Locked) kikamilifu!` 
          : `Duka la "${store.storeName}" limefunguliwa (Unlocked) kikamilifu!`
      );
      handleLoadRemoteStores();
    }
  };

  // Quick switch into any remote store from developer panel
  const handleSwitchToRemoteStore = (store: RemoteStoreRecord) => {
    let targetAccount = displayAccounts.find(a => 
      a.id === store.accountId || 
      a.id === store.id || 
      a.storeName.toLowerCase() === store.storeName.toLowerCase()
    );

    if (!targetAccount) {
      const newAcc: BusinessAccount = {
        id: store.accountId || store.id || `acc_${Date.now()}`,
        email: `${store.storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'duka'}@pos.tz`,
        password: '1234',
        storeName: store.storeName,
        ownerName: store.ownerName || 'Mwenye Duka',
        phone: store.phone !== 'Haina Namba' ? store.phone : '0700000000',
        createdAt: store.lastActiveAt || new Date().toISOString()
      };
      const initialSettings: StoreSettings = {
        ...INITIAL_SETTINGS,
        storeName: newAcc.storeName,
        phone: newAcc.phone,
        subscriptionExpiryDate: store.subscriptionExpiresAt,
        subscriptionStatus: store.subscriptionStatus === 'LOCKED' ? 'LOCKED' : 'ACTIVE'
      };
      saveAccountSettings(newAcc, initialSettings, activeAccount, onUpdateSettings);
      const updatedList = [...displayAccounts, newAcc];
      setLocalAccounts(updatedList);
      try {
        localStorage.setItem('pm_registered_accounts', JSON.stringify(updatedList));
      } catch (e) {}
      targetAccount = newAcc;
    }

    if (onSwitchAccount && targetAccount) {
      onSwitchAccount(targetAccount.id);
      showNotification(`Umeingia kwenye duka la "${targetAccount.storeName}"!`);
      onClose();
    }
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotification({ text, type });
    setTimeout(() => setActionNotification(null), 3000);
  };

  const handleRefreshAllAccounts = async () => {
    setIsRefreshingAccounts(true);
    setIsLoadingRemoteStores(true);

    try {
      // 1. Sync all local stores to Cloud Firestore
      await syncAllLocalStoresToCloud();

      // 2. Fetch all stores from Cloud Firestore
      const stores = await fetchRemoteStoresFromCloud();
      setRemoteStores(stores);

      // 3. Merge with local accounts
      const saved = localStorage.getItem('pm_registered_accounts');
      let currentAccs: BusinessAccount[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(currentAccs)) currentAccs = [];

      for (const store of stores) {
        const exists = currentAccs.some(a => a.id === store.accountId || a.id === store.id || a.storeName.toLowerCase() === store.storeName.toLowerCase());
        if (!exists && store.storeName) {
          currentAccs.push({
            id: store.accountId || store.id || `acc_${Date.now()}`,
            email: `${store.storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'duka'}@pos.tz`,
            password: '1234',
            storeName: store.storeName,
            ownerName: store.ownerName || 'Mwenye Duka',
            phone: store.phone !== 'Haina Namba' ? store.phone : '0700000000',
            createdAt: store.lastActiveAt || new Date().toISOString()
          });
        }
      }

      localStorage.setItem('pm_registered_accounts', JSON.stringify(currentAccs));
      setLocalAccounts(currentAccs);

      if (onReloadAccounts) {
        onReloadAccounts();
      }

      triggerRefresh();
      showNotification(`Maduka yote ${stores.length} yamesawazishwa kikamilifu kutoka kwenye domain link!`);
    } catch (e) {
      console.error('Failed to sync all accounts & stores:', e);
      showNotification('Usawazishaji umekamilika kwa kutumia kumbukumbu ya kifaa.');
    } finally {
      setIsRefreshingAccounts(false);
      setIsLoadingRemoteStores(false);
    }
  };

  // Build comprehensive deduplicated list of accounts
  const allAccMap = new Map<string, BusinessAccount>();
  (accounts || []).forEach(a => { if (a && a.id) allAccMap.set(a.id, a); });
  (localAccounts || []).forEach(a => { if (a && a.id) allAccMap.set(a.id, a); });
  
  try {
    const saved = localStorage.getItem('pm_registered_accounts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(a => { if (a && a.id) allAccMap.set(a.id, a); });
      }
    }
  } catch (e) {}

  if (activeAccount && activeAccount.id) {
    allAccMap.set(activeAccount.id, activeAccount);
  }

  if (allAccMap.size === 0) {
    const defAcc: BusinessAccount = {
      id: 'acc_default_main',
      email: 'admin@pos.tz',
      ownerName: 'Mwenye Duka',
      storeName: settings.storeName || 'Duka Kuu',
      phone: settings.phone || '0700000000',
      createdAt: new Date().toISOString()
    };
    allAccMap.set(defAcc.id, defAcc);
  }

  const displayAccounts = Array.from(allAccMap.values());

  // Quick Extend for current active account
  const handleQuickExtend = (days: number, plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' = 'MONTHLY') => {
    const updated = extendSubscription(settings, days, plan);
    onUpdateSettings(updated);
    showNotification(`Huduma ya duka la sasa imeongezwa siku ${days}!`);
  };

  const handleCustomExtend = (e: FormEvent) => {
    e.preventDefault();
    const days = parseInt(customDays, 10);
    if (!isNaN(days) && days > 0) {
      handleQuickExtend(days, days >= 365 ? 'ANNUAL' : 'MONTHLY');
    }
  };

  // Extend Subscription for ANY account by ID
  const handleExtendAccountSubscription = (
    account: BusinessAccount, 
    daysToAdd: number, 
    plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' = 'MONTHLY'
  ) => {
    const currentAccSettings = getAccountSettings(account, activeAccount, settings);
    const updatedSettings = extendSubscription(currentAccSettings, daysToAdd, plan);
    saveAccountSettings(account, updatedSettings, activeAccount, onUpdateSettings);
    triggerRefresh();
    showNotification(`Akaunti "${account.storeName}" imeongezwa siku ${daysToAdd} ya leseni!`);
  };

  // Lock/Unlock ANY account
  const handleToggleAccountLock = (account: BusinessAccount, newStatus: 'ACTIVE' | 'LOCKED') => {
    const currentAccSettings = getAccountSettings(account, activeAccount, settings);
    const updatedSettings: StoreSettings = {
      ...currentAccSettings,
      subscriptionStatus: newStatus
    };
    saveAccountSettings(account, updatedSettings, activeAccount, onUpdateSettings);
    triggerRefresh();
    showNotification(
      newStatus === 'LOCKED' 
        ? `Akaunti ya duka "${account.storeName}" IMEFUNGWA (Locked)!` 
        : `Akaunti ya duka "${account.storeName}" IMEFUNGULIWA (Unlocked)!`
    );
  };

  // Open Edit Modal for Account
  const handleOpenEditAccount = (acc: BusinessAccount) => {
    const accSet = getAccountSettings(acc, activeAccount, settings);
    setEditingAccount(acc);
    setEditStoreName(acc.storeName || accSet.storeName || '');
    setEditOwnerName(acc.ownerName || '');
    setEditPhone(acc.phone || accSet.phone || '');
    setEditEmail(acc.email || '');
    setEditAddress(acc.address || accSet.address || '');
  };

  // Save Edited Account Details
  const handleSaveEditedAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const updatedAccount: BusinessAccount = {
      ...editingAccount,
      storeName: editStoreName.trim() || editingAccount.storeName,
      ownerName: editOwnerName.trim() || editingAccount.ownerName,
      phone: editPhone.trim() || editingAccount.phone,
      email: editEmail.trim() || editingAccount.email,
      address: editAddress.trim() || editingAccount.address,
    };

    // Update in local state
    const newAccountsList = displayAccounts.map(a => a.id === updatedAccount.id ? updatedAccount : a);
    setLocalAccounts(newAccountsList);
    try {
      localStorage.setItem('pm_registered_accounts', JSON.stringify(newAccountsList));
    } catch (e) {}

    // Update settings
    const currentAccSettings = getAccountSettings(updatedAccount, activeAccount, settings);
    const newSettings: StoreSettings = {
      ...currentAccSettings,
      storeName: updatedAccount.storeName,
      phone: updatedAccount.phone,
      address: updatedAccount.address || currentAccSettings.address,
      receiptGreeting: updatedAccount.ownerName || currentAccSettings.receiptGreeting
    };
    saveAccountSettings(updatedAccount, newSettings, activeAccount, onUpdateSettings);

    if (onReloadAccounts) onReloadAccounts();
    triggerRefresh();
    setEditingAccount(null);
    showNotification(`Taarifa za duka "${updatedAccount.storeName}" zimehifadhiwa kikamilifu!`);
  };

  // Create New Store Account
  const handleCreateNewAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newEmail.trim()) {
      showNotification('Tafadhali jaza jina la duka na barua pepe!', 'error');
      return;
    }

    const newAccId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAccount: BusinessAccount = {
      id: newAccId,
      email: newEmail.trim(),
      password: newPassword.trim() || '1234',
      storeName: newStoreName.trim(),
      ownerName: newOwnerName.trim() || 'Mwenye Duka',
      phone: newPhone.trim() || '0700000000',
      createdAt: new Date().toISOString()
    };

    const initialDays = parseInt(newInitialDays, 10) || 30;
    const initialSettings = extendSubscription({
      ...INITIAL_SETTINGS,
      storeName: newAccount.storeName,
      phone: newAccount.phone,
      receiptGreeting: newAccount.ownerName
    }, initialDays, initialDays >= 365 ? 'ANNUAL' : 'MONTHLY');

    // Save initial db & settings
    saveAccountSettings(newAccount, initialSettings, activeAccount, onUpdateSettings);

    const updatedList = [...displayAccounts, newAccount];
    setLocalAccounts(updatedList);
    try {
      localStorage.setItem('pm_registered_accounts', JSON.stringify(updatedList));
    } catch (e) {}

    if (onReloadAccounts) onReloadAccounts();
    triggerRefresh();

    // Reset form
    setShowCreateAccountModal(false);
    setNewStoreName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewEmail('');
    setNewPassword('1234');
    setNewInitialDays('30');

    showNotification(`Akaunti ya duka "${newAccount.storeName}" imesajiliwa kikamilifu na kupewa siku ${initialDays}!`);
  };

  // Import Remote Store to Local Accounts
  const handleImportRemoteStoreToAccount = (remoteStore: RemoteStoreRecord) => {
    const existing = displayAccounts.find(a => a.id === remoteStore.id || a.storeName.toLowerCase() === remoteStore.storeName.toLowerCase());
    if (existing) {
      showNotification(`Duka la "${remoteStore.storeName}" tayari lipo kwenye orodha ya akaunti zako!`);
      return;
    }

    const newAcc: BusinessAccount = {
      id: remoteStore.id || `acc_${Date.now()}`,
      email: `${remoteStore.storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'duka'}@pos.tz`,
      password: '1234',
      storeName: remoteStore.storeName,
      ownerName: remoteStore.ownerName || 'Mwenye Duka',
      phone: remoteStore.phone !== 'Haina Namba' ? remoteStore.phone : '0700000000',
      createdAt: remoteStore.lastActiveAt || new Date().toISOString()
    };

    const initialSettings: StoreSettings = {
      ...INITIAL_SETTINGS,
      storeName: newAcc.storeName,
      phone: newAcc.phone,
      subscriptionExpiryDate: remoteStore.subscriptionExpiresAt,
      subscriptionStatus: remoteStore.subscriptionStatus === 'LOCKED' ? 'LOCKED' : 'ACTIVE'
    };

    saveAccountSettings(newAcc, initialSettings, activeAccount, onUpdateSettings);

    const updatedList = [...displayAccounts, newAcc];
    setLocalAccounts(updatedList);
    try {
      localStorage.setItem('pm_registered_accounts', JSON.stringify(updatedList));
    } catch (e) {}

    if (onReloadAccounts) onReloadAccounts();
    triggerRefresh();
    showNotification(`Duka la "${remoteStore.storeName}" limeingizwa kwenye orodha ya akaunti zako!`);
  };

  // Confirm Delete Store / Account
  const handleConfirmDeleteAccount = () => {
    if (!accountToDelete) return;
    const acc = accountToDelete;

    // 1. Comprehensive Local Storage cleanup for this account
    try {
      localStorage.removeItem(`pm_shops_${acc.id}`);
      localStorage.removeItem(`pm_settings_${acc.id}`);
      localStorage.removeItem(`pm_active_shop_${acc.id}`);
      localStorage.removeItem(`pm_db_${acc.id}_default`);
      localStorage.removeItem(`pm_db_${acc.id}_shop-default`);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`pm_db_${acc.id}_`) || key.includes(acc.id))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error cleaning up account storage:', e);
    }

    // 2. Call external onDeleteAccount if provided
    if (onDeleteAccount) {
      onDeleteAccount(acc.id);
    }

    // 3. Update local accounts state
    const updatedList = displayAccounts.filter(a => a.id !== acc.id);
    if (updatedList.length === 0) {
      const defAcc: BusinessAccount = {
        id: 'acc_default_main',
        email: 'admin@pos.tz',
        ownerName: 'Mwenye Duka',
        storeName: 'Duka Kuu',
        phone: '0700000000',
        createdAt: new Date().toISOString()
      };
      setLocalAccounts([defAcc]);
      try {
        localStorage.setItem('pm_registered_accounts', JSON.stringify([defAcc]));
      } catch (e) {}
    } else {
      setLocalAccounts(updatedList);
      try {
        localStorage.setItem('pm_registered_accounts', JSON.stringify(updatedList));
      } catch (e) {}
    }

    // 4. Delete remote tracker entry if exists
    deleteRemoteStoreFromCloud(acc.id).catch(() => {});

    if (onReloadAccounts) onReloadAccounts();
    triggerRefresh();
    showNotification(`Duka la "${acc.storeName}" limefutwa kikamilifu kwenye mfumo.`);
    setAccountToDelete(null);
  };

  // Confirm Delete Branch Shop
  const handleConfirmDeleteShop = () => {
    if (!shopToDelete) return;
    const { accountId, shopId, shopName } = shopToDelete;
    try {
      const shopsRaw = localStorage.getItem(`pm_shops_${accountId}`);
      if (shopsRaw) {
        const parsedShops = JSON.parse(shopsRaw);
        if (Array.isArray(parsedShops)) {
          const remaining = parsedShops.filter((s: any) => s.id !== shopId);
          localStorage.setItem(`pm_shops_${accountId}`, JSON.stringify(remaining));
        }
      }
      localStorage.removeItem(`pm_db_${accountId}_${shopId}`);
    } catch (e) {
      console.error('Error deleting sub-shop:', e);
    }
    triggerRefresh();
    showNotification(`Tawi la "${shopName}" limefutwa kikamilifu.`);
    setShopToDelete(null);
  };

  // Confirm Delete Remote Store from Cloud
  const handleConfirmDeleteRemoteStore = async () => {
    if (!remoteStoreToDelete) return;
    const store = remoteStoreToDelete;
    await deleteRemoteStoreFromCloud(store.id);
    setRemoteStores(prev => prev.filter(s => s.id !== store.id));
    showNotification(`Kumbukumbu ya duka la "${store.storeName}" imefutwa kwenye wingu.`);
    setRemoteStoreToDelete(null);
  };

  // Generate Key for Account
  const handleGenerateAccountKey = (account: BusinessAccount, type: '30_DAYS' | '90_DAYS' | '365_DAYS' | 'LIFETIME') => {
    const key = generateLicenseKey(type);
    setAccountGenKeys(prev => ({ ...prev, [account.id]: key }));
  };

  // Copy WhatsApp message for a specific account key
  const handleCopyAccountWhatsApp = (account: BusinessAccount) => {
    const key = accountGenKeys[account.id];
    if (!key) return;

    const feeFormatted = (settings.monthlyFeeAmount || DEFAULT_MONTHLY_FEE).toLocaleString();
    const message = `Habari Ndugu ${account.ownerName} (${account.storeName}),
Asante kwa kulipia ada ya mwezi ya TSh ${feeFormatted} ya mfumo wa LedgerBox POS.

🔑 **Key yako ya Leseni (Activation Key):**
\`${key}\`

Hatua za Kuingiza:
1. Fungua mfumo wako wa LedgerBox.
2. Nenda kwenye Mipangilio -> Leseni au uingize kwenye kisanduku cha 'Activation Key'.
3. Bonyeza 'Washa Key' kurejesha huduma mara moja!

Asante kwa kutumia LedgerBox POS!`;

    navigator.clipboard.writeText(message);
    setCopiedAccKeyId(account.id);
    setTimeout(() => setCopiedAccKeyId(null), 2500);
  };

  const handleToggleLockStatus = (newStatus: 'ACTIVE' | 'LOCKED') => {
    onUpdateSettings({
      ...settings,
      subscriptionStatus: newStatus
    });
  };

  const handleGenerateKey = (type: '30_DAYS' | '90_DAYS' | '365_DAYS' | 'LIFETIME') => {
    setGeneratedType(type);
    const key = generateLicenseKey(type);
    setGeneratedKey(key);
  };

  const handleCopyWhatsAppMessage = () => {
    if (!generatedKey) return;
    const feeFormatted = (settings.monthlyFeeAmount || DEFAULT_MONTHLY_FEE).toLocaleString();
    const daysStr = generatedType === '30_DAYS' ? '30 (Mwezi 1)' : generatedType === '90_DAYS' ? '90 (Miezi 3)' : generatedType === '365_DAYS' ? '365 (Mwaka 1)' : 'Maisha (Lifetime)';
    
    const message = `Habari ${settings.storeName || 'Duka'},
Asante kwa kulipia ada ya mwezi ya TSh ${feeFormatted} ya mfumo wa LedgerBox POS.

🔑 **Key yako ya Leseni (Siku ${daysStr}):**
\`${generatedKey}\`

Hatua za Kuingiza:
1. Fungua mfumo wa LedgerBox.
2. Ingiza Key hii hapo juu kwenye kisanduku cha 'Activation Key'.
3. Bonyeza 'Washa Huduma' kurejesha huduma mara moja!

Asante kwa kuwahudumia wateja wako na LedgerBox!`;

    navigator.clipboard.writeText(message);
    setCopiedKeyMsg(true);
    setTimeout(() => setCopiedKeyMsg(false), 2000);
  };

  const handleSaveDevConfig = (e: FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      developerName: devNameInput,
      developerPhone: devPhoneInput,
      monthlyFeeAmount: parseFloat(devFeeInput) || DEFAULT_MONTHLY_FEE,
      developerPin: devPinInput
    });
    setSaveDevSettingsSuccess(true);
    setTimeout(() => setSaveDevSettingsSuccess(false), 2000);
  };

  // Filtered accounts list
  const filteredAccounts = displayAccounts.filter(acc => {
    const term = searchAccountTerm.toLowerCase().trim();
    const matchesSearch = 
      acc.storeName.toLowerCase().includes(term) ||
      acc.ownerName.toLowerCase().includes(term) ||
      acc.email.toLowerCase().includes(term) ||
      (acc.phone && acc.phone.includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const accSet = getAccountSettings(acc, activeAccount, settings);
    const stat = getLicenseStatus(accSet);

    if (statusFilter === 'ACTIVE') return !stat.isExpired && !stat.isLocked;
    if (statusFilter === 'EXPIRED') return stat.isExpired && !stat.isLocked;
    if (statusFilter === 'LOCKED') return stat.isLocked;

    return true;
  });

  const filteredRemoteStores = remoteStores.filter(s => {
    const term = searchRemoteTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      (s.storeName && s.storeName.toLowerCase().includes(term)) ||
      (s.ownerName && s.ownerName.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term)) ||
      (s.deviceType && s.deviceType.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (remoteFilter === 'ONLINE_TODAY') {
      if (!s.lastActiveAt) return false;
      return (Date.now() - new Date(s.lastActiveAt).getTime()) < 24 * 60 * 60 * 1000;
    }
    if (remoteFilter === 'ACTIVE') {
      return s.subscriptionStatus === 'ACTIVE';
    }
    if (remoteFilter === 'EXPIRED') {
      return s.subscriptionStatus === 'EXPIRED' || (s.subscriptionExpiresAt && new Date(s.subscriptionExpiresAt).getTime() < Date.now());
    }
    if (remoteFilter === 'LOCKED') {
      return s.subscriptionStatus === 'LOCKED';
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative my-auto max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-950">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                Developer Admin Console ({devNameInput})
                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-md font-mono">
                  Master Subscription Control
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Usimamizi wa Akaunti Zote za Watumiaji, Malipo ya Mwezi, na Udhibiti wa Huduma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="dev-header-refresh-btn"
              onClick={handleRefreshAllAccounts}
              disabled={isRefreshingAccounts || isLoadingRemoteStores}
              className="px-3 py-2 text-indigo-200 hover:text-white bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/80 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 shadow-md shadow-indigo-950/50"
              title="Sawazisha na Refresh Maduka Yote Yaliyofunguliwa kwenye Domain Link"
            >
              <RefreshCw size={15} className={isRefreshingAccounts || isLoadingRemoteStores ? 'animate-spin text-indigo-400' : 'text-indigo-400'} />
              <span className="hidden sm:inline">
                {isRefreshingAccounts || isLoadingRemoteStores ? 'Inasawazisha...' : 'Refresh Maduka Yote'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {actionNotification && (
          <div className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b shrink-0 ${
            actionNotification.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' 
              : 'bg-rose-950/90 text-rose-300 border-rose-800'
          }`}>
            <CheckCircle2 size={15} />
            <span>{actionNotification.text}</span>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 pt-2 flex gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('REMOTE_STORES');
              handleLoadRemoteStores();
            }}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === 'REMOTE_STORES'
                ? 'bg-slate-900 text-emerald-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Globe size={15} className="text-emerald-400 animate-pulse" />
            Maduka ya Wingu (Live Devices) ({remoteStores.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === 'ACCOUNTS'
                ? 'bg-slate-900 text-indigo-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Users size={15} />
            Akaunti Zote ({displayAccounts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUICK_GRANT')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === 'QUICK_GRANT'
                ? 'bg-slate-900 text-indigo-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Calendar size={15} />
            Ongeza Duka la Sasa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('KEY_GEN')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === 'KEY_GEN'
                ? 'bg-slate-900 text-indigo-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Key size={15} />
            Tengeneza Key ya Leseni
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer border-t border-x ${
              activeTab === 'SETTINGS'
                ? 'bg-slate-900 text-indigo-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <UserCheck size={15} />
            Mipangilio ya Developer
          </button>
        </div>

        {/* MAIN BODY CONTENT */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">

          {/* TAB 0: LIVE CLOUD REMOTE STORES TRACKER */}
          {activeTab === 'REMOTE_STORES' && (
            <div className="space-y-4">
              
              {/* REFRESH BANNER & STATS */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-4 rounded-2xl border border-emerald-900/50 shadow-inner">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                    <Globe size={16} className="text-emerald-400" />
                    {language === 'SW' ? 'Maduka na Vifaa Vyote Vilivyofungua Mfumo (Domain Link)' : 'Live Remote Stores & Connected Devices'}
                    <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-700/80 px-2 py-0.5 rounded-full font-mono font-bold">
                      {remoteStores.length} Maduka Yaliyosajiliwa
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'SW'
                      ? 'Orodha hii inakuonyesha maduka yote yaliyofunguliwa au kusajiliwa kwenye link yako ya domain. Bonyeza Refresh kusawazisha maduka yote kutoka kwenye wingu (Cloud Registry).'
                      : 'Live registry of all stores and devices created or operated on your domain link. Click Refresh to synchronize all cloud stores.'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-emerald-400/90 font-mono">
                    <Wifi size={12} />
                    <span>Domain: {typeof window !== 'undefined' ? window.location.host : 'ledgerbox-pos.app'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  id="dev-tab-refresh-remote-btn"
                  onClick={handleRefreshAllAccounts}
                  disabled={isLoadingRemoteStores || isRefreshingAccounts}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/50 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={isLoadingRemoteStores || isRefreshingAccounts ? 'animate-spin' : ''} />
                  <span>
                    {isLoadingRemoteStores || isRefreshingAccounts
                      ? (language === 'SW' ? 'Inasawazisha Maduka Yote...' : 'Syncing All Stores...') 
                      : (language === 'SW' ? '🔄 Refresh Maduka Yote (Domain)' : '🔄 Refresh All Domain Stores')}
                  </span>
                </button>
              </div>

              {/* SUMMARY METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-black uppercase block">Maduka Yaliyofunguliwa</span>
                  <span className="text-base font-black text-white mt-0.5 block">{remoteStores.length} Devices</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-900/40">
                  <span className="text-[10px] text-emerald-400/80 font-black uppercase block">Mtandaoni Leo (Online Today)</span>
                  <span className="text-base font-black text-emerald-400 mt-0.5 block flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                    {remoteStores.filter(s => {
                      if (!s.lastActiveAt) return false;
                      const diff = Date.now() - new Date(s.lastActiveAt).getTime();
                      return diff < 86400000;
                    }).length}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-amber-900/40">
                  <span className="text-[10px] text-amber-400/80 font-black uppercase block">Jumla ya Mauzo Duniani</span>
                  <span className="text-base font-black text-amber-400 mt-0.5 block">
                    {remoteStores.reduce((acc, s) => acc + (s.totalSalesCount || 0), 0)} Transactions
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-indigo-900/40">
                  <span className="text-[10px] text-indigo-400/80 font-black uppercase block">Jumla ya Mapato</span>
                  <span className="text-base font-black text-indigo-300 mt-0.5 block truncate">
                    TZS {remoteStores.reduce((acc, s) => acc + (s.totalRevenue || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchRemoteTerm}
                    onChange={(e) => setSearchRemoteTerm(e.target.value)}
                    placeholder="Tafuta kwa jina la duka, mmiliki, namba au kifaa..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
                  {(['ALL', 'ONLINE_TODAY', 'ACTIVE', 'EXPIRED', 'LOCKED'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRemoteFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase transition cursor-pointer ${
                        remoteFilter === f 
                          ? 'bg-emerald-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'ALL' ? 'Zote' : f === 'ONLINE_TODAY' ? 'Online Leo' : f === 'ACTIVE' ? 'Active' : f === 'EXPIRED' ? 'Expired' : 'Locked'}
                    </button>
                  ))}
                </div>
              </div>

              {/* REMOTE STORES LIST */}
              <div className="space-y-3">
                {filteredRemoteStores.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs space-y-2">
                    <Globe size={32} className="mx-auto text-slate-700 animate-bounce" />
                    <p>Hakuna duka lolote linalofanana na utafutaji wako kwa sasa.</p>
                    <p className="text-[11px] text-slate-600">Duka lolote likifunguliwa kwenye kifaa kingine kupitia link iliyochapishwa litaonekana hapa kiotomatiki!</p>
                  </div>
                ) : (
                  filteredRemoteStores.map((store) => {
                    const isOnlineRecently = store.lastActiveAt 
                      ? (Date.now() - new Date(store.lastActiveAt).getTime()) < 15 * 60 * 1000
                      : false;

                    const isOnlineToday = store.lastActiveAt 
                      ? (Date.now() - new Date(store.lastActiveAt).getTime()) < 24 * 60 * 60 * 1000
                      : false;

                    const isLocked = store.subscriptionStatus === 'LOCKED';
                    const isExpired = store.subscriptionStatus === 'EXPIRED' || (store.subscriptionExpiresAt && new Date(store.subscriptionExpiresAt).getTime() < Date.now());

                    return (
                      <div 
                        key={store.id} 
                        className={`bg-slate-950 p-4 rounded-2xl border transition hover:border-slate-700 space-y-3.5 ${
                          isLocked 
                            ? 'border-rose-900/60 bg-rose-950/10' 
                            : isExpired 
                              ? 'border-amber-900/60 bg-amber-950/10' 
                              : isOnlineRecently 
                                ? 'border-emerald-700/80 shadow-md shadow-emerald-950/20' 
                                : 'border-slate-800'
                        }`}
                      >
                        {/* TOP BAR: STORE HEADER */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border font-extrabold text-sm ${
                              isLocked 
                                ? 'bg-rose-950 text-rose-400 border-rose-800' 
                                : isExpired 
                                  ? 'bg-amber-950 text-amber-400 border-amber-800' 
                                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            }`}>
                              <Store size={20} />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-white text-sm">
                                  {store.storeName}
                                </h4>

                                {isOnlineRecently ? (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                                    Sasa Hivi (Live)
                                  </span>
                                ) : isOnlineToday ? (
                                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                                    Ipo Hewani Leo
                                  </span>
                                ) : (
                                  <span className="bg-slate-800 text-slate-400 text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                                    Nje ya Mtandao
                                  </span>
                                )}

                                {store.isPwaInstalled && (
                                  <span className="bg-indigo-950 text-indigo-300 border border-indigo-700 text-[9.5px] font-bold px-2 py-0.5 rounded-full">
                                    📱 PWA App
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Mmiliki: <strong className="text-slate-200">{store.ownerName}</strong></span>
                                <span>•</span>
                                <span>Anwani: <span className="text-slate-300">{store.address}</span></span>
                              </p>
                            </div>
                          </div>

                          {/* ACTION STATUS BADGE */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {isLocked ? (
                              <span className="bg-rose-950/80 text-rose-300 border border-rose-800 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Lock size={12} /> IMEFUNGWA
                              </span>
                            ) : isExpired ? (
                              <span className="bg-amber-950/80 text-amber-300 border border-amber-800 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <AlertTriangle size={12} /> IMEISHA
                              </span>
                            ) : (
                              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <ShieldCheck size={12} /> INAFANYA KAZI
                              </span>
                            )}
                          </div>
                        </div>

                        {/* MIDDLE METRICS & DEVICE DETAILS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-500 font-bold block text-[9.5px] uppercase">Kifaa & Browser</span>
                            <span className="font-extrabold text-slate-200 block truncate mt-0.5">
                              {store.deviceType || 'Simu / Laptop'}
                            </span>
                            <span className="text-[9.5px] text-slate-400 block truncate">{store.browser}</span>
                          </div>

                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-500 font-bold block text-[9.5px] uppercase">Mauzo na Stoo</span>
                            <span className="font-extrabold text-emerald-400 block mt-0.5">
                              {store.totalSalesCount || 0} Mauzo ({store.totalProductsCount || 0} Bidhaa)
                            </span>
                            <span className="text-[9.5px] text-indigo-300 font-mono block truncate">
                              TZS {(store.totalRevenue || 0).toLocaleString()}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-500 font-bold block text-[9.5px] uppercase">Namba ya Mawasiliano</span>
                            <span className="font-extrabold text-slate-200 block mt-0.5 truncate">
                              {store.phone}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {store.phone && store.phone !== 'Haina Namba' && (
                                <>
                                  <a
                                    href={`tel:${store.phone}`}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2 py-0.5 rounded font-bold transition flex items-center gap-1"
                                  >
                                    <Phone size={10} /> Piga
                                  </a>
                                  <a
                                    href={`https://wa.me/${store.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Habari ${store.ownerName}, nina msaada kutoka kwa Developer wa LedgerBox POS (${devNameInput}).`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded font-bold transition flex items-center gap-1"
                                  >
                                    <MessageSquare size={10} /> WhatsApp
                                  </a>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-slate-500 font-bold block text-[9.5px] uppercase">Muda wa Mwisho Kuitumia</span>
                            <span className="font-extrabold text-slate-200 block mt-0.5">
                              {store.lastActiveAt ? new Date(store.lastActiveAt).toLocaleDateString('sw-TZ', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Haikumbukwi'}
                            </span>
                            <span className="text-[9.5px] text-slate-400 block truncate">
                              Expiry: {store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt).toLocaleDateString('sw-TZ') : 'Bila kikomo'}
                            </span>
                          </div>
                        </div>

                        {/* BOTTOM ACTION BUTTONS */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 mr-1">Ongeza Leseni:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRemoteStoreSubscription(store, 30)}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <Calendar size={12} /> +30 Siku (+1 Mwezi)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateRemoteStoreSubscription(store, 365)}
                              className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles size={12} /> +365 Siku (+1 Mwaka)
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {onSwitchAccount && (
                              <button
                                type="button"
                                onClick={() => handleSwitchToRemoteStore(store)}
                                className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-700 font-bold rounded-lg text-[10.5px] transition cursor-pointer flex items-center gap-1"
                                title="Fungua na ingia kwenye duka hili moja kwa moja"
                              >
                                <ExternalLink size={12} className="text-sky-400" />
                                Fungua Duka Hili
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleImportRemoteStoreToAccount(store)}
                              className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 font-bold rounded-lg text-[10.5px] transition cursor-pointer flex items-center gap-1"
                              title="Ingiza duka hili kwenye orodha ya Akaunti Zilizopo"
                            >
                              <PlusCircle size={12} className="text-indigo-400" />
                              Weka Kwenye Akaunti
                            </button>

                            <button
                              type="button"
                              onClick={() => setRemoteStoreToDelete(store)}
                              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold rounded-lg text-[10.5px] transition cursor-pointer flex items-center gap-1"
                              title="Futa kumbukumbu ya duka hili kwenye wingu"
                            >
                              <Trash2 size={12} />
                              Futa Wingu
                            </button>

                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleToggleRemoteStoreLock(store, 'ACTIVE')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-[10.5px] transition cursor-pointer flex items-center gap-1"
                              >
                                <Unlock size={12} /> Fungulia Huduma
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleRemoteStoreLock(store, 'LOCKED')}
                                className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-rose-200 border border-rose-700 font-black rounded-lg text-[10.5px] transition cursor-pointer flex items-center gap-1"
                              >
                                <Lock size={12} /> Funga Duka
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 1: ALL USER ACCOUNTS CONTROL */}
          {activeTab === 'ACCOUNTS' && (
            <div className="space-y-4">
              
              {/* REFRESH & CREATE STORE BANNER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 p-4 rounded-2xl border border-indigo-900/50 shadow-inner">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Users size={16} className="text-indigo-400" />
                    {language === 'SW' ? 'Akaunti na Maduka Yote Yaliyopo' : 'All Existing Accounts & Stores'}
                    <span className="text-[10px] bg-indigo-900/80 text-indigo-200 border border-indigo-700/80 px-2 py-0.5 rounded-full font-mono font-bold">
                      {displayAccounts.length} Maduka
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'SW'
                      ? 'Dhibiti leseni, ongeza siku, fungua/funga maduka, hariri taarifa, au tengeneza keys za WhatsApp kwa kila duka.'
                      : 'Manage licenses, extend validity, lock/unlock stores, edit details, or generate activation keys.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateAccountModal(true)}
                    className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    <PlusCircle size={15} />
                    <span>{language === 'SW' ? '+ Sajili Duka Jipya' : '+ New Store'}</span>
                  </button>

                  <button
                    type="button"
                    id="dev-tab-refresh-accounts-btn"
                    onClick={handleRefreshAllAccounts}
                    disabled={isRefreshingAccounts}
                    className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={isRefreshingAccounts ? 'animate-spin' : ''} />
                    <span>
                      {isRefreshingAccounts 
                        ? (language === 'SW' ? 'Inasawazisha...' : 'Syncing...') 
                        : (language === 'SW' ? 'Refresh Akaunti' : 'Refresh Accounts')}
                    </span>
                  </button>
                </div>
              </div>

              {/* ACCOUNTS SUMMARY BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-black uppercase block">Jumla ya Maduka</span>
                  <span className="text-base font-black text-white mt-0.5 block">{displayAccounts.length} Maduka</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-900/40">
                  <span className="text-[10px] text-emerald-400/80 font-black uppercase block">Active (Zinazofanya Kazi)</span>
                  <span className="text-base font-black text-emerald-400 mt-0.5 block">
                    {displayAccounts.filter(a => {
                      const st = getLicenseStatus(getAccountSettings(a, activeAccount, settings));
                      return !st.isExpired && !st.isLocked;
                    }).length}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-amber-900/40">
                  <span className="text-[10px] text-amber-400/80 font-black uppercase block">Zinazokaribia Kuisha (≤ 7)</span>
                  <span className="text-base font-black text-amber-400 mt-0.5 block">
                    {displayAccounts.filter(a => {
                      const st = getLicenseStatus(getAccountSettings(a, activeAccount, settings));
                      return !st.isExpired && !st.isLocked && st.daysRemaining <= 7;
                    }).length}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-rose-900/40">
                  <span className="text-[10px] text-rose-400/80 font-black uppercase block">Zilizofungwa / Expired</span>
                  <span className="text-base font-black text-rose-400 mt-0.5 block">
                    {displayAccounts.filter(a => {
                      const st = getLicenseStatus(getAccountSettings(a, activeAccount, settings));
                      return st.isExpired || st.isLocked;
                    }).length}
                  </span>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchAccountTerm}
                    onChange={(e) => setSearchAccountTerm(e.target.value)}
                    placeholder="Tafuta kwa jina la duka, mmiliki, au barua pepe au namba..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 flex-wrap">
                  {(['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'LOCKED'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatusFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase transition cursor-pointer ${
                        statusFilter === f 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'ALL' ? 'Zote' : f === 'ACTIVE' ? 'Active' : f === 'EXPIRING_SOON' ? 'Inaisha Hivi Karibuni' : f === 'EXPIRED' ? 'Expired' : 'Locked'}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIST OF ALL STORE ACCOUNTS */}
              <div className="space-y-3">
                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                    <Users size={32} className="mx-auto mb-2 opacity-30 text-indigo-400" />
                    Hakuna akaunti yoyote iliyopatikana kulingana na utafutaji wako.
                  </div>
                ) : (
                  filteredAccounts.map((acc) => {
                    const accSettings = getAccountSettings(acc, activeAccount, settings);
                    const status = getLicenseStatus(accSettings);
                    const isCurrent = activeAccount?.id === acc.id;
                    const shops = getAccountShops(acc.id, acc.storeName);

                    return (
                      <div 
                        key={acc.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
                          isCurrent 
                            ? 'bg-slate-950 border-indigo-600/60 ring-1 ring-indigo-500/30 shadow-lg' 
                            : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                        }`}
                      >
                        {/* CARD TOP INFO */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 mt-0.5 shadow ${
                              status.isLocked 
                                ? 'bg-rose-900 border border-rose-700' 
                                : status.isExpired 
                                  ? 'bg-amber-900 border border-amber-700' 
                                  : 'bg-indigo-600 border border-indigo-500'
                            }`}>
                              <Store size={20} />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-sm text-white">{acc.storeName}</h4>
                                {isCurrent && (
                                  <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase">
                                    Duka la Sasa (Active)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                                <span className="flex items-center gap-1 font-semibold text-slate-300">
                                  <UserCheck size={12} className="text-indigo-400" />
                                  {acc.ownerName}
                                </span>
                                <span className="flex items-center gap-1 font-mono text-slate-400">
                                  <Mail size={12} className="text-slate-500" />
                                  {acc.email}
                                </span>
                                {acc.phone && (
                                  <span className="flex items-center gap-1 font-mono text-slate-400">
                                    <Phone size={12} className="text-slate-500" />
                                    {acc.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* SUBSCRIPTION STATUS BADGE & EDIT BUTTON */}
                          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAccount(acc)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Hariri taarifa za duka"
                            >
                              <Edit3 size={13} className="text-indigo-400" />
                              <span>Hariri Duka</span>
                            </button>

                            <div className="text-right">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase inline-block border ${
                                status.isLocked
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : status.isExpired
                                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                                    : status.plan === 'LIFETIME'
                                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              }`}>
                                {status.isLocked 
                                  ? 'Imefungwa (Locked)' 
                                  : status.isExpired 
                                    ? 'Imekwisha (Expired)' 
                                    : status.plan === 'LIFETIME'
                                      ? 'Maisha Yote (Lifetime)'
                                      : `Siku ${status.daysRemaining} Zimesalia`}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                Inaisha: {status.formattedExpiry}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* STORE BRANCHES ROW */}
                        {shops.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1">
                              <Store size={11} className="text-indigo-400" />
                              Matawi ({shops.length}):
                            </span>
                            {shops.map((s: any) => (
                              <span 
                                key={s.id} 
                                className="inline-flex items-center gap-1.5 bg-slate-950 text-slate-200 border border-slate-800 text-[10.5px] px-2 py-0.5 rounded-lg font-medium"
                              >
                                <span>{s.name}</span>
                                {shops.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShopToDelete({
                                        accountId: acc.id,
                                        accountName: acc.storeName,
                                        shopId: s.id,
                                        shopName: s.name
                                      });
                                    }}
                                    className="text-slate-500 hover:text-rose-400 ml-0.5 cursor-pointer"
                                    title={`Futa tawi la ${s.name}`}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* ACTIONS ROW FOR THIS ACCOUNT */}
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                              Dhibiti Leseni na Uongezaji wa Siku:
                            </span>

                            {/* CUSTOM DAYS INPUT FOR THIS ACCOUNT */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                placeholder="Siku (mf. 15)"
                                value={accountCustomDays[acc.id] || ''}
                                onChange={(e) => setAccountCustomDays(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = parseInt(accountCustomDays[acc.id] || '0', 10);
                                  if (val > 0) {
                                    handleExtendAccountSubscription(acc, val, val >= 365 ? 'ANNUAL' : 'MONTHLY');
                                    setAccountCustomDays(prev => ({ ...prev, [acc.id]: '' }));
                                  }
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                + Ongeza Siku
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExtendAccountSubscription(acc, 30, 'MONTHLY')}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-indigo-950 text-indigo-300 hover:text-white border border-slate-800 hover:border-indigo-600 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles size={12} className="text-amber-400" />
                              + Siku 30 (Mwezi 1)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtendAccountSubscription(acc, 90, 'MONTHLY')}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-indigo-950 text-indigo-300 hover:text-white border border-slate-800 hover:border-indigo-600 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              + Siku 90 (Miezi 3)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtendAccountSubscription(acc, 365, 'ANNUAL')}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-emerald-950 text-emerald-300 border border-slate-800 hover:border-emerald-600 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              + Mwaka 1 (Siku 365)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtendAccountSubscription(acc, 36500, 'LIFETIME')}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-purple-950 text-purple-300 border border-slate-800 hover:border-purple-600 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              Lifetime (Maisha)
                            </button>

                            {/* LOCK / UNLOCK TOGGLE */}
                            {status.isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleToggleAccountLock(acc, 'ACTIVE')}
                                className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <Unlock size={12} />
                                Fungua Duka
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAccountLock(acc, 'LOCKED')}
                                className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <Lock size={12} />
                                Funga Duka
                              </button>
                            )}

                            {/* GENERATE KEY FOR ACCOUNT */}
                            <button
                              type="button"
                              onClick={() => handleGenerateAccountKey(acc, '30_DAYS')}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <Key size={12} />
                              Key Siku 30
                            </button>

                            {/* SWITCH ACCOUNT BUTTON */}
                            {onSwitchAccount && !isCurrent && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSwitchAccount(acc.id);
                                  showNotification(`Umebadili na kuingia kwenye akaunti ya "${acc.storeName}"!`);
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                Ingia Akaunti Hii
                              </button>
                            )}

                            {/* DELETE STORE BUTTON */}
                            <button
                              type="button"
                              onClick={() => setAccountToDelete(acc)}
                              className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Futa duka hili kabisa kwenye mfumo"
                            >
                              <Trash2 size={12} />
                              <span>Futa Duka</span>
                            </button>
                          </div>

                          {/* GENERATED KEY DISPLAY & WHATSAPP COPY FOR THIS ACCOUNT */}
                          {accountGenKeys[acc.id] && (
                            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Key Mpya:</span>
                                <span className="font-mono font-black text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                  {accountGenKeys[acc.id]}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopyAccountWhatsApp(acc)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                              >
                                {copiedAccKeyId === acc.id ? (
                                  <><Check size={12} /> Umekopi Ujumbe wa WhatsApp!</>
                                ) : (
                                  <><Copy size={12} /> Kopi Ujumbe wa WhatsApp Kumpa Mteja</>
                                )}
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CURRENT STORE QUICK GRANT */}
          {activeTab === 'QUICK_GRANT' && (
            <div className="space-y-5">
              {/* CURRENT STATUS SUMMARY CARD */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">
                    Hali ya Sasa ya Duka hili ({settings.storeName || 'Duka'})
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                      licenseStatus.isExpired 
                        ? 'bg-rose-950 text-rose-300 border-rose-800' 
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {licenseStatus.isExpired ? 'Imekwisha / Locked' : 'Huduma Inafanya Kazi'}
                    </span>
                    <span className="text-xs font-mono text-slate-300 font-bold">
                      Siku {licenseStatus.daysRemaining} zimesalia (Tarehe: {licenseStatus.formattedExpiry})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {licenseStatus.isLocked ? (
                    <button
                      type="button"
                      onClick={() => handleToggleLockStatus('ACTIVE')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Unlock size={14} />
                      Fungua Huduma (Unlock)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleLockStatus('LOCKED')}
                      className="px-3 py-2 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-rose-700"
                    >
                      <Lock size={14} />
                      Funga Huduma (Lock Store)
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK EXTEND BUTTONS */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                  <Calendar size={15} />
                  Ongeza Mwezi / Rejesha Huduma Papo Hapo (Instant Grant):
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(30, 'MONTHLY')}
                    className="p-3.5 bg-slate-950 hover:bg-indigo-950/80 text-white border border-slate-800 hover:border-indigo-600/60 rounded-2xl transition cursor-pointer text-left space-y-1"
                  >
                    <span className="text-xs font-black block text-indigo-300">+ Siku 30</span>
                    <span className="text-[10px] text-slate-400 block">Ada ya Mwezi 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickExtend(90, 'MONTHLY')}
                    className="p-3.5 bg-slate-950 hover:bg-indigo-950/80 text-white border border-slate-800 hover:border-indigo-600/60 rounded-2xl transition cursor-pointer text-left space-y-1"
                  >
                    <span className="text-xs font-black block text-indigo-300">+ Siku 90</span>
                    <span className="text-[10px] text-slate-400 block">Ada ya Miezi 3</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickExtend(365, 'ANNUAL')}
                    className="p-3.5 bg-slate-950 hover:bg-indigo-950/80 text-white border border-slate-800 hover:border-indigo-600/60 rounded-2xl transition cursor-pointer text-left space-y-1"
                  >
                    <span className="text-xs font-black block text-emerald-400">+ Mwaka 1</span>
                    <span className="text-[10px] text-slate-400 block">Siku 365 (Mwaka)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickExtend(36500, 'LIFETIME')}
                    className="p-3.5 bg-slate-950 hover:bg-purple-950/80 text-white border border-slate-800 hover:border-purple-600/60 rounded-2xl transition cursor-pointer text-left space-y-1"
                  >
                    <span className="text-xs font-black block text-purple-300">Lifetime</span>
                    <span className="text-[10px] text-slate-400 block">Maisha Yote (Bila Kikomo)</span>
                  </button>
                </div>

                <form onSubmit={handleCustomExtend} className="flex gap-2 pt-2">
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="Ingiza idadi ya siku (mfano: 15, 60)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Ongeza Siku Custom
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: KEY GENERATOR */}
          {activeTab === 'KEY_GEN' && (
            <div className="space-y-4 bg-slate-950/60 p-5 border border-slate-800/80 rounded-2xl">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Key size={15} />
                Tengeneza Key ya Leseni Kumpa Mteja (Activation Key Generator):
              </h3>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateKey('30_DAYS')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Key ya Siku 30
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateKey('90_DAYS')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Key ya Siku 90
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateKey('365_DAYS')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Key ya Mwaka 1
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateKey('LIFETIME')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-purple-300 border border-purple-800 rounded-xl transition cursor-pointer"
                >
                  Key ya Lifetime
                </button>
              </div>

              {generatedKey && (
                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-black uppercase">Generated Activation Code</span>
                    <span className="text-xs font-mono font-black text-amber-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 tracking-wider">
                      {generatedKey}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedKeyMsg ? <><Check size={14} /> Ujumbe wa WhatsApp Umekopiwa!</> : <><Copy size={14} /> Kopi Ujumbe wa WhatsApp Kumpa Mteja</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEVELOPER SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <form onSubmit={handleSaveDevConfig} className="space-y-4 bg-slate-950/40 p-5 border border-slate-800/60 rounded-2xl">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <UserCheck size={15} className="text-indigo-400" />
                Mipangilio ya Developer na Ada ya Mwezi:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Jina la Developer</label>
                  <input
                    type="text"
                    value={devNameInput}
                    onChange={(e) => setDevNameInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Namba za Simu za Malipo (Lipa Namba)</label>
                  <input
                    type="text"
                    value={devPhoneInput}
                    onChange={(e) => setDevPhoneInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Ada ya Mwezi (TSh)</label>
                  <input
                    type="number"
                    value={devFeeInput}
                    onChange={(e) => setDevFeeInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Developer Master PIN</label>
                  <input
                    type="password"
                    value={devPinInput}
                    onChange={(e) => setDevPinInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveDevSettingsSuccess ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <Check size={14} /> Mipangilio ya Developer Imewasilishwa!
                  </span>
                ) : (
                  <span></span>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hifadhi Mipangilio
                </button>
              </div>
            </form>
          )}

        </div>

        {/* MODAL: EDIT ACCOUNT DETAILS */}
        {editingAccount && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-indigo-700/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl shadow-indigo-950">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-indigo-400" />
                  <h3 className="font-black text-sm text-white">Hariri Taarifa za Duka</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditedAccount} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Jina la Duka (Store Name)</label>
                  <input
                    type="text"
                    required
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Jina la Mmiliki (Owner Name)</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Namba ya Simu</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Barua Pepe (Email)</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Mahali lilipo (Anwani / Location)</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="mf. Kariakoo, Dar es Salaam"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-3 py-2 text-slate-400 hover:text-white rounded-xl font-bold"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    Hifadhi Mabadiliko
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CREATE NEW ACCOUNT */}
        {showCreateAccountModal && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-700/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl shadow-emerald-950">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle size={18} className="text-emerald-400" />
                  <h3 className="font-black text-sm text-white">Sajili Akaunti Mpya ya Duka</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateNewAccount} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Jina la Duka (Store Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="mf. Samaki Fresh Store"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Jina la Mmiliki (Owner Name)</label>
                  <input
                    type="text"
                    placeholder="mf. Baraka Juma"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Namba ya Simu</label>
                    <input
                      type="text"
                      placeholder="07xxxxxxxx"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Barua Pepe *</label>
                    <input
                      type="email"
                      required
                      placeholder="duka@pos.tz"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">PIN / Password ya Kuingilia</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Siku za Leseni ya Kuanzia</label>
                    <input
                      type="number"
                      min="1"
                      value={newInitialDays}
                      onChange={(e) => setNewInitialDays(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono text-center font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateAccountModal(false)}
                    className="px-3 py-2 text-slate-400 hover:text-white rounded-xl font-bold"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    Kamilisha Usajili
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM DELETE ACCOUNT */}
        {accountToDelete && (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-700/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl shadow-rose-950/50">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Thibitisha Kufuta Duka</h3>
                    <p className="text-[11px] text-rose-400/80 font-medium">Ondoa kabisa kwenye mfumo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-3.5 text-xs text-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Store size={16} className="text-rose-400" />
                  <span>{accountToDelete.storeName}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Mmiliki: <strong className="text-white">{accountToDelete.ownerName}</strong> • Email: <span className="font-mono text-slate-300">{accountToDelete.email}</span>
                </p>
                <div className="p-2.5 bg-rose-950/40 rounded-xl border border-rose-800/40 text-[11px] text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1 text-rose-200">
                    <AlertTriangle size={13} />
                    Onyo la Ufutaji:
                  </p>
                  <p>
                    Kufuta duka hili kutaondoa akaunti, data zake zote za stoo, mauzo, matawi, na mipangilio yake kwenye mfumo na kwenye wingu.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  className="px-3.5 py-2 text-slate-400 hover:text-white rounded-xl font-bold text-xs"
                >
                  Ghairi (Hapana)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950"
                >
                  <Trash2 size={14} />
                  Ndio, Futa Duka Kabisa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM DELETE BRANCH SHOP */}
        {shopToDelete && (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-700/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl shadow-amber-950/50">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Thibitisha Kufuta Tawi</h3>
                    <p className="text-[11px] text-amber-400/80 font-medium">Ondoa tawi hili la duka</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShopToDelete(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-3.5 text-xs text-amber-200 space-y-2">
                <p>
                  Je, una uhakika unataka kufuta tawi la <strong className="text-white">"{shopToDelete.shopName}"</strong> kutoka duka la <strong className="text-white">"{shopToDelete.accountName}"</strong>?
                </p>
                <p className="text-[11px] text-slate-400">
                  Data za mauzo na stoo za tawi hili pekee zitaondolewa. Matawi mengine yataendelea kubaki.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShopToDelete(null)}
                  className="px-3.5 py-2 text-slate-400 hover:text-white rounded-xl font-bold text-xs"
                >
                  Ghairi
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteShop}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Futa Tawi Hili
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM DELETE REMOTE CLOUD STORE */}
        {remoteStoreToDelete && (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-700/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl shadow-rose-950/50">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Futa Duka Kwenye Wingu (Cloud)</h3>
                    <p className="text-[11px] text-rose-400/80 font-medium">Ondoa kwenye dashibodi ya Developer</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoteStoreToDelete(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-3.5 text-xs text-rose-200 space-y-2">
                <p>
                  Je, una uhakika unataka kufuta rekodi ya wingu ya duka la <strong className="text-white">"{remoteStoreToDelete.storeName}"</strong> (Mmiliki: {remoteStoreToDelete.ownerName})?
                </p>
                <p className="text-[11px] text-slate-400">
                  Kumbukumbu yake ya mtandaoni itaondolewa mara moja kwenye dashibodi yako.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRemoteStoreToDelete(null)}
                  className="px-3.5 py-2 text-slate-400 hover:text-white rounded-xl font-bold text-xs"
                >
                  Ghairi
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRemoteStore}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950"
                >
                  <Trash2 size={14} />
                  Futa Kwenye Wingu
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

