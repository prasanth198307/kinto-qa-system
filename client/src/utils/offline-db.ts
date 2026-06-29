// IndexedDB wrapper for offline restaurant operations

const DB_NAME = 'swacherp-offline';
const DB_VERSION = 1;

interface OfflineKOT {
  offline_id: string;
  table_number: string;
  table_id?: number;
  outlet_id?: number;
  order_type: string;
  covers: number;
  items: Array<{
    item_name: string;
    quantity: number;
    rate: number;
    amount: number;
    notes?: string;
  }>;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  cashier_name?: string;
  created_at: string;
  synced: boolean;
}

interface CachedData {
  key: string;
  data: any;
  cached_at: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('kot_queue')) {
        const store = db.createObjectStore('kot_queue', { keyPath: 'offline_id' });
        store.createIndex('synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains('menu_cache')) {
        db.createObjectStore('menu_cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('tables_cache')) {
        db.createObjectStore('tables_cache', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineKOT(kot: Omit<OfflineKOT, 'offline_id' | 'synced'>): Promise<string> {
  const db = await openDB();
  const offline_id = `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: OfflineKOT = { ...kot, offline_id, synced: false };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kot_queue', 'readwrite');
    tx.objectStore('kot_queue').put(record);
    tx.oncomplete = () => resolve(offline_id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedKOTs(): Promise<OfflineKOT[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kot_queue', 'readonly');
    const req = tx.objectStore('kot_queue').index('synced').getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function markKOTSynced(offline_id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kot_queue', 'readwrite');
    const store = tx.objectStore('kot_queue');
    const req = store.get(offline_id);
    req.onsuccess = () => {
      if (req.result) {
        store.put({ ...req.result, synced: true });
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const kots = await getQueuedKOTs();
  return kots.length;
}

export async function cacheMenuData(key: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('menu_cache', 'readwrite');
    tx.objectStore('menu_cache').put({ key, data, cached_at: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedMenuData(key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('menu_cache', 'readonly');
    const req = tx.objectStore('menu_cache').get(key);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => reject(req.error);
  });
}

export async function syncToServer(apiBase = ''): Promise<{ synced: number; errors: number }> {
  const pending = await getQueuedKOTs();
  if (pending.length === 0) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  try {
    const res = await fetch(`${apiBase}/api/restaurant/offline-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kots: pending, device_id: navigator.userAgent }),
    });
    if (res.ok) {
      const data = await res.json();
      for (const result of (data.results || [])) {
        await markKOTSynced(result.offline_id);
        synced++;
      }
    } else {
      errors = pending.length;
    }
  } catch {
    errors = pending.length;
  }

  return { synced, errors };
}
