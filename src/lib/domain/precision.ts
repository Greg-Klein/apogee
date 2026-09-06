/**
 * Date precision handling.
 *
 * Launch Library reports a target instant (`net`) alongside a precision that can be
 * as coarse as a decade. The brief forbids rendering an approximate date as if it
 * were an instant, so every launch is stored as an interval plus the precision that
 * produced it, and the UI formats from the precision rather than from `net`.
 */

export type PrecisionKind =
  'instant' | 'day' | 'month' | 'quarter' | 'half' | 'year' | 'decade' | 'unrecorded';

export type DatePrecision = {
  kind: PrecisionKind;
  /** Inclusive lower bound of the interval, epoch ms. */
  lo: number;
  /** Exclusive upper bound of the interval, epoch ms. */
  hi: number;
  /** Verbatim label from the source, kept when its meaning is uncertain. */
  sourceLabel: string | null;
};

const MINUTE = 60_000;

function utc(year: number, month = 0, day = 1): number {
  return Date.UTC(year, month, day);
}

/**
 * Maps an LL2 `net_precision.name` to an interval around `net`.
 * Unknown labels degrade to a whole-year interval rather than to a false instant.
 */
export function resolvePrecision(
  net: string | null,
  precisionName: string | null,
  hasFlown: boolean,
): DatePrecision | null {
  if (!net) return null;
  const t = Date.parse(net);
  if (Number.isNaN(t)) return null;

  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const label = precisionName?.trim() || null;

  if (!label) {
    // 177 historical launches carry no precision field. When the launch has flown,
    // `net` is a recorded liftoff time; we keep the instant but flag it as unstated.
    return hasFlown
      ? { kind: 'unrecorded', lo: t, hi: t + MINUTE, sourceLabel: null }
      : { kind: 'year', lo: utc(y), hi: utc(y + 1), sourceLabel: null };
  }

  const norm = label.toLowerCase();

  if (norm === 'second' || norm === 'minute' || norm === 'hour') {
    return { kind: 'instant', lo: t, hi: t + MINUTE, sourceLabel: label };
  }
  if (norm === 'day') {
    const lo = utc(y, m, d.getUTCDate());
    return { kind: 'day', lo, hi: lo + 86_400_000, sourceLabel: label };
  }
  if (norm === 'month') {
    return { kind: 'month', lo: utc(y, m), hi: utc(y, m + 1), sourceLabel: label };
  }
  const quarter = /^quarter\s*([1-4])$/.exec(norm);
  if (quarter) {
    const q = Number(quarter[1]) - 1;
    return { kind: 'quarter', lo: utc(y, q * 3), hi: utc(y, q * 3 + 3), sourceLabel: label };
  }
  const half = /^year\s*half\s*([12])$/.exec(norm);
  if (half) {
    const h = Number(half[1]) - 1;
    return { kind: 'half', lo: utc(y, h * 6), hi: utc(y, h * 6 + 6), sourceLabel: label };
  }
  if (norm === 'year' || norm === 'fiscal year') {
    return { kind: 'year', lo: utc(y), hi: utc(y + 1), sourceLabel: label };
  }
  if (norm === 'decade') {
    const start = Math.floor(y / 10) * 10;
    return { kind: 'decade', lo: utc(start), hi: utc(start + 10), sourceLabel: label };
  }
  // Unrecognised source label: keep it visible, widen to the year.
  return { kind: 'year', lo: utc(y), hi: utc(y + 1), sourceLabel: label };
}

/** True when the interval is tight enough to justify a countdown or a clock time. */
export function isInstant(kind: PrecisionKind): boolean {
  return kind === 'instant' || kind === 'unrecorded';
}
