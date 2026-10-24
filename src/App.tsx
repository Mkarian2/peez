import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSetUp } from './db/auth';
import type { Vault } from './db/vault';
import type { Settings as SettingsT } from './domain/types';
import { getInitialLang, I18nContext, saveLang, STRINGS, useI18n, type Lang } from './i18n';
import { LangToggle } from './ui/common';
import { AppContext, type AppContextValue } from './ui/context';
import { Home } from './ui/Home';
import { Lock } from './ui/Lock';
import { Settings } from './ui/Settings';
import { Setup } from './ui/Setup';
import { Stats } from './ui/Stats';

type Phase = 'loading' | 'setup' | 'locked' | 'unlocked' | 'storageError';
type Tab = 'home' | 'stats' | 'settings';

export function App() {
  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const [phase, setPhase] = useState<Phase>('loading');
  const [vault, setVault] = useState<Vault | null>(null);
  const [settings, setSettings] = useState<SettingsT | null>(null);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
  }, []);

  const i18n = useMemo(() => ({ lang, setLang, t: STRINGS[lang] }), [lang, setLang]);

  useEffect(() => {
    isSetUp().then(
      (ok) => setPhase(ok ? 'locked' : 'setup'),
      // IndexedDB can't be opened (e.g. site data blocked by browser settings).
      (e) => {
        console.error('Peez: cannot open local database', e);
        setPhase('storageError');
      },
    );
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

  return (
    <I18nContext.Provider value={i18n}>
      {phase === 'loading' ? (
        <div className="center-screen muted">{i18n.t.loading}</div>
      ) : phase === 'storageError' ? (
        <div className="center-screen">
          <div className="card setup">
            <div className="logo">⚠️</div>
            <h1>{i18n.t.storageErrorTitle}</h1>
            <p>{i18n.t.storageErrorBody}</p>
          </div>
        </div>
      ) : phase === 'setup' ? (
        <Setup onDone={onUnlock} />
      ) : phase === 'locked' || !vault || !settings ? (
        <Lock onUnlock={onUnlock} />
      ) : (
        <Unlocked vault={vault} settings={settings} setSettings={setSettings} lock={lock} />
      )}
    </I18nContext.Provider>
  );
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
  const { t } = useI18n();
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
          <div className="row">
            <LangToggle />
            <button className="icon-btn" onClick={lock} aria-label={t.lock}>
              🔒
            </button>
          </div>
        </header>
        <main className="content">
          {tab === 'home' && <Home />}
          {tab === 'stats' && <Stats />}
          {tab === 'settings' && <Settings />}
        </main>
        <nav className="tabbar">
          <TabButton icon="📅" label={t.tabs.calendar} active={tab === 'home'} onClick={() => setTab('home')} />
          <TabButton icon="📈" label={t.tabs.stats} active={tab === 'stats'} onClick={() => setTab('stats')} />
          <TabButton icon="⚙️" label={t.tabs.settings} active={tab === 'settings'} onClick={() => setTab('settings')} />
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
