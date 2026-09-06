import Link from 'next/link';
import { Suspense } from 'react';

import { VehicleFilters } from '@/components/hardware/vehicle-filters';
import { Eyebrow, SectionHead, EmptyBlock, Note } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';
import { Pill } from '@/components/ui/status';

import { getDb } from '@/lib/db/client';
import {
  listModels,
  listVehicles,
  getVehicleStatusFacets,
  type VehicleFilters as Filters,
} from '@/lib/db/vehicles';
import { formatDuration, num } from '@/lib/domain/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Matériel',
  description:
    'Modèles et configurations de lanceurs, et exemplaires physiques identifiés avec leur historique de réutilisation.',
};

const SORTS: Array<Filters['sort']> = ['flights_desc', 'recent', 'name'];

export default async function HardwarePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getDb()) return <SourceDown />;

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const kindParam = one(sp.type);
  const kind = kindParam === 'booster' || kindParam === 'spacecraft' ? kindParam : undefined;
  const sortParam = one(sp.tri) as Filters['sort'];
  const filters: Filters = {
    kind,
    q: one(sp.q)?.trim() || undefined,
    model: one(sp.modele) || undefined,
    status: one(sp.etat) || undefined,
    sort: SORTS.includes(sortParam) ? sortParam : 'flights_desc',
  };

  const models = listModels();
  const vehicles = listVehicles(filters);
  const statuses = getVehicleStatusFacets(kind);

  const launcherModels = models.filter((m) => m.kind === 'launcher');
  const spacecraftModels = models.filter((m) => m.kind === 'spacecraft');

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-1">
        <Eyebrow>Catalogue</Eyebrow>
        <h1 className="text-2xl tracking-tight text-ink md:text-3xl">Matériel</h1>
        <p className="mt-1 max-w-[75ch] text-sm leading-relaxed text-ink-3">
          Une fiche « Falcon 9 » décrit un modèle. Une fiche portant un numéro de série décrit un exemplaire
          physique. Les deux niveaux restent séparés.
        </p>
      </header>

      {/* ---- Models ---- */}
      <section aria-labelledby="modeles">
        <SectionHead id="modeles" title="Modèles et configurations" count={models.length} />

        <div className="flex flex-col gap-6">
          <ModelGrid title="Lanceurs" models={launcherModels} />
          {spacecraftModels.length ? <ModelGrid title="Vaisseaux" models={spacecraftModels} /> : null}
        </div>
      </section>

      {/* ---- Physical articles ---- */}
      <section aria-labelledby="exemplaires">
        <SectionHead
          id="exemplaires"
          title="Exemplaires répertoriés"
          count={vehicles.length}
          description="Numéros de série identifiés dans les vols de l'instantané. Les affectations sans numéro publié ne créent pas d'exemplaire."
        />

        <div className="flex flex-col gap-5">
          <Suspense fallback={null}>
            <VehicleFilters filters={filters} statuses={statuses} models={models} />
          </Suspense>

          {vehicles.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <thead>
                  <tr className="border-y border-hairline">
                    {[
                      'Exemplaire',
                      'Modèle',
                      'État',
                      'Vols répertoriés',
                      'À venir',
                      'Récupérations',
                      'Rotation la plus courte',
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-ink-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => (
                    <tr
                      key={v.id}
                      style={{ '--i': Math.min(i, 24) } as React.CSSProperties}
                      className="rise group border-b border-hairline transition-colors hover:bg-surface/50"
                    >
                      <th scope="row" className="px-3 py-2.5 font-normal">
                        <Link
                          href={`/materiel/exemplaires/${encodeURIComponent(v.id)}`}
                          className="font-mono text-sm text-ink transition-colors group-hover:text-ion"
                        >
                          {v.serial_number ?? v.name}
                        </Link>
                      </th>
                      <td className="px-3 py-2.5 text-xs text-ink-3">{v.model_name ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <Pill tone={statusTone(v.status_name)}>{v.status_name ?? 'Non renseigné'}</Pill>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular text-ink-2">
                        {num(v.recorded_flights)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular text-ink-3">
                        {v.recorded_upcoming ? num(v.recorded_upcoming) : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular text-ink-3">
                        {v.source_attempted_landings !== null
                          ? `${v.source_successful_landings ?? 0}/${v.source_attempted_landings}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs tabular text-ink-3">
                        {formatDuration(v.fastest_turnaround) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock
              title="Aucun exemplaire ne correspond à ces critères."
              hint="Essayez un autre numéro de série, ou retirez le filtre de modèle."
              action={
                <Link href="/materiel" className="mt-1 text-xs text-ion underline underline-offset-4">
                  Réinitialiser
                </Link>
              }
            />
          )}

          <Note>
            « Vols répertoriés » compte les participations présentes dans cet instantané, pas le total
            historique revendiqué par la source. Les deux chiffres apparaissent côte à côte sur la fiche
            d&apos;un exemplaire.
          </Note>
        </div>
      </section>
    </div>
  );
}

function ModelGrid({
  title,
  models,
}: {
  title: string;
  models: Array<{
    id: string;
    name: string;
    full_name: string | null;
    family: string | null;
    type: string | null;
    article_count: number;
    launch_count: number;
  }>;
}) {
  if (!models.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>{title}</Eyebrow>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((m, i) => (
          <Link
            key={m.id}
            href={`/materiel/modeles/${encodeURIComponent(m.id)}`}
            style={{ '--i': i } as React.CSSProperties}
            className="rise group flex flex-col gap-2 rounded-xl border border-hairline bg-surface/40 p-4 transition-colors duration-200 hover:border-ion/35"
          >
            <span className="truncate text-sm text-ink transition-colors group-hover:text-ion">
              {m.full_name ?? m.name}
            </span>
            <span className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
              {[m.type, m.family].filter(Boolean).join(' · ')}
            </span>
            <span className="mt-auto flex items-baseline gap-3 border-t border-hairline pt-2 font-mono text-[11px] tabular text-ink-3">
              <span>
                {m.launch_count}
                <span className="ml-1 text-[9px] text-ink-4">vols</span>
              </span>
              <span>
                {m.article_count}
                <span className="ml-1 text-[9px] text-ink-4">exemplaires</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function statusTone(status: string | null): 'go' | 'warn' | 'neutral' {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active') return 'go';
  if (s.includes('lost') || s.includes('expended') || s.includes('destroyed')) return 'warn';
  return 'neutral';
}
