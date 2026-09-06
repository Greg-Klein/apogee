import { requireDb } from './client';
import type { LaunchOutcome, LaunchPhase, RecoveryResult } from '../domain/status';
import type { PrecisionKind } from '../domain/precision';

export type LaunchRow = {
  id: string;
  slug: string;
  name: string;
  designator: string | null;
  status_id: number;
  status_name: string;
  status_abbrev: string;
  status_description: string | null;
  phase: LaunchPhase;
  outcome: LaunchOutcome;
  fail_reason: string | null;
  probability: number | null;
  weather_concerns: string | null;
  net: string | null;
  precision_kind: PrecisionKind | 'unknown';
  precision_label: string | null;
  date_lo: number | null;
  date_hi: number | null;
  window_start: string | null;
  window_end: string | null;
  pad_turnaround: string | null;
  last_updated: string | null;
  mission_name: string | null;
  mission_type: string | null;
  mission_description: string | null;
  orbit_name: string | null;
  orbit_abbrev: string | null;
  config_id: number | null;
  config_name: string | null;
  config_full_name: string | null;
  family: string | null;
  provider_id: number | null;
  provider_name: string | null;
  pad_id: number | null;
  pad_name: string | null;
  pad_wiki: string | null;
  pad_map_url: string | null;
  pad_lat: number | null;
  pad_lon: number | null;
  location_id: number | null;
  location_name: string | null;
  location_country: string | null;
  image_url: string | null;
  image_thumb: string | null;
  image_credit: string | null;
  patch_url: string | null;
  flightclub_url: string | null;
  webcast_live: number;
  is_crewed: number;
  is_test: number;
  booster_count: number;
  payload_count: number;
  has_video: number;
};

export type LaunchListItem = LaunchRow & {
  serials: string | null;
  programs: string | null;
  recoveries: string | null;
  /** 1 when the source pins the date to at least a month. Drives list grouping. */
  is_precise: number;
};

export type CatalogView = 'upcoming' | 'past' | 'all';
export type CatalogSort = 'date_desc' | 'date_asc' | 'name_asc';

export type CatalogFilters = {
  view: CatalogView;
  q?: string;
  families?: string[];
  outcomes?: string[]; // success | failure | partial | unknown | scheduled | in_flight
  locations?: number[];
  pads?: number[];
  missionTypes?: string[];
  programs?: number[];
  agencies?: number[];
  crewed?: 'yes' | 'no';
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  sort: CatalogSort;
  page: number;
  perPage: number;
};

type Clause = { sql: string; params: unknown[] };

/**
 * Builds the WHERE clauses for the catalogue.
 *
 * Categories combine with AND, values inside a category with OR, per the brief.
 * A date range keeps any launch whose *interval* overlaps it, so a mission known
 * only to the month is not silently dropped from a search that covers that month.
 */
function buildClauses(f: CatalogFilters): Clause {
  const sql: string[] = [];
  const params: unknown[] = [];

  if (f.view === 'upcoming') sql.push(`l.phase IN ('scheduled','in_flight')`);
  else if (f.view === 'past') sql.push(`l.phase = 'flown'`);

  if (f.families?.length) {
    sql.push(`l.family IN (${f.families.map(() => '?').join(',')})`);
    params.push(...f.families);
  }
  if (f.outcomes?.length) {
    const parts: string[] = [];
    const outcomeValues = f.outcomes.filter((o) => ['success', 'failure', 'partial', 'unknown'].includes(o));
    if (outcomeValues.length) {
      parts.push(`(l.phase = 'flown' AND l.outcome IN (${outcomeValues.map(() => '?').join(',')}))`);
      params.push(...outcomeValues);
    }
    if (f.outcomes.includes('scheduled')) parts.push(`l.phase = 'scheduled'`);
    if (f.outcomes.includes('in_flight')) parts.push(`l.phase = 'in_flight'`);
    if (parts.length) sql.push(`(${parts.join(' OR ')})`);
  }
  if (f.locations?.length) {
    sql.push(`l.location_id IN (${f.locations.map(() => '?').join(',')})`);
    params.push(...f.locations);
  }
  if (f.pads?.length) {
    sql.push(`l.pad_id IN (${f.pads.map(() => '?').join(',')})`);
    params.push(...f.pads);
  }
  if (f.missionTypes?.length) {
    sql.push(`l.mission_type IN (${f.missionTypes.map(() => '?').join(',')})`);
    params.push(...f.missionTypes);
  }
  if (f.programs?.length) {
    sql.push(
      `EXISTS (SELECT 1 FROM launch_program lp WHERE lp.launch_id = l.id AND lp.program_id IN (${f.programs.map(() => '?').join(',')}))`,
    );
    params.push(...f.programs);
  }
  if (f.agencies?.length) {
    sql.push(
      `EXISTS (SELECT 1 FROM launch_agency la WHERE la.launch_id = l.id AND la.agency_id IN (${f.agencies.map(() => '?').join(',')}))`,
    );
    params.push(...f.agencies);
  }
  if (f.crewed === 'yes') sql.push('l.is_crewed = 1');
  if (f.crewed === 'no') sql.push('l.is_crewed = 0');

  if (f.from) {
    const lo = Date.parse(`${f.from}T00:00:00Z`);
    if (!Number.isNaN(lo)) {
      sql.push('(l.date_hi IS NULL OR l.date_hi > ?)');
      params.push(lo);
    }
  }
  if (f.to) {
    const hi = Date.parse(`${f.to}T00:00:00Z`) + 86_400_000;
    if (!Number.isNaN(hi)) {
      sql.push('(l.date_lo IS NULL OR l.date_lo < ?)');
      params.push(hi);
    }
  }

  if (f.q?.trim()) {
    // Search reaches serial numbers and programs through the cross-entity index,
    // so a booster number finds its missions even when it is absent from the title.
    sql.push(`l.slug IN (SELECT ref FROM search_index WHERE entity = 'launch' AND search_index MATCH ?)`);
    params.push(toMatchQuery(f.q));
  }

  return { sql: sql.length ? `WHERE ${sql.join(' AND ')}` : '', params };
}

