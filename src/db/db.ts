import Dexie, { type Table } from 'dexie';
import { fromB64, toB64 } from '../crypto/crypto';

export interface MetaRow {
  key: string;
  value: unknown;
}

/** Every record is fully encrypted; `id` is an HMAC of the date so even dates are hidden. */
export interface RecordRow {
  id: string;
  iv: Uint8Array;
  ct: Uint8Array;
}

export interface StorageSnapshot {
  v: 1;
  updatedAt: number;
  meta: MetaRow[];
  records: RecordRow[];
}

const SNAPSHOT_LS_KEY = 'peez-vault-snapshot';
const EVER_SETUP_LS_KEY = 'peez-ever-setup';
const OPFS_FILE_NAME = 'peez-vault-snapshot.json';
const CACHE_NAME = 'peez-vault-backup-v1';
const CACHE_URL = '/__peez_vault_snapshot__';

class PeezDB extends Dexie {
  meta!: Table<MetaRow, string>;
  records!: Table<RecordRow, string>;

  constructor() {
    super('peez');
    this.version(1).stores({ meta: 'key', records: 'id' });
  }
}

export const db = new PeezDB();

/** In-memory fallback so Peez keeps working even if IndexedDB fails at runtime. */
const memMeta = new Map<string, unknown>();
const memRecords = new Map<string, RecordRow>();
let idbAvailable = true;

/** Losslessly serialize objects containing Uint8Array fields to JSON. */
export function serializeSnapshot(snap: StorageSnapshot): string {
  return JSON.stringify(snap, (_key, val) => {
    if (val instanceof Uint8Array) {
      return { __u8: toB64(val) };
    }
    if (ArrayBuffer.isView(val) && !(val instanceof DataView)) {
      return { __u8: toB64(new Uint8Array(val.buffer, val.byteOffset, val.byteLength)) };
    }
    return val;
  });
}

/** Losslessly deserialize a JSON snapshot back to objects with Uint8Array fields. */
export function deserializeSnapshot(json: string): StorageSnapshot | null {
  try {
    const parsed = JSON.parse(json, (_key, val) => {
      if (val && typeof val === 'object' && typeof val.__u8 === 'string' && Object.keys(val).length === 1) {
        return fromB64(val.__u8);
      }
      return val;
    }) as StorageSnapshot;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.meta) || !Array.isArray(parsed.records)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readLocalStorageSnapshot(): StorageSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SNAPSHOT_LS_KEY);
    return raw ? deserializeSnapshot(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalStorageSnapshot(json: string, hasPinWrap: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SNAPSHOT_LS_KEY, json);
    if (hasPinWrap) localStorage.setItem(EVER_SETUP_LS_KEY, '1');
  } catch {
    // Ignore quota or disabled localStorage errors
  }
}

async function readOpfsSnapshot(): Promise<StorageSnapshot | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null;
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(OPFS_FILE_NAME);
    const file = await handle.getFile();
    const text = await file.text();
    return deserializeSnapshot(text);
  } catch {
    return null;
  }
}

async function writeOpfsSnapshot(json: string): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(OPFS_FILE_NAME, { create: true });
    if ('createWritable' in handle && typeof handle.createWritable === 'function') {
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    }
  } catch {
    // Ignore OPFS errors on unsupported browsers
  }
}

async function readCacheSnapshot(): Promise<StorageSnapshot | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(CACHE_NAME);
    const resp = await cache.match(CACHE_URL);
    if (!resp) return null;
    return deserializeSnapshot(await resp.text());
  } catch {
    return null;
  }
}

async function writeCacheSnapshot(json: string): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      CACHE_URL,
      new Response(json, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }),
    );
  } catch {
    // Ignore CacheStorage errors
  }
}

function hasPin(meta: MetaRow[]): boolean {
  return meta.some((m) => m.key === 'pinWrap' && !!m.value);
}

function pickBestSnapshot(candidates: (StorageSnapshot | null)[]): StorageSnapshot | null {
  const valid = candidates.filter((c): c is StorageSnapshot => !!c && hasPin(c.meta));
  if (!valid.length) return null;
  return valid.sort((a, b) => {
    if (b.records.length !== a.records.length) return b.records.length - a.records.length;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  })[0];
}

let hydratePromise: Promise<void> | null = null;
let recoveredFromMirror = false;

export function wasRecoveredFromMirror(): boolean {
  return recoveredFromMirror;
}

export function resetHydrationState(): void {
  memMeta.clear();
  memRecords.clear();
  hydratePromise = null;
  recoveredFromMirror = false;
}

