import { TranscriptBlock, SummaryShape } from './types';

const DB_NAME = 'livenotes';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'current';

export interface SavedSession {
  committedTranscript: TranscriptBlock[];
  fullTranscript: string;
  currentSummary: SummaryShape;
  contextPrompt: string;
  transcriptionCost: number;
  summaryCost: number;
  savedAt: number;
}

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveSession = async (session: SavedSession): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(session, SESSION_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB may be unavailable (e.g., private browsing in some browsers)
  }
};

export const loadSession = async (): Promise<SavedSession | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(SESSION_KEY);
    const result = await new Promise<SavedSession | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
};

export const clearSavedSession = async (): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(SESSION_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // silently ignore
  }
};
