import { doc, setDoc, getDocs, collection, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { StoreSettings, BusinessAccount, DbState } from '../types';
import { INITIAL_SETTINGS } from '../data/initialData';
import { getLicenseStatus } from './licenseEngine';

export interface RemoteStoreRecord {
  id: string; // Store or Account document ID
  storeId: string;
  accountId?: string;
  storeName: string;
  ownerName: string;
  phone: string;
  address: string;
  currencySymbol: string;
  subscriptionExpiresAt: string;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'LOCKED' | 'TRIAL';
  monthlyFeeAmount: number;
  totalSalesCount: number;
  totalRevenue: number;
  totalProductsCount: number;
  totalCustomersCount: number;
  deviceType: string;
  browser: string;
  originUrl: string;
  lastActiveAt: string;
  firstSeenAt: string;
  isPwaInstalled?: boolean;
}

// Detect device type and OS from User-Agent
export function detectDeviceInfo(): { deviceType: string; browser: string; isPwa: boolean } {
  const ua = navigator.userAgent || '';
  let deviceType = '🖥️ Laptop / PC';
  let browser = 'Chrome';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMac = /Macintosh/i.test(ua);
  const isWindows = /Windows/i.test(ua);

  if (isAndroid) {
    deviceType = '📱 Simu ya Android';
  } else if (isIOS) {
    deviceType = '📱 iPhone / iPad';
  } else if (isMobile) {
    deviceType = '📱 Simu ya Mkononi';
  } else if (isMac) {
    deviceType = '💻 Kompyuta ya Apple Mac';
  } else if (isWindows) {
    deviceType = '💻 Kompyuta ya Windows';
  }

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Chrome')) browser = 'Google Chrome';

  const isPwa = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  return { deviceType, browser, isPwa };
}

// Ping current store info to Cloud Registry for Developer Panel tracking
export async function pingStoreToCloudRegistry(
  shopId: string,
  settings: StoreSettings,
  activeAccount: BusinessAccount | null,
  state: DbState | null
): Promise<boolean> {
  try {
    if (!settings || !settings.storeName) return false;

    const license = getLicenseStatus(settings);
    const { deviceType, browser, isPwa } = detectDeviceInfo();

    // Calculate store metrics safely
    const sales = state?.transactions || [];
    const totalSalesCount = sales.length;
    const totalRevenue = sales.reduce((acc, t) => acc + (t.total || 0), 0);
    const totalProductsCount = state?.products?.length || 0;
    const totalCustomersCount = state?.customers?.length || 0;

    // Build unique identifier for this store instance
    const accountId = activeAccount?.id || 'acc_default_main';
    const storeDocId = `${accountId}_${shopId || 'shop-default'}`.replace(/[^a-zA-Z0-9_\-]/g, '_');

    const nowIso = new Date().toISOString();
    const originUrl = window.location.origin || 'https://ledgerbox-pos.app';

    // Get first seen date if previously saved locally
    const cacheKey = `pm_remote_store_registered_${storeDocId}`;
    let firstSeenAt = localStorage.getItem(cacheKey);
    if (!firstSeenAt) {
      firstSeenAt = nowIso;
      localStorage.setItem(cacheKey, firstSeenAt);
    }

    const payload: RemoteStoreRecord = {
      id: storeDocId,
      storeId: shopId || 'shop-default',
      accountId: accountId,
      storeName: settings.storeName || activeAccount?.storeName || 'Duka Lisilo na Jina',
      ownerName: activeAccount?.ownerName || settings.receiptGreeting || 'Msimamizi wa Duka',
      phone: settings.phone || activeAccount?.phone || 'Haina Namba',
      address: settings.address || 'Haina Anwani',
      currencySymbol: settings.currencySymbol || 'TZS',
      subscriptionExpiresAt: settings.subscriptionExpiryDate || license.expiryDateStr || new Date(Date.now() + 30*86400000).toISOString(),
      subscriptionStatus: license.isLocked ? 'LOCKED' : license.isExpired ? 'EXPIRED' : 'ACTIVE',
      monthlyFeeAmount: settings.monthlyFeeAmount || 15000,
      totalSalesCount,
      totalRevenue,
      totalProductsCount,
      totalCustomersCount,
      deviceType,
      browser,
      originUrl,
      lastActiveAt: nowIso,
      firstSeenAt,
      isPwaInstalled: isPwa
    };

    // Save to Firestore 'developer_remote_stores' collection with timeout guard
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const docRef = doc(db, 'developer_remote_stores', storeDocId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud ping timeout')), 4000)
        );
        await Promise.race([
          setDoc(docRef, payload, { merge: true }),
          timeoutPromise
        ]);
        console.log(`[Developer Remote Tracker] Pinged store "${payload.storeName}" (${payload.id}) to Cloud Registry.`);
      } catch (err) {
        // Non-blocking background sync warning
      }
    }

    // Always update local cache for offline developer view
    const localRegistryRaw = localStorage.getItem('pm_cloud_remote_stores_cache');
    let localStores: RemoteStoreRecord[] = [];
    if (localRegistryRaw) {
      try {
        localStores = JSON.parse(localRegistryRaw);
      } catch (e) {
        localStores = [];
      }
    }
    const existingIndex = localStores.findIndex(s => s.id === storeDocId);
    if (existingIndex >= 0) {
      localStores[existingIndex] = { ...localStores[existingIndex], ...payload };
    } else {
      localStores.push(payload);
    }
    localStorage.setItem('pm_cloud_remote_stores_cache', JSON.stringify(localStores));

    return true;
  } catch (err) {
    console.warn('[Developer Remote Tracker] Cloud ping skipped:', err);
    return false;
  }
}

