import { addDays, diffDays } from './dates';
import type { DayEntry, Settings } from './types';

export interface Period {
  start: string;
  end: string;
  length: number;
}

export interface Cycle {
  start: string;
  length: number;
  periodLength: number;
}

export interface PredictedCycle {
  start: string;
  end: string;
  ovulation: string;
  fertileStart: string;
  fertileEnd: string;
}

export interface Prediction {
  avgCycle: number;
  avgPeriod: number;
  /** Number of cycles the average is based on (0 = defaults used). */
  basedOn: number;
  /** ± days of uncertainty around the predicted start. */
  range: number;
  lastPeriod?: Period;
  cycleDay?: number;
  inPeriod: boolean;
  nextStart?: string;
  lateBy: number;
  /** Fertile window / ovulation of the current cycle (may be in the past). */
  current?: PredictedCycle;
  /** Next predicted periods (with their preceding fertile windows). */
  upcoming: PredictedCycle[];
}

const MIN_CYCLE = 15;
const MAX_CYCLE = 60;
const HISTORY = 6;
const LUTEAL = 14;

/** Group period days into periods. A single missing day doesn't split a period. */
export function findPeriods(entries: DayEntry[]): Period[] {
  const days = entries
    .filter((e) => e.period)
    .map((e) => e.date)
    .sort();
  const periods: Period[] = [];
  for (const d of days) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, d) <= 2) {
      last.end = d;
      last.length = diffDays(last.start, d) + 1;
    } else {
      periods.push({ start: d, end: d, length: 1 });
    }
  }
  return periods;
}

export function findCycles(periods: Period[]): Cycle[] {
  const cycles: Cycle[] = [];
  for (let i = 0; i < periods.length - 1; i++) {
    cycles.push({
      start: periods[i].start,
      length: diffDays(periods[i].start, periods[i + 1].start),
      periodLength: periods[i].length,
    });
  }
  return cycles;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

function cycleFor(start: string, avgCycle: number, avgPeriod: number): PredictedCycle {
  const ovulation = addDays(start, -LUTEAL);
  return {
    start,
    end: addDays(start, avgPeriod - 1),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
  };
}

export function predict(entries: DayEntry[], settings: Settings, today: string, count = 3): Prediction {
  const periods = findPeriods(entries);
  const valid = findCycles(periods)
    .filter((c) => c.length >= MIN_CYCLE && c.length <= MAX_CYCLE)
    .slice(-HISTORY);

  const avgCycle = valid.length ? Math.round(mean(valid.map((c) => c.length))) : settings.defaultCycleLength;
  const range = valid.length >= 2 ? Math.max(1, Math.round(stdDev(valid.map((c) => c.length)))) : 3;

  // Exclude a period that may still be ongoing from the average period length.
  const finished = periods.filter((p) => diffDays(p.end, today) > 1).slice(-HISTORY);
  const avgPeriod = finished.length ? Math.round(mean(finished.map((p) => p.length))) : settings.defaultPeriodLength;

  const lastPeriod = periods[periods.length - 1];
  const base: Prediction = { avgCycle, avgPeriod, basedOn: valid.length, range, inPeriod: false, lateBy: 0, upcoming: [] };
  if (!lastPeriod || diffDays(lastPeriod.start, today) < 0) return { ...base, lastPeriod };

  const cycleDay = diffDays(lastPeriod.start, today) + 1;
  const inPeriod = diffDays(lastPeriod.end, today) <= 1 && cycleDay <= Math.max(avgPeriod, lastPeriod.length) + 1;
  const nextStart = addDays(lastPeriod.start, avgCycle);
  const lateBy = Math.max(0, diffDays(nextStart, today));

  const current = cycleFor(nextStart, avgCycle, avgPeriod);
  // If late, shift future predictions so they start from today.
  const first = lateBy > 0 ? today : nextStart;
  const upcoming = Array.from({ length: count }, (_, i) => cycleFor(addDays(first, i * avgCycle), avgCycle, avgPeriod));

  return { ...base, lastPeriod, cycleDay, inPeriod, nextStart, lateBy, current, upcoming };
}

export interface DayMark {
  predictedPeriod?: boolean;
  fertile?: boolean;
  ovulation?: boolean;
}

/** Map of date -> prediction marks, for the calendar. */
export function predictionMarks(p: Prediction, today: string): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();
  const mark = (d: string, m: DayMark) => marks.set(d, { ...marks.get(d), ...m });
  const cycles = p.current ? [p.current, ...p.upcoming] : p.upcoming;
  const lastStart = p.lastPeriod?.start;
  for (const c of cycles) {
    for (let d = c.fertileStart; d <= c.fertileEnd; d = addDays(d, 1)) {
      if (!lastStart || d > lastStart) mark(d, { fertile: true });
    }
    if (!lastStart || c.ovulation > lastStart) mark(c.ovulation, { ovulation: true });
  }
  for (const c of p.upcoming) {
    for (let d = c.start; d <= c.end; d = addDays(d, 1)) {
      if (d > today) mark(d, { predictedPeriod: true });
    }
  }
  return marks;
}
