'use client';

import Link from 'next/link';
import { useState } from 'react';
import { clsx } from '@/lib/clsx';

type Year = { year: number; flown: number; success: number; failure: number; partial: number };

/**
 * Flights per year, stacked by outcome.
 *
 * Every bar links to the catalogue filtered on that year, so the figure and the
 * list it summarises can be checked against each other.
 */
export function CadenceChart({ data }: { data: Year[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.flown));

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex items-end gap-[3px] overflow-x-auto pb-1" role="list">
        {data.map((d, i) => {
          const h = (d.flown / max) * 100;
          const active = hover === d.year;
          return (
            <Link
              key={d.year}
              href={`/vols?vue=past&du=${d.year}-01-01&au=${d.year}-12-31`}
              role="listitem"
              onMouseEnter={() => setHover(d.year)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.year)}
              onBlur={() => setHover(null)}
              title={`${d.year} — ${d.flown} vols partis`}
              className="group relative flex min-w-[9px] flex-1 flex-col justify-end"
              style={{ height: 132, '--i': i } as React.CSSProperties}
            >
              <span
                className={clsx(
                  'relative flex w-full flex-col-reverse overflow-hidden rounded-[2px] transition-all duration-300',
                  active ? 'brightness-125' : '',
                )}
                style={{
                  height: `${Math.max(h, 1.5)}%`,
                  transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <span className="w-full bg-ion/70" style={{ flexGrow: d.success }} />
                {d.partial ? <span className="w-full bg-warn" style={{ flexGrow: d.partial }} /> : null}
                {d.failure ? <span className="w-full bg-fail" style={{ flexGrow: d.failure }} /> : null}
              </span>
              <span
                aria-hidden
                className={clsx(
                  'pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded border border-hairline-2',
                  'bg-surface px-1.5 py-0.5 font-mono text-[10px] tabular text-ink transition-opacity duration-200',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              >
                {d.flown}
              </span>
            </Link>
          );
        })}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-ink-4">
        <span className="font-mono tabular">
          {data[0]?.year} — {data[data.length - 1]?.year}
        </span>
        <span className="flex items-center gap-3">
          <Legend className="bg-ion/70" label="Réussis" />
          <Legend className="bg-warn" label="Partiels" />
          <Legend className="bg-fail" label="Échecs" />
        </span>
      </figcaption>
    </figure>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-ink-3">
      <span aria-hidden className={clsx('h-2 w-2 rounded-[1px]', className)} />
      {label}
    </span>
  );
}
