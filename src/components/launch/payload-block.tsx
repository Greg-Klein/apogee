import Link from 'next/link';

import { Eyebrow, Field, EmptyBlock, Note } from '@/components/ui/primitives';
import { formatMass } from '@/lib/domain/format';
import type { CrewRow, LaunchRow, PayloadFlightRow } from '@/lib/db/launches';

const CREW_PHASE_LABEL: Record<string, string> = {
  launch: 'Équipage au lancement',
  onboard: 'Équipage à bord',
  landing: 'Équipage au retour',
};

/**
 * What the flight carries.
 *
 * The vehicle and its contents stay distinct: a Dragon capsule is listed as the
 * spacecraft, not merged with the cargo it holds, so nothing is counted twice.
 * Crew has its own block and is never mixed into the payload list.
 */
export function PayloadBlock({
  launch,
  payloads,
  crew,
}: {
  launch: LaunchRow;
  payloads: PayloadFlightRow[];
  crew: CrewRow[];
}) {
  const vehicles = payloads.filter((p) => p.source_kind === 'spacecraft_stage');
  const cargo = payloads.filter((p) => p.source_kind !== 'spacecraft_stage');

  const crewByPhase = crew.reduce<Record<string, CrewRow[]>>((acc, c) => {
    (acc[c.phase] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {crew.length ? (
        <div className="flex flex-col gap-3">
          {Object.entries(crewByPhase).map(([phase, seats]) => (
            <div key={phase} className="flex flex-col gap-2">
              <Eyebrow>{CREW_PHASE_LABEL[phase] ?? 'Équipage'}</Eyebrow>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {seats.map((c) => (
                  <li
                    key={`${c.astronaut_id}-${c.phase}`}
                    className="flex items-center gap-3 rounded-lg border border-hairline bg-surface/40 px-3 py-2"
                  >
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline-2 bg-surface-2 font-mono text-[10px] text-ink-3"
                    >
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-ink">
                        {c.wiki_url ? (
                          <a
                            href={c.wiki_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="transition-colors hover:text-ion"
                          >
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                      </span>
                      <span className="block truncate text-[10px] text-ink-4">
                        {[c.role, c.agency].filter(Boolean).join(' · ') || 'Rôle non renseigné'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {vehicles.length ? (
        <div className="flex flex-col gap-3">
          <Eyebrow>Véhicule embarqué</Eyebrow>
          <div className="grid gap-3 lg:grid-cols-2">
            {vehicles.map((p) => (
              <PayloadCard key={p.id} payload={p} />
            ))}
          </div>
          <Note>
            Le véhicule est distingué de son contenu. Le fret transporté à l&apos;intérieur n&apos;est pas
            détaillé par la source et n&apos;est donc pas listé séparément.
          </Note>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Eyebrow>Charges utiles {cargo.length ? `· ${cargo.length}` : ''}</Eyebrow>
        {cargo.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {cargo.map((p) => (
              <PayloadCard key={p.id} payload={p} />
            ))}
          </div>
        ) : (
          <EmptyBlock
            title="Aucune charge utile détaillée pour ce vol."
            hint={
              launch.mission_description
                ? "La source ne publie pas d'entrée de charge utile pour cette mission. Une liste absente ne signifie pas que le vol n'en transporte aucune : voir l'objectif de mission ci-dessus."
                : 'La source ne publie ni objectif détaillé ni entrée de charge utile pour cette mission.'
            }
          />
        )}
      </div>
    </div>
  );
}

function PayloadCard({ payload: p }: { payload: PayloadFlightRow }) {
  const confidential = /classified|top secret|non publi/i.test(p.description ?? '');

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm text-ink">
            <Link
              href={`/charges-utiles/${encodeURIComponent(p.payload_id)}`}
              className="transition-colors hover:text-ion"
            >
              {p.name}
            </Link>
          </h4>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-ink-4">
            {p.type ?? 'Type non renseigné'}
          </p>
        </div>
        {p.amount && p.amount > 1 ? (
          <span className="shrink-0 rounded-full border border-hairline-2 bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular text-ink-2">
            ×{p.amount}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
        <Field label="Organisation opératrice" value={p.operator} />
        <Field label="Constructeur" value={p.manufacturer} />
        <Field label="Destination" value={p.destination} />
        <Field label="Masse" value={formatMass(p.mass_kg)} mono />
      </div>

      {p.description ? (
        <p className="max-w-[70ch] text-[11px] leading-relaxed text-ink-3">{p.description}</p>
      ) : confidential ? (
        <p className="text-[11px] italic text-ink-4">Détails non publiés.</p>
      ) : null}
    </article>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
