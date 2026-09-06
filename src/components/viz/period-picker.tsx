'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { clsx } from '@/lib/clsx';
import { PERIODS, type PeriodKey } from '@/lib/domain/periods';

/**
 * Period selector for the indicators only.
 * The rail slides between options so the change of scope reads as one movement.
 */
export function PeriodPicker({ value }: { value: PeriodKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const index = PERIODS.findIndex((p) => p.key === value);

  const select = (key: PeriodKey) => {
    const next = new URLSearchParams(params?.toString());
    next.set('periode', key);
    startTransition(() => router.replace(`/?${next.toString()}#indicateurs`, { scroll: false }));
  };

  return (
    <div
      role="radiogroup"
      aria-label="Période des indicateurs"
      className={clsx(
        'relative flex rounded-lg border border-hairline bg-surface/60 p-0.5',
        pending && 'opacity-70',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 rounded-md bg-surface-2 transition-transform duration-300"
        style={{
          width: `calc((100% - 4px) / ${PERIODS.length})`,
          transform: `translateX(${index * 100}%)`,
          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
          left: 2,
        }}
      />
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="radio"
          aria-checked={p.key === value}
          onClick={() => select(p.key)}
          className={clsx(
            'relative z-10 flex-1 whitespace-nowrap px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200',
            p.key === value ? 'text-ink' : 'text-ink-4 hover:text-ink-2',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
