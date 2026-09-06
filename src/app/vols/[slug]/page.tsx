import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Countdown } from '@/components/launch/countdown';
import { FlightTimeline } from '@/components/launch/flight-timeline';
import { HardwareBlock } from '@/components/launch/hardware-block';
import { PayloadBlock } from '@/components/launch/payload-block';
import { UpdateLog } from '@/components/launch/update-log';
import { LaunchDate, Timestamp } from '@/components/ui/launch-date';
import { LaunchStatusPill, Pill, RecoveryPill } from '@/components/ui/status';
import { Eyebrow, Field, Note, Panel, SectionHead, EmptyBlock } from '@/components/ui/primitives';
import { SourceDown } from '@/components/ui/source-down';
import { OrbitMark } from '@/components/viz/orbit-mark';
import { HeroBackdrop, MissionPatch } from '@/components/ui/imagery';
import { LaunchCard } from '@/components/launch/launch-card';
import { WebcastButton, WebcastPlayer } from '@/components/launch/webcast';
import { primaryWebcast } from '@/lib/domain/webcast';

import { getDb } from '@/lib/db/client';
import { getLaunchBySlug, getLaunchDetail, getRelatedLaunches } from '@/lib/db/launches';
import { PRECISION_NOTE, formatDuration, formatTimestamp } from '@/lib/domain/format';
import { isInstant, type PrecisionKind } from '@/lib/domain/precision';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!getDb()) return { title: 'Vol' };
  const { slug } = await params;
  const launch = getLaunchBySlug(slug);
  if (!launch) return { title: 'Vol introuvable' };
  return {
    title: launch.mission_name ?? launch.name,
    description:
      launch.mission_description?.slice(0, 180) ??
      `${launch.name} · ${launch.config_full_name ?? ''} depuis ${launch.pad_name ?? 'un site non renseigné'}.`,
  };
}

