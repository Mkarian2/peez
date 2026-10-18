import { createContext, useContext } from 'react';
import type { Vault } from '../db/vault';
import type { Settings } from '../domain/types';

export interface AppContextValue {
  vault: Vault;
  settings: Settings;
  /** Bumped whenever data changes, to trigger recomputation. */
  version: number;
  refresh: () => void;
  updateSettings: (s: Settings) => Promise<void>;
  lock: () => void;
  toast: (msg: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
