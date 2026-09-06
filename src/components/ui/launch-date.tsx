'use client';

import { usePreferences } from '@/components/chrome/preferences';
import {
  PRECISION_BADGE,
  PRECISION_NOTE,
  formatLaunchDate,
  formatLaunchDateShort,
  formatTimestamp,
  type DateShape,
} from '@/lib/domain/format';
import { clsx } from '@/lib/clsx';

/**
 * Precision-aware date.
 *
 * Server output is UTC; the client re-renders in the visitor's timezone once known.
 * A coarse precision is rendered coarsely and labelled, never widened into a fake hour.
 */
export function LaunchDate({
  date,
  net,
  variant = 'long',
  showBadge = true,
  className,
}: {
  date: DateShape;
  net?: string | null;
  variant?: 'long' | 'short';
  showBadge?: boolean;
  className?: string;
}) {
  const { timeZone } = usePreferences();
  const text = variant === 'long' ? formatLaunchDate(date, timeZone) : formatLaunchDateShort(date, timeZone);
  const badge = showBadge ? PRECISION_BADGE[date.kind] : null;
  const utc = net ? formatTimestamp(net, 'UTC') : null;

  return (
    <span className={clsx('inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <time
        suppressHydrationWarning
        dateTime={net ?? undefined}
        title={
          [PRECISION_NOTE[date.kind], utc ? `${utc} UTC` : null].filter(Boolean).join(' — ') || undefined
        }
        className="tabular"
      >
        {text}
      </time>
      {badge ? (
        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-4">{badge}</span>
      ) : null}
    </span>
  );
}

/** Timezone-aware timestamp for source metadata and update logs. */
export function Timestamp({ iso, className }: { iso: string | null; className?: string }) {
  const { timeZone } = usePreferences();
  if (!iso) return <span className={clsx('text-ink-4', className)}>—</span>;
  return (
    <time suppressHydrationWarning dateTime={iso} className={clsx('tabular', className)}>
      {formatTimestamp(iso, timeZone)}
    </time>
  );
}
