import { deriveKeyFromPassphrase, fromB64, PBKDF2_ITERATIONS, randomBytes, sealJson, toB64, unsealJson } from '../crypto/crypto';
import { findCycles, findPeriods, predict } from '../domain/cycles';
import { formatDate, todayISO } from '../domain/dates';
import type { DayEntry, Settings, SyncRecord } from '../domain/types';
import type { Vault } from '../db/vault';

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
    [e.date, e.period ? 'yes' : 'no', e.flow ?? '', e.symptoms.join('; '), e.moods.join('; '), e.note].map(csvCell).join(','),
  );
  // BOM so Excel opens UTF-8 correctly.
  download(`peez-${todayISO()}.csv`, new Blob(['\ufeff' + [header.join(','), ...rows].join('\n')], { type: 'text/csv' }));
}

export async function exportPdf(entries: DayEntry[], settings: Settings): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const today = todayISO();
  const periods = findPeriods(entries);
  const cycles = findCycles(periods);
  const p = predict(entries, settings, today);
  const long = { day: 'numeric', month: 'short', year: 'numeric' } as const;

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
  line('Menstrual cycle summary', 18, true);
  doc.setTextColor(60, 60, 60);
  line(`Generated ${formatDate(today, long)} with Peez`, 9);
  y += 4;

  line('Overview', 13, true);
  line(`Average cycle length: ${p.avgCycle} days${p.basedOn ? ` (last ${p.basedOn} cycles)` : ' (default — not enough data)'}`);
  line(`Average period length: ${p.avgPeriod} days`);
  if (cycles.length) {
    const lens = cycles.map((c) => c.length);
    line(`Shortest / longest cycle: ${Math.min(...lens)} / ${Math.max(...lens)} days`);
  }
  line(`Periods recorded: ${periods.length}`);
  if (p.nextStart) line(`Next period predicted around: ${formatDate(p.upcoming[0].start, long)} (±${p.range} days)`);
  y += 4;

  line('Period history', 13, true);
  const cyc = new Map(cycles.map((c) => [c.start, c.length]));
  for (const per of [...periods].reverse()) {
    const c = cyc.get(per.start);
    line(
      `${formatDate(per.start, long)} – ${formatDate(per.end, long)}   ·   ${per.length} days${c ? `   ·   cycle ${c} days` : ''}`,
      10,
    );
  }
  y += 4;

  const counts = new Map<string, number>();
  for (const e of entries) for (const s of e.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  if (counts.size) {
    line('Symptoms (days logged)', 13, true);
    for (const [s, n] of [...counts].sort((a, b) => b[1] - a[1])) line(`${s}: ${n}`, 10);
    y += 4;
  }

  const notes = entries.filter((e) => e.note.trim());
  if (notes.length) {
    line('Notes', 13, true);
    for (const e of [...notes].reverse()) line(`${formatDate(e.date, long)}: ${e.note.trim()}`, 10);
  }

  doc.save(`peez-summary-${today}.pdf`);
}

interface BackupFile {
  app: 'peez';
  v: 1;
  salt: string;
  iterations: number;
  iv: string;
  ct: string;
}

/** Encrypted backup — also usable as a manual sync fallback between devices. */
export async function exportBackup(vault: Vault, passphrase: string): Promise<void> {
  const salt = randomBytes(16);
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const sealed = await sealJson(key, { records: vault.allRecords() });
  const file: BackupFile = {
    app: 'peez',
    v: 1,
    salt: toB64(salt),
    iterations: PBKDF2_ITERATIONS,
    iv: toB64(sealed.iv),
    ct: toB64(sealed.ct),
  };
  download(`peez-backup-${todayISO()}.peez`, new Blob([JSON.stringify(file)], { type: 'application/octet-stream' }));
}

export async function importBackup(vault: Vault, file: File, passphrase: string): Promise<number> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
    if (parsed.app !== 'peez') throw new Error();
  } catch {
    throw new Error('This is not a Peez backup file.');
  }
  const key = await deriveKeyFromPassphrase(passphrase, fromB64(parsed.salt), parsed.iterations);
  let data: { records: SyncRecord[] };
  try {
    data = await unsealJson(key, { iv: fromB64(parsed.iv), ct: fromB64(parsed.ct) });
  } catch {
    throw new Error('Wrong backup password.');
  }
  return vault.applyRemote(data.records);
}
