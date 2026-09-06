import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { LaunchDate } from '@/components/ui/launch-date';
import { Pill } from '@/components/ui/status';
import { Field, SectionHead, EmptyBlock, Note } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';
import { OrbitMark } from '@/components/viz/orbit-mark';

import { getDb } from '@/lib/db/client';
import { getModel, getModelArticles, getModelLaunches } from '@/lib/db/vehicles';
import { formatMass, num } from '@/lib/domain/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  if (!getDb()) return { title: 'Modèle' };
  const { id } = await params;
  const m = getModel(decodeURIComponent(id));
  if (!m) return { title: 'Modèle introuvable' };
  return {
    title: m.full_name ?? m.name,
    description:
      m.description?.slice(0, 180) ?? `Caractéristiques et vols du modèle ${m.full_name ?? m.name}.`,
  };
}

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  if (!getDb()) return <SourceDown />;

  const { id } = await params;
  const model = getModel(decodeURIComponent(id));
  if (!model) notFound();

  const articles = getModelArticles(model.id);
  const launches = getModelLaunches(model.id, 40) as Array<{
    id: string;
    slug: string;
    name: string;
    phase: string;
    outcome: string;
    date_lo: number | null;
    date_hi: number | null;
    precision_kind: string;
    precision_label: string | null;
    net: string | null;
    mission_type: string | null;
    pad_name: string | null;
  }>;

  const metres = (v: number | null) => (v === null ? null : `${v.toLocaleString('fr-FR')} m`);

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
            <span className="text-ink-3">Modèles</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="neutral">{model.type ?? 'Modèle'}</Pill>
                {model.family ? <Pill tone="neutral">Famille {model.family}</Pill> : null}
                {model.human_rated ? <Pill tone="ion">Qualifié vol habité</Pill> : null}
                {model.reusable ? <Pill tone="go">Réutilisable</Pill> : null}
              </div>

              <h1 className="text-3xl leading-none tracking-tighter text-ink md:text-5xl">
                {model.full_name ?? model.name}
              </h1>

              {model.description ? (
                <p className="max-w-[68ch] text-sm leading-relaxed text-ink-2">{model.description}</p>
              ) : (
                <p className="max-w-[68ch] text-sm italic text-ink-4">
                  Description non publiée par la source.
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                {model.info_url ? (
                  <a
                    href={model.info_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-ion transition-opacity hover:opacity-75"
                  >
                    Page officielle <span aria-hidden>↗</span>
                  </a>
                ) : null}
                {model.wiki_url ? (
                  <a
                    href={model.wiki_url}
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
              <Field label="Constructeur" value={model.manufacturer} />
              <Field label="Premier vol" value={model.maiden_flight} mono />
              <Field label="Hauteur" value={metres(model.height)} mono />
              <Field label="Diamètre" value={metres(model.diameter)} mono />
              <Field
                label="Masse au décollage"
                value={formatMass(model.launch_mass ? model.launch_mass * 1000 : null)}
                mono
              />
              <Field
                label={model.kind === 'launcher' ? 'Capacité en orbite basse' : 'Capacité de charge'}
                value={formatMass(model.leo_capacity)}
                mono
              />
              {model.crew_capacity ? (
                <Field label="Équipage" value={`${model.crew_capacity} personnes`} mono />
              ) : null}
              <Field label="Exemplaires répertoriés" value={num(articles.length)} mono />
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="exemplaires">
        <SectionHead
          id="exemplaires"
          title="Exemplaires répertoriés"
          count={articles.length}
          description="Articles physiques rattachés à ce modèle dans l'instantané."
        />

        {articles.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((a, i) => (
              <Link
                key={a.id}
                href={`/materiel/exemplaires/${encodeURIComponent(a.id)}`}
                style={{ '--i': Math.min(i, 24) } as React.CSSProperties}
                className="rise group flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface/40 px-3 py-2.5 transition-colors duration-200 hover:border-ion/35"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm text-ink transition-colors group-hover:text-ion">
                    {a.serial_number ?? a.name}
                  </span>
                  <span className="block truncate text-[10px] text-ink-4">
                    {a.status_name ?? 'État non renseigné'}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular text-ink-3">
                  {a.recorded_flights}
                  <span className="ml-1 text-[9px] text-ink-4">vols</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyBlock
            title="Aucun exemplaire identifié pour ce modèle."
            hint="Les vols de ce modèle n'ont pas de numéro de série publié. Aucun identifiant n'est inventé pour combler ce vide."
          />
        )}
      </section>

      <section aria-labelledby="vols">
        <SectionHead id="vols" title="Vols associés" count={launches.length} />

        {launches.length ? (
          <>
            <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
              {launches.map((l, i) => (
                <li key={l.id} style={{ '--i': Math.min(i, 24) } as React.CSSProperties} className="rise">
                  <Link
                    href={`/vols/${l.slug}`}
                    className="group flex flex-wrap items-center justify-between gap-3 px-2 py-3 transition-colors hover:bg-surface/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink group-hover:text-ion">{l.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
                        {[l.mission_type, l.pad_name].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <LaunchDate
                      date={{
                        lo: l.date_lo,
                        hi: l.date_hi,
                        kind: l.precision_kind as never,
                        label: l.precision_label,
                      }}
                      net={l.net}
                      variant="short"
                      className="text-xs text-ink-2"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <Note>
              Les 40 vols les plus récents sont listés ici. Le catalogue complet reste accessible avec le
              filtre correspondant.
            </Note>
          </>
        ) : (
          <EmptyBlock title="Aucun vol associé à ce modèle dans l'instantané." />
        )}

        {model.family ? (
          <Link
            href={`/vols?famille=${encodeURIComponent(model.family)}`}
            className="mt-4 inline-block rounded-lg border border-hairline bg-surface/50 px-3 py-2 text-xs text-ink-2 transition-colors hover:border-ion/40 hover:text-ink active:scale-[0.98]"
          >
            Tous les vols de la famille {model.family}
          </Link>
        ) : null}
      </section>
    </article>
  );
}
