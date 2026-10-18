import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { localeFor, useI18n } from '../i18n';
import {
  loadPairing,
  newPairing,
  pairingCode,
  parsePairingCode,
  savePairing,
  type Pairing,
} from '../sync/pairing';
import { runSync } from '../sync/peer';
import { useApp } from './context';
import { QrScanner } from './QrScanner';

type Mode = 'idle' | 'show' | 'scan';

export function SyncPanel() {
  const { vault, refresh, toast } = useApp();
  const { lang, t } = useI18n();
  const [pairing, setPairing] = useState<Pairing | undefined>();
  const [lastSync, setLastSync] = useState<number | undefined>();
  const [mode, setMode] = useState<Mode>('idle');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [paste, setPaste] = useState('');
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadPairing(vault).then((p) => setPairing(p ?? undefined));
    vault.getSecret<number>('lastSync').then(setLastSync);
    return () => abortRef.current?.abort();
  }, [vault]);

  async function showCode() {
    const p = newPairing();
    await savePairing(vault, p);
    const c = pairingCode(p);
    setCode(c);
    setQr(await QRCode.toDataURL(c, { width: 300, margin: 1, color: { dark: '#5a3d4a', light: '#ffffff' } }));
    setPairing(p);
    setMode('show');
  }

  const acceptCode = useCallback(
    async (text: string) => {
      const p = parsePairingCode(text);
      if (!p) {
        toast(t.sync.invalidCode);
        return;
      }
      await savePairing(vault, p);
      setPairing(p);
      setMode('idle');
      setPaste('');
      toast(t.sync.pairedToast);
    },
    [vault, toast, t.sync.invalidCode, t.sync.pairedToast],
  );

  async function syncNow() {
    if (!pairing) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setSyncing(true);
    setStatus(t.sync.starting);
    try {
      const r = await runSync(vault, pairing, setStatus, ac.signal);
      const now = Date.now();
      await vault.setSecret('lastSync', now);
      setLastSync(now);
      setStatus(t.sync.syncedStatus(r.applied));
      refresh();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setSyncing(false);
      abortRef.current = null;
    }
  }

  async function unpair() {
    if (!confirm(t.sync.unpairConfirm)) return;
    await savePairing(vault, null);
    setPairing(undefined);
    setStatus('');
  }

  if (mode === 'show') {
    return (
      <div className="stack">
        <p>
          {t.sync.scanInstructions1} <strong>{t.sync.otherDevice}</strong>
          {t.sync.scanInstructions2} <em>{t.sync.scanPairingCode}</em>
          {t.sync.scanInstructions3}
        </p>
        <img className="qr" src={qr} alt={t.sync.qrAlt} />
        <details>
          <summary className="muted small">{t.sync.cantScan}</summary>
          <div className="code-box small-code">{code}</div>
          <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(code)}>
            {t.sync.copyCode}
          </button>
        </details>
        <p className="muted small">{t.sync.keepPrivate}</p>
        <button className="btn primary block" onClick={() => setMode('idle')}>
          {t.done}
        </button>
      </div>
    );
  }

  if (mode === 'scan') {
    return (
      <div className="stack">
        <QrScanner onResult={acceptCode} />
        <div className="row">
          <input
            className="text-input"
            placeholder={t.sync.pastePlaceholder}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button className="btn primary" disabled={!paste} onClick={() => acceptCode(paste)}>
            {t.sync.pairBtn}
          </button>
        </div>
        <button className="btn ghost block" onClick={() => setMode('idle')}>
          {t.cancel}
        </button>
      </div>
    );
  }

  const loc = localeFor(lang);

  return (
    <div className="stack">
      {pairing ? (
        <>
          <p className="muted small">
            {t.sync.pairedOn(new Date(pairing.pairedAt).toLocaleDateString(loc))}
            {lastSync ? t.sync.lastSynced(new Date(lastSync).toLocaleString(loc)) : t.sync.neverSynced}
          </p>
          <p className="muted small">{t.sync.syncInstructions}</p>
          {syncing ? (
            <button className="btn ghost block" onClick={() => abortRef.current?.abort()}>
              {t.cancel}
            </button>
          ) : (
            <button className="btn primary block" onClick={syncNow}>
              {t.sync.syncNow}
            </button>
          )}
          {status && <p className="status">{status}</p>}
          <button className="link-btn" onClick={unpair} disabled={syncing}>
            {t.sync.unpairDevice}
          </button>
        </>
      ) : (
        <>
          <p className="muted small">{t.sync.notPairedInfo}</p>
          <div className="row">
            <button className="btn primary" onClick={showCode}>
              {t.sync.showPairingCode}
            </button>
            <button className="btn ghost" onClick={() => setMode('scan')}>
              {t.sync.scanPairingCode}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
