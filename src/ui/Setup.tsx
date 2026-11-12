import { useEffect, useState } from 'react';
import { biometricAvailable } from '../crypto/webauthn';
import { enableBiometric, setup } from '../db/auth';
import type { Vault } from '../db/vault';
import { exportBackup, inspectBackupFile, restoreBackupOnSetup } from '../export/export';
import { useI18n } from '../i18n';
import { APP_VERSION_LABEL } from '../version';
import { EnvWarningBanner, LangToggle, MIN_PIN, PinInput } from './common';

type Step = 'welcome' | 'pin' | 'recovery' | 'bio' | 'restore';

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

  // Restore step state
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupVersion, setBackupVersion] = useState<1 | 2 | null>(null);
  const [restoreSecret, setRestoreSecret] = useState('');
  const [restoreNewPin, setRestoreNewPin] = useState('');

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

  async function onPickBackupFile(f: File | null) {
    setBackupFile(f);
    setBackupVersion(null);
    setError('');
    if (!f) return;
    try {
      const info = await inspectBackupFile(f);
      setBackupVersion(info.version);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleRestore() {
    if (!backupFile || !restoreSecret.trim()) return;
    setError('');
    if (backupVersion === 1 && restoreNewPin.length < MIN_PIN) {
      return setError(t.setup.pinTooShort(MIN_PIN));
    }
    setBusy(true);
    try {
      const r = await restoreBackupOnSetup(
        backupFile,
        restoreSecret,
        restoreNewPin.length >= MIN_PIN ? restoreNewPin : undefined,
      );
      if (r.recoveryCode) {
        setVault(r.vault);
        setRecovery(r.recoveryCode);
        setStep('recovery');
      } else {
        onDone(r.vault);
      }
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
        <EnvWarningBanner />
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
            <button
              type="button"
              className="btn ghost block"
              onClick={() => {
                setError('');
                setStep('restore');
              }}
            >
              {t.setup.restoreExistingBtn}
            </button>
          </>
        )}

        {step === 'restore' && (
          <>
            <h1>{t.setup.restoreTitle}</h1>
            <p className="muted small">{t.setup.restoreBody}</p>
            <input
              type="file"
              accept=".peez,application/octet-stream,application/json"
              onChange={(e) => onPickBackupFile(e.target.files?.[0] ?? null)}
            />
            <input
              className="text-input"
              type="password"
              placeholder={t.setup.restoreSecretPlaceholder}
              value={restoreSecret}
              onChange={(e) => setRestoreSecret(e.target.value)}
              autoComplete="off"
            />
            {backupVersion === 1 && (
              <>
                <p className="muted small">{t.setup.restoreV1PinHint}</p>
                <PinInput value={restoreNewPin} onChange={setRestoreNewPin} placeholder={t.lockScreen.newPinPlaceholder} />
              </>
            )}
            {error && <p className="error">{error}</p>}
            <button
              className="btn primary block"
              disabled={busy || !backupFile || !restoreSecret.trim()}
              onClick={handleRestore}
            >
              {busy ? t.settings.restoring : t.settings.restoreBtn}
            </button>
            <button type="button" className="btn ghost block" onClick={() => setStep('welcome')}>
              {t.back}
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
            <button type="button" className="btn ghost block" onClick={() => setStep('welcome')}>
              {t.back}
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
            {vault && (
              <button
                type="button"
                className="btn ghost block"
                onClick={async () => {
                  await exportBackup(vault);
                  setSaved(true);
                }}
              >
                {t.setup.saveInitialBackupBtn}
              </button>
            )}
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
        <div className="muted small" style={{ marginTop: 4, fontSize: '0.75rem' }}>
          {APP_VERSION_LABEL}
        </div>
      </div>
    </div>
  );
}
