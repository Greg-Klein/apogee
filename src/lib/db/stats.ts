import { requireDb } from './client';

export type PeriodStats = {
  from: number;
  to: number;
  /** Launches that actually left the pad in the period. Scheduled ones are excluded. */
  flown: number;
  /** Departed but with no published result yet. Counted in `flown`, listed apart. */
  inFlight: number;
  outcomes: Array<{ key: string; label: string; count: number }>;
  families: Array<{ family: string; count: number }>;
  upcoming: number;
  /** Flown launches whose date is only known coarsely, hence approximate in this period. */
  approximate: number;
  /** Physical articles that participated, which exceeds `flown` on multi-booster flights. */
  boosterParticipations: number;
  reusedParticipations: number;
  recoveries: { success: number; failure: number; noAttempt: number; unknown: number };
  testFlights: number;
};

/**
 * Period indicators.
 *
 * "Flown" counts launches whose status says they left the pad, never launches whose
 * target time has merely passed. Booster participations are counted separately so a
 * Falcon Heavy reads as one flight and three articles.
 */
export function getPeriodStats(from: number, to: number): PeriodStats {
  const db = requireDb();
  const overlap = 'l.date_lo IS NOT NULL AND l.date_lo < ? AND l.date_hi > ?';
  const args = [to, from];

  const flown = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM launch l WHERE l.phase IN ('flown','in_flight') AND ${overlap}`)
      .get(...args) as { n: number }
  ).n;

  const inFlight = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM launch l WHERE l.phase = 'in_flight' AND ${overlap}`)
      .get(...args) as {
      n: number;
    }
  ).n;

  // Outcomes cover resolved flights only. A launch still in flight has no published
  // result, so it is reported on its own line rather than inflating "résultat inconnu".
  const outcomeRows = db
    .prepare(
      `
    SELECT l.outcome AS key, COUNT(*) AS count FROM launch l
    WHERE l.phase = 'flown' AND ${overlap} GROUP BY l.outcome
  `,
    )
    .all(...args) as Array<{ key: string; count: number }>;

  const LABELS: Record<string, string> = {
    success: 'Réussis',
    failure: 'Échecs',
    partial: 'Échecs partiels',
    unknown: 'Résultat inconnu',
    in_flight: 'En vol, résultat non publié',
  };

  const families = db
    .prepare(
      `
    SELECT l.family AS family, COUNT(*) AS count FROM launch l
    WHERE l.phase IN ('flown','in_flight') AND l.family IS NOT NULL AND ${overlap}
    GROUP BY l.family ORDER BY count DESC
  `,
    )
    .all(...args) as Array<{ family: string; count: number }>;

  const upcoming = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM launch l WHERE l.phase = 'scheduled' AND ${overlap}`)
      .get(...args) as { n: number }
  ).n;

  const approximate = (
    db
      .prepare(
        `
    SELECT COUNT(*) AS n FROM launch l
    WHERE l.phase IN ('flown','in_flight') AND l.precision_kind NOT IN ('instant','unrecorded','day') AND ${overlap}
  `,
      )
      .get(...args) as { n: number }
  ).n;

  const part = db
    .prepare(
      `
    SELECT COUNT(*) AS total, SUM(CASE WHEN a.reused = 1 THEN 1 ELSE 0 END) AS reused
    FROM flight_assignment a JOIN launch l ON l.id = a.launch_id
    WHERE a.kind = 'booster' AND l.phase IN ('flown','in_flight') AND ${overlap}
  `,
    )
    .get(...args) as { total: number; reused: number | null };

  const rec = db
    .prepare(
      `
    SELECT a.recovery AS r, COUNT(*) AS n
    FROM flight_assignment a JOIN launch l ON l.id = a.launch_id
    WHERE a.kind = 'booster' AND l.phase IN ('flown','in_flight') AND ${overlap}
    GROUP BY a.recovery
  `,
    )
    .all(...args) as Array<{ r: string; n: number }>;
  const recMap = Object.fromEntries(rec.map((x) => [x.r, x.n]));

  const testFlights = (
    db
      .prepare(
        `
    SELECT COUNT(*) AS n FROM launch l WHERE l.is_test = 1 AND l.phase IN ('flown','in_flight') AND ${overlap}
  `,
      )
      .get(...args) as { n: number }
  ).n;

  return {
    from,
    to,
    flown,
    inFlight,
    outcomes: [
      ...outcomeRows.map((r) => ({ key: r.key, label: LABELS[r.key] ?? r.key, count: r.count })),
      ...(inFlight ? [{ key: 'in_flight', label: LABELS.in_flight, count: inFlight }] : []),
    ].sort((a, b) => b.count - a.count),
    families,
    upcoming,
    approximate,
    boosterParticipations: part.total ?? 0,
    reusedParticipations: part.reused ?? 0,
    recoveries: {
      success: recMap.success ?? 0,
      failure: recMap.failure ?? 0,
      noAttempt: recMap.no_attempt ?? 0,
      unknown: (recMap.attempted_unknown ?? 0) + (recMap.undocumented ?? 0),
    },
    testFlights,
  };
}

/** Flights per year, for the overview chart. Flown only. */
export function getYearlyCadence(): Array<{
  year: number;
  flown: number;
  success: number;
  failure: number;
  partial: number;
}> {
  const db = requireDb();
  return db
    .prepare(
      `
    SELECT CAST(strftime('%Y', date_lo / 1000, 'unixepoch') AS INTEGER) AS year,
           COUNT(*) AS flown,
           SUM(outcome = 'success') AS success,
           SUM(outcome = 'failure') AS failure,
           SUM(outcome = 'partial') AS partial
    FROM launch
    WHERE phase IN ('flown','in_flight') AND date_lo IS NOT NULL
    GROUP BY year ORDER BY year ASC
  `,
    )
    .all() as Array<{ year: number; flown: number; success: number; failure: number; partial: number }>;
}
