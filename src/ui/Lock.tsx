import { useEffect, useState } from 'react';
import { hasBiometric, unlockWithBiometric, unlockWithPin, unlockWithRecovery } from '../db/auth';
import type { Vault } from '../db/vault';
import { MIN_PIN, PinInput } from './common';

export function Lock({ onUnlock }: { onUnlock: (v: Vault) => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bio, setBio] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    hasBiometric().then(setBio);
  }, []);

  async function attempt(fn: () => Promise<Vault>) {
    setError('');
    setBusy(true);
    try {
      onUnlock(await fn());
    } catch (e) {
      setError((e as Error).message);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  if (recoveryMode) {
    return (
      <div className="center-screen">
        <form
          className="card setup"
          onSubmit={(e) => {
            e.preventDefault();
            if (newPin.length < MIN_PIN) return setError(`New PIN must have at least ${MIN_PIN} digits.`);
            attempt(() => unlockWithRecovery(code, newPin));
          }}
        >
          <h1>Reset PIN</h1>
          <p className="muted">Enter the recovery code you saved when setting up Peez, then choose a new PIN.</p>
          <input
            className="text-input"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <PinInput value={newPin} onChange={setNewPin} placeholder="New PIN" />
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Checking…' : 'Reset PIN & unlock'}
          </button>
          <button type="button" className="btn ghost block" onClick={() => setRecoveryMode(false)}>
            Back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <form
        className="card setup"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin) attempt(() => unlockWithPin(pin));
        }}
      >
        <div className="logo">💧</div>
        <h1>Peez is locked</h1>
        <PinInput value={pin} onChange={setPin} autoFocus />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy || !pin}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
        {bio && (
          <button type="button" className="btn ghost block" disabled={busy} onClick={() => attempt(unlockWithBiometric)}>
            👆 Use fingerprint / Windows Hello
          </button>
        )}
        <button type="button" className="link-btn" onClick={() => setRecoveryMode(true)}>
          Forgot PIN?
        </button>
      </form>
    </div>
  );
}
