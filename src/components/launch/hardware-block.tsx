import Link from 'next/link';

import { Eyebrow, Field, EmptyBlock } from '@/components/ui/primitives';
import { RecoveryPill } from '@/components/ui/status';
import { formatDuration, formatKm, ordinalFr } from '@/lib/domain/format';
import type { AssignmentRow, LaunchRow } from '@/lib/db/launches';

const ROLE_LABEL: Record<AssignmentRow['role'], string> = {
  core: 'Étage central',
  side_booster: 'Booster latéral',
  spacecraft: 'Vaisseau',
};

/**
 * Hardware actually assigned to this flight.
 *
 * Figures are stated as of this mission: "3e vol de cet exemplaire" is the rank
 * recorded for this launch, never the article's current total. An article known
 * only by its model links to the model page rather than to an invented serial.
 */
export function HardwareBlock({ launch, assignments }: { launch: LaunchRow; assignments: AssignmentRow[] }) {
  const boosters = assignments.filter((a) => a.kind === 'booster');
  const spacecraft = assignments.filter((a) => a.kind === 'spacecraft');
  const scheduled = launch.phase === 'scheduled';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 rounded-xl border border-hairline bg-surface/40 p-4 sm:grid-cols-3">
        <Field label="Famille" value={launch.family} />
        <Field label="Configuration" value={launch.config_full_name ?? launch.config_name} />
        <Field
          label="Exemplaires identifiés"
          value={`${assignments.filter((a) => a.vehicle_id).length} sur ${assignments.length}`}
          mono
        />
      </div>

      {boosters.length ? (
        <div className="flex flex-col gap-3">
          <Eyebrow>Premier étage {boosters.length > 1 ? `· ${boosters.length} exemplaires` : ''}</Eyebrow>
          <div className="grid gap-3 lg:grid-cols-2">
            {boosters.map((a) => (
              <ArticleCard key={a.id} assignment={a} scheduled={scheduled} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyBlock
          title="Aucun exemplaire de premier étage documenté pour ce vol."
          hint="La source ne rattache pas d'étage identifié à cette mission. Cela ne signifie pas qu'il n'y en a pas eu."
        />
      )}

      {spacecraft.length ? (
        <div className="flex flex-col gap-3">
          <Eyebrow>Vaisseau</Eyebrow>
          <div className="grid gap-3 lg:grid-cols-2">
            {spacecraft.map((a) => (
              <ArticleCard key={a.id} assignment={a} scheduled={scheduled} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArticleCard({ assignment: a, scheduled }: { assignment: AssignmentRow; scheduled: boolean }) {
  const identified = Boolean(a.vehicle_id);
  const href = identified
    ? `/materiel/exemplaires/${encodeURIComponent(a.vehicle_id as string)}`
    : a.model_id
      ? `/materiel/modeles/${encodeURIComponent(a.model_id)}`
      : null;

  const title = identified ? (a.serial_number ?? a.vehicle_name) : (a.model_name ?? 'Modèle non renseigné');

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{ROLE_LABEL[a.role]}</Eyebrow>
          <h4 className="mt-1 truncate font-mono text-base tracking-tight text-ink">
            {href ? (
              <Link href={href} className="transition-colors hover:text-ion">
                {title}
              </Link>
            ) : (
              title
            )}
          </h4>
          {!identified ? (
            <p className="mt-1 text-[11px] leading-snug text-ink-4">
              Numéro de série non publié. Seul le modèle est connu.
            </p>
          ) : null}
        </div>
        <RecoveryPill recovery={a.recovery} short />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
        <Field
          label={scheduled ? 'Rang de vol prévu' : 'Rang de ce vol'}
          value={a.flight_number ? `${ordinalFr(a.flight_number)} vol de cet exemplaire` : null}
          hint={scheduled ? 'Affectation provisoire' : 'Tel qu’enregistré pour cette mission'}
        />
        <Field
          label="Réutilisation"
          value={a.reused === null ? null : a.reused ? 'Exemplaire déjà volé' : 'Premier vol'}
        />
        {a.kind === 'booster' ? (
          <>
            <Field label="Délai depuis le vol précédent" value={formatDuration(a.turnaround)} mono />
            <Field label="Distance en aval" value={formatKm(a.downrange_km)} mono />
          </>
        ) : (
          <>
            <Field label="Destination" value={a.destination} />
            <Field label="Durée de mission" value={formatDuration(a.duration)} mono />
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-hairline pt-3">
        <Eyebrow>Récupération</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Méthode" value={a.landing_type} />
          <Field
            label="Zone ou plateforme"
            value={
              a.landing_zone
                ? `${a.landing_zone}${a.landing_zone_abbrev ? ` (${a.landing_zone_abbrev})` : ''}`
                : null
            }
          />
        </div>
        {a.landing_description ? (
          <p className="mt-1 max-w-[70ch] text-[11px] leading-relaxed text-ink-3">{a.landing_description}</p>
        ) : null}
        {a.recovery === 'no_attempt' ? (
          <p className="mt-1 text-[11px] leading-relaxed text-ink-4">
            Aucune tentative de récupération n&apos;était prévue. Ce n&apos;est pas un échec.
          </p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="group mt-auto self-start text-[11px] text-ion transition-opacity hover:opacity-75"
        >
          {identified ? 'Historique de cet exemplaire' : 'Fiche du modèle'}{' '}
          <span
            aria-hidden
            className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      ) : null}
    </article>
  );
}
