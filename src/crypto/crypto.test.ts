import { describe, expect, it } from 'vitest';
import { fromB64, hkdfAesKey, randomBytes, sealJson, toB64, unsealJson } from './crypto';
import { unwrapWithPassphrase, wrapWithPassphrase } from '../db/vault';

describe('crypto', () => {
  it('base64url round-trips', () => {
    const b = randomBytes(33);
    expect([...fromB64(toB64(b))]).toEqual([...b]);
    expect(toB64(b)).not.toMatch(/[+/=]/);
  });

  it('seals and unseals JSON, and rejects the wrong key', async () => {
    const k1 = await hkdfAesKey(randomBytes(32), 'x');
    const k2 = await hkdfAesKey(randomBytes(32), 'x');
    const s = await sealJson(k1, { hello: 'world' });
    expect(await unsealJson(k1, s)).toEqual({ hello: 'world' });
    await expect(unsealJson(k2, s)).rejects.toThrow();
  });

  it('wraps the data key with a passphrase', async () => {
    const raw = randomBytes(32);
    const w = await wrapWithPassphrase(raw, '123456', 1000);
    expect([...(await unwrapWithPassphrase(w, '123456'))]).toEqual([...raw]);
    await expect(unwrapWithPassphrase(w, '654321')).rejects.toThrow();
  });
});
