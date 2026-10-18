import { useEffect, useState } from 'react';
import { biometricAvailable } from '../crypto/webauthn';
import { changePin, disableBiometric, enableBiometric, hasBiometric, regenerateRecoveryCode, wipeEverything } from '../db/auth';
import type { Settings as SettingsT } from '../domain/types';
import { exportBackup, exportCsv, exportPdf, importBackup } from '../export/export';
import { MIN_PIN, Modal, PinInput } from './common';
import { useApp } from './context';
import { SyncPanel } from './SyncPanel';

export function Settings() {
  const { vault, settings, updateSettings, refresh, toast, lock } = useApp();
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
        toast('Fingerprint unlock enabled');
      }
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const setNum = (key: keyof SettingsT, v: number) => updateSettings({ ...settings, [key]: v });

  return (
    <>
      <div className="card">
        <h2>Sync between devices</h2>
        <SyncPanel />
      </div>

      <div className="card">
        <h2>Security</h2>
        <div className="list">
          <button className="list-item" onClick={() => setModal('pin')}>
            Change PIN <span>›</span>
          </button>
          {bioAvailable && (
            <label className="list-item">
              Fingerprint / Windows Hello
              <input type="checkbox" className="switch" checked={bioOn} onChange={toggleBio} />
            </label>
          )}
          <button className="list-item" onClick={() => setModal('recovery')}>
            New recovery code <span>›</span>
          </button>
          <label className="list-item">
            Auto-lock
            <select
              value={settings.lockAfterSeconds}
              onChange={(e) => setNum('lockAfterSeconds', Number(e.target.value))}
            >
              <option value={0}>Immediately</option>
              <option value={60}>After 1 minute</option>
              <option value={300}>After 5 minutes</option>
              <option value={900}>After 15 minutes</option>
            </select>
          </label>
          <button className="list-item" onClick={lock}>
            Lock now <span>🔒</span>
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Cycle defaults</h2>
        <p className="muted small">Used until enough cycles are logged to compute your own averages.</p>
        <div className="list">
          <label className="list-item">
            Cycle length (days)
            <input
              type="number"
              min={15}
              max={60}
              value={settings.defaultCycleLength}
              onChange={(e) => setNum('defaultCycleLength', Math.min(60, Math.max(15, Number(e.target.value) || 28)))}
            />
          </label>
          <label className="list-item">
            Period length (days)
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
        <h2>Your data</h2>
        <div className="list">
          <button className="list-item" onClick={() => exportPdf(vault.entries(), settings)}>
            Export PDF summary (for a doctor) <span>📄</span>
          </button>
          <button className="list-item" onClick={() => exportCsv(vault.entries())}>
            Export CSV spreadsheet <span>📊</span>
          </button>
          <button className="list-item" onClick={() => setModal('backup')}>
            Create encrypted backup <span>💾</span>
          </button>
          <button className="list-item" onClick={() => setModal('restore')}>
            Restore / merge a backup <span>📥</span>
          </button>
          <button className="list-item danger" onClick={() => setModal('wipe')}>
            Delete all data on this device <span>🗑️</span>
          </button>
        </div>
      </div>

      <div className="card">
        <h2>About</h2>
        <p className="muted small">
          Peez stores everything encrypted on this device only. Predictions are estimates and must not be used as
          contraception or medical advice.
        </p>
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
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Change PIN">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (a.length < MIN_PIN) return setErr(`Use at least ${MIN_PIN} digits.`);
          if (a !== b) return setErr('PINs do not match.');
          setBusy(true);
          await changePin(vault, a);
          setBusy(false);
          setA('');
          setB('');
          setErr('');
          toast('PIN changed');
          onClose();
        }}
      >
        <PinInput value={a} onChange={setA} placeholder="New PIN" />
        <PinInput value={b} onChange={setB} placeholder="Repeat new PIN" />
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}

function RecoveryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault } = useApp();
  const [code, setCode] = useState('');
  return (
    <Modal
      open={open}
      onClose={() => {
        setCode('');
        onClose();
      }}
      title="Recovery code"
    >
      {code ? (
        <div className="stack">
          <p>Your new recovery code (the old one no longer works):</p>
          <div className="code-box">{code}</div>
          <button className="btn ghost block" onClick={() => navigator.clipboard?.writeText(code)}>
            Copy
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">This creates a new recovery code and invalidates the previous one.</p>
          <button className="btn primary block" onClick={async () => setCode(await regenerateRecoveryCode(vault))}>
            Generate new code
          </button>
        </div>
      )}
    </Modal>
  );
}

function BackupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault, toast } = useApp();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Encrypted backup">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await exportBackup(vault, pw);
          setBusy(false);
          setPw('');
          toast('Backup downloaded');
          onClose();
        }}
      >
        <p className="muted small">
          Choose a password for this backup file. You'll need it to restore. The file can also be used to move data to
          another device if sync isn't available.
        </p>
        <input
          className="text-input"
          type="password"
          placeholder="Backup password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button className="btn primary block" disabled={busy || pw.length < 4}>
          {busy ? 'Encrypting…' : 'Download backup'}
        </button>
      </form>
    </Modal>
  );
}

function RestoreModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { vault, toast } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Restore a backup">
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
            toast(`Backup merged — ${n} change${n === 1 ? '' : 's'} applied`);
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
        <p className="muted small">The backup is merged with existing data: the most recent version of each day wins.</p>
        <input type="file" accept=".peez,application/octet-stream,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input
          className="text-input"
          type="password"
          placeholder="Backup password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="error">{err}</p>}
        <button className="btn primary block" disabled={busy || !file || !pw}>
          {busy ? 'Restoring…' : 'Restore'}
        </button>
      </form>
    </Modal>
  );
}

function WipeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Delete all data">
      <div className="stack">
        <p>
          This permanently deletes every entry, your PIN and pairing <strong>on this device</strong>. Other synced
          devices keep their copy.
        </p>
        <input className="text-input" placeholder='Type "DELETE" to confirm' value={text} onChange={(e) => setText(e.target.value)} />
        <button
          className="btn danger block"
          disabled={text !== 'DELETE'}
          onClick={async () => {
            await wipeEverything();
            location.reload();
          }}
        >
          Delete everything
        </button>
      </div>
    </Modal>
  );
}
