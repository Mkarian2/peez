import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSetUp } from './db/auth';
import type { Vault } from './db/vault';
import type { Settings as SettingsT } from './domain/types';
import { AppContext, type AppContextValue } from './ui/context';
import { Home } from './ui/Home';
import { Lock } from './ui/Lock';
import { Settings } from './ui/Settings';
import { Setup } from './ui/Setup';
import { Stats } from './ui/Stats';

type Phase = 'loading' | 'setup' | 'locked' | 'unlocked';
type Tab = 'home' | 'stats' | 'settings';

export function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [vault, setVault] = useState<Vault | null>(null);
  const [settings, setSettings] = useState<SettingsT | null>(null);

  useEffect(() => {
    isSetUp().then((ok) => setPhase(ok ? 'locked' : 'setup'));
  }, []);

  async function onUnlock(v: Vault) {
    setSettings(await v.getSettings());
    setVault(v);
    setPhase('unlocked');
  }

  const lock = useCallback(() => {
    setVault(null);
    setSettings(null);
    setPhase('locked');
  }, []);

  if (phase === 'loading') return <div className="center-screen muted">Loading…</div>;
  if (phase === 'setup') return <Setup onDone={onUnlock} />;
  if (phase === 'locked' || !vault || !settings) return <Lock onUnlock={onUnlock} />;
  return <Unlocked vault={vault} settings={settings} setSettings={setSettings} lock={lock} />;
}

function Unlocked({
  vault,
  settings,
  setSettings,
  lock,
}: {
  vault: Vault;
  settings: SettingsT;
  setSettings: (s: SettingsT) => void;
  lock: () => void;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const [version, setVersion] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-lock when the app has been in the background for too long.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= settings.lockAfterSeconds * 1000) lock();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [settings.lockAfterSeconds, lock]);

  const ctx = useMemo<AppContextValue>(
    () => ({
      vault,
      settings,
      version,
      refresh: () => setVersion((v) => v + 1),
      updateSettings: async (s) => {
        await vault.setSecret('settings', s);
        setSettings(s);
      },
      lock,
      toast: (msg) => {
        setToastMsg(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(''), 3500);
      },
    }),
    [vault, settings, version, setSettings, lock],
  );

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <header className="header">
          <span className="brand">💧 Peez</span>
          <button className="icon-btn" onClick={lock} aria-label="Lock">
            🔒
          </button>
        </header>
        <main className="content">
          {tab === 'home' && <Home />}
          {tab === 'stats' && <Stats />}
          {tab === 'settings' && <Settings />}
        </main>
        <nav className="tabbar">
          <TabButton icon="📅" label="Calendar" active={tab === 'home'} onClick={() => setTab('home')} />
          <TabButton icon="📈" label="Stats" active={tab === 'stats'} onClick={() => setTab('stats')} />
          <TabButton icon="⚙️" label="Settings" active={tab === 'settings'} onClick={() => setTab('settings')} />
        </nav>
        {toastMsg && <div className="toast">{toastMsg}</div>}
      </div>
    </AppContext.Provider>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`tab${active ? ' active' : ''}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
