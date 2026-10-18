import { ab, randomBytes } from './crypto';

/**
 * Fingerprint / Windows Hello unlock using the WebAuthn PRF extension.
 * PRF gives us a secret that only the platform authenticator can reproduce
 * after user verification, which we use to wrap the data key.
 */

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

export async function biometricAvailable(): Promise<boolean> {
  try {
    return (
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export interface BiometricRegistration {
  credentialId: Uint8Array;
  prfSalt: Uint8Array;
  prfOutput: Uint8Array;
}

export async function registerBiometric(): Promise<BiometricRegistration> {
  const prfSalt = randomBytes(32);
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Peez', id: location.hostname },
      user: { id: randomBytes(16), name: 'Peez', displayName: 'Peez' },
      challenge: randomBytes(32),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Fingerprint setup was cancelled.');

  const ext = cred.getClientExtensionResults() as PrfResults;
  if (ext.prf?.enabled === false) {
    throw new Error('This device/browser does not support fingerprint unlock for web apps. Use your PIN instead.');
  }
  const credentialId = new Uint8Array(cred.rawId);
  const first = ext.prf?.results?.first;
  const prfOutput = first ? new Uint8Array(first) : await evaluateBiometric(credentialId, prfSalt);
  return { credentialId, prfSalt, prfOutput };
}

export async function evaluateBiometric(credentialId: Uint8Array, prfSalt: Uint8Array): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: ab(credentialId) }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: ab(prfSalt) } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Fingerprint unlock was cancelled.');
  const first = (assertion.getClientExtensionResults() as PrfResults).prf?.results?.first;
  if (!first) {
    throw new Error('This device/browser does not support fingerprint unlock for web apps. Use your PIN instead.');
  }
  return new Uint8Array(first);
}
