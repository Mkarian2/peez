import { describe, expect, it } from 'vitest';
import { randomBytes } from '../crypto/crypto';
import { emptyEntry } from '../domain/types';
import { buildBackupObject, importBackup, restoreBackupOnSetup } from '../export/export';
import { isSetUp, setup, unlockWithPin, wipeEverything } from './auth';
import { db, deserializeSnapshot, resetHydrationState, serializeSnapshot, wasRecoveredFromMirror, type StorageSnapshot } from './db';
import { keysFromRaw, Vault } from './vault';

describe('storage snapshot serialization & backup recovery', () => {
  it('losslessly serializes and deserializes snapshots with nested Uint8Arrays', () => {
    const iv = randomBytes(12);
    const ct = randomBytes(48);
    const salt = randomBytes(16);
    const snap: StorageSnapshot = {
      v: 1,
      updatedAt: 1700000000000,
      meta: [
        { key: 'deviceId', value: 'dev-123' },
        { key: 'pinWrap', value: { salt, iterations: 1000, iv, ct } },
      ],
      records: [{ id: 'rec-1', iv, ct }],
    };

    const json = serializeSnapshot(snap);
    const restored = deserializeSnapshot(json);
    expect(restored).not.toBeNull();
    expect(restored!.updatedAt).toBe(1700000000000);
    expect(restored!.meta[0].value).toBe('dev-123');

    const pinWrap = restored!.meta[1].value as { salt: Uint8Array; iterations: number; iv: Uint8Array; ct: Uint8Array };
    expect(pinWrap.salt).toBeInstanceOf(Uint8Array);
    expect([...pinWrap.salt]).toEqual([...salt]);
    expect([...restored!.records[0].iv]).toEqual([...iv]);
    expect([...restored!.records[0].ct]).toEqual([...ct]);
  });

  it('creates a v2 backup and restores it on setup using PIN or recovery code', async () => {
    await wipeEverything();
    const { vault, recoveryCode } = await setup('123456');
    await vault.saveEntry({ ...emptyEntry('2026-03-01'), period: true, flow: 'medium', note: 'day 1' });
    await vault.saveEntry({ ...emptyEntry('2026-03-02'), period: true, flow: 'heavy', note: 'day 2' });

    const backupObj = await buildBackupObject(vault);
    expect(backupObj.v).toBe(2);

    const file = new File([JSON.stringify(backupObj)], 'peez-backup.peez', { type: 'application/json' });

    // Simulate browser wiping all local storage
    await wipeEverything();

    // 1. Restore on Welcome screen using PIN
    const restoredByPin = await restoreBackupOnSetup(file, '123456');
    expect(restoredByPin.applied).toBe(2);
    expect(restoredByPin.vault.entries().map((e) => e.date)).toEqual(['2026-03-01', '2026-03-02']);
    expect(restoredByPin.vault.entry('2026-03-01')?.note).toBe('day 1');

    // 2. Wipe again and restore using the Recovery Code
    await wipeEverything();
    const restoredByRec = await restoreBackupOnSetup(file, recoveryCode, '654321');
    expect(restoredByRec.applied).toBe(2);
    expect(restoredByRec.vault.entries().length).toBe(2);

    // 3. Same-vault importBackup works without requiring any password
    const secondVault = new Vault(await keysFromRaw(restoredByRec.vault.keys.raw), 'dev-2');
    await secondVault.load();
    const mergedCount = await importBackup(secondVault, file, '');
    expect(mergedCount).toBe(0); // already has the same records
  });

  it('auto-heals from localStorage mirror if IndexedDB is lost or reset', async () => {
    const store = new Map<string, string>();
    const mockLs = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mockLs, configurable: true });

    await wipeEverything();
    const { vault } = await setup('998877');
    await vault.saveEntry({ ...emptyEntry('2026-04-10'), period: true, flow: 'light', note: 'mirrored' });

    expect(store.has('peez-vault-snapshot')).toBe(true);

    // Simulate IndexedDB being wiped/corrupted while localStorage mirror survives
    try {
      await db.delete();
    } catch {
      // ignore in node environment without indexedDB
    }
    resetHydrationState();

    // Next page load: isSetUp() should self-heal from the localStorage mirror!
    expect(await isSetUp()).toBe(true);
    expect(wasRecoveredFromMirror()).toBe(true);

    const recoveredVault = await unlockWithPin('998877');
    expect(recoveredVault.entry('2026-04-10')?.note).toBe('mirrored');
  });
});
