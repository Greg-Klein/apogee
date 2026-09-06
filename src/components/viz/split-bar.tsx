'use client';

import Link from 'next/link';
import { clsx } from '@/lib/clsx';

export type Segment = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: 'go' | 'warn' | 'fail' | 'ion' | 'neutral';
};

const FILL: Record<Segment['tone'], string> = {
  go: 'bg-go',
  warn: 'bg-warn',
  fail: 'bg-fail',
  ion: 'bg-ion',
  neutral: 'bg-ink-4',
};

/**
 * A breakdown that stays clickable: each share opens the launches behind it,
 * with the same period and filters that produced the figure.
 */
export function SplitBar({
  segments,
  total,
  emptyLabel,
}: {
  segments: Segment[];
  total: number;
  emptyLabel: string;
}) {
  if (!total) {
    return <p className="text-xs italic text-ink-4">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-2">
        {segments.map((s) => (
          <span
            key={s.key}
            className={clsx('h-full transition-[flex-grow] duration-500', FILL[s.tone])}
            style={{ flexGrow: s.count, transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {segments.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className="group flex items-baseline justify-between gap-3 rounded px-1 py-0.5 text-xs transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center gap-2 text-ink-2 group-hover:text-ink">
                <span aria-hidden className={clsx('h-2 w-2 shrink-0 rounded-[1px]', FILL[s.tone])} />
                {s.label}
              </span>
              <span className="font-mono tabular text-ink-3 group-hover:text-ion">
                {s.count}
                <span className="ml-1.5 text-[10px] text-ink-4">{Math.round((s.count / total) * 100)}%</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
