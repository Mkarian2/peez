import { useMemo, useState } from 'react';
import { predict, predictionMarks } from '../domain/cycles';
import { diffDays, formatDate, todayISO } from '../domain/dates';
import { useApp } from './context';
import { Calendar } from './Calendar';
import { DayEditor } from './DayEditor';

export function Home() {
  const { vault, settings, version } = useApp();
  const today = todayISO();
  const entries = useMemo(() => vault.entries(), [vault, version]);
  const prediction = useMemo(() => predict(entries, settings, today), [entries, settings, today]);
  const marks = useMemo(() => predictionMarks(prediction, today), [prediction, today]);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <Summary prediction={prediction} today={today} onLogToday={() => setEditing(today)} />
      <div className="card">
        <Calendar
          entries={entries}
          marks={marks}
          today={today}
          onSelect={setEditing}
        />
      </div>
      <DayEditor key={editing ?? 'none'} date={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function Summary({
  prediction: p,
  today,
  onLogToday,
}: {
  prediction: ReturnType<typeof predict>;
  today: string;
  onLogToday: () => void;
}) {
  let headline: string;
  let sub = '';
  if (!p.lastPeriod) {
    headline = 'Welcome!';
    sub = 'Tap the first day of your last period in the calendar to start predictions.';
  } else if (p.inPeriod) {
    headline = `Period · day ${p.cycleDay}`;
    sub = `Next one expected around ${formatDate(p.upcoming[1]?.start ?? p.upcoming[0].start)}`;
  } else if (p.lateBy > 0) {
    headline = `Period ${p.lateBy} day${p.lateBy > 1 ? 's' : ''} late`;
    sub = `Expected ${formatDate(p.nextStart!)} · cycle day ${p.cycleDay}`;
  } else {
    const days = diffDays(today, p.nextStart!);
    headline = days === 0 ? 'Period expected today' : `Period in ${days} day${days > 1 ? 's' : ''}`;
    sub = `Around ${formatDate(p.nextStart!)} (±${p.range}d) · cycle day ${p.cycleDay}`;
  }

  const fertile = [p.current, ...p.upcoming].find((c) => c && c.fertileEnd >= today && (!p.lastPeriod || c.fertileStart > p.lastPeriod.start));
  let fertileText = '';
  if (fertile && p.lastPeriod) {
    fertileText =
      fertile.fertileStart <= today
        ? `Fertile window now · until ${formatDate(fertile.fertileEnd)}`
        : `Fertile window ${formatDate(fertile.fertileStart)} – ${formatDate(fertile.fertileEnd)}`;
  }

  return (
    <div className="card summary">
      <div className="summary-text">
        <div className="big">{headline}</div>
        <div className="muted">{sub}</div>
        {fertileText && <div className="fertile-text">{fertileText}</div>}
        {p.lastPeriod && p.basedOn < 2 && (
          <div className="muted small">Predictions get better after a few cycles.</div>
        )}
      </div>
      <button className="btn primary" onClick={onLogToday}>
        Log today
      </button>
    </div>
  );
}
