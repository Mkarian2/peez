import { useEffect, useState } from 'react';
import { biometricAvailable } from '../crypto/webauthn';
import {
  changePin,
  disableBiometric,
  enableBiometric,
  hasBiometric,
  regenerateRecoveryCode,
  wipeEverything,
} from '../db/auth';
import type { Settings as SettingsT } from '../domain/types';
import { exportBackup, exportCsv, exportPdf, importBackup } from '../export/export';
import { useI18n } from '../i18n';
import { LangToggle, MIN_PIN, Modal, PinInput } from './common';
import { useApp } from './context';
import { SyncPanel } from './SyncPanel';

export function Settings() {
  const { vault, settings, updateSettings, refresh, toast, lock } = useApp();
  const { lang, t } = useI18n();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [modal, setModal] = useState<null | 'pin' | 'recovery' | 'backup' | 'restore' | 'wipe'>(null);

  useEffect(() => {
    biometricAvailable().then(setBioAvailable);
    hasBiometric().then(setBioOn);
  }, []);

  async function toggleBio() {
    try {
      if (bioOn) {
        await disableBiometric();
        setBioOn(false);
      } else {
        await enableBiometric(vault);
        setBioOn(true);
        toast(t.settings.fingerprintEnabledToast);
      }
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const setNum = (key: keyof SettingsT, v: number) => updateSettings({ ...settings, [key]: v });

  return (
    <>
      <div className="card">
        <div className="list-item" style={{ borderBottom: 'none', padding: 0 }}>
          <h2 style={{ margin: 0 }}>{t.settings.languageSection}</h2>
          <LangToggle />
        </div>
      </div>

      <div className="card">
        <h2>{t.settings.syncSection}</h2>
        <SyncPanel />
      </div>

      <div className="card">
        <h2>{t.settings.securitySection}</h2>
        <div className="list">
          <button className="list-item" onClick={() => setModal('pin')}>
            {t.settings.changePin} <span>›</span>
          </button>
          {bioAvailable && (
            <label className="list-item">
              {t.settings.fingerprint}
              <input type="checkbox" className="switch" checked={bioOn} onChange={toggleBio} />
            </label>
          )}
          <button className="list-item" onClick={() => setModal('recovery')}>
            {t.settings.newRecoveryCode} <span>›</span>
          </button>
          <label className="list-item">
            {t.settings.autoLock}
            <select
              value={settings.lockAfterSeconds}
              onChange={(e) => setNum('lockAfterSeconds', Number(e.target.value))}
            >
              <option value={0}>{t.settings.lockImmediately}</option>
              <option value={60}>{t.settings.lock1m}</option>
              <option value={300}>{t.settings.lock5m}</option>
              <option value={900}>{t.settings.lock15m}</option>
            </select>
          </label>
          <button className="list-item" onClick={lock}>
            {t.settings.lockNow} <span>🔒</span>
          </button>
        </div>
      </div>

      <div className="card">
        <h2>{t.settings.defaultsSection}</h2>
        <p className="muted small">{t.settings.defaultsSub}</p>
        <div className="list">
          <label className="list-item">
            {t.settings.cycleLengthDays}
            <input
              type="number"
              min={15}
              max={60}
              value={settings.defaultCycleLength}
              onChange={(e) => setNum('defaultCycleLength', Math.min(60, Math.max(15, Number(e.target.value) || 28)))}
            />
          </label>
          <label className="list-item">
            {t.settings.periodLengthDays}
            <input
              type="number"
              min={1}
              max={14}
              value={settings.defaultPeriodLength}
              onChange={(e) => setNum('defaultPeriodLength', Math.min(14, Math.max(1, Number(e.target.value) || 5)))}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>{t.settings.dataSection}</h2>
        <div className="list">
          <button className="list-item" onClick={() => exportPdf(vault.entries(), settings, lang)}>
            {t.settings.exportPdf} <span>📄</span>
          </button>
          <button className="list-item" onClick={() => exportCsv(vault.entries())}>
            {t.settings.exportCsv} <span>📊</span>
          </button>
          <button className="list-item" onClick={() => setModal('backup')}>
            {t.settings.createBackup} <span>💾</span>
          </button>
          <button className="list-item" onClick={() => setModal('restore')}>
            {t.settings.restoreBackup} <span>📥</span>
          </button>
          <button className="list-item danger" onClick={() => setModal('wipe')}>
            {t.settings.deleteAllData} <span>🗑️</span>
          </button>
        </div>
      </div>

      <div className="card">
        <h2>{t.settings.aboutSection}</h2>
        <p className="muted small">{t.settings.aboutText}</p>
      </div>

      <ChangePinModal open={modal === 'pin'} onClose={() => setModal(null)} />
      <RecoveryModal open={modal === 'recovery'} onClose={() => setModal(null)} />
      <BackupModal open={modal === 'backup'} onClose={() => setModal(null)} />
      <RestoreModal open={modal === 'restore'} onClose={() => setModal(null)} onDone={refresh} />
      <WipeModal open={modal === 'wipe'} onClose={() => setModal(null)} />
    </>
  );
}

function ChangePinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault, toast } = useApp();
  const { t } = useI18n();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={t.settings.changePin}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (a.length < MIN_PIN) return setErr(t.setup.pinTooShort(MIN_PIN));
          if (a !== b) return setErr(t.setup.pinMismatch);
          setBusy(true);
          await changePin(vault, a);
          setBusy(false);
          setA('');
          setB('');
          setErr('');
          toast(t.settings.pinChangedToast);
          onClose();
        }}
      >
        <PinInput value={a} onChange={setA} placeholder={t.settings.newPinPlaceholder} />
        <PinInput value={b} onChange={setB} placeholder={t.settings.repeatNewPinPlaceholder} />
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? t.saving : t.save}
        </button>
      </form>
    </Modal>
  );
}

function RecoveryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault } = useApp();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  return (
    <Modal
      open={open}
      onClose={() => {
        setCode('');
        onClose();
      }}
      title={t.settings.recoveryModalTitle}
    >
      {code ? (
        <div className="stack">
          <p>{t.settings.newRecoveryInfo}</p>
          <div className="code-box">{code}</div>
          <button className="btn ghost block" onClick={() => navigator.clipboard?.writeText(code)}>
            {t.copy}
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">{t.settings.generateRecoveryWarn}</p>
          <button className="btn primary block" onClick={async () => setCode(await regenerateRecoveryCode(vault))}>
            {t.settings.generateRecoveryBtn}
          </button>
        </div>
      )}
    </Modal>
  );
}

function BackupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault, toast } = useApp();
  const { t } = useI18n();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={t.settings.backupModalTitle}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await exportBackup(vault, pw);
          setBusy(false);
          setPw('');
          toast(t.settings.backupDownloadedToast);
          onClose();
        }}
      >
        <p className="muted small">{t.settings.backupModalInfo}</p>
        <input
          className="text-input"
          type="password"
          placeholder={t.settings.backupPwPlaceholder}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button className="btn primary block" disabled={busy || pw.length < 4}>
          {busy ? t.settings.encrypting : t.settings.downloadBackup}
        </button>
      </form>
    </Modal>
  );
}

function RestoreModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { vault, toast } = useApp();
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={t.settings.restoreModalTitle}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          setBusy(true);
          setErr('');
          try {
            const n = await importBackup(vault, file, pw);
            onDone();
            toast(t.settings.backupMergedToast(n));
            setPw('');
            setFile(null);
            onClose();
          } catch (ex) {
            setErr((ex as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted small">{t.settings.restoreModalInfo}</p>
        <input
          type="file"
          accept=".peez,application/octet-stream,application/json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <input
          className="text-input"
          type="password"
          placeholder={t.settings.backupPwPlaceholder}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy || !file || !pw}>
          {busy ? t.settings.restoring : t.settings.restoreBtn}
        </button>
      </form>
    </Modal>
  );
}

function WipeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={t.settings.wipeModalTitle}>
      <div className="stack">
        <p>
          {t.settings.wipeModalInfo1} <strong>{t.settings.wipeModalBold}</strong>
          {t.settings.wipeModalInfo2}
        </p>
        <input
          className="text-input"
          placeholder={t.settings.wipeConfirmPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="btn danger block"
          disabled={text !== 'DELETE'}
          onClick={async () => {
            await wipeEverything();
            location.reload();
          }}
        >
          {t.settings.deleteEverything}
        </button>
      </div>
    </Modal>
  );
}
