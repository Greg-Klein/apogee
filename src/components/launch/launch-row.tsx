'use client';

import Link from 'next/link';
import { LaunchDate } from '@/components/ui/launch-date';
import { LaunchStatusPill, RecoveryPill } from '@/components/ui/status';
import type { LaunchListItem } from '@/lib/db/launches';
import type { RecoveryResult } from '@/lib/domain/status';

/**
 * One catalogue row.
 *
 * The whole row opens the flight; the vehicle serial is a nested link that jumps
 * straight to the article, so the two navigation paths stay distinct.
 */
export function LaunchRow({ launch, index }: { launch: LaunchListItem; index: number }) {
  const shape = {
    lo: launch.date_lo,
    hi: launch.date_hi,
    kind: launch.precision_kind,
    label: launch.precision_label,
  };
  const recoveries = (launch.recoveries?.split(',').filter(Boolean) ?? []) as RecoveryResult[];
  const serials = launch.serials?.split(' · ').filter(Boolean) ?? [];

  return (
    <li
      style={{ '--i': index } as React.CSSProperties}
      className="rise group relative border-b border-hairline transition-colors duration-200 hover:bg-surface/50"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-3 py-3 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] md:items-center">
        {/* Mission */}
        <div className="min-w-0">
          <Link href={`/vols/${launch.slug}`} className="block min-w-0">
            <span className="block truncate text-sm text-ink transition-colors group-hover:text-ion">
              {launch.mission_name ?? launch.name}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
              {[launch.designator, launch.mission_type].filter(Boolean).join(' · ') ||
                'Objectif non renseigné'}
            </span>
          </Link>
        </div>

        {/* Date */}
        <div className="min-w-0">
          <LaunchDate date={shape} net={launch.net} variant="short" className="text-xs text-ink-2" />
        </div>

        {/* Status and recovery, kept on separate lines because they are separate facts */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <LaunchStatusPill
            phase={launch.phase}
            outcome={launch.outcome}
            statusId={launch.status_id}
            statusName={launch.status_name}
            short
          />
          {recoveries.map((r, i) => (
            <RecoveryPill key={`${r}-${i}`} recovery={r} short />
          ))}
        </div>

        {/* Vehicle */}
        <div className="min-w-0 text-xs text-ink-2">
          <span className="block truncate">{launch.config_full_name ?? launch.config_name ?? '—'}</span>
          {serials.length ? (
            <span className="mt-0.5 flex flex-wrap gap-1.5">
              {serials.map((s) => (
                <Link
                  key={s}
                  href={`/materiel?q=${encodeURIComponent(s)}`}
                  className="relative z-10 font-mono text-[10px] text-ink-3 underline decoration-hairline-2 underline-offset-2 transition-colors hover:text-ion hover:decoration-ion"
                >
                  {s}
                </Link>
              ))}
            </span>
          ) : (
            <span className="mt-0.5 block font-mono text-[10px] text-ink-4">Exemplaire non identifié</span>
          )}
        </div>

        {/* Site and payload summary */}
        <div className="min-w-0 text-xs text-ink-3">
          <span className="block truncate">{launch.pad_name ?? 'Pas de tir non renseigné'}</span>
          <span className="mt-0.5 block truncate text-[10px] text-ink-4">
            {launch.payload_count > 0
              ? `${launch.payload_count} entrée${launch.payload_count > 1 ? 's' : ''} de charge utile`
              : 'Charge utile non détaillée'}
            {launch.programs ? ` · ${launch.programs}` : ''}
          </span>
        </div>
      </div>
    </li>
  );
}
