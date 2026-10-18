import type { SyncRecord } from '../domain/types';

/** Last-write-wins ordering; deviceId breaks exact ties deterministically. */
export function isNewer(a: SyncRecord, b: SyncRecord): boolean {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt;
  return a.deviceId > b.deviceId;
}

/**
 * Merge remote records into local state. Returns the remote records that
 * win and must be written locally. Idempotent and commutative, so both
 * devices converge to the same state after exchanging their records.
 */
export function mergeRecords(local: Map<string, SyncRecord>, remote: SyncRecord[]): SyncRecord[] {
  const winners: SyncRecord[] = [];
  for (const r of remote) {
    if (!r || typeof r.date !== 'string' || typeof r.updatedAt !== 'number') continue;
    const mine = local.get(r.date);
    if (!mine || isNewer(r, mine)) winners.push(r);
  }
  return winners;
}
