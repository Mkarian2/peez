import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
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
        toast('That is not a valid Peez pairing code.');
        return;
      }
      await savePairing(vault, p);
      setPairing(p);
      setMode('idle');
      setPaste('');
      toast('Paired! Now tap "Sync now" on both devices.');
    },
    [vault, toast],
  );

  async function syncNow() {
    if (!pairing) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setSyncing(true);
    setStatus('Starting…');
    try {
      const r = await runSync(vault, pairing, setStatus, ac.signal);
      const now = Date.now();
      await vault.setSecret('lastSync', now);
      setLastSync(now);
      setStatus(`Synced ✓ — ${r.applied} change${r.applied === 1 ? '' : 's'} received.`);
      refresh();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setSyncing(false);
      abortRef.current = null;
    }
  }

  async function unpair() {
    if (!confirm('Unpair this device? You will need to scan a new pairing code to sync again.')) return;
    await savePairing(vault, null);
    setPairing(undefined);
    setStatus('');
  }

  if (mode === 'show') {
    return (
      <div className="stack">
        <p>
          On the <strong>other device</strong>, open Peez → Settings → Sync → <em>Scan pairing code</em>, and point it at
          this code:
        </p>
        <img className="qr" src={qr} alt="Pairing QR code" />
        <details>
          <summary className="muted small">Can't scan? Copy the code as text</summary>
          <div className="code-box small-code">{code}</div>
          <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(code)}>
            Copy code
          </button>
        </details>
        <p className="muted small">Keep this code private — anyone with it could sync with your data.</p>
        <button className="btn primary block" onClick={() => setMode('idle')}>
          Done
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
            placeholder="…or paste the code (PEEZ1:…)"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button className="btn primary" disabled={!paste} onClick={() => acceptCode(paste)}>
            Pair
          </button>
        </div>
        <button className="btn ghost block" onClick={() => setMode('idle')}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {pairing ? (
        <>
          <p className="muted small">
            Paired {new Date(pairing.pairedAt).toLocaleDateString('en-GB')}
            {lastSync ? ` · last synced ${new Date(lastSync).toLocaleString('en-GB')}` : ' · never synced'}
          </p>
          <p className="muted small">Open Peez on both devices and tap "Sync now" on each (within 2 minutes).</p>
          {syncing ? (
            <button className="btn ghost block" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          ) : (
            <button className="btn primary block" onClick={syncNow}>
              🔄 Sync now
            </button>
          )}
          {status && <p className="status">{status}</p>}
          <button className="link-btn" onClick={unpair} disabled={syncing}>
            Unpair this device
          </button>
        </>
      ) : (
        <>
          <p className="muted small">
            Pair this device with her other device once. Pick one to show the code, and scan it with the other.
          </p>
          <div className="row">
            <button className="btn primary" onClick={showCode}>
              Show pairing code
            </button>
            <button className="btn ghost" onClick={() => setMode('scan')}>
              Scan pairing code
            </button>
          </div>
        </>
      )}
    </div>
  );
}
