import {
  deriveKeyFromPassphrase,
  hkdfAesKey,
  hkdfHmacKey,
  hmac,
  PBKDF2_ITERATIONS,
  randomBytes,
  seal,
  sealJson,
  unseal,
  unsealJson,
  type Sealed,
} from '../crypto/crypto';
import { db, getMeta, setMeta } from './db';
import { mergeRecords } from '../sync/merge';
import { DEFAULT_SETTINGS, type DayEntry, type Settings, type SyncRecord } from '../domain/types';

export interface DataKeys {
  raw: Uint8Array;
  aes: CryptoKey;
  hmac: CryptoKey;
}

export async function keysFromRaw(raw: Uint8Array): Promise<DataKeys> {
  return {
    raw,
    aes: await hkdfAesKey(raw, 'peez-data-aes'),
    hmac: await hkdfHmacKey(raw, 'peez-data-id'),
  };
}

export interface WrappedKey extends Sealed {
  salt: Uint8Array;
  iterations: number;
}

export async function wrapWithPassphrase(raw: Uint8Array, passphrase: string, iterations = PBKDF2_ITERATIONS): Promise<WrappedKey> {
  const salt = randomBytes(16);
  const key = await deriveKeyFromPassphrase(passphrase, salt, iterations);
  return { salt, iterations, ...(await seal(key, raw)) };
}

/** Throws if the passphrase is wrong. */
export async function unwrapWithPassphrase(w: WrappedKey, passphrase: string): Promise<Uint8Array> {
  const key = await deriveKeyFromPassphrase(passphrase, w.salt, w.iterations);
  return unseal(key, w);
}

/**
 * The unlocked vault: holds decryption keys in memory only, and a decrypted
 * in-memory copy of all records (data is small: ~1 record/day).
 */
export class Vault {
  readonly records = new Map<string, SyncRecord>();
  private ids = new Map<string, string>();

  constructor(
    readonly keys: DataKeys,
    readonly deviceId: string,
  ) {}

  async load(): Promise<void> {
    this.records.clear();
    const rows = await db.records.toArray();
    for (const row of rows) {
      const rec = await unsealJson<SyncRecord>(this.keys.aes, row);
      this.records.set(rec.date, rec);
      this.ids.set(rec.date, row.id);
    }
  }

  private async idFor(date: string): Promise<string> {
    let id = this.ids.get(date);
    if (!id) {
      id = await hmac(this.keys.hmac, date);
      this.ids.set(date, id);
    }
    return id;
  }

  private async putMany(recs: SyncRecord[]): Promise<void> {
    const rows = await Promise.all(
      recs.map(async (r) => ({ id: await this.idFor(r.date), ...(await sealJson(this.keys.aes, r)) })),
    );
    await db.records.bulkPut(rows);
    for (const r of recs) this.records.set(r.date, r);
  }

  private nextTimestamp(date: string): number {
    const prev = this.records.get(date)?.updatedAt ?? 0;
    return Math.max(Date.now(), prev + 1);
  }

  entries(): DayEntry[] {
    const out: DayEntry[] = [];
    for (const r of this.records.values()) if (!r.deleted && r.entry) out.push(r.entry);
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  entry(date: string): DayEntry | undefined {
    const r = this.records.get(date);
    return r && !r.deleted ? r.entry : undefined;
  }

  async saveEntry(entry: DayEntry): Promise<void> {
    await this.putMany([
      { date: entry.date, updatedAt: this.nextTimestamp(entry.date), deviceId: this.deviceId, deleted: false, entry },
    ]);
  }

  /** Deletion is a tombstone so that it propagates through sync. */
  async deleteEntry(date: string): Promise<void> {
    if (!this.records.has(date)) return;
    await this.putMany([{ date, updatedAt: this.nextTimestamp(date), deviceId: this.deviceId, deleted: true }]);
  }

  allRecords(): SyncRecord[] {
    return [...this.records.values()];
  }

  /** Merge records from another device or a backup; returns number of changes applied. */
  async applyRemote(remote: SyncRecord[]): Promise<number> {
    const winners = mergeRecords(this.records, remote);
    if (winners.length) await this.putMany(winners);
    return winners.length;
  }

  /** Small encrypted key/value store for settings, pairing info, etc. */
  async getSecret<T>(key: string): Promise<T | undefined> {
    const sealed = await getMeta<Sealed>(`secret:${key}`);
    return sealed ? unsealJson<T>(this.keys.aes, sealed) : undefined;
  }

  async setSecret(key: string, value: unknown): Promise<void> {
    await setMeta(`secret:${key}`, await sealJson(this.keys.aes, value));
  }

  async getSettings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...(await this.getSecret<Partial<Settings>>('settings')) };
  }
}
