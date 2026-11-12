export interface StorageHealth {
  persisted: boolean;
  hasOpfs: boolean;
  hasLocalStorage: boolean;
  hasCacheStorage: boolean;
  isInAppBrowser: boolean;
  isIosBrowserTab: boolean;
  isStandalone: boolean;
}

/**
 * Re-requests persistent storage whenever the user interacts with or unlocks Peez.
 * Browsers often reject `persist()` on the very first visit (0 site engagement),
 * but grant it on subsequent visits or after PWA installation if re-requested.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage) return false;
    if (navigator.storage.persisted) {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    if (navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
  return false;
}

/** Detect messaging / social in-app WebViews that aggressively wipe IndexedDB/site data. */
export function detectInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|Snapchat|TikTok|BytedanceWebview|GSA\/|wv\)/i.test(ua);
}

export function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    (typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches))
  );
}

/**
 * Safari on iOS evicts script-writable storage after 7 days of inactivity
 * unless the web app is added to the Home Screen (standalone mode).
 */
export function detectIosBrowserTab(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos =
    /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos && !detectStandalone();
}

export async function getStorageHealth(): Promise<StorageHealth> {
  const persisted = await ensurePersistentStorage();
  const hasOpfs = typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
  let hasLocalStorage = false;
  try {
    hasLocalStorage = typeof localStorage !== 'undefined' && localStorage.getItem('peez-vault-snapshot') !== null;
  } catch {
    hasLocalStorage = false;
  }
  const hasCacheStorage = typeof caches !== 'undefined';
  return {
    persisted,
    hasOpfs,
    hasLocalStorage,
    hasCacheStorage,
    isInAppBrowser: detectInAppBrowser(),
    isIosBrowserTab: detectIosBrowserTab(),
    isStandalone: detectStandalone(),
  };
}
