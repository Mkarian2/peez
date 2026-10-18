export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';

export const FLOWS: { value: Flow; label: string }[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export const SYMPTOMS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Back pain',
  'Tender breasts',
  'Acne',
  'Fatigue',
  'Nausea',
  'Cravings',
  'Insomnia',
  'Diarrhea',
  'Constipation',
];

export const MOODS = ['Happy', 'Calm', 'Sensitive', 'Sad', 'Irritable', 'Anxious', 'Energetic', 'Low energy'];

/** One day of logged data. Dates are local calendar dates: YYYY-MM-DD. */
export interface DayEntry {
  date: string;
  period: boolean;
  flow?: Flow;
  symptoms: string[];
  moods: string[];
  note: string;
}

/** What is stored & synced: an entry plus last-write-wins metadata. */
export interface SyncRecord {
  date: string;
  updatedAt: number;
  deviceId: string;
  deleted: boolean;
  entry?: DayEntry;
}

export interface Settings {
  defaultCycleLength: number;
  defaultPeriodLength: number;
  lockAfterSeconds: number;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  lockAfterSeconds: 60,
};

export function emptyEntry(date: string): DayEntry {
  return { date, period: false, symptoms: [], moods: [], note: '' };
}

export function isEntryEmpty(e: DayEntry): boolean {
  return !e.period && !e.flow && e.symptoms.length === 0 && e.moods.length === 0 && e.note.trim() === '';
}
