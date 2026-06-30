// IndexedDB helpers for offline KOT queue
const DB_NAME = 'swacherp-offline';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('kot-queue')) d.createObjectStore('kot-queue', { keyPath: 'localId' });
      if (!d.objectStoreNames.contains('menu-cache')) d.createObjectStore('menu-cache', { keyPath: 'key' });
    };
    req.onsuccess = () => { db = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineKOT(kot: object): Promise<void> {
  const d = await openDB();
  const tx = d.transaction('kot-queue', 'readwrite');
  const store = tx.objectStore('kot-queue');
  store.put({ ...kot, localId: Date.now() + Math.random() });
}

export async function getCachedMenuData(key: string): Promise<any> {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('menu-cache', 'readonly');
    const req = tx.objectStore('menu-cache').get(key);
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheMenuData(key: string, data: any): Promise<void> {
  const d = await openDB();
  const tx = d.transaction('menu-cache', 'readwrite');
  tx.objectStore('menu-cache').put({ key, data, cachedAt: Date.now() });
}
