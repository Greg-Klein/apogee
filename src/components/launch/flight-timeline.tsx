'use client';

import { useState } from 'react';
import { formatRelative } from '@/lib/domain/format';
import { clsx } from '@/lib/clsx';
import type { TimelineRow } from '@/lib/db/launches';

/**
 * The planned flight profile.
 *
 * Every entry here is a relative offset published before the flight, so the whole
 * block is labelled as planned. It is never presented as a record of what happened:
 * the source gives no confirmed timestamps per event.
 */
export function FlightTimeline({ events }: { events: TimelineRow[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!events.length) return null;

  const shown = expanded ? events : events.slice(0, 8);
  const min = events[0].offset_sec;
  const max = events[events.length - 1].offset_sec;
  const span = Math.max(1, max - min);

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-lg border border-warn/20 bg-warn/5 px-3 py-2 text-[11px] leading-relaxed text-warn/90">
        <span aria-hidden className="mt-[2px]">
          ▲
        </span>
        <span>
          Profil de vol prévu, publié avant le lancement. Ces horaires sont des consignes, pas des événements
          confirmés : la source ne fournit pas d&apos;heure réelle par étape.
        </span>
      </p>

      <ol className="relative flex flex-col">
        <span aria-hidden className="absolute bottom-2 left-[5.5rem] top-2 w-px bg-hairline" />
        {shown.map((e, i) => {
          const position = ((e.offset_sec - min) / span) * 100;
          return (
            <li
              key={e.seq}
              style={{ '--i': i } as React.CSSProperties}
              className="rise group relative flex items-start gap-4 py-1.5"
            >
              <span
                className={clsx(
                  'w-[4.5rem] shrink-0 text-right font-mono text-[11px] tabular',
                  e.offset_sec === 0 ? 'text-ion' : 'text-ink-3',
                )}
              >
                {formatRelative(e.offset_sec)}
              </span>
              <span className="relative z-10 mt-[5px] flex h-2 w-2 shrink-0 items-center justify-center">
                <span
                  className={clsx(
                    'h-1.5 w-1.5 rounded-full ring-4 ring-ground transition-transform duration-300 group-hover:scale-125',
                    e.offset_sec === 0 ? 'bg-ion' : e.offset_sec < 0 ? 'bg-ink-4' : 'bg-go',
                  )}
                  style={{ opacity: 0.5 + position / 220 }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-ink">{e.abbrev}</span>
                {e.description ? (
                  <span className="mt-0.5 block max-w-[70ch] text-[11px] leading-relaxed text-ink-3">
                    {e.description}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {events.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[11px] text-ink-3 underline underline-offset-4 transition-colors hover:text-ion"
        >
          {expanded ? 'Réduire la chronologie' : `Afficher les ${events.length - 8} étapes restantes`}
        </button>
      ) : null}
    </div>
  );
}