export function hadPreviousSetupFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(EVER_SETUP_LS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Ensures IndexedDB and our redundant mirrors (OPFS, localStorage, CacheStorage)
 * are synchronized. If IndexedDB was cleared or corrupted while a mirror survived,
 * automatically self-heals IndexedDB before the app checks `isSetUp()`.
 */
export function ensureStorageHydrated(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      let idbMeta: MetaRow[] = [];
      let idbRecords: RecordRow[] = [];
      try {
        [idbMeta, idbRecords] = await Promise.all([db.meta.toArray(), db.records.toArray()]);
        idbAvailable = true;
      } catch {
        idbAvailable = false;
      }

      const [opfsSnap, lsSnap, cacheSnap] = await Promise.all([
        readOpfsSnapshot(),
        Promise.resolve(readLocalStorageSnapshot()),
        readCacheSnapshot(),
      ]);

      const bestMirror = pickBestSnapshot([opfsSnap, lsSnap, cacheSnap]);
      const idbHasPin = hasPin(idbMeta);

      if (!idbHasPin && bestMirror) {
        // Self-heal from the surviving mirror!
        recoveredFromMirror = true;
        for (const m of bestMirror.meta) memMeta.set(m.key, m.value);
        for (const r of bestMirror.records) memRecords.set(r.id, r);
        if (idbAvailable) {
          try {
            await db.transaction('rw', db.meta, db.records, async () => {
              await db.meta.bulkPut(bestMirror.meta);
              if (bestMirror.records.length) await db.records.bulkPut(bestMirror.records);
            });
          } catch {
            idbAvailable = false;
          }
        }
        await syncMirrorsFromState(bestMirror.meta, bestMirror.records);
        return;
      }

      if (idbHasPin) {
        // Merge any missing records or meta keys from a mirror if needed
        const mergedMetaMap = new Map<string, unknown>();
        if (bestMirror) {
          for (const m of bestMirror.meta) mergedMetaMap.set(m.key, m.value);
        }
        for (const m of idbMeta) mergedMetaMap.set(m.key, m.value);

        const mergedRecMap = new Map<string, RecordRow>();
        if (bestMirror) {
          for (const r of bestMirror.records) mergedRecMap.set(r.id, r);
        }
        for (const r of idbRecords) mergedRecMap.set(r.id, r);

        for (const [k, v] of mergedMetaMap) memMeta.set(k, v);
        for (const [id, r] of mergedRecMap) memRecords.set(id, r);

        const finalMeta = Array.from(mergedMetaMap, ([key, value]) => ({ key, value }));
        const finalRecords = [...mergedRecMap.values()];

        if (idbAvailable && (finalMeta.length > idbMeta.length || finalRecords.length > idbRecords.length)) {
          try {
            await db.transaction('rw', db.meta, db.records, async () => {
              await db.meta.bulkPut(finalMeta);
              if (finalRecords.length) await db.records.bulkPut(finalRecords);
            });
          } catch {
            // ignore
          }
        }

        await syncMirrorsFromState(finalMeta, finalRecords);
      }
    })();
  }
  return hydratePromise;
}

async function syncMirrorsFromState(meta: MetaRow[], records: RecordRow[]): Promise<void> {
  const snap: StorageSnapshot = {
    v: 1,
    updatedAt: Date.now(),
    meta,
    records,
  };
  const json = serializeSnapshot(snap);
  writeLocalStorageSnapshot(json, hasPin(meta));
  await Promise.all([writeOpfsSnapshot(json), writeCacheSnapshot(json)]);
}

export async function syncMirrors(): Promise<void> {
  let meta: MetaRow[];
  let records: RecordRow[];
  if (idbAvailable) {
    try {
      [meta, records] = await Promise.all([db.meta.toArray(), db.records.toArray()]);
      memMeta.clear();
      for (const m of meta) memMeta.set(m.key, m.value);
      memRecords.clear();
      for (const r of records) memRecords.set(r.id, r);
    } catch {
      idbAvailable = false;
      meta = Array.from(memMeta, ([key, value]) => ({ key, value }));
      records = [...memRecords.values()];
    }
  } else {
    meta = Array.from(memMeta, ([key, value]) => ({ key, value }));
    records = [...memRecords.values()];
  }
  await syncMirrorsFromState(meta, records);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  await ensureStorageHydrated();
  if (idbAvailable) {
    try {
      const row = await db.meta.get(key);
      if (row !== undefined) {
        memMeta.set(key, row.value);
        return row.value as T;
      }
    } catch {
      idbAvailable = false;
    }
  }
  return memMeta.get(key) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await ensureStorageHydrated();
  memMeta.set(key, value);
  if (idbAvailable) {
    try {
      await db.meta.put({ key, value });
    } catch {
      idbAvailable = false;
    }
  }
  await syncMirrors();
}

export async function delMeta(key: string): Promise<void> {
  await ensureStorageHydrated();
  memMeta.delete(key);
  if (idbAvailable) {
    try {
      await db.meta.delete(key);
    } catch {
      idbAvailable = false;
    }
  }
  await syncMirrors();
}

export async function getAllRecordRows(): Promise<RecordRow[]> {
  await ensureStorageHydrated();
  if (idbAvailable) {
    try {
      const rows = await db.records.toArray();
      memRecords.clear();
      for (const r of rows) memRecords.set(r.id, r);
      return rows;
    } catch {
      idbAvailable = false;
    }
  }
  return [...memRecords.values()];
}

export async function putRecordRows(rows: RecordRow[]): Promise<void> {
  await ensureStorageHydrated();
  for (const r of rows) memRecords.set(r.id, r);
  if (idbAvailable) {
    try {
      await db.records.bulkPut(rows);
    } catch {
      idbAvailable = false;
    }
  }
  await syncMirrors();
}

export async function wipeAllStorage(): Promise<void> {
  memMeta.clear();
  memRecords.clear();
  hydratePromise = null;
  recoveredFromMirror = false;
  try {
    await db.delete();
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SNAPSHOT_LS_KEY);
      localStorage.removeItem(EVER_SETUP_LS_KEY);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_FILE_NAME);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete(CACHE_NAME);
    }
  } catch {
    // ignore
  }
}
