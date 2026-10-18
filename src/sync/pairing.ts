import { fromB64, hkdfAesKey, hkdfBytes, randomBytes, toB64 } from '../crypto/crypto';
import type { Vault } from '../db/vault';

export interface Pairing {
  /** 32-byte shared secret, base64url. */
  secret: string;
  /** 'a' = device that showed the QR code, 'b' = device that scanned it. */
  role: 'a' | 'b';
  pairedAt: number;
}

const PREFIX = 'PEEZ1:';
const PAIRING_KEY = 'pairing';

export function newPairing(): Pairing {
  return { secret: toB64(randomBytes(32)), role: 'a', pairedAt: Date.now() };
}

export function pairingCode(p: Pairing): string {
  return PREFIX + p.secret;
}

export function parsePairingCode(code: string): Pairing | null {
  const trimmed = code.trim();
  if (!trimmed.toUpperCase().startsWith(PREFIX)) return null;
  const secret = trimmed.slice(PREFIX.length);
  try {
    if (fromB64(secret).length !== 32) return null;
  } catch {
    return null;
  }
  return { secret, role: 'b', pairedAt: Date.now() };
}

export async function loadPairing(vault: Vault): Promise<Pairing | undefined> {
  return vault.getSecret<Pairing>(PAIRING_KEY);
}

export async function savePairing(vault: Vault, p: Pairing | null): Promise<void> {
  await vault.setSecret(PAIRING_KEY, p);
}

function hex(u: Uint8Array): string {
  return Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Everything both devices derive identically from the shared secret. */
export async function deriveSyncParams(p: Pairing) {
  const secret = fromB64(p.secret);
  const key = await hkdfAesKey(secret, 'peez-sync-aes');
  const idBase = hex(await hkdfBytes(secret, 'peez-sync-peer-id', 16));
  const idA = `peez-${idBase}-a`;
  const idB = `peez-${idBase}-b`;
  return {
    key,
    myId: p.role === 'a' ? idA : idB,
    otherId: p.role === 'a' ? idB : idA,
  };
}
