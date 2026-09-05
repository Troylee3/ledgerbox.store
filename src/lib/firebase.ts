import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  getDoc,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress non-critical Firestore offline & token retry warnings
try {
  setLogLevel('silent');
} catch {
  // Ignore
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore safely
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
let dbInstance;
try {
  if (firestoreDbId) {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true
    }, firestoreDbId);
  } else {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true
    });
  }
} catch {
  try {
    dbInstance = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
  } catch {
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;
export const auth = getAuth(app);

// Error Handling helper required for Firestore operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Configure Google OAuth Provider
// For primary authentication, request only standard profile & email scopes
// This avoids CASA / restricted scope blocks and works seamlessly with verified domain ledgerbox.store
export function createGoogleProvider(extraScopes: string[] = []): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.addScope('openid');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  if (extraScopes && extraScopes.length > 0) {
    extraScopes.forEach(scope => {
      if (scope) provider.addScope(scope);
    });
  }
  return provider;
}

export const googleProvider = createGoogleProvider();

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        const token = cachedAccessToken || (await user.getIdToken());
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } catch (err) {
        console.warn('Failed to retrieve token for authenticated user:', err);
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (extraScopes?: string[]): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = (extraScopes && extraScopes.length > 0) 
      ? createGoogleProvider(extraScopes) 
      : googleProvider;
      
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    // Safely retrieve token: OAuth access token if available, or Firebase ID token.
    // Never throws an error if accessToken is absent for standard profile sign in!
    const token = credential?.accessToken || (await result.user.getIdToken());
    cachedAccessToken = token;

    return { user: result.user, accessToken: token };
  } catch (error: any) {
    const errorCode = error?.code || 'auth/unknown';
    const errorMessage = error?.message || String(error);
    console.warn(`[Firebase Auth] Google Sign-In notice (${errorCode}):`, errorMessage);

    // Create an informative structured error
    const isUnauthorizedDomain = errorCode === 'auth/unauthorized-domain';
    const isPopupBlocked = errorCode === 'auth/popup-blocked';
    const isCancelled = errorCode === 'auth/cancelled-popup-request' || errorCode === 'auth/popup-closed-by-user';
    const isNetwork = errorCode === 'auth/network-request-failed' || errorMessage.includes('network-request-failed');

    const enhancedError: any = new Error(
      isUnauthorizedDomain
        ? 'Domain hii haijaidhinishwa kwenye Firebase Auth. Kwenye https://ledgerbox.store domain imehakikiwa kikamilifu.'
        : isPopupBlocked
        ? 'Dirisha dogo (popup) la Google limezuiwa na kivinjari chako. Tafadhali ruhusu popups.'
        : isCancelled
        ? 'Kuingia na Google kumesitishwa na mtumiaji.'
        : errorMessage
    );
    enhancedError.code = errorCode;
    enhancedError.isUnauthorizedDomain = isUnauthorizedDomain;
    enhancedError.isPopupBlocked = isPopupBlocked;
    enhancedError.isCancelled = isCancelled;
    enhancedError.isNetworkOrIframeError = isNetwork || isPopupBlocked || isUnauthorizedDomain;
    
    throw enhancedError;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Validate Connection to Firestore safely without breaking or blocking UI
export async function testConnection() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 3000)
    );
    await Promise.race([
      getDoc(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    return true;
  } catch {
    // Non-blocking - offline mode will work seamlessly
    return false;
  }
}

