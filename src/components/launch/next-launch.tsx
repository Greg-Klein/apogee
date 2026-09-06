'use client';

import Link from 'next/link';
import { Countdown } from './countdown';
import { LaunchDate } from '@/components/ui/launch-date';
import { LaunchStatusPill } from '@/components/ui/status';
import { Eyebrow, Field } from '@/components/ui/primitives';
import { OrbitMark } from '@/components/viz/orbit-mark';
import { HeroBackdrop, MissionPatch } from '@/components/ui/imagery';
import { usePreferences } from '@/components/chrome/preferences';
import { formatClock } from '@/lib/domain/format';
import { isInstant, type PrecisionKind } from '@/lib/domain/precision';
import type { LaunchRow } from '@/lib/db/launches';

/**
 * The next flight, front and centre.
 *
 * Scope is global on purpose: the period selector further down the page moves the
 * indicators, never this block. A countdown appears only when the source gives a
 * target instant; a provisional status keeps it labelled as indicative.
 */
export function NextLaunchHero({
  launch,
  webcast,
}: {
  launch: LaunchRow;
  webcast: {
    url: string;
    publisher: string | null;
    type_name: string | null;
    is_live: number;
  } | null;
}) {
  const { timeZone } = usePreferences();
  const shape = {
    lo: launch.date_lo,
    hi: launch.date_hi,
    kind: launch.precision_kind,
    label: launch.precision_label,
  };
  // A countdown only makes sense before liftoff; in flight, the status says it all.
  const countdownEligible =
    launch.net !== null && isInstant(launch.precision_kind as PrecisionKind) && launch.phase === 'scheduled';
  const provisional = launch.status_id === 2 || launch.status_id === 8 || launch.status_id === 5;
  const windowStart = formatClock(launch.window_start, timeZone);
  const windowEnd = formatClock(launch.window_end, timeZone);
  const sameWindow = launch.window_start === launch.window_end;

  return (
    <section
      aria-labelledby="prochain-vol"
      className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-ground-2 to-ground"
    >
      <HeroBackdrop src={launch.image_url} credit={launch.image_credit} />
      <div aria-hidden className="grid-veil pointer-events-none absolute inset-0 opacity-40" />
      <OrbitMark className="pointer-events-none absolute -right-24 -top-32 h-[520px] w-[520px] opacity-[0.35] md:-right-10" />

      <div className="relative grid gap-8 p-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:p-9">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Eyebrow>Prochain vol</Eyebrow>
            <LaunchStatusPill
              phase={launch.phase}
              outcome={launch.outcome}
              statusId={launch.status_id}
              statusName={launch.status_name}
            />
            {launch.webcast_live ? <Eyebrow className="text-go">Direct en cours</Eyebrow> : null}
          </div>

          <div className="flex items-start gap-5">
            <MissionPatch
              src={launch.patch_url}
              name={launch.mission_name ?? launch.name}
              className="h-14 w-14 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
            />
            <div className="min-w-0">
              <h1 id="prochain-vol" className="text-3xl leading-none tracking-tighter text-ink md:text-5xl">
                {launch.mission_name ?? launch.name}
              </h1>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                {[launch.config_full_name, launch.pad_name, launch.location_name]
                  .filter(Boolean)
                  .join('  ·  ')}
              </p>
            </div>
          </div>

          {launch.mission_description ? (
            <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">{launch.mission_description}</p>
          ) : (
            <p className="max-w-[62ch] text-sm italic leading-relaxed text-ink-4">
              Objectif de mission non publié par la source.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/vols/${launch.slug}`}
              className="group inline-flex items-center gap-2 rounded-lg bg-ion px-4 py-2 text-sm font-medium text-ground transition-transform duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              Fiche complète
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            {webcast ? (
              <a
                href={webcast.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-lg border border-hairline-2 px-4 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-ion/40 hover:text-ink active:scale-[0.98]"
              >
                {webcast.is_live ? 'Direct officiel' : 'Retransmission'}
                <span className="font-mono text-[10px] text-ink-4">
                  {webcast.publisher ?? 'lien externe'}
                </span>
              </a>
            ) : (
              <span className="text-xs italic text-ink-4">Aucune retransmission référencée</span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 rounded-xl border border-white/12 bg-surface/55 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_16px_40px_-18px_rgb(0_0_0/0.7)] backdrop-blur-xl backdrop-saturate-150 md:-my-3 md:-mr-3">
          <div className="flex flex-col gap-3">
            <Eyebrow>
              {countdownEligible
                ? 'Compte à rebours'
                : launch.phase === 'in_flight'
                  ? 'Vol en cours'
                  : 'Programmation'}
            </Eyebrow>
            {countdownEligible && launch.net ? (
              <Countdown targetIso={launch.net} provisional={provisional} confirmed={false} />
            ) : launch.phase === 'in_flight' ? (
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2.5 font-mono text-lg tracking-tight text-ion">
                  <span aria-hidden className="breathe text-[9px]">
                    ◆
                  </span>
                  Décollage confirmé
                </span>
                <p className="max-w-[42ch] text-xs leading-relaxed text-ink-3">
                  Le lanceur a quitté le pas de tir. Le résultat s&apos;affichera dès que la source le
                  publiera.
                </p>
              </div>
            ) : (
              <p className="max-w-[42ch] text-xs leading-relaxed text-ink-3">
                Aucune heure cible publiée. Le compte à rebours n&apos;apparaît qu&apos;avec une heure connue.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Date de lancement"
              value={<LaunchDate date={shape} net={launch.net} />}
              hint={launch.precision_label ? `Précision source : ${launch.precision_label}` : undefined}
              className="col-span-2"
            />
            <Field
              label="Fenêtre"
              value={
                windowStart && windowEnd && !sameWindow
                  ? `${windowStart} → ${windowEnd}`
                  : windowStart
                    ? windowStart
                    : null
              }
              mono
            />
            <Field label="Orbite visée" value={launch.orbit_name} />
            <Field label="Type de mission" value={launch.mission_type} />
            <Field
              label="Probabilité météo"
              value={
                launch.probability !== null && launch.probability >= 0 ? `${launch.probability} %` : null
              }
              mono
            />
          </div>
        </div>
      </div>
    </section>
  );
}
