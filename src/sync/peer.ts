import Peer, { type DataConnection, type PeerError } from 'peerjs';
import { fromB64, sealJson, toB64, unsealJson } from '../crypto/crypto';
import type { SyncRecord } from '../domain/types';
import type { Vault } from '../db/vault';
import { deriveSyncParams, type Pairing } from './pairing';

type Message = { t: 'state'; iv: string; ct: string } | { t: 'ack' };

export interface SyncResult {
  received: number;
  applied: number;
}

const TIMEOUT_MS = 120_000;
const RETRY_MS = 4_000;

/**
 * Peer-to-peer sync. The PeerJS public server only introduces the two devices
 * (using IDs derived from the pairing secret); data then flows over a direct
 * WebRTC channel, additionally encrypted with a key derived from the secret.
 *
 * Device "a" dials, device "b" listens. Both send their full record set,
 * merge what they receive, and acknowledge.
 */
export async function runSync(
  vault: Vault,
  pairing: Pairing,
  onStatus: (s: string) => void,
  signal?: AbortSignal,
): Promise<SyncResult> {
  const { key, myId, otherId } = await deriveSyncParams(pairing);
  onStatus('Connecting to matchmaking server…');
  const peer = new Peer(myId, { debug: 0 });

  return new Promise<SyncResult>((resolve, reject) => {
    let conn: DataConnection | null = null;
    let pending: DataConnection | null = null;
    let finished = false;
    let sentState = false;
    let gotState = false;
    let gotAck = false;
    const result: SyncResult = { received: 0, applied: 0 };

    const timeout = setTimeout(
      () => finish(new Error('Could not reach the other device. Open Peez on it and tap "Sync now" there too.')),
      TIMEOUT_MS,
    );
    let retry: ReturnType<typeof setInterval> | undefined;

    function finish(err?: Error) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      clearInterval(retry);
      // Give the last message time to flush before tearing down.
      setTimeout(() => peer.destroy(), 1500);
      if (err) reject(err);
      else resolve(result);
    }

    signal?.addEventListener('abort', () => finish(new Error('Sync cancelled.')));

    function check() {
      if (sentState && gotState && gotAck) {
        onStatus('Done!');
        finish();
      }
    }

    function attach(c: DataConnection) {
      c.on('open', async () => {
        if (conn && conn !== c) {
          c.close();
          return;
        }
        conn = c;
        clearInterval(retry);
        onStatus('Connected — exchanging data…');
        try {
          const sealed = await sealJson(key, { v: 1, records: vault.allRecords() });
          const msg: Message = { t: 'state', iv: toB64(sealed.iv), ct: toB64(sealed.ct) };
          c.send(msg);
          sentState = true;
          check();
        } catch (e) {
          finish(e as Error);
        }
      });
      c.on('data', async (raw) => {
        if (conn !== c) return;
        const msg = raw as Message;
        try {
          if (msg.t === 'state') {
            const data = await unsealJson<{ v: number; records: SyncRecord[] }>(key, {
              iv: fromB64(msg.iv),
              ct: fromB64(msg.ct),
            });
            result.received = data.records.length;
            result.applied = await vault.applyRemote(data.records);
            gotState = true;
            c.send({ t: 'ack' } satisfies Message);
            check();
          } else if (msg.t === 'ack') {
            gotAck = true;
            check();
          }
        } catch {
          finish(new Error('Could not decrypt data from the other device. Try pairing the devices again.'));
        }
      });
      c.on('close', () => {
        if (conn === c && !finished) finish(new Error('Connection closed before sync finished. Please try again.'));
      });
      c.on('error', (e) => {
        if (conn === c) finish(e);
      });
    }

    function dial() {
      if (conn || finished) return;
      if (pending && !pending.open) pending.close();
      pending = peer.connect(otherId, { reliable: true });
      attach(pending);
    }

    peer.on('open', () => {
      onStatus('Waiting for the other device… (tap "Sync now" on it too)');
      if (pairing.role === 'a') {
        dial();
        retry = setInterval(dial, RETRY_MS);
      }
    });

    peer.on('connection', (c) => attach(c));

    peer.on('error', (err: PeerError<string>) => {
      switch (err.type) {
        case 'peer-unavailable':
          return; // other device not online yet — keep retrying
        case 'unavailable-id':
          return finish(new Error('A previous sync is still closing. Wait a minute and try again.'));
        case 'network':
        case 'server-error':
        case 'socket-error':
        case 'socket-closed':
          return finish(new Error('Cannot reach the matchmaking server. Check the internet connection.'));
        case 'browser-incompatible':
          return finish(new Error('This browser does not support WebRTC.'));
        default:
          return finish(new Error(`Sync error: ${err.type}`));
      }
    });
  });
}
