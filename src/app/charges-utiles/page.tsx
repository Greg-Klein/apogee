import Link from 'next/link';
import { Suspense } from 'react';

import { PayloadFilters } from '@/components/payload/payload-filters';
import { LaunchDate } from '@/components/ui/launch-date';
import { Eyebrow, SectionHead, EmptyBlock, Note } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';

import { getDb } from '@/lib/db/client';
import { getPayloadFacets, listPayloads, type PayloadFilters as Filters } from '@/lib/db/payloads';
import { formatMass } from '@/lib/domain/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Charges utiles',
  description:
    'Charges utiles et véhicules embarqués répertoriés par Launch Library 2, avec leur mission porteuse, leur organisation et leur destination.',
};

export default async function PayloadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getDb()) return <SourceDown />;

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const many = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(',')).filter(Boolean);

  const filters: Filters = {
    q: one(sp.q)?.trim() || undefined,
    types: many(sp.type),
    operators: many(sp.operateur),
    destinations: many(sp.destination),
    sort: one(sp.tri) === 'name' ? 'name' : 'recent',
  };

  const facets = getPayloadFacets();
  const payloads = listPayloads(filters);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="text-2xl tracking-tight text-ink md:text-3xl">Charges utiles</h1>
        <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-ink-3">
          Chaque entrée renvoie à son vol porteur et à ses résultats documentés. Les objets portant un nom
          proche ne sont pas fusionnés, et un lot documenté reste un lot.
        </p>
      </header>

      <div className="rounded-xl border border-warn/20 bg-warn/5 p-4">
        <p className="max-w-[85ch] text-xs leading-relaxed text-warn/90">
          <span className="font-mono text-[10px] uppercase tracking-wider">
            Couverture réelle de la source
          </span>
          <br />
          Launch Library 2 ne publie qu&apos;une soixantaine de charges utiles pour l&apos;ensemble du
          catalogue&nbsp;: la très grande majorité des vols n&apos;a aucune entrée détaillée. Ce catalogue
          reflète cette limite plutôt que de la combler. Un vol sans charge utile listée n&apos;est pas un vol
          sans charge utile, et son objectif de mission reste consultable sur sa fiche.
        </p>
      </div>

      <Suspense fallback={null}>
        <PayloadFilters filters={filters} facets={facets} total={payloads.length} />
      </Suspense>

      <SectionHead title="Entrées répertoriées" count={payloads.length} />

      {payloads.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {payloads.map((p, i) => (
            <Link
              key={p.id}
              href={`/charges-utiles/${encodeURIComponent(p.id)}`}
              style={{ '--i': Math.min(i, 24) } as React.CSSProperties}
              className="rise group flex flex-col gap-3 rounded-xl border border-hairline bg-surface/40 p-4 transition-colors duration-200 hover:border-ion/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm text-ink transition-colors group-hover:text-ion">
                    {p.name}
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
                    {p.type ?? 'Type non renseigné'}
                  </p>
                </div>
                {p.source_kind === 'spacecraft' ? (
                  <span className="shrink-0 rounded-full border border-hairline-2 bg-surface-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-3">
                    véhicule
                  </span>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-2 border-t border-hairline pt-3 text-[11px]">
                <div>
                  <dt className="text-ink-4">Organisation</dt>
                  <dd className="truncate text-ink-2">{p.operator ?? p.manufacturer ?? 'Non renseignée'}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">Destination</dt>
                  <dd className="truncate text-ink-2">{p.destinations ?? 'Non renseignée'}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">Masse</dt>
                  <dd className="truncate font-mono tabular text-ink-2">{formatMass(p.mass_kg) ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-4">Vols</dt>
                  <dd className="font-mono tabular text-ink-2">{p.flight_count}</dd>
                </div>
              </dl>

              {p.launch_name ? (
                <p className="mt-auto flex flex-wrap items-baseline gap-2 border-t border-hairline pt-3 text-[11px]">
                  <span className="truncate text-ink-3">{p.launch_name}</span>
                  {p.launch_date !== null ? (
                    <LaunchDate
                      date={{
                        lo: p.launch_date,
                        hi: p.launch_date,
                        kind: 'day',
                      }}
                      variant="short"
                      showBadge={false}
                      className="text-ink-4"
                    />
                  ) : null}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyBlock
          title="Aucune charge utile ne correspond à ces critères."
          hint="Retirez un filtre, ou repartez du catalogue complet."
          action={
            <Link href="/charges-utiles" className="mt-1 text-xs text-ion underline underline-offset-4">
              Réinitialiser
            </Link>
          }
        />
      )}

      <Note>
        Les véhicules embarqués (capsules Dragon, prototypes Starship) apparaissent ici comme entrées
        distinctes de leur contenu, pour éviter tout double comptage entre le véhicule et le fret.
      </Note>
    </div>
  );
}
