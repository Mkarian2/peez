import { hkdfAesKey, randomBytes, seal, toB64, unseal, type Sealed } from '../crypto/crypto';
import { evaluateBiometric, registerBiometric } from '../crypto/webauthn';
import { db, delMeta, getMeta, setMeta } from './db';
import { keysFromRaw, unwrapWithPassphrase, Vault, wrapWithPassphrase, type WrappedKey } from './vault';

/**
 * Key management. A random 256-bit data key encrypts everything; it is stored
 * only in wrapped (encrypted) form: once with the PIN, once with a recovery
 * code, and optionally once with a fingerprint/Windows Hello secret.
 */

const PIN_WRAP = 'pinWrap';
const RECOVERY_WRAP = 'recoveryWrap';
const BIO_WRAP = 'bioWrap';
const DEVICE_ID = 'deviceId';

interface BioWrap extends Sealed {
  credentialId: Uint8Array;
  prfSalt: Uint8Array;
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newRecoveryCode(): string {
  const bytes = randomBytes(20);
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}

function normaliseRecovery(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function getDeviceId(): Promise<string> {
  let id = await getMeta<string>(DEVICE_ID);
  if (!id) {
    id = toB64(randomBytes(12));
    await setMeta(DEVICE_ID, id);
  }
  return id;
}

async function openVault(raw: Uint8Array): Promise<Vault> {
  const vault = new Vault(await keysFromRaw(raw), await getDeviceId());
  await vault.load();
  return vault;
}

export async function isSetUp(): Promise<boolean> {
  return !!(await getMeta(PIN_WRAP));
}

export async function setup(pin: string): Promise<{ vault: Vault; recoveryCode: string }> {
  const raw = randomBytes(32);
  const recoveryCode = newRecoveryCode();
  await setMeta(PIN_WRAP, await wrapWithPassphrase(raw, pin));
  await setMeta(RECOVERY_WRAP, await wrapWithPassphrase(raw, normaliseRecovery(recoveryCode)));
  // Ask the browser not to evict our data under storage pressure.
  await navigator.storage?.persist?.().catch(() => false);
  return { vault: await openVault(raw), recoveryCode };
}

export async function unlockWithPin(pin: string): Promise<Vault> {
  const w = await getMeta<WrappedKey>(PIN_WRAP);
  if (!w) throw new Error('Not set up');
  let raw: Uint8Array;
  try {
    raw = await unwrapWithPassphrase(w, pin);
  } catch {
    throw new Error('Wrong PIN');
  }
  return openVault(raw);
}

export async function unlockWithRecovery(code: string, newPin: string): Promise<Vault> {
  const w = await getMeta<WrappedKey>(RECOVERY_WRAP);
  if (!w) throw new Error('No recovery code was set up');
  let raw: Uint8Array;
  try {
    raw = await unwrapWithPassphrase(w, normaliseRecovery(code));
  } catch {
    throw new Error('Wrong recovery code');
  }
  await setMeta(PIN_WRAP, await wrapWithPassphrase(raw, newPin));
  return openVault(raw);
}

export async function changePin(vault: Vault, newPin: string): Promise<void> {
  await setMeta(PIN_WRAP, await wrapWithPassphrase(vault.keys.raw, newPin));
}

export async function regenerateRecoveryCode(vault: Vault): Promise<string> {
  const code = newRecoveryCode();
  await setMeta(RECOVERY_WRAP, await wrapWithPassphrase(vault.keys.raw, normaliseRecovery(code)));
  return code;
}

export async function hasBiometric(): Promise<boolean> {
  return !!(await getMeta(BIO_WRAP));
}

export async function enableBiometric(vault: Vault): Promise<void> {
  const reg = await registerBiometric();
  const key = await hkdfAesKey(reg.prfOutput, 'peez-bio-wrap');
  const wrap: BioWrap = { credentialId: reg.credentialId, prfSalt: reg.prfSalt, ...(await seal(key, vault.keys.raw)) };
  await setMeta(BIO_WRAP, wrap);
}

export async function disableBiometric(): Promise<void> {
  await delMeta(BIO_WRAP);
}

export async function unlockWithBiometric(): Promise<Vault> {
  const w = await getMeta<BioWrap>(BIO_WRAP);
  if (!w) throw new Error('Fingerprint unlock is not enabled');
  const out = await evaluateBiometric(w.credentialId, w.prfSalt);
  const key = await hkdfAesKey(out, 'peez-bio-wrap');
  return openVault(await unseal(key, w));
}

/** Irreversibly delete all local data. */
export async function wipeEverything(): Promise<void> {
  await db.delete();
}
