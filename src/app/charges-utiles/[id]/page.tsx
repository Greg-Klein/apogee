import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { LaunchDate } from '@/components/ui/launch-date';
import { LaunchStatusPill, Pill } from '@/components/ui/status';
import { Field, Note, SectionHead, EmptyBlock } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';
import { OrbitMark } from '@/components/viz/orbit-mark';

import { getDb } from '@/lib/db/client';
import { getPayload, getPayloadFlights } from '@/lib/db/payloads';
import { formatMass } from '@/lib/domain/format';
import type { LaunchOutcome, LaunchPhase } from '@/lib/domain/status';

export const dynamic = 'force-dynamic';

type Flight = {
  id: string;
  destination: string | null;
  amount: number | null;
  source_kind: string;
  slug: string;
  launch_name: string;
  phase: string;
  outcome: string;
  net: string | null;
  date_lo: number | null;
  date_hi: number | null;
  precision_kind: string;
  precision_label: string | null;
  orbit_name: string | null;
  pad_name: string | null;
  location_name: string | null;
  mission_type: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  if (!getDb()) return { title: 'Charge utile' };
  const { id } = await params;
  const p = getPayload(decodeURIComponent(id));
  if (!p) return { title: 'Charge utile introuvable' };
  return {
    title: p.name,
    description: p.description?.slice(0, 180) ?? `Charge utile ${p.name}, ${p.type ?? 'type non renseigné'}.`,
  };
}

export default async function PayloadPage({ params }: { params: Promise<{ id: string }> }) {
  if (!getDb()) return <SourceDown />;

  const { id } = await params;
  const payload = getPayload(decodeURIComponent(id));
  if (!payload) notFound();

  const flights = getPayloadFlights(payload.id) as unknown as Flight[];
  const isVehicle = payload.source_kind === 'spacecraft';

  return (
    <article className="flex flex-col gap-12">
      <header className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-ground-2 to-ground">
        <div aria-hidden className="grid-veil pointer-events-none absolute inset-0 opacity-50" />
        <OrbitMark className="pointer-events-none absolute -right-40 -top-44 h-[500px] w-[500px] opacity-25" />

        <div className="relative flex flex-col gap-6 p-6 md:p-9">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[11px] text-ink-4">
            <Link href="/charges-utiles" className="transition-colors hover:text-ion">
              Charges utiles
            </Link>
            <span aria-hidden>/</span>
            <span className="truncate text-ink-3">{payload.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="neutral">{payload.type ?? 'Type non renseigné'}</Pill>
                {isVehicle ? <Pill tone="ion">Véhicule embarqué</Pill> : null}
              </div>

              <h1 className="text-3xl leading-none tracking-tighter text-ink md:text-5xl">{payload.name}</h1>

              {payload.description ? (
                <p className="max-w-[68ch] text-sm leading-relaxed text-ink-2">{payload.description}</p>
              ) : (
                <p className="max-w-[68ch] text-sm italic leading-relaxed text-ink-4">
                  Description non publiée. Cette charge peut relever de détails non divulgués.
                </p>
              )}

              {isVehicle ? (
                <Note>
                  Ce véhicule est répertorié séparément de son contenu. Le fret qu&apos;il transporte
                  n&apos;est pas détaillé par la source et n&apos;est donc pas listé ici.
                </Note>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-1">
                {payload.info_url ? (
                  <a
                    href={payload.info_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-ion transition-opacity hover:opacity-75"
                  >
                    Page officielle <span aria-hidden>↗</span>
                  </a>
                ) : null}
                {payload.wiki_url ? (
                  <a
                    href={payload.wiki_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-ion transition-opacity hover:opacity-75"
                  >
                    Wikipédia <span aria-hidden>↗</span>
                  </a>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-hairline pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Field label="Organisation opératrice" value={payload.operator} />
              <Field label="Constructeur" value={payload.manufacturer} />
              <Field label="Masse" value={formatMass(payload.mass_kg)} mono />
              <Field label="Vols répertoriés" value={String(flights.length)} mono />
              <Field
                label="Destination"
                value={
                  flights
                    .map((f) => f.destination)
                    .filter(Boolean)
                    .join(' · ') || null
                }
                className="col-span-2"
              />
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="vols">
        <SectionHead
          id="vols"
          title="Vols porteurs"
          count={flights.length}
          description="Chaque association à un vol est conservée séparément : un même objet transporté deux fois apparaît deux fois."
        />

        {flights.length ? (
          <ul className="flex flex-col gap-3">
            {flights.map((f, i) => (
              <li key={f.id} style={{ '--i': i } as React.CSSProperties} className="rise">
                <Link
                  href={`/vols/${f.slug}`}
                  className="group flex flex-col gap-3 rounded-xl border border-hairline bg-surface/40 p-4 transition-colors duration-200 hover:border-ion/35"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm text-ink transition-colors group-hover:text-ion">
                        {f.launch_name}
                      </h3>
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
                        {[f.mission_type, f.pad_name, f.location_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <LaunchStatusPill
                      phase={f.phase as LaunchPhase}
                      outcome={f.outcome as LaunchOutcome}
                      statusId={f.phase === 'flown' ? 3 : 2}
                      statusName={f.phase}
                      short
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3 sm:grid-cols-4">
                    <Field
                      label="Date"
                      value={
                        <LaunchDate
                          date={{
                            lo: f.date_lo,
                            hi: f.date_hi,
                            kind: f.precision_kind as never,
                            label: f.precision_label,
                          }}
                          net={f.net}
                          variant="short"
                        />
                      }
                    />
                    <Field label="Orbite visée" value={f.orbit_name} />
                    <Field label="Destination" value={f.destination} />
                    <Field
                      label="Quantité"
                      value={f.amount !== null ? String(f.amount) : null}
                      mono
                      hint={f.amount && f.amount > 1 ? 'Lot documenté comme un ensemble' : undefined}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyBlock
            title="Aucun vol porteur rattaché à cette entrée."
            hint="La charge utile existe dans la source mais aucun de ses vols n'est présent dans cet instantané."
          />
        )}
      </section>

      <section>
        <SectionHead title="Explorer" />
        <div className="flex flex-wrap gap-3">
          {payload.operator ? (
            <Link
              href={`/charges-utiles?operateur=${encodeURIComponent(payload.operator)}`}
              className="rounded-lg border border-hairline bg-surface/50 px-3 py-2 text-xs text-ink-2 transition-colors hover:border-ion/40 hover:text-ink active:scale-[0.98]"
            >
              Autres charges utiles de {payload.operator}
            </Link>
          ) : null}
          {payload.type ? (
            <Link
              href={`/charges-utiles?type=${encodeURIComponent(payload.type)}`}
              className="rounded-lg border border-hairline bg-surface/50 px-3 py-2 text-xs text-ink-2 transition-colors hover:border-ion/40 hover:text-ink active:scale-[0.98]"
            >
              Autres charges utiles de type {payload.type}
            </Link>
          ) : null}
          <Link
            href={`/vols?q=${encodeURIComponent(payload.name)}`}
            className="rounded-lg border border-hairline bg-surface/50 px-3 py-2 text-xs text-ink-2 transition-colors hover:border-ion/40 hover:text-ink active:scale-[0.98]"
          >
            Rechercher dans le catalogue de vols
          </Link>
        </div>
      </section>
    </article>
  );
}
