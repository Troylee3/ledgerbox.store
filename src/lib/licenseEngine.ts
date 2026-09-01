import { StoreSettings } from '../types';

export interface LicenseStatus {
  isExpired: boolean;
  isLocked: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'LOCKED' | 'TRIAL';
  daysRemaining: number;
  expiryDateStr: string;
  formattedExpiry: string;
  plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'TRIAL';
}

const DEFAULT_DEVELOPER_NAME = 'BRAYAN FLAVIAN KAKO';
const DEFAULT_DEVELOPER_PHONE = '37290818';
const DEFAULT_DEVELOPER_PIN = '9999';
const DEFAULT_MONTHLY_FEE = 15000;

// Secret key seed offset for offline verification
const SECRET_SEED = 7919;

/**
 * Calculates current license status based on store settings.
 * Defaults to a active 30-day trial if no subscriptionExpiryDate is set.
 */
export function getLicenseStatus(settings: StoreSettings): LicenseStatus {
  const statusSetting = settings.subscriptionStatus || 'ACTIVE';
  const plan = settings.subscriptionPlan || 'MONTHLY';
  
  // If explicitly locked by developer
  if (statusSetting === 'LOCKED') {
    return {
      isExpired: true,
      isLocked: true,
      status: 'LOCKED',
      daysRemaining: 0,
      expiryDateStr: settings.subscriptionExpiryDate || new Date().toISOString(),
      formattedExpiry: 'Imefungwa na Developer (Locked)',
      plan
    };
  }

  // Lifetime plan check
  if (plan === 'LIFETIME') {
    return {
      isExpired: false,
      isLocked: false,
      status: 'ACTIVE',
      daysRemaining: 99999,
      expiryDateStr: '2099-12-31T23:59:59.000Z',
      formattedExpiry: 'Bila Kikomo (Lifetime License)',
      plan: 'LIFETIME'
    };
  }

  // If no expiry date set, initialize it to 30 days from now
  let expiryDate = settings.subscriptionExpiryDate ? new Date(settings.subscriptionExpiryDate) : null;
  if (!expiryDate || isNaN(expiryDate.getTime())) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    expiryDate = thirtyDaysFromNow;
  }

  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;

  return {
    isExpired,
    isLocked: isExpired,
    status: isExpired ? 'EXPIRED' : statusSetting,
    daysRemaining: Math.max(0, daysRemaining),
    expiryDateStr: expiryDate.toISOString(),
    formattedExpiry: expiryDate.toLocaleDateString('sw-TZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    plan
  };
}

/**
 * Extends or updates store subscription settings by adding days.
 */
export function extendSubscription(
  settings: StoreSettings,
  daysToAdd: number,
  newPlan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'TRIAL' = 'MONTHLY',
  licenseKeyUsed?: string
): StoreSettings {
  const currentStatus = getLicenseStatus(settings);
  
  let baseDate = new Date();
  // If current subscription is still active, extend from existing expiry date
  if (!currentStatus.isExpired && settings.subscriptionExpiryDate) {
    const existingDate = new Date(settings.subscriptionExpiryDate);
    if (!isNaN(existingDate.getTime()) && existingDate > baseDate) {
      baseDate = existingDate;
    }
  }

  if (newPlan === 'LIFETIME') {
    return {
      ...settings,
      subscriptionStatus: 'ACTIVE',
      subscriptionPlan: 'LIFETIME',
      subscriptionExpiryDate: '2099-12-31T23:59:59.000Z',
      lastLicenseKeyUsed: licenseKeyUsed || settings.lastLicenseKeyUsed,
      activatedAt: new Date().toISOString()
    };
  }

  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + daysToAdd);

  return {
    ...settings,
    subscriptionStatus: 'ACTIVE',
    subscriptionPlan: newPlan,
    subscriptionExpiryDate: newExpiry.toISOString(),
    lastLicenseKeyUsed: licenseKeyUsed || settings.lastLicenseKeyUsed,
    activatedAt: new Date().toISOString()
  };
}

/**
 * Generate a valid offline verifiable key for Developer to give to customers.
 */
