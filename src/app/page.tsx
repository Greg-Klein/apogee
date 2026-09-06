import Link from 'next/link';

import { NextLaunchHero } from '@/components/launch/next-launch';
import { LaunchCard } from '@/components/launch/launch-card';
import { LaunchDate } from '@/components/ui/launch-date';
import { Metric } from '@/components/viz/metric';
import { SplitBar, type Segment } from '@/components/viz/split-bar';
import { CadenceChart } from '@/components/viz/cadence-chart';
import { PeriodPicker } from '@/components/viz/period-picker';
import { PERIODS, isPeriodKey, type PeriodKey } from '@/lib/domain/periods';
import { SectionHead, Eyebrow, Note, EmptyBlock } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';

import { getDb } from '@/lib/db/client';
import {
  getNextLaunch,
  getRecent,
  getUndatedUpcoming,
  getUpcoming,
  getLaunchDetail,
} from '@/lib/db/launches';
import { getPeriodStats, getYearlyCadence } from '@/lib/db/stats';
import { getDateBounds } from '@/lib/db/facets';

export const dynamic = 'force-dynamic';

function periodRange(key: PeriodKey, bounds: { min: number | null; max: number | null }) {
  const now = Date.now();
  const YEAR = 365.25 * 86_400_000;
  switch (key) {
    case '12m':
      return { from: now - YEAR, to: now + YEAR };
    case '24m':
      return { from: now - 2 * YEAR, to: now + YEAR };
    case '5y':
      return { from: now - 5 * YEAR, to: now + 2 * YEAR };
    default:
      return { from: bounds.min ?? 0, to: bounds.max ?? now + 10 * YEAR };
  }
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!getDb()) return <SourceDown />;

  const sp = await searchParams;
  const raw = typeof sp.periode === 'string' ? sp.periode : '12m';
  const period: PeriodKey = isPeriodKey(raw) ? raw : '12m';

  const bounds = getDateBounds();
  const { from, to } = periodRange(period, bounds);
  const stats = getPeriodStats(from, to);
  const cadence = getYearlyCadence();

  const next = getNextLaunch();
  const nextWebcast = next
    ? (getLaunchDetail(next.id)
        .links.filter((l) => l.kind === 'video')
        .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0] ?? null)
    : null;

  const upcoming = getUpcoming(6, next?.id);
  const undated = getUndatedUpcoming(6);
  const recent = getRecent(6);

  const dateRange = `du=${iso(from)}&au=${iso(to)}`;
  // "Parti" means the vehicle left the pad, whether or not a result is published yet.
  // The catalogue expresses that as an outcome filter, so the figure and the list it
  // opens always describe the same set of launches.
  const departed = 'resultat=success,failure,partial,unknown,in_flight';
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? '12 mois';

  const outcomeSegments: Segment[] = stats.outcomes.map((o) => ({
    key: o.key,
    label: o.label,
    count: o.count,
    href: `/vols?resultat=${o.key}&${dateRange}`,
    tone:
      o.key === 'success' ? 'go' : o.key === 'failure' ? 'fail' : o.key === 'partial' ? 'warn' : 'neutral',
  }));

  const familySegments: Segment[] = stats.families.map((f, i) => ({
    key: f.family,
    label: f.family,
    count: f.count,
    href: `/vols?${departed}&famille=${encodeURIComponent(f.family)}&${dateRange}`,
    tone: i === 0 ? 'ion' : i === 1 ? 'go' : i === 2 ? 'warn' : 'neutral',
  }));

  return (
    <div className="flex flex-col gap-14">
      {next ? (
        <NextLaunchHero launch={next} webcast={nextWebcast} />
      ) : (
        <EmptyBlock
          title="Aucun vol à venir avec une date suffisamment précise."
          hint="Les missions annoncées sans jour connu restent listées dans « Date à confirmer »."
        />
      )}

      {/* --- Indicators --------------------------------------------------- */}
      <section id="indicateurs" aria-labelledby="indicateurs-titre" className="scroll-mt-24">
        <SectionHead
          id="indicateurs-titre"
          title="Indicateurs"
          description={`Sur la période sélectionnée. Le bloc « Prochain vol » garde une portée globale et n'est pas affecté par ce sélecteur.`}
          action={<PeriodPicker value={period} />}
        />

        <div className="grid gap-8 border-b border-hairline pb-8 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <Metric
            label={`Vols partis · ${periodLabel}`}
            value={stats.flown}
            emphasis
            href={`/vols?${departed}&${dateRange}`}
            hint="Missions dont la source confirme le décollage. Une heure cible dépassée ne suffit pas."
          />
          <Metric
            label="Vols à venir dans la période"
            value={stats.upcoming}
            href={`/vols?vue=upcoming&${dateRange}`}
            hint="Programmés, toutes précisions de date confondues."
          />
          <Metric
            label="Participations de matériel"
            value={stats.boosterParticipations}
            href={`/materiel?type=booster`}
            hint="Un vol à plusieurs boosters compte pour un vol et plusieurs participations."
          />
          <Metric
            label="Participations réutilisées"
            value={stats.reusedParticipations}
            suffix={stats.boosterParticipations ? `/ ${stats.boosterParticipations}` : undefined}
            href={`/materiel?type=booster&tri=flights_desc`}
            hint="Exemplaires déjà volés au moment de la mission."
          />
        </div>

        <div className="grid gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
          <div className="flex flex-col gap-3">
            <Eyebrow>Résultats des lancements</Eyebrow>
            <SplitBar
              segments={outcomeSegments}
              total={stats.flown}
              emptyLabel="Aucun vol parti sur la période."
            />
            <Note>
              Les résultats inconnus sont comptés à part. Aucun taux de réussite n&apos;est affiché ici&nbsp;:
              son dénominateur varierait selon le traitement des échecs partiels et des essais.
            </Note>
          </div>

          <div className="flex flex-col gap-3">
            <Eyebrow>Familles de lanceur</Eyebrow>
            <SplitBar
              segments={familySegments}
              total={stats.flown}
              emptyLabel="Aucun vol parti sur la période."
            />
            {stats.testFlights > 0 ? (
              <Note>
                {stats.testFlights} vol{stats.testFlights > 1 ? 's' : ''} d&apos;essai
                {stats.testFlights > 1 ? ' sont inclus' : ' est inclus'} dans ce décompte. Les essais et les
                missions opérationnelles ne se comparent pas directement.
              </Note>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Eyebrow>Cadence annuelle · catalogue complet</Eyebrow>
            <CadenceChart data={cadence} />
            <Note>
              Portée différente des indicateurs ci-dessus&nbsp;: ce graphique couvre l&apos;ensemble du
              catalogue, pas la période sélectionnée.
            </Note>
          </div>
        </div>

        <div className="grid gap-6 border-t border-hairline pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Récupérations réussies"
            value={stats.recoveries.success}
            href={`/vols?vue=past&${dateRange}`}
          />
          <Metric
            label="Récupérations échouées"
            value={stats.recoveries.failure}
            href={`/vols?vue=past&${dateRange}`}
          />
          <Metric
            label="Sans tentative"
            value={stats.recoveries.noAttempt}
            hint="Une absence de tentative n'est pas un échec."
          />
          <Metric
            label="Résultat non publié"
            value={stats.recoveries.unknown}
            hint="Tentative connue mais issue non documentée, ou récupération non documentée."
          />
        </div>

        {stats.approximate > 0 ? (
          <p className="mt-5 text-[11px] text-ink-3">
            {stats.approximate} vol{stats.approximate > 1 ? 's' : ''} de cette période
            {stats.approximate > 1 ? ' ont' : ' a'} une date approximative&nbsp;;
            {stats.approximate > 1 ? ' ils sont inclus' : ' il est inclus'} car leur intervalle chevauche la
            période.
          </p>
        ) : null}
      </section>

      {/* --- Upcoming ----------------------------------------------------- */}
      <section aria-labelledby="prochains">
        <SectionHead
          id="prochains"
          title="Prochains départs"
          count={upcoming.length}
          action={
            <Link href="/vols?vue=upcoming" className="text-xs text-ion transition-opacity hover:opacity-75">
              Tous les vols à venir <span aria-hidden>→</span>
            </Link>
          }
        />
        {upcoming.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((l, i) => (
              <LaunchCard key={l.id} launch={l} index={i} />
            ))}
          </div>
        ) : (
          <EmptyBlock title="Aucun vol à venir avec une date précise dans l'instantané." />
        )}
      </section>

      {/* --- Undated ------------------------------------------------------ */}
      {undated.length ? (
        <section aria-labelledby="a-confirmer">
          <SectionHead
            id="a-confirmer"
            title="Date à confirmer"
            count={undated.length}
            description="Missions annoncées sans jour précis. Elles ne sont pas placées avant les vols datés."
          />
          <ul className="divide-y divide-hairline border-y border-hairline">
            {undated.map((l, i) => (
              <li key={l.id} style={{ '--i': i } as React.CSSProperties} className="rise">
                <Link
                  href={`/vols/${l.slug}`}
                  className="group flex flex-wrap items-center justify-between gap-3 px-2 py-3 transition-colors hover:bg-surface/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink group-hover:text-ion">
                      {l.mission_name ?? l.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
                      {[l.config_full_name, l.pad_name].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <LaunchDate
                    date={{
                      lo: l.date_lo,
                      hi: l.date_hi,
                      kind: l.precision_kind,
                    }}
                    net={l.net}
                    className="text-xs text-ink-2"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Recent ------------------------------------------------------- */}
      <section aria-labelledby="recents">
        <SectionHead
          id="recents"
          title="Activité récente"
          count={recent.length}
          action={
            <Link href="/vols?vue=past" className="text-xs text-ion transition-opacity hover:opacity-75">
              Tous les vols passés <span aria-hidden>→</span>
            </Link>
          }
        />
        {recent.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((l, i) => (
              <LaunchCard key={l.id} launch={l} index={i} />
            ))}
          </div>
        ) : (
          <EmptyBlock title="Aucun vol passé dans l'instantané." />
        )}
      </section>
    </div>
  );
}
