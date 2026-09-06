import { Fragment, Suspense } from 'react';

import { FilterBar } from '@/components/catalog/filter-bar';
import { Pagination } from '@/components/catalog/pagination';
import { ScrollRestore } from '@/components/catalog/scroll-restore';
import { LaunchRow } from '@/components/launch/launch-row';
import { EmptyBlock, Eyebrow } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';

import { getDb } from '@/lib/db/client';
import { countByView, queryCatalog } from '@/lib/db/launches';
import { getFacets } from '@/lib/db/facets';
import { parseCatalogParams } from '@/lib/catalog-params';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Catalogue des vols',
  description: "Rechercher, filtrer et trier l'ensemble des vols SpaceX répertoriés, à venir comme passés.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getDb()) return <SourceDown />;

  const sp = await searchParams;
  const filters = parseCatalogParams(sp);
  const facets = getFacets();
  const counts = countByView(filters);
  const { items, total, page, pages } = queryCatalog(filters);

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <ScrollRestore />
      </Suspense>

      <header className="flex flex-col gap-1">
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="text-2xl tracking-tight text-ink md:text-3xl">Vols</h1>
      </header>

      <Suspense fallback={<FilterSkeleton />}>
        <FilterBar filters={filters} facets={facets} counts={counts} total={total} />
      </Suspense>

      {items.length ? (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[52rem]">
              <div
                aria-hidden
                className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] gap-x-4 border-y border-hairline px-3 py-2"
              >
                {[
                  'Mission',
                  'Date',
                  'Statut et récupération',
                  'Lanceur et exemplaires',
                  'Site et charges utiles',
                ].map((h) => (
                  <span key={h} className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">
                    {h}
                  </span>
                ))}
              </div>
              <ul>
                {items.map((l, i) => (
                  <Fragment key={l.id}>
                    {/* Coarse dates are grouped rather than interleaved: a mission
                        announced only for a year would otherwise sort as if it were
                        due on 1 January of that year. */}
                    {i > 0 && items[i - 1].is_precise === 1 && l.is_precise === 0 ? (
                      <li className="flex items-center gap-3 border-b border-hairline bg-surface/30 px-3 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-warn/80">
                          Dates approximatives
                        </span>
                        <span className="h-px flex-1 bg-hairline" />
                        <span className="text-[10px] text-ink-4">
                          Aucun jour n&apos;est publié pour ces missions
                        </span>
                      </li>
                    ) : null}
                    <LaunchRow launch={l} index={i} />
                  </Fragment>
                ))}
              </ul>
            </div>
          </div>
          <Suspense fallback={null}>
            <Pagination page={page} pages={pages} total={total} />
          </Suspense>
        </>
      ) : (
        <EmptyBlock
          title="Aucun vol ne correspond à cette combinaison de filtres."
          hint="Élargissez la période, retirez un filtre, ou réinitialisez la recherche pour repartir du catalogue complet."
          action={
            <a
              href={filters.view === 'all' ? '/vols' : `/vols?vue=${filters.view}`}
              className="mt-1 text-xs text-ion underline underline-offset-4"
            >
              Réinitialiser les filtres
            </a>
          }
        />
      )}
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {[10, 20, 8, 6].map((w, i) => (
        <div
          key={i}
          className="shimmer relative h-8 overflow-hidden rounded-lg bg-surface-2"
          style={{ width: `${w}rem` }}
        />
      ))}
    </div>
  );
}
