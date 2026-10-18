import { useState } from 'react';
import { formatLong, todayISO } from '../domain/dates';
import { emptyEntry, FLOWS, isEntryEmpty, MOODS, SYMPTOMS, type DayEntry } from '../domain/types';
import { Chip, Modal } from './common';
import { useApp } from './context';

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Keyed by date by the parent, so state initialises once per opened day. */
export function DayEditor({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { vault, refresh, toast } = useApp();
  const [entry, setEntry] = useState<DayEntry>(() =>
    structuredClone(date ? (vault.entry(date) ?? emptyEntry(date)) : emptyEntry(todayISO())),
  );
  const [busy, setBusy] = useState(false);

  if (!date) return null;

  const existing = !!vault.entry(date);
  const future = date > todayISO();

  async function save() {
    setBusy(true);
    try {
      const clean: DayEntry = { ...entry, flow: entry.period ? entry.flow : undefined };
      if (isEntryEmpty(clean)) await vault.deleteEntry(date!);
      else await vault.saveEntry(clean);
      refresh();
      onClose();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await vault.deleteEntry(date!);
    refresh();
    onClose();
  }

  return (
    <Modal open={!!date} onClose={onClose} title={formatLong(date)}>
      {future && <p className="muted small">This day is in the future — you can still add notes.</p>}

      <section>
        <label className="switch-row">
          <span>Period</span>
          <input
            type="checkbox"
            className="switch"
            checked={entry.period}
            onChange={(e) =>
              setEntry({ ...entry, period: e.target.checked, flow: e.target.checked ? entry.flow ?? 'medium' : undefined })
            }
          />
        </label>
        {entry.period && (
          <div className="chips">
            {FLOWS.map((f) => (
              <Chip key={f.value} on={entry.flow === f.value} onClick={() => setEntry({ ...entry, flow: f.value })}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>Symptoms</h3>
        <div className="chips">
          {SYMPTOMS.map((s) => (
            <Chip key={s} on={entry.symptoms.includes(s)} onClick={() => setEntry({ ...entry, symptoms: toggle(entry.symptoms, s) })}>
              {s}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h3>Mood</h3>
        <div className="chips">
          {MOODS.map((m) => (
            <Chip key={m} on={entry.moods.includes(m)} onClick={() => setEntry({ ...entry, moods: toggle(entry.moods, m) })}>
              {m}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h3>Notes</h3>
        <textarea
          className="text-input"
          rows={3}
          placeholder="Anything else…"
          value={entry.note}
          onChange={(e) => setEntry({ ...entry, note: e.target.value })}
        />
      </section>

      <div className="row end">
        {existing && (
          <button className="btn danger ghost" onClick={remove}>
            Clear day
          </button>
        )}
        <button className="btn primary" disabled={busy} onClick={save}>
          Save
        </button>
      </div>
    </Modal>
  );
}