// Deep scan of all local shops and accounts on this domain link to ensure they are tracked
export async function syncAllLocalStoresToCloud(): Promise<number> {
  let syncedCount = 0;
  try {
    const { deviceType, browser, isPwa } = detectDeviceInfo();
    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ledgerbox-pos.app';
    const nowIso = new Date().toISOString();

    // 1. Read registered accounts
    let accounts: BusinessAccount[] = [];
    try {
      const accsRaw = localStorage.getItem('pm_registered_accounts');
      if (accsRaw) accounts = JSON.parse(accsRaw);
    } catch {}

    if (accounts.length === 0) {
      accounts = [{
        id: 'acc_default_main',
        email: 'admin@pos.tz',
        ownerName: 'Mwenye Duka',
        storeName: 'Duka Kuu',
        phone: '0700000000',
        createdAt: nowIso
      }];
    }

    for (const acc of accounts) {
      if (!acc || !acc.id) continue;

      // Get shops for this account
      let shops: any[] = [];
      try {
        const shopsRaw = localStorage.getItem(`pm_shops_${acc.id}`);
        if (shopsRaw) shops = JSON.parse(shopsRaw);
      } catch {}

      if (!Array.isArray(shops) || shops.length === 0) {
        shops = [{ id: 'shop-default', name: acc.storeName || 'Duka Kuu' }];
      }

      for (const shop of shops) {
        const shopId = shop.id || 'shop-default';
        const storeDocId = `${acc.id}_${shopId}`.replace(/[^a-zA-Z0-9_\-]/g, '_');

        // Try getting db state
        let dbState: DbState | null = null;
        const candidateKeys = [
          `pm_db_${acc.id}_${shopId}`,
          `pm_db_${acc.id}_default`,
          `pm_db_${acc.id}_shop-default`
        ];
        if (acc.id === 'acc_default_main') {
          candidateKeys.push('pm_supermarket_offline_db');
        }

        for (const k of candidateKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              dbState = JSON.parse(raw);
              if (dbState) break;
            } catch {}
          }
        }

        // Get settings
        let storeSettings: StoreSettings = dbState?.settings || {
          ...INITIAL_SETTINGS,
          storeName: shop.name || acc.storeName || 'Duka Kuu',
          phone: acc.phone || '0700000000',
          receiptGreeting: acc.ownerName || 'Karibu Tena',
          subscriptionExpiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          subscriptionStatus: 'ACTIVE',
          monthlyFeeAmount: 15000,
          developerName: 'Kiprotich & Co. Tech',
          developerPhone: '0613584700',
          developerPin: '2026'
        };

        const license = getLicenseStatus(storeSettings);
        const sales = dbState?.transactions || [];
        const totalSalesCount = sales.length;
        const totalRevenue = sales.reduce((acc, t) => acc + (t.total || 0), 0);
        const totalProductsCount = dbState?.products?.length || 0;
        const totalCustomersCount = dbState?.customers?.length || 0;

        const payload: RemoteStoreRecord = {
          id: storeDocId,
          storeId: shopId,
          accountId: acc.id,
          storeName: storeSettings.storeName || shop.name || acc.storeName || 'Duka Kuu',
          ownerName: acc.ownerName || storeSettings.receiptGreeting || 'Mwenye Duka',
          phone: storeSettings.phone || acc.phone || 'Haina Namba',
          address: storeSettings.address || 'Haina Anwani',
          currencySymbol: storeSettings.currencySymbol || 'TZS',
          subscriptionExpiresAt: storeSettings.subscriptionExpiryDate || license.expiryDateStr,
          subscriptionStatus: license.isLocked ? 'LOCKED' : license.isExpired ? 'EXPIRED' : 'ACTIVE',
          monthlyFeeAmount: storeSettings.monthlyFeeAmount || 15000,
          totalSalesCount,
          totalRevenue,
          totalProductsCount,
          totalCustomersCount,
          deviceType,
          browser,
          originUrl,
          lastActiveAt: nowIso,
          firstSeenAt: nowIso,
          isPwaInstalled: isPwa
        };

        // Push to Firestore
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const docRef = doc(db, 'developer_remote_stores', storeDocId);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 3000)
            );
            await Promise.race([
              setDoc(docRef, payload, { merge: true }),
              timeoutPromise
            ]);
            syncedCount++;
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('Error in syncAllLocalStoresToCloud:', e);
  }
  return syncedCount;
}

