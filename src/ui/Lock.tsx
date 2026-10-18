import { useEffect, useState } from 'react';
import { hasBiometric, unlockWithBiometric, unlockWithPin, unlockWithRecovery } from '../db/auth';
import type { Vault } from '../db/vault';
import { useI18n } from '../i18n';
import { LangToggle, MIN_PIN, PinInput } from './common';

export function Lock({ onUnlock }: { onUnlock: (v: Vault) => void }) {
  const { t } = useI18n();
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
            if (newPin.length < MIN_PIN) return setError(t.lockScreen.newPinShort(MIN_PIN));
            attempt(() => unlockWithRecovery(code, newPin));
          }}
        >
          <h1>{t.lockScreen.resetTitle}</h1>
          <p className="muted">{t.lockScreen.resetSub}</p>
          <input
            className="text-input"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <PinInput value={newPin} onChange={setNewPin} placeholder={t.lockScreen.newPinPlaceholder} />
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? t.lockScreen.checking : t.lockScreen.resetAndUnlock}
          </button>
          <button type="button" className="btn ghost block" onClick={() => setRecoveryMode(false)}>
            {t.back}
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
        <LangToggle />
        <div className="logo">💧</div>
        <h1>{t.lockScreen.lockedTitle}</h1>
        <PinInput value={pin} onChange={setPin} autoFocus />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy || !pin}>
          {busy ? t.lockScreen.unlocking : t.lockScreen.unlock}
        </button>
        {bio && (
          <button type="button" className="btn ghost block" disabled={busy} onClick={() => attempt(unlockWithBiometric)}>
            {t.lockScreen.useBio}
          </button>
        )}
        <button type="button" className="link-btn" onClick={() => setRecoveryMode(true)}>
          {t.lockScreen.forgotPin}
        </button>
      </form>
    </div>
  );
}
