'use client';

import { useState } from 'react';
import { Timestamp } from '@/components/ui/launch-date';
import type { UpdateRow } from '@/lib/db/launches';

/**
 * Published change history for the mission.
 *
 * This is where a postponement shows up: the mission keeps its identity and its
 * page, and the schedule change is recorded as an entry rather than as a new flight.
 */
export function UpdateLog({ updates }: { updates: UpdateRow[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!updates.length) return null;

  const shown = expanded ? updates : updates.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y divide-hairline border-y border-hairline">
        {shown.map((u, i) => (
          <li
            key={u.id}
            style={{ '--i': i } as React.CSSProperties}
            className="rise flex flex-col gap-1 py-2.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="max-w-[70ch] text-xs leading-relaxed text-ink-2">{u.comment}</span>
              <Timestamp iso={u.created_on} className="shrink-0 font-mono text-[10px] text-ink-4" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-4">
              {u.created_by ? <span>par {u.created_by}</span> : null}
              {u.info_url ? (
                <a
                  href={u.info_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="truncate text-ion/80 underline underline-offset-2 transition-colors hover:text-ion"
                >
                  Source
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {updates.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[11px] text-ink-3 underline underline-offset-4 transition-colors hover:text-ion"
        >
          {expanded ? "Réduire l'historique" : `Afficher les ${updates.length - 5} entrées restantes`}
        </button>
      ) : null}
    </div>
  );
}
