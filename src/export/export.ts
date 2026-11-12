import {
  deriveKeyFromPassphrase,
  fromB64,
  PBKDF2_ITERATIONS,
  randomBytes,
  sealJson,
  toB64,
  unsealJson,
} from '../crypto/crypto';
import { getStoredWraps, normaliseRecovery, restoreVaultKeys, setup } from '../db/auth';
import { keysFromRaw, unwrapWithPassphrase, type Vault, type WrappedKey } from '../db/vault';
import { findCycles, findPeriods, predict } from '../domain/cycles';
import { formatDate, todayISO } from '../domain/dates';
import type { DayEntry, Settings, SyncRecord } from '../domain/types';
import { STRINGS, translateTag, type Lang } from '../i18n';
import { loadPairing, savePairing, type Pairing } from '../sync/pairing';

export function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function csvCell(v: string): string {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function exportCsv(entries: DayEntry[]): void {
  const header = ['date', 'period', 'flow', 'symptoms', 'moods', 'note'];
  const rows = entries.map((e) =>
    [e.date, e.period ? 'yes' : 'no', e.flow ?? '', e.symptoms.join('; '), e.moods.join('; '), e.note]
      .map(csvCell)
      .join(','),
  );
  // BOM so Excel opens UTF-8 correctly.
  download(`peez-${todayISO()}.csv`, new Blob(['\ufeff' + [header.join(','), ...rows].join('\n')], { type: 'text/csv' }));
}

export async function exportPdf(entries: DayEntry[], settings: Settings, lang: Lang = 'en'): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const today = todayISO();
  const periods = findPeriods(entries);
  const cycles = findCycles(periods);
  const p = predict(entries, settings, today);
  const long = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  const tp = STRINGS[lang].pdf;

  let y = 20;
  const line = (text: string, size = 11, bold = false, indent = 15) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, 180 - (indent - 15));
    doc.text(wrapped, indent, y);
    y += wrapped.length * size * 0.45 + 2;
  };

  doc.setTextColor(200, 90, 130);
  line(tp.title, 18, true);
  doc.setTextColor(60, 60, 60);
  line(tp.generated(formatDate(today, long, lang)), 9);
  y += 4;

  line(tp.overview, 13, true);
  line(tp.avgCycle(p.avgCycle, p.basedOn));
  line(tp.avgPeriod(p.avgPeriod));
  if (cycles.length) {
    const lens = cycles.map((c) => c.length);
    line(tp.shortestLongest(Math.min(...lens), Math.max(...lens)));
  }
  line(tp.periodsRecorded(periods.length));
  if (p.nextStart) line(tp.nextPredicted(formatDate(p.upcoming[0].start, long, lang), p.range));
  y += 4;

  line(tp.periodHistory, 13, true);
  const cyc = new Map(cycles.map((c) => [c.start, c.length]));
  for (const per of [...periods].reverse()) {
    const c = cyc.get(per.start);
    line(tp.periodRow(formatDate(per.start, long, lang), formatDate(per.end, long, lang), per.length, c), 10);
  }
  y += 4;

  const counts = new Map<string, number>();
  for (const e of entries) for (const s of e.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  if (counts.size) {
    line(tp.symptomsTitle, 13, true);
    for (const [s, n] of [...counts].sort((a, b) => b[1] - a[1])) line(`${translateTag(lang, s)}: ${n}`, 10);
    y += 4;
  }

  const notes = entries.filter((e) => e.note.trim());
  if (notes.length) {
    line(tp.notesTitle, 13, true);
    for (const e of [...notes].reverse()) line(`${formatDate(e.date, long, lang)}: ${e.note.trim()}`, 10);
  }

  doc.save(`peez-summary-${today}.pdf`);
}

interface SerializedWrap {
  salt: string;
  iterations: number;
  iv: string;
  ct: string;
}

interface BackupFileV1 {
  app: 'peez';
  v: 1;
  salt: string;
  iterations: number;
  iv: string;
  ct: string;
}

export interface BackupFileV2 {
  app: 'peez';
  v: 2;
  exportedAt: string;
  pinWrap: SerializedWrap;
  recoveryWrap?: SerializedWrap;
  customWrap?: SerializedWrap;
  iv: string;
  ct: string;
}

