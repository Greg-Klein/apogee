'use client';

import { useState } from 'react';
import { usePreferences } from './preferences';
import { clsx } from '@/lib/clsx';

/**
 * Timezone selector. The choice applies everywhere and persists locally;
 * UTC stays one click away because the source records instants in UTC.
 */
export function TimezoneSwitch() {
  const { timeZone, localZone, hydrated, setTimeZone } = usePreferences();
  const [open, setOpen] = useState(false);

  const options = Array.from(
    new Set(['UTC', localZone, 'America/Los_Angeles', 'America/New_York', 'Europe/Paris']),
  );
  const shortLabel = (tz: string) => (tz === 'UTC' ? 'UTC' : (tz.split('/').pop()?.replace(/_/g, ' ') ?? tz));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          'flex items-center gap-1.5 rounded-lg border border-hairline bg-surface/60 px-2.5 py-1.5',
          'font-mono text-[10px] uppercase tracking-wider text-ink-3 transition-colors duration-200',
          'hover:border-hairline-2 hover:text-ink-2 active:scale-[0.98]',
        )}
      >
        <GlobeGlyph />
        <span suppressHydrationWarning>{hydrated ? shortLabel(timeZone) : 'UTC'}</span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            aria-label="Fuseau horaire"
            className="rise absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-lg border border-hairline-2 bg-surface shadow-[0_20px_50px_-15px_rgb(0_0_0/0.7)]"
          >
            {options.map((tz) => (
              <li key={tz}>
                <button
                  type="button"
                  role="option"
                  aria-selected={tz === timeZone}
                  onClick={() => {
                    setTimeZone(tz);
                    setOpen(false);
                  }}
                  className={clsx(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors',
                    tz === timeZone ? 'bg-ion-wash text-ink' : 'text-ink-2 hover:bg-surface-2',
                  )}
                >
                  <span className="truncate">
                    {tz === localZone && tz !== 'UTC' ? `${shortLabel(tz)} (local)` : shortLabel(tz)}
                  </span>
                  <span className="font-mono text-[9px] text-ink-4">
                    {tz === 'UTC' ? 'Z' : tz.split('/')[0]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function GlobeGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="8" cy="8" rx="2.6" ry="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.4 6h11.2M2.4 10h11.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
