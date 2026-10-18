import { describe, expect, it } from 'vitest';
import { mergeRecords } from './merge';
import { deriveSyncParams, newPairing, pairingCode, parsePairingCode } from './pairing';
import type { SyncRecord } from '../domain/types';
import { emptyEntry } from '../domain/types';

const rec = (date: string, updatedAt: number, deviceId: string, deleted = false): SyncRecord => ({
  date,
  updatedAt,
  deviceId,
  deleted,
  entry: deleted ? undefined : { ...emptyEntry(date), note: `${deviceId}@${updatedAt}` },
});

function apply(local: Map<string, SyncRecord>, remote: SyncRecord[]) {
  for (const w of mergeRecords(local, remote)) local.set(w.date, w);
}

describe('mergeRecords', () => {
  it('takes the newest version and keeps unknown records', () => {
    const local = new Map([['2026-10-01', rec('2026-10-01', 10, 'A')]]);
    const winners = mergeRecords(local, [rec('2026-10-01', 20, 'B'), rec('2026-10-02', 5, 'B')]);
    expect(winners.map((w) => w.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(mergeRecords(local, [rec('2026-10-01', 5, 'B')])).toEqual([]);
  });

  it('propagates deletions via tombstones', () => {
    const local = new Map([['2026-10-01', rec('2026-10-01', 10, 'A')]]);
    apply(local, [rec('2026-10-01', 11, 'B', true)]);
    expect(local.get('2026-10-01')!.deleted).toBe(true);
  });

  it('converges: both devices end up identical after exchanging', () => {
    const a = new Map<string, SyncRecord>([
      ['d1', rec('d1', 1, 'A')],
      ['d2', rec('d2', 5, 'A')],
      ['d3', rec('d3', 7, 'A')],
    ]);
    const b = new Map<string, SyncRecord>([
      ['d2', rec('d2', 6, 'B')],
      ['d3', rec('d3', 7, 'B')], // exact tie broken by deviceId
      ['d4', rec('d4', 2, 'B', true)],
    ]);
    const aSnap = [...a.values()];
    const bSnap = [...b.values()];
    apply(a, bSnap);
    apply(b, aSnap);
    const norm = (m: Map<string, SyncRecord>) => JSON.stringify([...m.entries()].sort());
    expect(norm(a)).toBe(norm(b));
    expect(a.get('d3')!.deviceId).toBe('B');
    // idempotent
    expect(mergeRecords(a, [...b.values()])).toEqual([]);
  });

  it('ignores malformed records', () => {
    expect(mergeRecords(new Map(), [null as unknown as SyncRecord, { date: 1 } as unknown as SyncRecord])).toEqual([]);
  });
});

describe('pairing', () => {
  it('round-trips the pairing code and derives complementary peer IDs', async () => {
    const a = newPairing();
    const b = parsePairingCode(pairingCode(a))!;
    expect(b.role).toBe('b');
    expect(b.secret).toBe(a.secret);
    const pa = await deriveSyncParams(a);
    const pb = await deriveSyncParams(b);
    expect(pa.myId).toBe(pb.otherId);
    expect(pb.myId).toBe(pa.otherId);
    expect(pa.myId).not.toBe(pb.myId);
  });

  it('rejects invalid codes', () => {
    expect(parsePairingCode('hello')).toBeNull();
    expect(parsePairingCode('PEEZ1:abc')).toBeNull();
  });
});
