import { describe, expect, it } from 'vitest';
import { findCycles, findPeriods, predict, predictionMarks } from './cycles';
import { addDays, diffDays } from './dates';
import { DEFAULT_SETTINGS, emptyEntry, type DayEntry } from './types';

function periodDays(start: string, len: number): DayEntry[] {
  return Array.from({ length: len }, (_, i) => ({ ...emptyEntry(addDays(start, i)), period: true }));
}

describe('dates', () => {
  it('handles month/year boundaries and DST', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // EU DST switch
    expect(diffDays('2026-10-01', '2026-10-29')).toBe(28);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('findPeriods', () => {
  it('groups consecutive days and tolerates a single gap', () => {
    const entries = [
      ...periodDays('2026-01-01', 3),
      { ...emptyEntry('2026-01-05'), period: true }, // 1-day gap on 01-04
      ...periodDays('2026-01-29', 4),
    ];
    const p = findPeriods(entries);
    expect(p).toEqual([
      { start: '2026-01-01', end: '2026-01-05', length: 5 },
      { start: '2026-01-29', end: '2026-02-01', length: 4 },
    ]);
    expect(findCycles(p)).toEqual([{ start: '2026-01-01', length: 28, periodLength: 5 }]);
  });

  it('ignores non-period entries', () => {
    expect(findPeriods([{ ...emptyEntry('2026-01-01'), symptoms: ['Cramps'] }])).toEqual([]);
  });
});

describe('predict', () => {
  it('uses defaults with no data', () => {
    const p = predict([], DEFAULT_SETTINGS, '2026-10-18');
    expect(p.lastPeriod).toBeUndefined();
    expect(p.upcoming).toEqual([]);
    expect(p.avgCycle).toBe(28);
  });

  it('predicts from a single period with default cycle length', () => {
    const p = predict(periodDays('2026-10-01', 5), DEFAULT_SETTINGS, '2026-10-18');
    expect(p.nextStart).toBe('2026-10-29');
    expect(p.cycleDay).toBe(18);
    expect(p.inPeriod).toBe(false);
    expect(p.current?.ovulation).toBe('2026-10-15');
    expect(p.current?.fertileStart).toBe('2026-10-10');
    expect(p.current?.fertileEnd).toBe('2026-10-16');
    expect(p.range).toBe(3);
  });

  it('averages the last cycles', () => {
    const entries = [
      ...periodDays('2026-06-01', 5),
      ...periodDays('2026-07-01', 5), // 30
      ...periodDays('2026-07-31', 4), // 30
      ...periodDays('2026-08-30', 5), // 30
    ];
    const p = predict(entries, DEFAULT_SETTINGS, '2026-09-10');
    expect(p.basedOn).toBe(3);
    expect(p.avgCycle).toBe(30);
    expect(p.nextStart).toBe('2026-09-29');
    expect(p.avgPeriod).toBe(5);
    expect(p.range).toBe(1);
  });

  it('ignores implausible cycles (e.g. a forgotten month)', () => {
    const entries = [...periodDays('2026-01-01', 5), ...periodDays('2026-03-30', 5), ...periodDays('2026-04-27', 5)];
    const p = predict(entries, DEFAULT_SETTINGS, '2026-05-01');
    expect(p.basedOn).toBe(1);
    expect(p.avgCycle).toBe(28);
  });

  it('detects current period and lateness', () => {
    const entries = periodDays('2026-10-01', 2);
    expect(predict(entries, DEFAULT_SETTINGS, '2026-10-02').inPeriod).toBe(true);
    const late = predict(entries, DEFAULT_SETTINGS, '2026-11-02');
    expect(late.lateBy).toBe(4);
    expect(late.upcoming[0].start).toBe('2026-11-02');
  });

  it('produces calendar marks for future predicted periods only', () => {
    const p = predict(periodDays('2026-10-01', 5), DEFAULT_SETTINGS, '2026-10-18');
    const marks = predictionMarks(p, '2026-10-18');
    expect(marks.get('2026-10-29')?.predictedPeriod).toBe(true);
    expect(marks.get('2026-11-02')?.predictedPeriod).toBe(true);
    expect(marks.get('2026-11-03')?.predictedPeriod).toBeUndefined();
    expect(marks.get('2026-10-15')?.ovulation).toBe(true);
    expect(marks.get('2026-10-12')?.fertile).toBe(true);
  });
});
