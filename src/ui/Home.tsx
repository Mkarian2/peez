import { useEffect, useMemo, useState } from 'react';
import { predict, predictionMarks } from '../domain/cycles';
import { diffDays, formatDate, todayISO } from '../domain/dates';
import { exportBackup } from '../export/export';
import { useI18n } from '../i18n';
import { Calendar } from './Calendar';
import { EnvWarningBanner } from './common';
import { useApp } from './context';
import { DayEditor } from './DayEditor';

const BACKUP_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function Home() {
  const { vault, settings, version, toast, refresh } = useApp();
  const { t } = useI18n();
  const today = todayISO();
  const entries = useMemo(() => vault.entries(), [vault, version]);
  const prediction = useMemo(() => predict(entries, settings, today), [entries, settings, today]);
  const marks = useMemo(() => predictionMarks(prediction, today), [prediction, today]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);

  useEffect(() => {
    if (entries.length === 0 || dismissedPrompt) {
      setShowBackupPrompt(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      vault.getSecret<number>('lastBackup'),
      vault.getSecret<number>('lastSync'),
      vault.getSecret<number>('lastModified'),
    ]).then(([lastBackup, lastSync, lastModified]) => {
      if (cancelled) return;
      const lastSafe = Math.max(lastBackup ?? 0, lastSync ?? 0);
      const lastMod = lastModified ?? 0;
      const needsBackup = lastSafe === 0 || (lastMod > lastSafe && Date.now() - lastSafe > BACKUP_REMINDER_INTERVAL_MS);
      setShowBackupPrompt(needsBackup);
    });
    return () => {
      cancelled = true;
    };
  }, [vault, entries.length, version, dismissedPrompt]);

  async function saveOneTapBackup() {
    await exportBackup(vault);
    setShowBackupPrompt(false);
    toast(t.settings.backupDownloadedToast);
    refresh();
  }

  return (
    <>
      <EnvWarningBanner />
      <Summary prediction={prediction} today={today} onLogToday={() => setEditing(today)} />
      {showBackupPrompt && (
        <div className="card backup-banner">
          <div className="backup-banner-text">
            <strong>{t.backupPrompt.title}</strong>
            <span className="muted small">{t.backupPrompt.body}</span>
          </div>
          <div className="row">
            <button className="btn primary" onClick={saveOneTapBackup}>
              {t.backupPrompt.saveBtn}
            </button>
            <button className="btn ghost" onClick={() => setDismissedPrompt(true)}>
              {t.backupPrompt.laterBtn}
            </button>
          </div>
        </div>
      )}
      <div className="card">
        <Calendar entries={entries} marks={marks} today={today} onSelect={setEditing} />
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
  const { lang, t } = useI18n();
  const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short' }, lang);

  let headline: string;
  let sub = '';
  if (!p.lastPeriod) {
    headline = t.home.welcomeHeadline;
    sub = t.home.welcomeSub;
  } else if (p.inPeriod) {
    headline = t.home.periodDay(p.cycleDay!);
    sub = t.home.nextExpectedAround(fmt(p.upcoming[1]?.start ?? p.upcoming[0].start));
  } else if (p.lateBy > 0) {
    headline = t.home.periodLate(p.lateBy);
    sub = t.home.expectedCycleDay(fmt(p.nextStart!), p.cycleDay!);
  } else {
    const days = diffDays(today, p.nextStart!);
    headline = days === 0 ? t.home.periodExpectedToday : t.home.periodInDays(days);
    sub = t.home.aroundDateCycleDay(fmt(p.nextStart!), p.range, p.cycleDay!);
  }

  const fertile = [p.current, ...p.upcoming].find(
    (c) => c && c.fertileEnd >= today && (!p.lastPeriod || c.fertileStart > p.lastPeriod.start),
  );
  let fertileText = '';
  if (fertile && p.lastPeriod) {
    fertileText =
      fertile.fertileStart <= today
        ? t.home.fertileNow(fmt(fertile.fertileEnd))
        : t.home.fertileRange(fmt(fertile.fertileStart), fmt(fertile.fertileEnd));
  }

  return (
    <div className="card summary">
      <div className="summary-text">
        <div className="big">{headline}</div>
        <div className="muted">{sub}</div>
        {fertileText && <div className="fertile-text">{fertileText}</div>}
        {p.lastPeriod && p.basedOn < 2 && <div className="muted small">{t.home.betterAfterCycles}</div>}
      </div>
      <button className="btn primary" onClick={onLogToday}>
        {t.home.logToday}
      </button>
    </div>
  );
}
