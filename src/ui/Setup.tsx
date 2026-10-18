import { useEffect, useState } from 'react';
import { biometricAvailable } from '../crypto/webauthn';
import { enableBiometric, setup } from '../db/auth';
import type { Vault } from '../db/vault';
import { useI18n } from '../i18n';
import { LangToggle, MIN_PIN, PinInput } from './common';

type Step = 'welcome' | 'pin' | 'recovery' | 'bio';

export function Setup({ onDone }: { onDone: (v: Vault) => void }) {
  const { t } = useI18n();
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
    if (pin.length < MIN_PIN) return setError(t.setup.pinTooShort(MIN_PIN));
    if (pin !== pin2) return setError(t.setup.pinMismatch);
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
        <LangToggle />
        <div className="logo">💧</div>
        {step === 'welcome' && (
          <>
            <h1>{t.setup.welcomeTitle}</h1>
            <p>{t.setup.welcomeBody}</p>
            <div className="notice">
              {t.setup.disclaimer1} <strong>{t.setup.disclaimerBold}</strong> {t.setup.disclaimer2}
            </div>
            <button className="btn primary block" onClick={() => setStep('pin')}>
              {t.setup.getStarted}
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <h1>{t.setup.choosePinTitle}</h1>
            <p className="muted">{t.setup.choosePinSub}</p>
            <PinInput value={pin} onChange={setPin} autoFocus />
            <PinInput value={pin2} onChange={setPin2} placeholder={t.setup.repeatPin} />
            {error && <p className="error">{error}</p>}
            <button className="btn primary block" disabled={busy} onClick={createPin}>
              {busy ? t.setup.settingUp : t.continueBtn}
            </button>
          </>
        )}

        {step === 'recovery' && (
          <>
            <h1>{t.setup.recoveryTitle}</h1>
            <p>
              {t.setup.recoveryBody1} <strong>{t.setup.recoveryOnly}</strong> {t.setup.recoveryBody2}
            </p>
            <div className="code-box">{recovery}</div>
            <button className="btn ghost block" onClick={() => navigator.clipboard?.writeText(recovery)}>
              {t.copy}
            </button>
            <label className="check">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />{' '}
              {t.setup.recoverySavedCheck}
            </label>
            <button
              className="btn primary block"
              disabled={!saved}
              onClick={() => (bioOk ? setStep('bio') : onDone(vault!))}
            >
              {t.continueBtn}
            </button>
          </>
        )}

        {step === 'bio' && (
          <>
            <h1>{t.setup.bioTitle}</h1>
            <p className="muted">{t.setup.bioSub}</p>
            {error && <p className="error">{error}</p>}
            <button className="btn primary block" disabled={busy} onClick={addBio}>
              {busy ? t.setup.waiting : t.setup.enableBio}
            </button>
            <button className="btn ghost block" onClick={() => onDone(vault!)}>
              {t.setup.notNow}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