// Fetch all registered remote stores from Firestore for Developer Console
export async function fetchRemoteStoresFromCloud(): Promise<RemoteStoreRecord[]> {
  // Trigger background sync of any newly created local stores first
  syncAllLocalStoresToCloud().catch(() => {});

  const remoteStoresMap = new Map<string, RemoteStoreRecord>();

  // 1. Try reading from Firestore collection 'developer_remote_stores'
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const q = query(collection(db, 'developer_remote_stores'));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cloud fetch timeout')), 4000)
      );
      const snapshot: any = await Promise.race([
        getDocs(q),
        timeoutPromise
      ]);
      if (snapshot && typeof snapshot.forEach === 'function') {
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as RemoteStoreRecord;
          if (data && data.storeName) {
            remoteStoresMap.set(docSnap.id, { ...data, id: docSnap.id });
          }
        });
        console.log(`[Developer Remote Tracker] Fetched ${remoteStoresMap.size} remote store records from Cloud Firestore.`);
      }
    } catch (e) {
      // Offline fallback
    }
  }

  // 2. Fallback or merge with local cached stores
  try {
    const localRegistryRaw = localStorage.getItem('pm_cloud_remote_stores_cache');
    if (localRegistryRaw) {
      const cached: RemoteStoreRecord[] = JSON.parse(localRegistryRaw);
      cached.forEach(item => {
        if (!remoteStoresMap.has(item.id)) {
          remoteStoresMap.set(item.id, item);
        }
      });
    }
  } catch (e) {
    console.error('Error merging local cached remote stores', e);
  }

  // Convert to array sorted by lastActiveAt descending
  const storeList = Array.from(remoteStoresMap.values());
  storeList.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());

  return storeList;
}

// Update Remote Store Subscription/Status from Developer Console
export async function updateRemoteStoreInCloud(
  recordId: string,
  updates: Partial<RemoteStoreRecord>
): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const docRef = doc(db, 'developer_remote_stores', recordId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud update timeout')), 4000)
        );
        await Promise.race([
          setDoc(docRef, updates, { merge: true }),
          timeoutPromise
        ]);
      } catch (err) {
        // Continue to update local cache
      }
    }

    // Update local cache
    const localRegistryRaw = localStorage.getItem('pm_cloud_remote_stores_cache');
    if (localRegistryRaw) {
      const cached: RemoteStoreRecord[] = JSON.parse(localRegistryRaw);
      const idx = cached.findIndex(s => s.id === recordId);
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...updates };
        localStorage.setItem('pm_cloud_remote_stores_cache', JSON.stringify(cached));
      }
    }

    return true;
  } catch (err) {
    console.error('Error updating remote store in cloud:', err);
    return false;
  }
}

// Delete Remote Store record from Cloud Firestore and local cache
export async function deleteRemoteStoreFromCloud(recordId: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const docRef = doc(db, 'developer_remote_stores', recordId);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud delete timeout')), 4000)
        );
        await Promise.race([
          deleteDoc(docRef),
          timeoutPromise
        ]);
      } catch (err) {
        // Continue to update local cache
      }
    }

    // Remove from local cache
    const localRegistryRaw = localStorage.getItem('pm_cloud_remote_stores_cache');
    if (localRegistryRaw) {
      try {
        const cached: RemoteStoreRecord[] = JSON.parse(localRegistryRaw);
        const updated = cached.filter(s => s.id !== recordId);
        localStorage.setItem('pm_cloud_remote_stores_cache', JSON.stringify(updated));
      } catch (e) {}
    }

    return true;
  } catch (err) {
    console.error('Error deleting remote store from cloud:', err);
    return false;
  }
}

