import { useMemo, useState } from 'react';
import type { DayMark } from '../domain/cycles';
import { toISO } from '../domain/dates';
import type { DayEntry } from '../domain/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar({
  entries,
  marks,
  today,
  onSelect,
}: {
  entries: DayEntry[];
  marks: Map<string, DayMark>;
  today: string;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);

  const days = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <button
          className="cal-title"
          onClick={() => {
            const d = new Date();
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
        >
          {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </button>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const iso = toISO(d);
          const e = byDate.get(iso);
          const m = marks.get(iso);
          const cls = ['cal-day'];
          if (d.getMonth() !== month.getMonth()) cls.push('other');
          if (iso === today) cls.push('today');
          if (e?.period) cls.push('period', `flow-${e.flow ?? 'medium'}`);
          else if (m?.predictedPeriod) cls.push('predicted');
          if (!e?.period && m?.fertile) cls.push('fertile');
          if (m?.ovulation) cls.push('ovulation');
          const hasInfo = e && (e.symptoms.length || e.moods.length || e.note.trim());
          return (
            <button key={iso} className={cls.join(' ')} onClick={() => onSelect(iso)} aria-label={iso}>
              <span>{d.getDate()}</span>
              {hasInfo ? <i className="dot" /> : null}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="sw period" /> Period
        </span>
        <span>
          <i className="sw predicted" /> Predicted
        </span>
        <span>
          <i className="sw fertile" /> Fertile
        </span>
        <span>
          <i className="sw ovulation" /> Ovulation
        </span>
      </div>
    </div>
  );
}
