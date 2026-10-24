import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';

export interface SheetMetadata {
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Automatically converts any standard Google Sheet URL into direct CSV export URL.
 * Supports:
 * - Direct CSV links (pub?output=csv, export?format=csv)
 * - Standard Google Sheet edit links (/edit#gid=...)
 * - Sharing links (/spreadsheets/d/{ID}/...)
 * - Published to web links
 */
export function convertToCsvUrl(inputUrl: string): string {
  const trimmed = (inputUrl || '').trim();
  if (!trimmed) return '';

  // Already a direct CSV link
  if (trimmed.includes('pub?output=csv') || trimmed.includes('export?format=csv')) {
    return trimmed;
  }

  // Google Sheet ID extraction
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const id = match[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gidPart = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidPart}`;
  }

  return trimmed;
}

/**
 * Subscribe in real-time to a shared Google Sheet URL stored in Firestore `settings/{docId}`.
 * When the Admin updates the link in Firestore, all users' browsers receive the new URL in real-time.
 */
export function subscribeToSharedSheetUrl(
  docId: string,
  defaultUrl: string,
  storageKey: string,
  onUpdate: (url: string, metadata?: SheetMetadata) => void
): () => void {
  // 1. Initial fast local read for instant render without flash
  try {
    const local = localStorage.getItem(storageKey);
    if (local && local.trim()) {
      onUpdate(local.trim());
    } else if (defaultUrl) {
      onUpdate(defaultUrl);
    }
  } catch (e) {
    if (defaultUrl) onUpdate(defaultUrl);
  }

  // 2. Real-time Firestore snapshot listener across all users
  const docRef = doc(db, COLLECTIONS.SETTINGS, docId);
  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const firestoreUrl = data?.url || data?.sheetUrl || data?.webhookUrl;
        if (firestoreUrl && typeof firestoreUrl === 'string' && firestoreUrl.trim()) {
          const clean = firestoreUrl.trim();
          try {
            localStorage.setItem(storageKey, clean);
          } catch (e) {
            // ignore local storage errors
          }
          onUpdate(clean, {
            updatedAt: data?.updatedAt,
            updatedBy: data?.updatedBy
          });
          return;
        }
      }

      // If document doesn't exist yet, fallback to localStorage or default
      try {
        const local = localStorage.getItem(storageKey);
        if (local && local.trim()) {
          onUpdate(local.trim());
          return;
        }
      } catch (e) {}

      if (defaultUrl) {
        onUpdate(defaultUrl);
      }
    },
    (err) => {
      console.warn(`[SharedSheetConfig] Firestore subscription failed for ${docId}:`, err);
    }
  );

  return unsubscribe;
}

/**
 * Save Google Sheet URL to Cloud Firestore `settings/{docId}` so it is permanently pinned for all users.
 */
export async function saveSharedSheetUrl(
  docId: string,
  url: string,
  storageKey: string,
  user?: { displayName?: string; username?: string } | null
): Promise<void> {
  const clean = convertToCsvUrl(url.trim());
  if (!clean) {
    throw new Error('Invalid URL');
  }

  // 1. Save locally
  try {
    localStorage.setItem(storageKey, clean);
  } catch (e) {
    // ignore
  }

  // 2. Persist to Firestore settings document for all users
  const docRef = doc(db, COLLECTIONS.SETTINGS, docId);
  await setDoc(
    docRef,
    {
      url: clean,
      sheetUrl: clean,
      originalUrl: url.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: user?.displayName || user?.username || 'Admin'
    },
    { merge: true }
  );
}
