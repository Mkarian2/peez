import { useEffect, useState } from 'react';
import { biometricAvailable } from '../crypto/webauthn';
import { enableBiometric, setup } from '../db/auth';
import type { Vault } from '../db/vault';
import { MIN_PIN, PinInput } from './common';

type Step = 'welcome' | 'pin' | 'recovery' | 'bio';

export function Setup({ onDone }: { onDone: (v: Vault) => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [vault, setVault] = useState<Vault | null>(null);
  const [recovery, setRecovery] = useState('');
  const [saved, setSaved] = useState(false);
  const [bioOk, setBioOk] = useState(false);

  useEffect(() => {
    biometricAvailable().then(setBioOk);
  }, []);

  async function createPin() {
    setError('');
    if (pin.length < MIN_PIN) return setError(`Use at least ${MIN_PIN} digits (6+ recommended).`);
    if (pin !== pin2) return setError('The two PINs do not match.');
    setBusy(true);
    try {
      const r = await setup(pin);
      setVault(r.vault);
      setRecovery(r.recoveryCode);
      setStep('recovery');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addBio() {
    setError('');
    setBusy(true);
    try {
      await enableBiometric(vault!);
      onDone(vault!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card setup">
        <div className="logo">💧</div>
        {step === 'welcome' && (
          <>
            <h1>Welcome to Peez</h1>
            <p>A private period tracker. Everything you log stays encrypted on your own devices — no account, no cloud.</p>
            <div className="notice">
              Predictions are estimates based on your history. <strong>Peez must not be used as contraception</strong>{' '}
              and is not a medical device.
            </div>
            <button className="btn primary block" onClick={() => setStep('pin')}>
              Get started
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <h1>Choose a PIN</h1>
            <p className="muted">Your PIN encrypts your data. 6 or more digits is recommended.</p>
            <PinInput value={pin} onChange={setPin} autoFocus />
            <PinInput value={pin2} onChange={setPin2} placeholder="Repeat PIN" />
            {error && <p className="error">{error}</p>}
            <button className="btn primary block" disabled={busy} onClick={createPin}>
              {busy ? 'Setting up…' : 'Continue'}
            </button>
          </>
        )}

        {step === 'recovery' && (
          <>
            <h1>Your recovery code</h1>
            <p>
              If you ever forget your PIN, this code is the <strong>only</strong> way to get your data back. Write it down
              or save it in a password manager.
            </p>
            <div className="code-box">{recovery}</div>
            <button className="btn ghost block" onClick={() => navigator.clipboard?.writeText(recovery)}>
              Copy
            </button>
            <label className="check">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I saved my recovery
              code
            </label>
            <button
              className="btn primary block"
              disabled={!saved}
              onClick={() => (bioOk ? setStep('bio') : onDone(vault!))}
            >
              Continue
            </button>
          </>
        )}

        {step === 'bio' && (
          <>
            <h1>Unlock with fingerprint?</h1>
            <p className="muted">You can always use your PIN as well. You can change this later in Settings.</p>
            {error && <p className="error">{error}</p>}
            <button className="btn primary block" disabled={busy} onClick={addBio}>
              {busy ? 'Waiting…' : 'Enable fingerprint / Windows Hello'}
            </button>
            <button className="btn ghost block" onClick={() => onDone(vault!)}>
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
