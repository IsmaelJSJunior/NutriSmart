import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  serverTimestamp,
  doc,
  getDocFromServer,
  FieldValue,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Configuration resolution
let resolvedConfig = firebaseConfigData as any;
if (typeof window !== 'undefined' && (window as any).__firebase_config) {
  try {
    const dynamicConfig = JSON.parse((window as any).__firebase_config);
    if (dynamicConfig && Object.keys(dynamicConfig).length > 0) {
      resolvedConfig = { ...resolvedConfig, ...dynamicConfig };
    }
  } catch {
    // Keep resolvedConfig
  }
}

// App and DB initialization
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();

export const db: Firestore =
  resolvedConfig.firestoreDatabaseId && resolvedConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth: Auth = getAuth(app);

// Keep an anonymous session ready for Firestore security
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch((err) => {
        console.warn('NutriClinical: Falha ao iniciar autenticação anônima:', err);
      });
    }
  });

  // Verify connection
  (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (e: any) {
      if (e?.message && e.message.includes('the client is offline')) {
        console.warn('NutriClinical: Cliente Firestore operando em modo offline.');
      }
    }
  })();
}

export { serverTimestamp, FieldValue };