type BackupFile = BackupFileV1 | BackupFileV2;

interface BackupPayload {
  records: SyncRecord[];
  settings?: Settings;
  pairing?: Pairing;
}

function encodeWrap(w: WrappedKey): SerializedWrap {
  return {
    salt: toB64(w.salt),
    iterations: w.iterations,
    iv: toB64(w.iv),
    ct: toB64(w.ct),
  };
}

function decodeWrap(w: SerializedWrap): WrappedKey {
  return {
    salt: fromB64(w.salt),
    iterations: w.iterations,
    iv: fromB64(w.iv),
    ct: fromB64(w.ct),
  };
}

/**
 * Build a v2 encrypted backup blob protected by the user's existing PIN & Recovery Code
 * (and optionally an extra custom passphrase if provided).
 */
export async function buildBackupObject(vault: Vault, passphrase?: string): Promise<BackupFileV2 | BackupFileV1> {
  const { pinWrap, recoveryWrap } = await getStoredWraps();
  const [settings, pairing] = await Promise.all([vault.getSettings(), loadPairing(vault)]);
  const payload: BackupPayload = {
    records: vault.allRecords(),
    settings,
    pairing,
  };

  if (pinWrap) {
    const sealed = await sealJson(vault.keys.aes, payload);
    const file: BackupFileV2 = {
      app: 'peez',
      v: 2,
      exportedAt: todayISO(),
      pinWrap: encodeWrap(pinWrap),
      recoveryWrap: recoveryWrap ? encodeWrap(recoveryWrap) : undefined,
      iv: toB64(sealed.iv),
      ct: toB64(sealed.ct),
    };
    if (passphrase && passphrase.trim().length > 0) {
      const salt = randomBytes(16);
      const pwKey = await deriveKeyFromPassphrase(passphrase, salt);
      const pwSealed = await sealJson(pwKey, { raw: toB64(vault.keys.raw) });
      file.customWrap = {
        salt: toB64(salt),
        iterations: PBKDF2_ITERATIONS,
        iv: toB64(pwSealed.iv),
        ct: toB64(pwSealed.ct),
      };
    }
    return file;
  }

  // Fallback to v1 format if no pinWrap is stored in meta (e.g. in isolated unit tests).
  const salt = randomBytes(16);
  const key = await deriveKeyFromPassphrase(passphrase || '0000', salt);
  const sealed = await sealJson(key, payload);
  return {
    app: 'peez',
    v: 1,
    salt: toB64(salt),
    iterations: PBKDF2_ITERATIONS,
    iv: toB64(sealed.iv),
    ct: toB64(sealed.ct),
  };
}

/**
 * 1-tap encrypted backup — encrypted with the user's PIN and Recovery Code.
 * Also usable as a manual sync fallback between devices.
 */
export async function exportBackup(vault: Vault, passphrase?: string): Promise<void> {
  const file = await buildBackupObject(vault, passphrase);
  await vault.setSecret('lastBackup', Date.now());
  download(`peez-backup-${todayISO()}.peez`, new Blob([JSON.stringify(file)], { type: 'application/octet-stream' }));
}

export async function inspectBackupFile(file: File): Promise<{ version: 1 | 2; exportedAt?: string }> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
    if (parsed.app !== 'peez' || (parsed.v !== 1 && parsed.v !== 2)) throw new Error();
  } catch {
    throw new Error('This is not a Peez backup file.');
  }
  return {
    version: parsed.v,
    exportedAt: parsed.v === 2 ? parsed.exportedAt : undefined,
  };
}

async function unwrapV2RawKey(parsed: BackupFileV2, secret: string): Promise<{ raw: Uint8Array; usedRecovery: boolean }> {
  const trimmed = secret.trim();
  // 1. Try as PIN
  try {
    const raw = await unwrapWithPassphrase(decodeWrap(parsed.pinWrap), trimmed);
    return { raw, usedRecovery: false };
  } catch {
    // continue
  }
  // 2. Try as Recovery Code
  if (parsed.recoveryWrap) {
    try {
      const raw = await unwrapWithPassphrase(decodeWrap(parsed.recoveryWrap), normaliseRecovery(trimmed));
      return { raw, usedRecovery: true };
    } catch {
      // continue
    }
  }
  // 3. Try as optional custom backup password
  if (parsed.customWrap) {
    try {
      const cw = decodeWrap(parsed.customWrap);
      const pwKey = await deriveKeyFromPassphrase(trimmed, cw.salt, cw.iterations);
      const res = await unsealJson<{ raw: string }>(pwKey, { iv: cw.iv, ct: cw.ct });
      return { raw: fromB64(res.raw), usedRecovery: false };
    } catch {
      // continue
    }
  }
  throw new Error('Wrong PIN, recovery code, or backup password.');
}

