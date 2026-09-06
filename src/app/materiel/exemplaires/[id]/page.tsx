import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { LaunchDate } from '@/components/ui/launch-date';
import { LaunchStatusPill, Pill, RecoveryPill } from '@/components/ui/status';
import { Field, Note, SectionHead, EmptyBlock } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';
import { OrbitMark } from '@/components/viz/orbit-mark';

import { getDb } from '@/lib/db/client';
import { getVehicle, getVehicleFlights } from '@/lib/db/vehicles';
import { formatDuration, ordinalFr } from '@/lib/domain/format';
import type { LaunchOutcome, LaunchPhase } from '@/lib/domain/status';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  core: 'Étage central',
  side_booster: 'Booster latéral',
  spacecraft: 'Vaisseau',
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  if (!getDb()) return { title: 'Exemplaire' };
  const { id } = await params;
  const v = getVehicle(decodeURIComponent(id));
  if (!v) return { title: 'Exemplaire introuvable' };
  return {
    title: v.serial_number ?? v.name,
    description: `Historique de vols de l'exemplaire ${v.serial_number ?? v.name} (${v.model_name ?? 'modèle non renseigné'}).`,
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  if (!getDb()) return <SourceDown />;

  const { id } = await params;
  const vehicle = getVehicle(decodeURIComponent(id));
  if (!vehicle) notFound();

  const flights = getVehicleFlights(vehicle.id);
  const flown = flights.filter((f) => f.phase !== 'scheduled');
  const upcoming = flights.filter((f) => f.phase === 'scheduled');
  const firstFlight = flown[0];
  const lastFlight = flown[flown.length - 1];

  // The source's own totals can exceed what this snapshot holds; both are shown.
  const sourceExceedsSnapshot =
    vehicle.source_flights !== null && vehicle.source_flights > vehicle.recorded_flights;

  return (
    <article className="flex flex-col gap-12">
      <header className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-ground-2 to-ground">
        <div aria-hidden className="grid-veil pointer-events-none absolute inset-0 opacity-50" />
        <OrbitMark className="pointer-events-none absolute -right-40 -top-44 h-[500px] w-[500px] opacity-25" />

        <div className="relative flex flex-col gap-6 p-6 md:p-9">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[11px] text-ink-4">
            <Link href="/materiel" className="transition-colors hover:text-ion">
              Matériel
            </Link>
            <span aria-hidden>/</span>
            <span className="text-ink-3">Exemplaires</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={vehicle.status_name?.toLowerCase() === 'active' ? 'go' : 'neutral'}>
                  {vehicle.status_name ?? 'État non renseigné'}
                </Pill>
                {vehicle.in_space ? (
                  <Pill tone="ion" pulse>
                    Actuellement en vol
                  </Pill>
                ) : null}
              </div>

              <div>
                <h1 className="font-mono text-4xl leading-none tracking-tighter text-ink md:text-6xl">
                  {vehicle.serial_number ?? vehicle.name}
                </h1>
                <p className="mt-2 text-sm text-ink-3">
                  {vehicle.model_name ?? 'Modèle non renseigné'}
                  {vehicle.model_id ? (
                    <>
                      {' · '}
                      <Link
                        href={`/materiel/modeles/${encodeURIComponent(vehicle.model_id)}`}
                        className="text-ion transition-opacity hover:opacity-75"
                      >
                        fiche du modèle
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>

              {vehicle.details ? (
                <p className="max-w-[68ch] text-sm leading-relaxed text-ink-2">{vehicle.details}</p>
              ) : null}

              <Note>
                L&apos;absence de vol récent n&apos;implique pas un retrait&nbsp;: l&apos;état affiché est
                celui publié par la source.
              </Note>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-hairline pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Field
                label="Vols répertoriés"
                value={String(vehicle.recorded_flights)}
                mono
                hint={
                  sourceExceedsSnapshot
                    ? `La source en annonce ${vehicle.source_flights} au total`
                    : 'Participations présentes dans cet instantané'
                }
              />
              <Field
                label="Affectations à venir"
                value={vehicle.recorded_upcoming ? String(vehicle.recorded_upcoming) : '0'}
                mono
                hint="Comptées séparément des vols effectués"
              />
              <Field
                label="Premier vol répertorié"
                value={
                  firstFlight ? (
                    <LaunchDate
                      date={{
                        lo: firstFlight.date_lo,
                        hi: firstFlight.date_hi,
                        kind: firstFlight.precision_kind as never,
                      }}
                      net={firstFlight.net}
                      variant="short"
                      showBadge={false}
                    />
                  ) : null
                }
              />
              <Field
                label="Dernier vol répertorié"
                value={
                  lastFlight ? (
                    <LaunchDate
                      date={{
                        lo: lastFlight.date_lo,
                        hi: lastFlight.date_hi,
                        kind: lastFlight.precision_kind as never,
                      }}
                      net={lastFlight.net}
                      variant="short"
                      showBadge={false}
                    />
                  ) : null
                }
              />
              <Field
                label="Récupérations"
                value={
                  vehicle.source_attempted_landings !== null
                    ? `${vehicle.source_successful_landings ?? 0} sur ${vehicle.source_attempted_landings} tentatives`
                    : null
                }
                mono
              />
              <Field
                label="Rotation la plus courte"
                value={formatDuration(vehicle.fastest_turnaround)}
                mono
              />
              {vehicle.time_in_space ? (
                <Field
                  label="Temps cumulé dans l'espace"
                  value={formatDuration(vehicle.time_in_space)}
                  mono
                  className="col-span-2"
                />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="historique">
        <SectionHead
          id="historique"
          title="Historique de vols"
          count={flights.length}
          description="Chronologique. Le rang de vol affiché est celui enregistré pour chaque mission, pas le total actuel de l'exemplaire."
        />

        {flights.length ? (
          <ol className="flex flex-col divide-y divide-hairline border-y border-hairline">
            {flights.map((f, i) => (
              <li
                key={f.assignment_id}
                style={{ '--i': Math.min(i, 24) } as React.CSSProperties}
                className="rise group"
              >
                <div className="grid gap-x-4 gap-y-2 px-2 py-3.5 md:grid-cols-[3.5rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] md:items-center">
                  <span className="font-mono text-sm tabular text-ink-4">
                    {f.flight_number ? ordinalFr(f.flight_number) : '—'}
                  </span>

                  <Link href={`/vols/${f.slug}`} className="min-w-0">
                    <span className="block truncate text-sm text-ink transition-colors group-hover:text-ion">
                      {f.launch_name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
                      {[ROLE_LABEL[f.role] ?? f.role, f.pad_name].filter(Boolean).join(' · ')}
                    </span>
                  </Link>

                  <LaunchDate
                    date={{
                      lo: f.date_lo,
                      hi: f.date_hi,
                      kind: f.precision_kind as never,
                      label: f.precision_label,
                    }}
                    net={f.net}
                    variant="short"
                    className="text-xs text-ink-2"
                  />

                  <span className="flex flex-wrap items-center gap-1.5">
                    <LaunchStatusPill
                      phase={f.phase as LaunchPhase}
                      outcome={f.outcome as LaunchOutcome}
                      statusId={f.phase === 'flown' ? 3 : 2}
                      statusName={f.phase}
                      short
                    />
                    <RecoveryPill recovery={f.recovery} short />
                  </span>

                  <span className="min-w-0 font-mono text-[11px] text-ink-3">
                    {f.turnaround ? (
                      <>
                        <span className="text-ink-4">+</span> {formatDuration(f.turnaround)}
                        <span className="ml-1 text-[9px] text-ink-4">depuis le vol précédent</span>
                      </>
                    ) : f.reused === 0 ? (
                      <span className="text-ink-4">premier vol</span>
                    ) : (
                      <span className="text-ink-4">délai non calculable</span>
                    )}
                  </span>
                </div>

                {f.landing_description ? (
                  <p className="max-w-[85ch] px-2 pb-3 text-[11px] leading-relaxed text-ink-4">
                    {f.landing_description}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyBlock
            title="Aucune participation répertoriée pour cet exemplaire."
            hint="La source connaît cet exemplaire mais aucun de ses vols n'est présent dans cet instantané."
          />
        )}

        {upcoming.length ? (
          <p className="mt-4 text-[11px] text-ink-3">
            <span className="font-mono tabular text-ink-2">{upcoming.length}</span> affectation
            {upcoming.length > 1 ? 's' : ''} à venir, comptée
            {upcoming.length > 1 ? 's' : ''} à part des vols effectués. Une affectation future reste
            provisoire.
          </p>
        ) : null}
      </section>

      <section>
        <SectionHead title="Explorer" />
        <div className="flex flex-wrap gap-3">
          {vehicle.model_id ? (
            <Link
              href={`/materiel?modele=${encodeURIComponent(vehicle.model_id)}`}
              className="rounded-lg border border-hairline bg-surface/50 px-3 py-2 text-xs text-ink-2 transition-colors hover:border-ion/40 hover:text-ink active:scale-[0.98]"
            >
              Autres exemplaires de ce modèle
            </Link>
          ) : null}
          <Link
            href={`/vols?q=${encodeURIComponent(vehicle.serial_number ?? vehicle.name)}`}
            className="rounded-lg border border-hairline bg-surface/50 px-3 py-2 text-xs text-ink-2 transition-colors hover:border-ion/40 hover:text-ink active:scale-[0.98]"
          >
            Rechercher {vehicle.serial_number ?? vehicle.name} dans le catalogue
          </Link>
        </div>
      </section>
    </article>
  );
}
