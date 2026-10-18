import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { findCycles, findPeriods, predict } from '../domain/cycles';
import { formatDate, todayISO } from '../domain/dates';
import { translateTag, useI18n } from '../i18n';
import { useApp } from './context';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export function Stats() {
  const { vault, settings, version } = useApp();
  const { lang, t } = useI18n();
  const entries = useMemo(() => vault.entries(), [vault, version]);
  const periods = useMemo(() => findPeriods(entries), [entries]);
  const cycles = useMemo(() => findCycles(periods), [periods]);
  const p = useMemo(() => predict(entries, settings, todayISO()), [entries, settings]);

  const symptomCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) for (const s of [...e.symptoms, ...e.moods]) m.set(s, (m.get(s) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  if (!periods.length) {
    return (
      <div className="card">
        <h2>{t.stats.title}</h2>
        <p className="muted">{t.stats.empty}</p>
      </div>
    );
  }

  const recent = cycles.slice(-12);
  const lens = cycles.map((c) => c.length);
  const maxCount = symptomCounts[0]?.[1] ?? 1;
  const d = t.stats.dayUnit;

  return (
    <>
      <div className="stat-grid">
        <Stat label={t.stats.avgCycle} value={`${p.avgCycle} ${d}`} />
        <Stat label={t.stats.avgPeriod} value={`${p.avgPeriod} ${d}`} />
        <Stat label={t.stats.variation} value={lens.length >= 2 ? `±${p.range} ${d}` : '—'} />
        <Stat label={t.stats.periodsLogged} value={String(periods.length)} />
        {lens.length > 0 && <Stat label={t.stats.shortest} value={`${Math.min(...lens)} ${d}`} />}
        {lens.length > 0 && <Stat label={t.stats.longest} value={`${Math.max(...lens)} ${d}`} />}
      </div>

      {recent.length > 0 && (
        <div className="card">
          <h2>{t.stats.cycleHistory}</h2>
          <div className="chart">
            <Bar
              data={{
                labels: recent.map((c) => formatDate(c.start, { day: 'numeric', month: 'short' }, lang)),
                datasets: [
                  {
                    label: t.stats.cycleLength,
                    data: recent.map((c) => c.length),
                    backgroundColor: '#f2a7bf',
                    borderRadius: 6,
                  },
                  {
                    label: t.stats.periodLength,
                    data: recent.map((c) => c.periodLength),
                    backgroundColor: '#c9b6e4',
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
                plugins: {
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} ${t.stats.daysUnit}` },
                  },
                },
              }}
            />
          </div>
          <div className="legend">
            <span>
              <i className="sw" style={{ background: '#f2a7bf' }} /> {t.stats.cycleLength}
            </span>
            <span>
              <i className="sw" style={{ background: '#c9b6e4' }} /> {t.stats.periodLength}
            </span>
          </div>
        </div>
      )}

      {symptomCounts.length > 0 && (
        <div className="card">
          <h2>{t.stats.mostFrequent}</h2>
          {symptomCounts.map(([name, n]) => (
            <div key={name} className="bar-row">
              <span>{translateTag(lang, name)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(n / maxCount) * 100}%` }} />
              </div>
              <span className="muted">{n}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>{t.stats.periodsTable}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{t.stats.colStart}</th>
              <th>{t.stats.colLength}</th>
              <th>{t.stats.colCycle}</th>
            </tr>
          </thead>
          <tbody>
            {[...periods].reverse().map((per) => {
              const c = cycles.find((x) => x.start === per.start);
              return (
                <tr key={per.start}>
                  <td>{formatDate(per.start, { day: 'numeric', month: 'short', year: 'numeric' }, lang)}</td>
                  <td>
                    {per.length} {d}
                  </td>
                  <td>{c ? `${c.length} ${d}` : <span className="muted">{t.stats.current}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