export function generateLicenseKey(
  type: '30_DAYS' | '90_DAYS' | '365_DAYS' | 'LIFETIME'
): string {
  const planTag = type === '30_DAYS' ? '30D' : type === '90_DAYS' ? '90D' : type === '365_DAYS' ? '365D' : 'LIFE';
  const randBlock = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Calculate checksum for verification
  let num = 0;
  for (let i = 0; i < randBlock.length; i++) {
    num += parseInt(randBlock[i]) * (i + 3);
  }
  const checksum = ((num * SECRET_SEED) % 8999 + 1000).toString();

  return `LBX-${planTag}-${randBlock}-${checksum}`;
}

/**
 * Verify a key entered by user or developer and apply it if valid.
 */
export function verifyAndApplyLicenseKey(
  inputKey: string,
  settings: StoreSettings
): { success: boolean; message: string; updatedSettings?: StoreSettings; daysGranted?: number } {
  const cleanKey = inputKey.trim().toUpperCase();

  if (!cleanKey) {
    return { success: false, message: 'Tafadhali ingiza Key ya Leseni.' };
  }

  // Master Developer Instant Keys
  if (cleanKey === 'LBX-DEVELOPER-MASTER' || cleanKey === 'BRAYAN2026' || cleanKey === 'LBX-UNLOCK-ALL') {
    const updated = extendSubscription(settings, 365, 'ANNUAL', cleanKey);
    return {
      success: true,
      message: 'Leseni ya Developer Imefanikiwa! Mfumo umefunguliwa kwa siku 365.',
      updatedSettings: updated,
      daysGranted: 365
    };
  }

  if (cleanKey === 'LBX-30DAYS-FREE' || cleanKey === 'LBX-TEST-30') {
    const updated = extendSubscription(settings, 30, 'MONTHLY', cleanKey);
    return {
      success: true,
      message: 'Leseni ya Mwezi 1 (Siku 30) Imefanya Kazi! Karibu LedgerBox.',
      updatedSettings: updated,
      daysGranted: 30
    };
  }

  if (cleanKey === 'LBX-LIFETIME-MASTER') {
    const updated = extendSubscription(settings, 36500, 'LIFETIME', cleanKey);
    return {
      success: true,
      message: 'Leseni ya Maisha (Lifetime) Imewashwa!',
      updatedSettings: updated,
      daysGranted: 36500
    };
  }

  // Standard Key pattern: LBX-TAG-RAND-CHECKSUM
  const parts = cleanKey.split('-');
  if (parts.length !== 4 || parts[0] !== 'LBX') {
    return {
      success: false,
      message: 'Key ya Leseni siyo sahihi. Hakikisha umeandika kwa usahihi (mfano: LBX-30D-XXXX-YYYY).'
    };
  }

  const tag = parts[1];
  const randBlock = parts[2];
  const providedChecksum = parts[3];

  if (!/^\d{4}$/.test(randBlock) || !/^\d{4}$/.test(providedChecksum)) {
    return { success: false, message: 'Format ya Key ya Leseni si sahihi.' };
  }

  // Calculate expected checksum
  let num = 0;
  for (let i = 0; i < randBlock.length; i++) {
    num += parseInt(randBlock[i]) * (i + 3);
  }
  const expectedChecksum = ((num * SECRET_SEED) % 8999 + 1000).toString();

  if (providedChecksum !== expectedChecksum) {
    return { success: false, message: 'Key ya Leseni imekataliwa. Sio key halali au imeshatumika.' };
  }

  let days = 30;
  let plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' = 'MONTHLY';

  if (tag === '30D') {
    days = 30;
    plan = 'MONTHLY';
  } else if (tag === '90D') {
    days = 90;
    plan = 'MONTHLY';
  } else if (tag === '365D') {
    days = 365;
    plan = 'ANNUAL';
  } else if (tag === 'LIFE') {
    days = 36500;
    plan = 'LIFETIME';
  } else {
    return { success: false, message: 'Aina ya Leseni kwenye Key haitambuliki.' };
  }

  const updatedSettings = extendSubscription(settings, days, plan, cleanKey);
  return {
    success: true,
    message: `Leseni imekubaliwa! Huduma imerejeshwa na kuongezwa kwa Siku ${days}.`,
    updatedSettings,
    daysGranted: days
  };
}

export { DEFAULT_DEVELOPER_NAME, DEFAULT_DEVELOPER_PHONE, DEFAULT_DEVELOPER_PIN, DEFAULT_MONTHLY_FEE };
