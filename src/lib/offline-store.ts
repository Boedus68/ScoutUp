/** IndexedDB cache for registro uscite + schede sanitarie (client-only). */

const DB_NAME = "scout-up-offline";
const DB_VERSION = 1;

export type OfflineEventBundle = {
  eventId: string;
  savedAt: string;
  event: Record<string, unknown>;
  members: Array<Record<string, unknown>>;
  medical: Array<Record<string, unknown>>;
  attendances: Array<Record<string, unknown>>;
};

export type SyncQueueItem = {
  id: string;
  kind: "attendances";
  eventId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("eventBundles")) {
        db.createObjectStore("eventBundles", { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveEventBundle(bundle: OfflineEventBundle) {
  const db = await openDb();
  const tx = db.transaction("eventBundles", "readwrite");
  tx.objectStore("eventBundles").put(bundle);
  await txDone(tx);
  db.close();
}

export async function getEventBundle(eventId: string) {
  const db = await openDb();
  const tx = db.transaction("eventBundles", "readonly");
  const req = tx.objectStore("eventBundles").get(eventId);
  const result = await new Promise<OfflineEventBundle | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as OfflineEventBundle | undefined);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return result;
}

export async function enqueueSync(item: Omit<SyncQueueItem, "id" | "createdAt">) {
  const db = await openDb();
  const full: SyncQueueItem = {
    ...item,
    id: `${item.kind}-${item.eventId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const tx = db.transaction("syncQueue", "readwrite");
  tx.objectStore("syncQueue").put(full);
  await txDone(tx);
  db.close();
  return full.id;
}

export async function listSyncQueue() {
  const db = await openDb();
  const tx = db.transaction("syncQueue", "readonly");
  const req = tx.objectStore("syncQueue").getAll();
  const rows = await new Promise<SyncQueueItem[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as SyncQueueItem[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows;
}

export async function removeSyncItem(id: string) {
  const db = await openDb();
  const tx = db.transaction("syncQueue", "readwrite");
  tx.objectStore("syncQueue").delete(id);
  await txDone(tx);
  db.close();
}
