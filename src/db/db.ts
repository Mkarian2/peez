import Dexie, { type Table } from 'dexie';

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

class PeezDB extends Dexie {
  meta!: Table<MetaRow, string>;
  records!: Table<RecordRow, string>;

  constructor() {
    super('peez');
    this.version(1).stores({ meta: 'key', records: 'id' });
  }
}

export const db = new PeezDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function delMeta(key: string): Promise<void> {
  await db.meta.delete(key);
}