/**
 * Import/merge a `.peez` backup into an already-unlocked vault.
 * If the v2 backup comes from the same vault, it unlocks automatically without needing a password.
 */
export async function importBackup(vault: Vault, file: File, secret = ''): Promise<number> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
    if (parsed.app !== 'peez') throw new Error();
  } catch {
    throw new Error('This is not a Peez backup file.');
  }

  let data: BackupPayload;
  if (parsed.v === 2) {
    const sealed = { iv: fromB64(parsed.iv), ct: fromB64(parsed.ct) };
    // Try current vault key first (same account!)
    try {
      data = await unsealJson<BackupPayload>(vault.keys.aes, sealed);
    } catch {
      if (!secret.trim()) {
        throw new Error('Enter the PIN or recovery code for this backup.');
      }
      const { raw } = await unwrapV2RawKey(parsed, secret);
      const keys = await keysFromRaw(raw);
      data = await unsealJson<BackupPayload>(keys.aes, sealed);
    }
  } else {
    const key = await deriveKeyFromPassphrase(secret, fromB64(parsed.salt), parsed.iterations);
    try {
      data = await unsealJson<BackupPayload>(key, { iv: fromB64(parsed.iv), ct: fromB64(parsed.ct) });
    } catch {
      throw new Error('Wrong backup password.');
    }
  }

  const applied = await vault.applyRemote(data.records);
  await vault.setSecret('lastBackup', Date.now());
  return applied;
}

/**
 * Restore a `.peez` backup directly from the Welcome (`Setup`) screen when browser
 * site data was cleared or when moving to a new device.
 */
export async function restoreBackupOnSetup(
  file: File,
  secret: string,
  newPin?: string,
): Promise<{ vault: Vault; applied: number; recoveryCode?: string }> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
    if (parsed.app !== 'peez') throw new Error();
  } catch {
    throw new Error('This is not a Peez backup file.');
  }

  if (parsed.v === 2) {
    const { raw, usedRecovery } = await unwrapV2RawKey(parsed, secret);
    const keys = await keysFromRaw(raw);
    const data = await unsealJson<BackupPayload>(keys.aes, {
      iv: fromB64(parsed.iv),
      ct: fromB64(parsed.ct),
    });

    const vault = await restoreVaultKeys({
      raw,
      pinWrap: decodeWrap(parsed.pinWrap),
      recoveryWrap: parsed.recoveryWrap ? decodeWrap(parsed.recoveryWrap) : undefined,
      newPin: usedRecovery && newPin ? newPin : undefined,
    });

    const applied = await vault.applyRemote(data.records);
    if (data.settings) {
      await vault.setSecret('settings', data.settings);
    }
    if (data.pairing) {
      await savePairing(vault, data.pairing);
    }
    await vault.setSecret('lastBackup', Date.now());
    return { vault, applied };
  }

  // Legacy v1 backup file: decrypt records with backup password, then set up vault with newPin
  if (!newPin || newPin.length < 4) {
    throw new Error('Choose a PIN (at least 4 digits) to unlock your restored vault.');
  }
  const key = await deriveKeyFromPassphrase(secret, fromB64(parsed.salt), parsed.iterations);
  let data: BackupPayload;
  try {
    data = await unsealJson<BackupPayload>(key, { iv: fromB64(parsed.iv), ct: fromB64(parsed.ct) });
  } catch {
    throw new Error('Wrong backup password.');
  }
  const { vault, recoveryCode } = await setup(newPin);
  const applied = await vault.applyRemote(data.records);
  await vault.setSecret('lastBackup', Date.now());
  return { vault, applied, recoveryCode };
}
