'use client';

import Link from 'next/link';
import { LaunchDate } from '@/components/ui/launch-date';
import { LaunchStatusPill } from '@/components/ui/status';
import { clsx } from '@/lib/clsx';
import { Thumb } from '@/components/ui/imagery';
import type { LaunchListItem } from '@/lib/db/launches';

/** Tracks the pointer into CSS variables so the spotlight border costs no re-render. */
function trackSpot(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function LaunchCard({ launch, index = 0 }: { launch: LaunchListItem; index?: number }) {
  const shape = {
    lo: launch.date_lo,
    hi: launch.date_hi,
    kind: launch.precision_kind,
    label: launch.precision_label,
  };
  return (
    <article
      onPointerMove={trackSpot}
      style={{ '--i': index } as React.CSSProperties}
      className="rise spot group relative overflow-hidden rounded-xl border border-hairline bg-surface/50"
    >
      <Link href={`/vols/${launch.slug}`} className="flex h-full flex-col">
        <Thumb
          src={launch.image_thumb ?? launch.image_url}
          alt={`Photographie associée à ${launch.mission_name ?? launch.name}`}
          className="h-24 w-full rounded-b-none"
        />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium text-ink transition-colors group-hover:text-ion">
                {launch.mission_name ?? launch.name}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
                {launch.config_full_name ?? launch.config_name ?? '—'}
              </p>
            </div>
            <LaunchStatusPill
              phase={launch.phase}
              outcome={launch.outcome}
              statusId={launch.status_id}
              statusName={launch.status_name}
              short
            />
          </div>

          <div className="mt-auto flex flex-col gap-1.5 border-t border-hairline pt-3">
            <LaunchDate date={shape} net={launch.net} variant="short" className="text-xs text-ink-2" />
            <p className="truncate text-[11px] text-ink-3">
              {[launch.pad_name, launch.location_name].filter(Boolean).join(' · ') || 'Site non renseigné'}
            </p>
            {launch.serials ? (
              <p className="truncate font-mono text-[10px] text-ink-4">{launch.serials}</p>
            ) : null}
          </div>
        </div>
      </Link>
      <span
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ion',
          'transition-transform duration-500 group-hover:scale-x-100',
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
      />
    </article>
  );
}
