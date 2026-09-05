import { useState, useEffect } from 'react';
import { DbState, Product, Category, Customer, Supplier, Transaction, StoreSettings, DebtLog, StockLog, CartItem, PaymentMethod, StaffUser, Shop, BusinessAccount, Expense } from '../types';
import { getInitialDbState, getEmptyDbState } from './initialData';
import { pingStoreToCloudRegistry } from '../lib/remoteStoreTracker';

const LOCAL_STORAGE_KEY = 'pm_supermarket_offline_db';
const ACCOUNTS_KEY = 'pm_registered_accounts';
const ACTIVE_ACCOUNT_KEY = 'pm_active_account_id';

export function useStore() {
  const [state, setState] = useState<DbState | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string>('default');

  // Multi-Tenant Accounts State
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<BusinessAccount | null>(null);

  // Network & Auto-Sync Offline States
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('pm_last_cloud_sync_time') || null;
  });

  // Storage Key Helpers
  const getShopsKey = (acc: BusinessAccount | null) => 
    acc ? `pm_shops_${acc.id}` : 'pm_supermarket_shops';

  const getDbKey = (acc: BusinessAccount | null, shopId: string) => 
    acc ? `pm_db_${acc.id}_${shopId}` : (shopId === 'default' ? LOCAL_STORAGE_KEY : `${LOCAL_STORAGE_KEY}_${shopId}`);

  // Sync to Cloud function helper
  const syncToCloudIfNeeded = async (shopId: string, dbState: DbState) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setPendingSyncCount(prev => prev + 1);
      return false;
    }
    setIsSyncingCloud(true);
    try {
      const { auth, db } = await import('../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      const accountId = activeAccount?.id || user?.uid;
      if (user && accountId) {
        const docRef = doc(db, 'users', accountId, 'shops', shopId, 'state', 'current');
        const stateToSave = {
          ...dbState,
          currentUser: null // avoid locking cloud state to a specific cashier
        };
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud sync timeout')), 4000)
        );
        await Promise.race([
          setDoc(docRef, {
            state: stateToSave,
            updatedAt: new Date().toISOString(),
            backupBy: user.displayName || user.email || activeAccount?.ownerName
          }),
          timeoutPromise
        ]);
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastCloudSyncTime(timeNow);
        localStorage.setItem('pm_last_cloud_sync_time', timeNow);
        setPendingSyncCount(0);
        console.log(`Auto-synced shop ${shopId} for account ${accountId} to Cloud (Firestore)`);
        return true;
      }
    } catch {
      // Non-blocking background sync
      setPendingSyncCount(prev => prev + 1);
      return false;
    } finally {
      setIsSyncingCloud(false);
    }
    return false;
  };

  const forceCloudSync = async () => {
    if (!state || !currentShopId) return;
    setIsSyncingCloud(true);
    try {
      await syncToCloudIfNeeded(currentShopId, state);

      // Auto-sync to Google Sheets if configured
      const sheetsKey = activeAccount ? `pm_google_sheets_config_${activeAccount.id}` : 'pm_google_sheets_config';
      const savedSheetsConfig = localStorage.getItem(sheetsKey);
      if (savedSheetsConfig) {
        try {
          const config = JSON.parse(savedSheetsConfig);
          if (config.spreadsheetId && config.autoSync) {
            const { getAccessToken } = await import('../lib/firebase');
            const token = await getAccessToken();
            if (token && state.transactions.length > 0) {
              const { appendTransactionsToSheet } = await import('../lib/sheets');
              await appendTransactionsToSheet(token, config.spreadsheetId, state.transactions, state.settings);
              console.log('Auto-synced transactions to Google Sheets upon reconnection.');
            }
          }
        } catch (sheetsErr) {
          console.warn('Sheets sync skipped during auto-sync:', sheetsErr);
        }
      }
    } catch (err) {
      console.error('Error during forceCloudSync:', err);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const syncShopsListToCloud = async (shopsList: Shop[]) => {
    try {
      const { auth, db } = await import('../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      const accountId = activeAccount?.id || user?.uid;
      if (user && accountId) {
        const docRef = doc(db, 'users', accountId, 'shops', 'list');
        await setDoc(docRef, {
          shops: shopsList,
          updatedAt: new Date().toISOString()
        });
        console.log(`Synced shops list for account ${accountId} to Cloud (Firestore)`);
      }
    } catch (e) {
      console.warn('Shops list cloud sync skipped:', e);
    }
  };

  const saveShopsList = (newShops: Shop[]) => {
    setShops(newShops);
    const key = getShopsKey(activeAccount);
    localStorage.setItem(key, JSON.stringify(newShops));
    syncShopsListToCloud(newShops);
  };

  const reloadAccounts = () => {
    let storedAccounts: BusinessAccount[] = [];
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    if (saved) {
      try {
        storedAccounts = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse accounts', e);
      }
    }
    setAccounts(storedAccounts);
    return storedAccounts;
  };

  // 1. Initialize Accounts
  useEffect(() => {
    let storedAccounts: BusinessAccount[] = [];
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    if (saved) {
      try {
        storedAccounts = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse accounts', e);
      }
    }

    setAccounts(storedAccounts);

    const activeAccId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    let currentAcc = storedAccounts.find(a => a.id === activeAccId) || null;
    setActiveAccount(currentAcc);

    if (!currentAcc) {
      setState(getEmptyDbState());
    }
  }, []);

  // 2. Load shops when activeAccount changes
  useEffect(() => {
    if (!activeAccount) {
      setShops([]);
      setState(getEmptyDbState());
      return;
    }

    const shopsKey = getShopsKey(activeAccount);
    let accountShops: Shop[] = [];
    const storedShops = localStorage.getItem(shopsKey);
    
    if (storedShops) {
      try {
        accountShops = JSON.parse(storedShops);
      } catch (e) {
        console.error('Failed to parse shops for account', e);
      }
    }

    if (accountShops.length === 0) {
      // Migrate legacy default shop or create main shop for this account
      const existingDb = localStorage.getItem(LOCAL_STORAGE_KEY);
      let storeName = activeAccount.storeName || 'Duka Kuu';
      if (existingDb && activeAccount.id === 'acc_default_main') {
        try {
          const parsed = JSON.parse(existingDb);
          if (parsed?.settings?.storeName) {
            storeName = parsed.settings.storeName;
          }
        } catch (e) {}
      }

      accountShops = [{
        id: 'default',
        name: storeName,
        createdAt: new Date().toISOString()
      }];
      localStorage.setItem(shopsKey, JSON.stringify(accountShops));
    }

    setShops(accountShops);

    const activeShopKey = `pm_active_shop_${activeAccount.id}`;
    const activeShopId = localStorage.getItem(activeShopKey) || accountShops[0]?.id || 'default';
    setCurrentShopId(activeShopId);
  }, [activeAccount]);

  // 3. Reload database state when currentShopId or activeAccount changes
  useEffect(() => {
    if (!activeAccount || !currentShopId) return;

    const storageKey = getDbKey(activeAccount, currentShopId);

    const fetchCloudOrInit = async () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as DbState;
          if (parsed.products && parsed.categories && parsed.transactions && parsed.customers) {
            if (!parsed.expenses) {
              parsed.expenses = [];
            }
            if (!parsed.users || parsed.users.length === 0) {
              const freshDefault = getInitialDbState();
              parsed.users = freshDefault.users;
              parsed.currentUser = freshDefault.currentUser;
              if (parsed.expenses.length === 0 && freshDefault.expenses) {
                parsed.expenses = freshDefault.expenses;
              }
            }
            setState(parsed);
            return;
          }
        }
      } catch (e) {
        console.error(`Error loading database for account ${activeAccount.id} shop ${currentShopId}`, e);
      }

      // Try fetching from Firebase Cloud first if signed in and online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const { auth, db } = await import('../lib/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          const user = auth.currentUser;
          if (user) {
            const docRef = doc(db, 'users', activeAccount.id, 'shops', currentShopId, 'state', 'current');
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cloud load timeout')), 3500)
            );
            const docSnap: any = await Promise.race([
              getDoc(docRef),
              timeoutPromise
            ]);
            if (docSnap && docSnap.exists && docSnap.exists() && docSnap.data().state) {
              const cloudState = docSnap.data().state as DbState;
              if (!cloudState.expenses) {
                cloudState.expenses = [];
              }
              localStorage.setItem(storageKey, JSON.stringify(cloudState));
              setState(cloudState);
              console.log(`Loaded shop ${currentShopId} from Cloud state for account ${activeAccount.id}`);
              return;
            }
          }
        } catch {
          // Fallback to local storage or empty store
        }
      }

      // Fallback/First boot for this specific account shop (always empty store)
      const devDb = getEmptyDbState();
      const currentShop = shops.find(s => s.id === currentShopId);
      if (currentShop) {
        devDb.settings.storeName = currentShop.name;
      } else if (activeAccount.storeName) {
        devDb.settings.storeName = activeAccount.storeName;
      }
      devDb.users = [
        {
          id: `usr-admin-${Date.now()}`,
          name: activeAccount.ownerName || 'Mwenye Duka',
          role: 'ADMIN',
          pin: '1234',
          createdAt: new Date().toISOString(),
          permissions: {
            canSell: true,
            canViewCostPrice: true,
            canViewReports: true,
            canManageInventory: true,
            canManageCustomers: true,
            canManageSettings: true
          }
        },
        {
          id: `usr-cashier-${Date.now()}`,
          name: 'Mhudumu 1',
          role: 'CASHIER',
          pin: '0000',
          createdAt: new Date().toISOString(),
          permissions: {
            canSell: true,
            canViewCostPrice: false,
            canViewReports: false,
            canManageInventory: false,
            canManageCustomers: true,
            canManageSettings: false
          }
        }
      ];
      devDb.currentUser = null;

      localStorage.setItem(storageKey, JSON.stringify(devDb));
      setState(devDb);
    };

    fetchCloudOrInit();
  }, [currentShopId, activeAccount, shops]);

  // Online / Offline Automatic Reconnection Listener
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('Network connection restored. Automatically syncing offline data to cloud...');
      if (state && currentShopId) {
        await forceCloudSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Network connection lost. Switched to 100% Offline Mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state, currentShopId, activeAccount]);

  // Automatic ping to Developer Cloud Registry when store state is loaded or updated
  useEffect(() => {
    if (state && state.settings && state.settings.storeName) {
      pingStoreToCloudRegistry(currentShopId, state.settings, activeAccount, state);
    }
  }, [state?.settings?.storeName, currentShopId, activeAccount?.id, state?.transactions?.length]);

  // Save changes helper
  const saveState = (newState: DbState) => {
    setState(newState);
    const storageKey = getDbKey(activeAccount, currentShopId);
    localStorage.setItem(storageKey, JSON.stringify(newState));
    syncToCloudIfNeeded(currentShopId, newState);
    pingStoreToCloudRegistry(currentShopId, newState.settings, activeAccount, newState);
  };

  // Account Management Functions
  const registerAccount = (
    email: string, 
    ownerName: string, 
    storeName: string, 
    password?: string, 
    phone?: string
  ): BusinessAccount => {
    const newAcc: BusinessAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      email,
      ownerName,
      storeName,
      phone,
      passwordHash: password || '123456',
      createdAt: new Date().toISOString()
    };

    const updatedAccounts = [...accounts, newAcc];
    setAccounts(updatedAccounts);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

    // Create initial shop for new account
    const initialShop: Shop = {
      id: 'shop-default',
      name: storeName,
      createdAt: new Date().toISOString()
    };
    const shopsKey = `pm_shops_${newAcc.id}`;
    localStorage.setItem(shopsKey, JSON.stringify([initialShop]));

    // Create fresh initial DB state for new account (EMPTY inventory & zero transactions)
    const freshDb = getEmptyDbState();
    freshDb.settings.storeName = storeName;
    freshDb.users = [
      {
        id: `usr-admin-${Date.now()}`,
        name: ownerName,
        role: 'ADMIN',
        pin: '1234',
        createdAt: new Date().toISOString(),
        permissions: {
          canSell: true,
          canViewCostPrice: true,
          canViewReports: true,
          canManageInventory: true,
          canManageCustomers: true,
          canManageSettings: true
        }
      },
      {
        id: `usr-cashier-${Date.now()}`,
        name: 'Mhudumu Mauzo',
        role: 'CASHIER',
        pin: '0000',
        createdAt: new Date().toISOString(),
        permissions: {
          canSell: true,
          canViewCostPrice: false,
          canViewReports: false,
          canManageInventory: false,
          canManageCustomers: true,
          canManageSettings: false
        }
      }
    ];
    freshDb.currentUser = null;

    const dbKey = `pm_db_${newAcc.id}_shop-default`;
    localStorage.setItem(dbKey, JSON.stringify(freshDb));

    // Switch to active account
    setActiveAccount(newAcc);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, newAcc.id);
    setShops([initialShop]);
    setCurrentShopId('shop-default');
    setState(freshDb);

    syncToCloudIfNeeded('shop-default', freshDb);
    syncShopsListToCloud([initialShop]);

    return newAcc;
  };

  const loginAccount = (emailOrPhoneOrName: string, password?: string): boolean => {
    const term = emailOrPhoneOrName.trim().toLowerCase();
    const found = accounts.find(a => 
      a.email.toLowerCase() === term || 
      a.phone === term || 
      a.ownerName.toLowerCase() === term ||
      a.storeName.toLowerCase() === term
    );

    if (found) {
      if (password && found.passwordHash && found.passwordHash !== password) {
        return false;
      }
      setActiveAccount(found);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, found.id);
      return true;
    }
    return false;
  };

  const logoutAccount = () => {
    setActiveAccount(null);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    setState(null);
  };

  const switchAccount = (accountId: string) => {
    const found = accounts.find(a => a.id === accountId);
    if (found) {
      setActiveAccount(found);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, found.id);
    }
  };

  const deleteAccount = (accountId: string) => {
    const updated = accounts.filter(a => a.id !== accountId);

    // Thorough cleanup of all local storage keys related to this account
    try {
      localStorage.removeItem(`pm_shops_${accountId}`);
      localStorage.removeItem(`pm_settings_${accountId}`);
      localStorage.removeItem(`pm_active_shop_${accountId}`);
      localStorage.removeItem(`pm_db_${accountId}_default`);
      localStorage.removeItem(`pm_db_${accountId}_shop-default`);
      
      // Clean up any other specific keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`pm_db_${accountId}_`) || key.includes(accountId))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error cleaning up account storage:', e);
    }

    if (updated.length === 0) {
      // If all accounts were deleted, create a fresh default account
      const defAcc: BusinessAccount = {
        id: 'acc_default_main',
        email: 'admin@pos.tz',
        ownerName: 'Mwenye Duka',
        storeName: 'Duka Kuu',
        phone: '0700000000',
        createdAt: new Date().toISOString()
      };
      setAccounts([defAcc]);
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([defAcc]));
      setActiveAccount(defAcc);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, defAcc.id);
      return;
    }

    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));

    if (activeAccount?.id === accountId) {
      const nextAcc = updated[0];
      setActiveAccount(nextAcc);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextAcc.id);
    }
  };

  // Products
  const addProduct = (p: Omit<Product, 'id' | 'createdAt'>) => {
    if (!state) return;
    const newProduct: Product = {
      ...p,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    
    // Log stock change if stock > 0
    const newStockLogs: StockLog[] = [...state.stockLogs];
    if (newProduct.stock > 0) {
      newStockLogs.push({
        id: `stock-log-${Date.now()}`,
        productId: newProduct.id,
        type: 'IN',
        quantity: newProduct.stock,
        note: 'Stoo ya kwanza kabisa (First insertion)',
        timestamp: new Date().toISOString()
      });
    }

    saveState({
      ...state,
      products: [newProduct, ...state.products],
      stockLogs: newStockLogs
    });
  };

  const updateProduct = (p: Product, customNote?: string) => {
    if (!state) return;
    const oldProduct = state.products.find(item => item.id === p.id);
    const newStockLogs = [...state.stockLogs];

    if (oldProduct && oldProduct.stock !== p.stock) {
      const diff = p.stock - oldProduct.stock;
      newStockLogs.push({
        id: `stock-log-${Date.now()}`,
        productId: p.id,
        type: diff > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(diff),
        note: customNote || `Marekebisho ya stoo (Manual adjustment)`,
        timestamp: new Date().toISOString()
      });
    }

    saveState({
      ...state,
      products: state.products.map(item => item.id === p.id ? p : item),
      stockLogs: newStockLogs
    });
  };

  const deleteProduct = (id: string) => {
    if (!state) return;
    saveState({
      ...state,
      products: state.products.filter(item => item.id !== id),
      stockLogs: state.stockLogs.filter(log => log.productId !== id)
    });
  };

  // Categories
  const addCategory = (name: string, color: string) => {
    if (!state) return;
    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      color
    };
    saveState({
      ...state,
      categories: [...state.categories, newCategory]
    });
  };

  const updateCategory = (cat: Category) => {
    if (!state) return;
    saveState({
      ...state,
      categories: state.categories.map(c => c.id === cat.id ? cat : c)
    });
  };

  const deleteCategory = (id: string) => {
    if (!state) return;
    saveState({
      ...state,
      categories: state.categories.filter(c => c.id !== id),
      // Reset items in deleted category to unassigned/others
      products: state.products.map(prod => prod.category === id ? { ...prod, category: 'cat-5' } : prod)
    });
  };

  // Customers
  const addCustomer = (
    c: Omit<Customer, 'id' | 'createdAt' | 'debt'>,
    initialDebt?: number,
    initialDebtNote?: string,
    initialDueDate?: string
  ): Customer | undefined => {
    if (!state) return undefined;
    const custId = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const debtVal = (initialDebt && initialDebt > 0) ? initialDebt : 0;

    const newCustomer: Customer = {
      ...c,
      id: custId,
      debt: debtVal,
      dueDate: initialDueDate || c.dueDate || undefined,
      createdAt: new Date().toISOString()
    };

    let updatedDebtLogs = state.debtLogs;
    if (debtVal > 0) {
      const initialLog: DebtLog = {
        id: `debt-log-${Date.now()}-init`,
        customerId: custId,
        type: 'BORROW',
        amount: debtVal,
        note: initialDebtNote || 'Deni la mwanzo wakati wa kusajili (Initial balance)',
        timestamp: new Date().toISOString(),
        dueDate: initialDueDate
      };
      updatedDebtLogs = [initialLog, ...state.debtLogs];
    }

    saveState({
      ...state,
      customers: [newCustomer, ...state.customers],
      debtLogs: updatedDebtLogs
    });

    return newCustomer;
  };

  const updateCustomer = (c: Customer) => {
    if (!state) return;
    saveState({
      ...state,
      customers: state.customers.map(item => item.id === c.id ? c : item)
    });
  };

  const deleteCustomer = (id: string) => {
    if (!state) return;
    saveState({
      ...state,
      customers: state.customers.filter(item => item.id !== id),
      debtLogs: state.debtLogs.filter(log => log.customerId !== id)
    });
  };

  // Suppliers Management
  const addSupplier = (s: Omit<import('../types').Supplier, 'id' | 'createdAt'>) => {
    if (!state) return;
    const newSupplier: import('../types').Supplier = {
      ...s,
      id: `supp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    saveState({
      ...state,
      suppliers: [newSupplier, ...(state.suppliers || [])]
    });
  };

  const updateSupplier = (s: import('../types').Supplier) => {
    if (!state) return;
    saveState({
      ...state,
      suppliers: (state.suppliers || []).map(item => item.id === s.id ? s : item)
    });
  };

  const deleteSupplier = (id: string) => {
    if (!state) return;
    saveState({
      ...state,
      suppliers: (state.suppliers || []).filter(item => item.id !== id)
    });
  };

  const clearAllSuppliers = () => {
    if (!state) return;
    saveState({
      ...state,
      suppliers: []
    });
  };

  // Manual Debt Adjustment & Payment Recording
  const recordDebtLog = (
    customerId: string, 
    type: 'BORROW' | 'PAYMENT', 
    amount: number, 
    note: string, 
    receiptId?: string,
    newDueDate?: string,
    customTimestamp?: string,
    paymentMethod?: PaymentMethod,
    recordedBy?: string
  ) => {
    if (!state) return;
    
    // Resolve timestamp
    let logTimestamp = new Date().toISOString();
    if (customTimestamp) {
      const parsed = new Date(customTimestamp);
      if (!isNaN(parsed.getTime())) {
        logTimestamp = parsed.toISOString();
      }
    }

    // Log
    const newLog: DebtLog = {
      id: `debt-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerId,
      type,
      amount,
      note,
      timestamp: logTimestamp,
      receiptId,
      dueDate: newDueDate,
      paymentMethod: paymentMethod || (type === 'PAYMENT' ? 'CASH' : 'CREDIT'),
      recordedBy: recordedBy || state.currentUser?.name || 'Cashier'
    };

    // Update customer debt value recursively
    const change = type === 'BORROW' ? amount : -amount;
    const updatedCustomers = state.customers.map(cust => {
      if (cust.id === customerId) {
        const newDebt = Math.max(0, cust.debt + change);
        // If due date provided, update customer's due date
        // If debt is paid off (0), option to keep or clear due date
        return {
          ...cust,
          debt: newDebt,
          dueDate: newDueDate !== undefined ? newDueDate : (newDebt === 0 ? undefined : cust.dueDate)
        };
      }
      return cust;
    });

    saveState({
      ...state,
      customers: updatedCustomers,
      debtLogs: [newLog, ...state.debtLogs]
    });
  };

  // Expenses Management
  const addExpense = (
    exp: Omit<Expense, 'id' | 'createdAt'>
  ): Expense | undefined => {
    if (!state) return undefined;
    const newExpense: Expense = {
      ...exp,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    const updatedExpenses = [newExpense, ...(state.expenses || [])];
    saveState({
      ...state,
      expenses: updatedExpenses
    });
    return newExpense;
  };

  const updateExpense = (exp: Expense) => {
    if (!state) return;
    const updatedExpenses = (state.expenses || []).map(e => e.id === exp.id ? exp : e);
    saveState({
      ...state,
      expenses: updatedExpenses
    });
  };

  const deleteExpense = (id: string) => {
    if (!state) return;
    const updatedExpenses = (state.expenses || []).filter(e => e.id !== id);
    saveState({
      ...state,
      expenses: updatedExpenses
    });
  };

  // Checkouts & Transactions
  const createTransaction = (
    items: CartItem[], 
    discount: number, 
    paymentMethod: PaymentMethod, 
    customerId: string | undefined, 
    receivedAmount: number,
    cashierName: string,
    customTimestamp?: string,
    saleNote?: string
  ): Transaction | null => {
    if (!state) return null;

    const subtotal = items.reduce((sum, item) => sum + ((item.customPrice ?? item.product.sellingPrice) * item.quantity), 0);
    const total = Math.max(subtotal - discount, 0);
    const changeAmount = paymentMethod === 'CASH' ? Math.max(0, receivedAmount - total) : 0;
    const receiptId = `tr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const receiptNumber = `PM-${Math.floor(100000 + Math.random() * 900000)}`;

    // Resolve transaction date/time
    let txTimestamp = new Date().toISOString();
    let isBackdated = false;

    if (customTimestamp) {
      const parsedDate = new Date(customTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        txTimestamp = parsedDate.toISOString();
        const now = new Date();
        if (parsedDate.toDateString() !== now.toDateString() || parsedDate.getTime() < now.getTime() - 60000) {
          isBackdated = true;
        }
      }
    }

    const newTransaction: Transaction = {
      id: receiptId,
      items,
      subtotal,
      discount,
      total,
      paymentMethod,
      customerId,
      receivedAmount,
      changeAmount,
      timestamp: txTimestamp,
      cashierName,
      receiptNumber,
      note: saleNote || undefined,
      isBackdated
    };

    // 1. Deduct Product Stock & register stock logs
    const updatedProducts = [...state.products];
    const newStockLogs = [...state.stockLogs];

    items.forEach(cartItem => {
      const idx = updatedProducts.findIndex(p => p.id === cartItem.product.id);
      if (idx !== -1) {
        const prod = updatedProducts[idx];
        const newStock = Math.max(0, prod.stock - cartItem.quantity);
        updatedProducts[idx] = {
          ...prod,
          stock: newStock
        };

        newStockLogs.push({
          id: `stock-log-${Date.now()}-${cartItem.product.id}`,
          productId: cartItem.product.id,
          type: 'SALE',
          quantity: cartItem.quantity,
          note: `Uuzaji - Risiti Na: ${receiptNumber}${isBackdated ? ' (Mauzo ya Nyuma)' : ''}`,
          timestamp: txTimestamp
        });
      }
    });

    // 2. If PaymentMethod is CREDIT, add to customer debt
    let updatedCustomers = [...state.customers];
    const newDebtLogs = [...state.debtLogs];

    if (paymentMethod === 'CREDIT' && customerId) {
      updatedCustomers = updatedCustomers.map(cust => {
        if (cust.id === customerId) {
          return {
            ...cust,
            debt: cust.debt + total
          };
        }
        return cust;
      });

      newDebtLogs.push({
        id: `debt-log-${Date.now()}-credit`,
        customerId,
        type: 'BORROW',
        amount: total,
        note: `Mauzo ya mkopo - Risiti Na: ${receiptNumber}${isBackdated ? ' (Mauzo ya Nyuma)' : ''}`,
        timestamp: txTimestamp,
        receiptId
      });
    }

    // Sort transactions chronologically descending (newest timestamp first)
    const allTransactions = [newTransaction, ...state.transactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const nextState: DbState = {
      ...state,
      products: updatedProducts,
      transactions: allTransactions,
      customers: updatedCustomers,
      stockLogs: newStockLogs,
      debtLogs: newDebtLogs
    };

    saveState(nextState);
    return newTransaction;
  };

  // Refund or Cancel order
  const cancelTransaction = (id: string, reason: string) => {
    if (!state) return;
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    // Refund stock
    const updatedProducts = [...state.products];
    const newStockLogs = [...state.stockLogs];

    tx.items.forEach(cartItem => {
      const idx = updatedProducts.findIndex(p => p.id === cartItem.product.id);
      if (idx !== -1) {
        const prod = updatedProducts[idx];
        updatedProducts[idx] = {
          ...prod,
          stock: prod.stock + cartItem.quantity
        };

        newStockLogs.push({
          id: `stock-log-${Date.now()}-refund-${cartItem.product.id}`,
          productId: cartItem.product.id,
          type: 'IN',
          quantity: cartItem.quantity,
          note: `Marejesho (Refund) ya Risiti Na: ${tx.receiptNumber} - Sababu: ${reason}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Refund debt if it was credit
    let updatedCustomers = [...state.customers];
    const newDebtLogs = [...state.debtLogs];

    if (tx.paymentMethod === 'CREDIT' && tx.customerId) {
      updatedCustomers = updatedCustomers.map(cust => {
        if (cust.id === tx.customerId) {
          return {
            ...cust,
            debt: Math.max(0, cust.debt - tx.total)
          };
        }
        return cust;
      });

      newDebtLogs.push({
        id: `debt-log-${Date.now()}-cancel`,
        customerId: tx.customerId,
        type: 'PAYMENT',
        amount: tx.total,
        note: `Futa Mauzo ya Mkopo kwa sababu ya: ${reason}`,
        timestamp: new Date().toISOString(),
        receiptId: tx.id
      });
    }

    // Filter transaction from list (or flag it as cancelled - better to remove, but wait, we can just remove it to keep it simple and clean, or mark it. Let's filter it out to keep stats correct).
    saveState({
      ...state,
      products: updatedProducts,
      transactions: state.transactions.filter(t => t.id !== id),
      customers: updatedCustomers,
      stockLogs: newStockLogs,
      debtLogs: newDebtLogs
    });
  };

  // Settings
  const updateSettings = (sett: StoreSettings) => {
    if (!state) return;
    saveState({
      ...state,
      settings: sett
    });
  };

  // Staff Users Management
  const addUser = (name: string, role: 'ADMIN' | 'CASHIER', pin: string, permissions: StaffUser['permissions']) => {
    if (!state) return;
    const newUser: StaffUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      role,
      pin,
      createdAt: new Date().toISOString(),
      permissions
    };
    saveState({
      ...state,
      users: [...(state.users || []), newUser]
    });
  };

  const updateUser = (u: StaffUser) => {
    if (!state) return;
    const updatedUsers = (state.users || []).map(item => item.id === u.id ? u : item);
    const updatedCurrentUser = state.currentUser?.id === u.id ? u : state.currentUser;
    saveState({
      ...state,
      users: updatedUsers,
      currentUser: updatedCurrentUser
    });
  };

  const deleteUser = (id: string) => {
    if (!state) return;
    saveState({
      ...state,
      users: (state.users || []).filter(item => item.id !== id)
    });
  };

  const setCurrentUser = (user: StaffUser | null) => {
    if (!state) return;
    saveState({
      ...state,
      currentUser: user
    });
  };

  // Utilities
  const resetDatabase = () => {
    const fresh = getInitialDbState();
    saveState(fresh);
  };

  const importDatabase = (imported: DbState) => {
    saveState(imported);
  };

  const createShop = (name: string): string => {
    const newId = `shop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newShop: Shop = {
      id: newId,
      name,
      createdAt: new Date().toISOString()
    };
    const updatedShops = [...shops, newShop];
    saveShopsList(updatedShops);

    const freshDb = getEmptyDbState();
    freshDb.settings.storeName = name;
    if (state?.users) {
      freshDb.users = state.users;
    }
    const dbKey = getDbKey(activeAccount, newId);
    localStorage.setItem(dbKey, JSON.stringify(freshDb));
    syncToCloudIfNeeded(newId, freshDb);

    return newId;
  };

  const renameShop = (id: string, name: string) => {
    const updatedShops = shops.map(s => s.id === id ? { ...s, name } : s);
    saveShopsList(updatedShops);

    const storageKey = id === 'default' ? LOCAL_STORAGE_KEY : `${LOCAL_STORAGE_KEY}_${id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as DbState;
        parsed.settings.storeName = name;
        localStorage.setItem(storageKey, JSON.stringify(parsed));
        if (id === currentShopId) {
          setState(parsed);
        }
        syncToCloudIfNeeded(id, parsed);
      }
    } catch (e) {
      console.error('Failed to rename shop in database storage', e);
    }
  };

  const deleteShop = (id: string) => {
    if (shops.length <= 1) {
      alert('Huwezi kufuta duka pekee lililosalia. Lazima kuwe na duka angalau moja.');
      return;
    }
    const confirmDelete = window.confirm(
      `Je, una uhakika unataka kufuta duka hili na bidhaa, mauzo, na taarifa zake zote? Kitendo hiki hakiwezi kurejeshwa.`
    );
    if (!confirmDelete) return;

    const updatedShops = shops.filter(s => s.id !== id);
    saveShopsList(updatedShops);

    const storageKey = id === 'default' ? LOCAL_STORAGE_KEY : `${LOCAL_STORAGE_KEY}_${id}`;
    localStorage.removeItem(storageKey);

    // Delete background cloud backup if possible
    try {
      const deleteCloud = async () => {
        const { auth, db } = await import('../lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, 'users', user.uid, 'shops', id, 'state', 'current');
          await deleteDoc(docRef);
        }
      };
      deleteCloud();
    } catch (e) {
      console.warn('Could not delete shop cloud backup:', e);
    }

    if (currentShopId === id) {
      const nextActiveId = updatedShops[0].id;
      setCurrentShopId(nextActiveId);
      localStorage.setItem('pm_supermarket_current_shop_id', nextActiveId);
    }
  };

  const switchShop = (id: string) => {
    setCurrentShopId(id);
    localStorage.setItem('pm_supermarket_current_shop_id', id);
  };

  return {
    state,
    isLoaded: state !== null,
    isOnline,
    isSyncingCloud,
    pendingSyncCount,
    lastCloudSyncTime,
    forceCloudSync,
    accounts,
    activeAccount,
    reloadAccounts,
    registerAccount,
    loginAccount,
    logoutAccount,
    switchAccount,
    deleteAccount,
    shops,
    currentShopId,
    createShop,
    renameShop,
    deleteShop,
    switchShop,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    clearAllSuppliers,
    addExpense,
    updateExpense,
    deleteExpense,
    recordDebtLog,
    createTransaction,
    cancelTransaction,
    updateSettings,
    addUser,
    updateUser,
    deleteUser,
    setCurrentUser,
    resetDatabase,
    importDatabase
  };
}