export default async function FlightPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!getDb()) return <SourceDown />;

  const { slug } = await params;
  const launch = getLaunchBySlug(slug);
  if (!launch) notFound();

  const detail = getLaunchDetail(launch.id);
  const related = getRelatedLaunches(launch);

  const shape = {
    lo: launch.date_lo,
    hi: launch.date_hi,
    kind: launch.precision_kind,
    label: launch.precision_label,
  };
  const scheduled = launch.phase === 'scheduled';
  // A countdown only makes sense before the vehicle leaves the pad; once the source
  // reports it in flight, the state itself is the information.
  const countdownEligible =
    launch.net !== null && isInstant(launch.precision_kind as PrecisionKind) && launch.phase === 'scheduled';
  const provisional = [2, 5, 8].includes(launch.status_id);

  const videos = detail.links.filter((l) => l.kind === 'video');
  const webcast = primaryWebcast(detail.links);
  const officialLink = detail.links.find((l) => l.kind === 'info');
  const infos = detail.links.filter((l) => l.kind === 'info');
  const boosterAssignments = detail.assignments.filter((a) => a.kind === 'booster');
  const recoveryDocumented = detail.assignments.filter((a) => a.recovery !== 'undocumented');

  return (
    <article className="flex flex-col gap-12">
      {/* ---- Header ---- */}
      <header className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-ground-2 to-ground">
        <HeroBackdrop src={launch.image_url} credit={launch.image_credit} />
        <div aria-hidden className="grid-veil pointer-events-none absolute inset-0 opacity-35" />
        <OrbitMark className="pointer-events-none absolute -right-32 -top-40 h-[520px] w-[520px] opacity-25" />

        <div className="relative flex flex-col gap-6 p-6 md:p-9">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[11px] text-ink-4">
            <Link href="/vols" className="transition-colors hover:text-ion">
              Vols
            </Link>
            <span aria-hidden>/</span>
            <span className="truncate text-ink-3">{launch.mission_name ?? launch.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <LaunchStatusPill
              phase={launch.phase}
              outcome={launch.outcome}
              statusId={launch.status_id}
              statusName={launch.status_name}
            />
            {launch.is_crewed ? <Pill tone="ion">Vol habité</Pill> : null}
            {launch.is_test ? <Pill tone="warn">Vol d&apos;essai</Pill> : null}
            {launch.designator ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
                {launch.designator}
              </span>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-5">
                <MissionPatch
                  src={launch.patch_url}
                  name={launch.mission_name ?? launch.name}
                  className="h-14 w-14 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                />
                <div className="min-w-0">
                  <h1 className="text-3xl leading-none tracking-tighter text-ink md:text-5xl">
                    {launch.mission_name ?? launch.name}
                  </h1>
                  {launch.mission_name && launch.mission_name !== launch.name ? (
                    <p className="mt-2 text-sm text-ink-3">
                      Désignation complète&nbsp;: <span className="text-ink-2">{launch.name}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {launch.mission_description ? (
                <p className="max-w-[68ch] text-sm leading-relaxed text-ink-2">
                  {launch.mission_description}
                </p>
              ) : (
                <p className="max-w-[68ch] text-sm italic leading-relaxed text-ink-4">
                  Objectif de mission non publié par la source.
                </p>
              )}

              {launch.fail_reason ? (
                <p className="max-w-[68ch] rounded-lg border border-fail/25 bg-fail/5 px-3 py-2 text-xs leading-relaxed text-fail/90">
                  <span className="font-mono text-[10px] uppercase tracking-wider">
                    Cause de l&apos;échec
                  </span>
                  <br />
                  {launch.fail_reason}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {webcast ? <WebcastButton video={webcast} /> : null}
                {officialLink ? (
                  <a
                    href={officialLink.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 rounded-lg border border-hairline-2 bg-surface/60 px-4 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-ion/40 hover:text-ink active:scale-[0.98]"
                  >
                    Page officielle
                    <span className="font-mono text-[10px] opacity-60">
                      {officialLink.publisher ?? officialLink.source}
                    </span>
                  </a>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {detail.programs.map((p) => (
                  <Link
                    key={p.program_id}
                    href={`/vols?programme=${p.program_id}`}
                    className="rounded-full border border-hairline-2 bg-surface-2 px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-ion/40 hover:text-ink"
                  >
                    {p.name}
                  </Link>
                ))}
                {launch.location_id ? (
                  <Link
                    href={`/vols?site=${launch.location_id}`}
                    className="rounded-full border border-hairline-2 bg-surface-2 px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-ion/40 hover:text-ink"
                  >
                    {launch.location_name}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-5 self-start rounded-xl border border-white/12 bg-surface/55 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_16px_40px_-18px_rgb(0_0_0/0.7)] backdrop-blur-xl backdrop-saturate-150 lg:-mr-3 lg:-mt-3">
              {countdownEligible && launch.net ? (
                <div className="flex flex-col gap-2">
                  <Eyebrow>Compte à rebours</Eyebrow>
                  <Countdown
                    targetIso={launch.net}
                    provisional={provisional}
                    confirmed={launch.phase !== 'scheduled'}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={scheduled ? 'Date visée' : 'Date de lancement'}
                  value={<LaunchDate date={shape} net={launch.net} />}
                  hint={PRECISION_NOTE[launch.precision_kind] ?? undefined}
                  className="col-span-2"
                />
                <Field label="Lanceur" value={launch.config_full_name ?? launch.config_name} />
                <Field label="Orbite visée" value={launch.orbit_name} />
                <Field label="Pas de tir" value={launch.pad_name} />
                <Field label="Site" value={launch.location_name} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---- Schedule ---- */}
      <section aria-labelledby="dates">
        <SectionHead
          id="dates"
          title="Dates et déroulement"
          description="Ce que la source publie sur la programmation. Ce qui est prévu reste distingué de ce qui est confirmé."
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Heure cible (UTC)"
                value={formatTimestamp(launch.net, 'UTC')}
                mono
                hint={launch.precision_label ? `Précision source : ${launch.precision_label}` : undefined}
              />
              <Field
                label="Précision de la date"
                value={PRECISION_NOTE[launch.precision_kind] ?? 'À la seconde'}
              />
              <Field
                label="Ouverture de fenêtre (UTC)"
                value={formatTimestamp(launch.window_start, 'UTC')}
                mono
              />
              <Field
                label="Fermeture de fenêtre (UTC)"
                value={formatTimestamp(launch.window_end, 'UTC')}
                mono
              />
              <Field
                label="Statut source"
                value={launch.status_name}
                hint={launch.status_description ?? undefined}
                className="col-span-2"
              />
              <Field
                label="Délai depuis le vol précédent sur ce pas de tir"
                value={formatDuration(launch.pad_turnaround)}
                mono
                className="col-span-2"
              />
            </div>

            <Note>
              Les instants sont conservés en UTC et affichés dans le fuseau choisi en haut de page. Le passage
              de l&apos;heure cible ne suffit pas à classer cette mission parmi les vols effectués.
            </Note>

            {detail.updates.length ? (
              <div className="flex flex-col gap-3 pt-2">
                <Eyebrow>Historique publié · {detail.updates.length} entrées</Eyebrow>
                <UpdateLog updates={detail.updates} />
              </div>
            ) : null}
          </div>

          <div>
            {detail.timeline.length ? (
              <FlightTimeline events={detail.timeline} />
            ) : (
              <EmptyBlock
                title="Aucune chronologie publiée pour ce vol."
                hint="La source ne fournit que le décollage et le résultat final. Aucune chronologie n'est reconstituée à partir d'un profil théorique."
              />
            )}
          </div>
        </div>
      </section>

      {/* ---- Hardware ---- */}
      <section aria-labelledby="materiel">
        <SectionHead
          id="materiel"
          title="Matériel embarqué"
          description="Configuration du vol, puis les exemplaires réellement affectés. Les compteurs sont donnés tels qu'enregistrés pour cette mission."
        />
        <HardwareBlock launch={launch} assignments={detail.assignments} />
      </section>

      {/* ---- Payloads ---- */}
      <section aria-labelledby="charges">
        <SectionHead
          id="charges"
          title="Charges utiles et équipage"
          count={detail.payloads.length + detail.crew.length}
        />
        <PayloadBlock launch={launch} payloads={detail.payloads} crew={detail.crew} />
      </section>

      {/* ---- Results ---- */}
      <section aria-labelledby="resultats">
        <SectionHead
          id="resultats"
          title="Résultats"
          description="Trois informations distinctes : le résultat du lancement, celui de la mission ou des déploiements, et la récupération de chaque exemplaire."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Panel className="flex flex-col gap-3 p-4">
            <Eyebrow>Résultat du lancement</Eyebrow>
            <LaunchStatusPill
              phase={launch.phase}
              outcome={launch.outcome}
              statusId={launch.status_id}
              statusName={launch.status_name}
            />
            <p className="text-[11px] leading-relaxed text-ink-3">
              {launch.phase === 'flown'
                ? "Porte uniquement sur l'insertion en orbite par le lanceur."
                : "Le résultat n'est pas encore publié : la mission n'est pas classée."}
            </p>
          </Panel>

          <Panel className="flex flex-col gap-3 p-4">
            <Eyebrow>Déploiements et mission</Eyebrow>
            {detail.payloads.length ? (
              <p className="text-xs leading-relaxed text-ink-2">
                {detail.payloads.length} entrée
                {detail.payloads.length > 1 ? 's' : ''} de charge utile répertoriée
                {detail.payloads.length > 1 ? 's' : ''}. La source ne publie pas de résultat de déploiement
                distinct.
              </p>
            ) : (
              <p className="text-xs italic leading-relaxed text-ink-4">
                Aucun résultat de déploiement documenté séparément.
              </p>
            )}
            {launch.is_test ? (
              <p className="text-[11px] leading-relaxed text-warn/90">
                Vol d&apos;essai&nbsp;: le bilan reste descriptif et n&apos;est pas forcé dans une
                classification binaire.
              </p>
            ) : null}
          </Panel>

          <Panel className="flex flex-col gap-3 p-4">
            <Eyebrow>Récupération par exemplaire</Eyebrow>
            {recoveryDocumented.length ? (
              <ul className="flex flex-col gap-2">
                {detail.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[11px] text-ink-2">
                      {a.serial_number ?? a.vehicle_name ?? a.model_name ?? 'Exemplaire non identifié'}
                    </span>
                    <RecoveryPill recovery={a.recovery} short />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs italic leading-relaxed text-ink-4">
                Aucune information de récupération publiée pour ce vol.
              </p>
            )}
            {boosterAssignments.length > 1 ? (
              <p className="text-[11px] leading-relaxed text-ink-3">
                Ce vol utilise {boosterAssignments.length} exemplaires&nbsp;: chacun a son propre résultat de
                récupération.
              </p>
            ) : null}
          </Panel>
        </div>
      </section>

      {/* ---- Resources ---- */}
      {videos.length || infos.length || launch.flightclub_url || launch.pad_map_url ? (
        <section aria-labelledby="ressources">
          <SectionHead id="ressources" title="Ressources" count={videos.length + infos.length} />
          {webcast ? (
            <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <WebcastPlayer video={webcast} />
              <div className="flex flex-col gap-2 self-start">
                <Eyebrow>À propos de cette retransmission</Eyebrow>
                <p className="max-w-[60ch] text-[11px] leading-relaxed text-ink-3">
                  {webcast.description ??
                    "Aucune description publiée pour cette retransmission. Le lecteur ci-contre ouvre la source d'origine."}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-3 border-t border-hairline pt-3 text-[11px]">
                  <div>
                    <dt className="text-ink-4">Diffuseur</dt>
                    <dd className="truncate text-ink-2">{webcast.publisher ?? 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-4">Nature</dt>
                    <dd className="truncate text-ink-2">{webcast.type_name ?? 'Non renseignée'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-4">Langue</dt>
                    <dd className="truncate text-ink-2">{webcast.language ?? 'Non renseignée'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-4">Autres sources</dt>
                    <dd className="font-mono tabular text-ink-2">{Math.max(0, videos.length - 1)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Eyebrow>Toutes les vidéos et retransmissions</Eyebrow>
              {videos.length ? (
                <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
                  {videos.slice(0, 8).map((v) => (
                    <li key={v.url}>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-ion"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-ink-2 group-hover:text-ion">
                            {v.title ?? v.url}
                          </span>
                          <span className="block truncate text-[10px] text-ink-4">
                            {[v.publisher, v.type_name, v.language].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {v.is_live ? (
                          <Pill tone="go" pulse>
                            En direct
                          </Pill>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-ink-4">Aucune retransmission référencée.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Eyebrow>Liens officiels et références</Eyebrow>
              <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
                {infos.map((v) => (
                  <li key={v.url}>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate py-2.5 text-xs text-ink-2 transition-colors hover:text-ion"
                    >
                      {v.title ?? v.url}
                      <span className="ml-2 text-[10px] text-ink-4">{v.publisher ?? v.source}</span>
                    </a>
                  </li>
                ))}
                {launch.flightclub_url ? (
                  <li>
                    <a
                      href={launch.flightclub_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block py-2.5 text-xs text-ink-2 transition-colors hover:text-ion"
                    >
                      Simulation de trajectoire
                      <span className="ml-2 text-[10px] text-ink-4">Flight Club</span>
                    </a>
                  </li>
                ) : null}
                {launch.pad_map_url ? (
                  <li>
                    <a
                      href={launch.pad_map_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block py-2.5 text-xs text-ink-2 transition-colors hover:text-ion"
                    >
                      Localisation du pas de tir
                      <span className="ml-2 text-[10px] text-ink-4">carte</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---- Related ---- */}
      <section aria-labelledby="prolongements">
        <SectionHead
          id="prolongements"
          title="Prolongements"
          description="Vols du même programme, du même site et de la même configuration."
        />

        <div className="flex flex-col gap-8">
          {related.sameProgram.length ? (
            <RelatedGroup
              title="Même programme"
              href={related.programIds.length ? `/vols?programme=${related.programIds.join(',')}` : '/vols'}
              items={related.sameProgram}
            />
          ) : null}
          {related.samePad.length ? (
            <RelatedGroup
              title={`Même pas de tir · ${launch.pad_name}`}
              href={`/vols?pas=${launch.pad_id}`}
              items={related.samePad}
            />
          ) : null}
          {related.sameConfig.length ? (
            <RelatedGroup
              title={`Même configuration · ${launch.config_full_name ?? launch.config_name}`}
              href={`/vols?famille=${encodeURIComponent(launch.family ?? '')}`}
              items={related.sameConfig}
            />
          ) : null}
        </div>
      </section>

      <p className="border-t border-hairline pt-4 text-[11px] text-ink-4">
        Dernière modification de cette fiche côté source&nbsp;:{' '}
        <Timestamp iso={launch.last_updated} className="text-ink-3" />
      </p>
    </article>
  );
}

function RelatedGroup({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: Array<React.ComponentProps<typeof LaunchCard>['launch']>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        <Link href={href} className="text-[11px] text-ion transition-opacity hover:opacity-75">
          Voir tous <span aria-hidden>→</span>
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((l, i) => (
          <LaunchCard key={l.id} launch={l} index={i} />
        ))}
      </div>
    </div>
  );
}
