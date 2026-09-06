'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * Display preferences, held locally.
 *
 * The server always renders UTC, then this provider re-renders once the stored
 * timezone is known. Nothing here is sent anywhere: no account exists.
 */

const STORAGE_KEY = 'spacex-board.timezone';
const CHANGE_EVENT = 'apogee:timezone';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readDetectedZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

type Prefs = {
  timeZone: string;
  /** False until the stored value has been read, so the first paint stays deterministic. */
  hydrated: boolean;
  localZone: string;
  setTimeZone: (tz: string) => void;
};

const PreferencesContext = createContext<Prefs>({
  timeZone: 'UTC',
  hydrated: false,
  localZone: 'UTC',
  setTimeZone: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  /*
   * The timezone lives in localStorage, which is an external store: reading it in an
   * effect would render once with UTC and then immediately again. `useSyncExternalStore`
   * expresses the same thing without that cascade, and its server snapshot pins the
   * first paint to UTC so server and client markup agree.
   */
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const detected = useSyncExternalStore(subscribe, readDetectedZone, () => null);

  const [override, setOverride] = useState<string | null>(null);

  const setTimeZone = useCallback((tz: string) => {
    setOverride(tz);
    try {
      window.localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      /* storage unavailable: the choice applies now but does not persist */
    }
    // Wake any other tab and this one's own subscribers.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo<Prefs>(() => {
    const localZone = detected ?? 'UTC';
    return {
      timeZone: override ?? stored ?? detected ?? 'UTC',
      hydrated: detected !== null,
      localZone,
      setTimeZone,
    };
  }, [override, stored, detected, setTimeZone]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => useContext(PreferencesContext);
