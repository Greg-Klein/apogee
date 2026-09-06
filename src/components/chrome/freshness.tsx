'use client';

import { usePreferences } from './preferences';
import { formatTimestamp } from '@/lib/domain/format';
import type { SyncMeta } from '@/lib/db/client';

/**
 * Data provenance strip.
 *
 * Two distinct dates: when this snapshot was pulled, and when the source itself
 * last touched any of these records. Nothing here claims real time.
 */
export function Freshness({ meta }: { meta: SyncMeta | null }) {
  const { timeZone } = usePreferences();
  if (!meta) {
    return (
      <p className="text-[11px] text-warn">
        Aucun instantané local. Les écrans affichent leur état « source indisponible ».
      </p>
    );
  }
  const synced = formatTimestamp(meta.syncedAt, timeZone);
  const sourceUpdated = formatTimestamp(meta.sourceLastUpdated, timeZone);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-ink-3">
      <span>
        Source&nbsp;: <span className="text-ink-2">Launch Library 2</span>
      </span>
      <span suppressHydrationWarning>
        Dernière synchronisation réussie&nbsp;: <span className="tabular text-ink-2">{synced ?? '—'}</span>
      </span>
      <span suppressHydrationWarning>
        Dernière modification côté source&nbsp;:{' '}
        <span className="tabular text-ink-2">{sourceUpdated ?? '—'}</span>
      </span>
      <span className="tabular">{meta.launchCount} vols dans l&apos;instantané</span>
    </div>
  );
}