/** Turns free text into a prefix-matching FTS5 query, escaping quotes. */
export function toMatchQuery(input: string): string {
  const terms = input
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, ''))
    .filter(Boolean)
    .slice(0, 8);
  if (!terms.length) return '""';
  return terms.map((t) => `"${t}"*`).join(' AND ');
}

/**
 * A date is "precise" when the source pins it to at least a month. Coarser ones
 * (quarter, half, year, decade) are grouped after the precise dates rather than
 * being interleaved: a mission announced for "the 2020s" carries an interval
 * starting in 2020, and sorting on that alone would park it ahead of next week's
 * launch. The list renders the two groups with an explicit separator.
 */
export const PRECISE_KINDS = "('instant','unrecorded','day','month')";
const PRECISE = `l.precision_kind IN ${PRECISE_KINDS}`;

const ORDER: Record<CatalogSort, string> = {
  // Undated missions sort last rather than being given an invented position.
  date_desc: `l.date_lo IS NULL, ${PRECISE} DESC, l.date_lo DESC, l.name ASC`,
  date_asc: `l.date_lo IS NULL, ${PRECISE} DESC, l.date_lo ASC, l.name ASC`,
  name_asc: 'l.name ASC',
};

const LIST_SELECT = `
  SELECT l.*,
    (${PRECISE}) AS is_precise,
    (SELECT GROUP_CONCAT(v.serial_number, ' · ') FROM flight_assignment a
       JOIN vehicle v ON v.id = a.vehicle_id
      WHERE a.launch_id = l.id AND a.kind = 'booster' AND v.serial_number IS NOT NULL) AS serials,
    (SELECT GROUP_CONCAT(lp.name, ' · ') FROM launch_program lp WHERE lp.launch_id = l.id) AS programs,
    (SELECT GROUP_CONCAT(a.recovery, ',') FROM flight_assignment a
      WHERE a.launch_id = l.id AND a.kind = 'booster') AS recoveries
  FROM launch l
`;

export type CatalogResult = {
  items: LaunchListItem[];
  total: number;
  page: number;
  pages: number;
};

