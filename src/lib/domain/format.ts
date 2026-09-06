import type { PrecisionKind } from './precision';

/**
 * Display helpers.
 *
 * Every formatter takes the timezone explicitly so the same function serves the
 * server render (UTC) and the client render (the visitor's stored preference).
 */

export const UTC = 'UTC';

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function parts(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const map = Object.fromEntries(fmt.formatToParts(ms).map((p) => [p.type, p.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    weekday: map.weekday?.replace('.', ''),
  };
}

export type DateShape = {
  lo: number | null;
  hi: number | null;
  kind: PrecisionKind | 'unknown';
  label?: string | null;
};

/** Full sentence for a flight header. Never invents a day or an hour. */
export function formatLaunchDate(d: DateShape, timeZone: string): string {
  if (d.lo === null) return 'Date non renseignée';
  const p = parts(d.lo, timeZone);
  const monthName = MONTHS[Number(p.month) - 1];
  switch (d.kind) {
    case 'instant':
    case 'unrecorded':
      return `${p.weekday} ${Number(p.day)} ${monthName} ${p.year}, ${p.hour}:${p.minute}`;
    case 'day':
      return `${p.weekday} ${Number(p.day)} ${monthName} ${p.year}`;
    case 'month':
      return `${monthName} ${p.year}`;
    case 'quarter': {
      const q = Math.floor(Number(p.month) / 3.01) + 1;
      return `T${q} ${p.year}`;
    }
    case 'half':
      return `${Number(p.month) <= 6 ? '1er' : '2e'} semestre ${p.year}`;
    case 'year':
      return `Courant ${p.year}`;
    case 'decade':
      return `Années ${p.year}`;
    default:
      return 'Date non renseignée';
  }
}

/** Compact variant for tables and cards. */
export function formatLaunchDateShort(d: DateShape, timeZone: string): string {
  if (d.lo === null) return '—';
  const p = parts(d.lo, timeZone);
  switch (d.kind) {
    case 'instant':
    case 'unrecorded':
      return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
    case 'day':
      return `${p.day}.${p.month}.${p.year}`;
    case 'month':
      return `${p.month}.${p.year}`;
    case 'quarter':
      return `T${Math.floor(Number(p.month) / 3.01) + 1} ${p.year}`;
    case 'half':
      return `S${Number(p.month) <= 6 ? 1 : 2} ${p.year}`;
    case 'year':
      return String(p.year);
    case 'decade':
      return `${p.year}s`;
    default:
      return '—';
  }
}

export const PRECISION_NOTE: Record<PrecisionKind | 'unknown', string | null> = {
  instant: null,
  unrecorded: 'Précision non indiquée par la source',
  day: 'Jour connu, heure non publiée',
  month: 'Mois connu, jour non publié',
  quarter: 'Trimestre annoncé',
  half: 'Semestre annoncé',
  year: 'Année annoncée',
  decade: 'Décennie annoncée',
  unknown: 'Date inconnue',
};

export const PRECISION_BADGE: Record<PrecisionKind | 'unknown', string | null> = {
  instant: null,
  unrecorded: 'précision inconnue',
  day: 'à la journée',
  month: 'au mois',
  quarter: 'au trimestre',
  half: 'au semestre',
  year: "à l'année",
  decade: 'à la décennie',
  unknown: 'inconnue',
};

export function formatTimestamp(iso: string | null, timeZone: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const p = parts(t, timeZone);
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}

export function formatClock(iso: string | null, timeZone: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const p = parts(t, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** ISO-8601 duration to a readable French span. */
export function formatDuration(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m =
    /^(-)?P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      iso.trim(),
    );
  if (!m) return null;
  const [, , y, mo, d, h, mi, sec] = m;
  const bits: string[] = [];
  if (y) bits.push(`${Math.round(Number(y))} an${Number(y) > 1 ? 's' : ''}`);
  if (mo) bits.push(`${Math.round(Number(mo))} mois`);
  if (d) bits.push(`${Math.round(Number(d))} j`);
  if (h && bits.length < 2) bits.push(`${Math.round(Number(h))} h`);
  if (mi && bits.length < 2) bits.push(`${Math.round(Number(mi))} min`);
  // Seconds only surface when they are the finest unit available, so a short
  // turnaround expressed purely in seconds is not rendered as an empty value.
  if (sec && bits.length === 0) bits.push(`${Math.round(Number(sec))} s`);
  return bits.length ? bits.join(' ') : null;
}

/** Signed seconds relative to T-0, as used by the planned timeline. */
export function formatRelative(sec: number): string {
  const sign = sec < 0 ? '-' : '+';
  const a = Math.abs(sec);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = Math.round(a % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `T${sign}${h}:${pad(m)}:${pad(s)}` : `T${sign}${pad(m)}:${pad(s)}`;
}

export function formatMass(kg: number | null | undefined): string | null {
  if (kg === null || kg === undefined) return null;
  return kg >= 1000
    ? `${(kg / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} t`
    : `${kg.toLocaleString('fr-FR')} kg`;
}

export function formatKm(km: number | null | undefined): string | null {
  if (km === null || km === undefined) return null;
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km`;
}

export const num = (n: number) => n.toLocaleString('fr-FR');

/** Ordinal used for "troisième vol de cet exemplaire". */
export function ordinalFr(n: number): string {
  return n === 1 ? '1er' : `${n}e`;
}

export const NOT_PROVIDED = 'Non renseigné';