export function queryCatalog(f: CatalogFilters): CatalogResult {
  const db = requireDb();
  const { sql, params } = buildClauses(f);
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM launch l ${sql}`).get(...params) as { n: number }).n;
  const pages = Math.max(1, Math.ceil(total / f.perPage));
  const page = Math.min(Math.max(1, f.page), pages);
  const items = db
    .prepare(`${LIST_SELECT} ${sql} ORDER BY ${ORDER[f.sort]} LIMIT ? OFFSET ?`)
    .all(...params, f.perPage, (page - 1) * f.perPage) as LaunchListItem[];
  return { items, total, page, pages };
}

/** Counts per view for the segmented control, under the same non-view filters. */
export function countByView(f: CatalogFilters): Record<CatalogView, number> {
  const db = requireDb();
  const out = {} as Record<CatalogView, number>;
  for (const view of ['upcoming', 'past', 'all'] as CatalogView[]) {
    const { sql, params } = buildClauses({ ...f, view });
    out[view] = (db.prepare(`SELECT COUNT(*) AS n FROM launch l ${sql}`).get(...params) as { n: number }).n;
  }
  return out;
}

export function getLaunchBySlug(slug: string): LaunchRow | null {
  const db = requireDb();
  return (db.prepare('SELECT * FROM launch WHERE slug = ?').get(slug) as LaunchRow | undefined) ?? null;
}

export function listLaunchSlugs(limit = 400): string[] {
  const db = requireDb();
  return (
    db.prepare(`SELECT slug FROM launch ORDER BY date_lo IS NULL, date_lo DESC LIMIT ?`).all(limit) as Array<{
      slug: string;
    }>
  ).map((r) => r.slug);
}

/** Next launch with a usable target time, and the ones whose date is still open. */
export function getNextLaunch(): LaunchRow | null {
  const db = requireDb();
  return (
    (db
      .prepare(
        `
        SELECT * FROM launch
        WHERE phase IN ('scheduled','in_flight')
          AND precision_kind IN ('instant','day')
          AND date_lo IS NOT NULL
        ORDER BY phase = 'in_flight' DESC, date_lo ASC
        LIMIT 1
      `,
      )
      .get() as LaunchRow | undefined) ?? null
  );
}

export function getUndatedUpcoming(limit = 8): LaunchListItem[] {
  const db = requireDb();
  return db
    .prepare(
      `${LIST_SELECT}
      WHERE l.phase = 'scheduled' AND l.precision_kind NOT IN ('instant','day')
      ORDER BY l.date_lo IS NULL, l.date_lo ASC LIMIT ?`,
    )
    .all(limit) as LaunchListItem[];
}

export function getUpcoming(limit = 6, excludeId?: string): LaunchListItem[] {
  const db = requireDb();
  return db
    .prepare(
      `${LIST_SELECT}
      WHERE l.phase IN ('scheduled','in_flight')
        AND l.precision_kind IN ('instant','day')
        AND (? IS NULL OR l.id <> ?)
      ORDER BY l.date_lo IS NULL, l.date_lo ASC LIMIT ?`,
    )
    .all(excludeId ?? null, excludeId ?? null, limit) as LaunchListItem[];
}

export function getRecent(limit = 6): LaunchListItem[] {
  const db = requireDb();
  return db
    .prepare(`${LIST_SELECT} WHERE l.phase = 'flown' ORDER BY l.date_lo DESC LIMIT ?`)
    .all(limit) as LaunchListItem[];
}

// --- flight detail --------------------------------------------------------

export type ProgramRow = {
  program_id: number;
  name: string;
  info_url: string | null;
  wiki_url: string | null;
  image_url: string | null;
};
export type AgencyRow = { agency_id: number; name: string; abbrev: string | null; role: string };
export type LinkRow = {
  kind: 'video' | 'info';
  priority: number | null;
  title: string | null;
  description: string | null;
  url: string;
  source: string | null;
  publisher: string | null;
  type_name: string | null;
  language: string | null;
  feature_image: string | null;
  start_time: string | null;
  is_live: number;
};
export type UpdateRow = {
  id: number;
  comment: string | null;
  info_url: string | null;
  created_by: string | null;
  created_on: string | null;
};
export type TimelineRow = { seq: number; abbrev: string; description: string | null; offset_sec: number };

export type AssignmentRow = {
  id: number;
  launch_id: string;
  vehicle_id: string | null;
  model_id: string | null;
  kind: 'booster' | 'spacecraft';
  role: 'core' | 'side_booster' | 'spacecraft';
  reused: number | null;
  flight_number: number | null;
  previous_flight: string | null;
  turnaround: string | null;
  landing_documented: number;
  landing_attempt: number | null;
  landing_success: number | null;
  recovery: RecoveryResult;
  landing_type: string | null;
  landing_type_abbrev: string | null;
  landing_zone: string | null;
  landing_zone_abbrev: string | null;
  landing_description: string | null;
  downrange_km: number | null;
  destination: string | null;
  duration: string | null;
  mission_end: string | null;
  serial_number: string | null;
  vehicle_name: string | null;
  vehicle_status: string | null;
  vehicle_recorded_flights: number | null;
  model_name: string | null;
  model_type: string | null;
};

export type CrewRow = {
  assignment_id: number;
  astronaut_id: number;
  name: string;
  role: string | null;
  role_priority: number | null;
  phase: string;
  agency: string | null;
  nationality: string | null;
  image_thumb: string | null;
  wiki_url: string | null;
};

export type PayloadFlightRow = {
  id: string;
  destination: string | null;
  amount: number | null;
  source_kind: string;
  payload_id: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  operator: string | null;
  description: string | null;
  mass_kg: number | null;
  image_thumb: string | null;
  info_url: string | null;
  wiki_url: string | null;
};

export function getLaunchDetail(launchId: string) {
  const db = requireDb();
  return {
    programs: db
      .prepare(
        'SELECT program_id, name, info_url, wiki_url, image_url FROM launch_program WHERE launch_id = ?',
      )
      .all(launchId) as ProgramRow[],
    agencies: db
      .prepare('SELECT agency_id, name, abbrev, role FROM launch_agency WHERE launch_id = ? ORDER BY role')
      .all(launchId) as AgencyRow[],
    links: db
      .prepare(
        'SELECT kind, priority, title, description, url, source, publisher, type_name, language, feature_image, start_time, is_live FROM launch_link WHERE launch_id = ? ORDER BY priority IS NULL, priority ASC',
      )
      .all(launchId) as LinkRow[],
    updates: db
      .prepare(
        'SELECT id, comment, info_url, created_by, created_on FROM launch_update WHERE launch_id = ? ORDER BY created_on DESC',
      )
      .all(launchId) as UpdateRow[],
    timeline: db
      .prepare(
        'SELECT seq, abbrev, description, offset_sec FROM launch_timeline WHERE launch_id = ? ORDER BY offset_sec ASC',
      )
      .all(launchId) as TimelineRow[],
    assignments: db
      .prepare(
        `
      SELECT a.*, v.serial_number, v.name AS vehicle_name, v.status_name AS vehicle_status,
             v.recorded_flights AS vehicle_recorded_flights,
             m.name AS model_name, m.type AS model_type
      FROM flight_assignment a
      LEFT JOIN vehicle v ON v.id = a.vehicle_id
      LEFT JOIN vehicle_model m ON m.id = a.model_id
      WHERE a.launch_id = ?
      ORDER BY a.kind DESC, a.role = 'core' DESC, a.id ASC
    `,
      )
      .all(launchId) as AssignmentRow[],
    crew: db
      .prepare(
        'SELECT * FROM crew_seat WHERE launch_id = ? ORDER BY phase, role_priority IS NULL, role_priority ASC',
      )
      .all(launchId) as CrewRow[],
    payloads: db
      .prepare(
        `
      SELECT pf.id, pf.destination, pf.amount, pf.source_kind, pf.payload_id,
             p.name, p.type, p.manufacturer, p.operator, p.description, p.mass_kg,
             p.image_thumb, p.info_url, p.wiki_url
      FROM payload_flight pf JOIN payload p ON p.id = pf.payload_id
      WHERE pf.launch_id = ? ORDER BY pf.source_kind, p.name
    `,
      )
      .all(launchId) as PayloadFlightRow[],
  };
}

/** Sibling flights used by the "prolongements" block at the end of a flight page. */
export function getRelatedLaunches(launch: LaunchRow, limit = 5) {
  const db = requireDb();
  const programIds = (
    db.prepare('SELECT program_id FROM launch_program WHERE launch_id = ?').all(launch.id) as Array<{
      program_id: number;
    }>
  ).map((r) => r.program_id);
  const samePad = db
    .prepare(
      `${LIST_SELECT} WHERE l.pad_id = ? AND l.id <> ? ORDER BY l.date_lo IS NULL, l.date_lo DESC LIMIT ?`,
    )
    .all(launch.pad_id, launch.id, limit) as LaunchListItem[];
  const sameProgram = programIds.length
    ? (db
        .prepare(
          `${LIST_SELECT}
        WHERE l.id <> ? AND EXISTS (SELECT 1 FROM launch_program lp WHERE lp.launch_id = l.id AND lp.program_id IN (${programIds.map(() => '?').join(',')}))
        ORDER BY l.date_lo IS NULL, l.date_lo DESC LIMIT ?`,
        )
        .all(launch.id, ...programIds, limit) as LaunchListItem[])
    : [];
  const sameConfig = db
    .prepare(
      `${LIST_SELECT} WHERE l.config_id = ? AND l.id <> ? ORDER BY l.date_lo IS NULL, l.date_lo DESC LIMIT ?`,
    )
    .all(launch.config_id, launch.id, limit) as LaunchListItem[];
  return { samePad, sameProgram, sameConfig, programIds };
}
