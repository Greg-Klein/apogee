import { requireDb } from './client';

export type PayloadRow = {
  id: string;
  source_kind: 'payload' | 'spacecraft';
  name: string;
  type: string | null;
  manufacturer: string | null;
  operator: string | null;
  description: string | null;
  mass_kg: number | null;
  image_url: string | null;
  image_thumb: string | null;
  info_url: string | null;
  wiki_url: string | null;
};

export type PayloadListItem = PayloadRow & {
  flight_count: number;
  destinations: string | null;
  launch_slug: string | null;
  launch_name: string | null;
  launch_date: number | null;
};

export type PayloadFilters = {
  q?: string;
  types?: string[];
  operators?: string[];
  destinations?: string[];
  sort: 'recent' | 'name';
};

const SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM payload_flight pf WHERE pf.payload_id = p.id) AS flight_count,
    (SELECT GROUP_CONCAT(DISTINCT pf.destination) FROM payload_flight pf WHERE pf.payload_id = p.id) AS destinations,
    (SELECT l.slug FROM payload_flight pf JOIN launch l ON l.id = pf.launch_id
      WHERE pf.payload_id = p.id ORDER BY l.date_lo DESC LIMIT 1) AS launch_slug,
    (SELECT l.name FROM payload_flight pf JOIN launch l ON l.id = pf.launch_id
      WHERE pf.payload_id = p.id ORDER BY l.date_lo DESC LIMIT 1) AS launch_name,
    (SELECT l.date_lo FROM payload_flight pf JOIN launch l ON l.id = pf.launch_id
      WHERE pf.payload_id = p.id ORDER BY l.date_lo DESC LIMIT 1) AS launch_date
  FROM payload p
`;

export function listPayloads(f: PayloadFilters): PayloadListItem[] {
  const db = requireDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.q?.trim()) {
    where.push('(p.name LIKE ? OR p.operator LIKE ? OR p.manufacturer LIKE ?)');
    const like = `%${f.q.trim()}%`;
    params.push(like, like, like);
  }
  if (f.types?.length) {
    where.push(`COALESCE(p.type,'Non renseigné') IN (${f.types.map(() => '?').join(',')})`);
    params.push(...f.types);
  }
  if (f.operators?.length) {
    where.push(`COALESCE(p.operator,'Non renseigné') IN (${f.operators.map(() => '?').join(',')})`);
    params.push(...f.operators);
  }
  if (f.destinations?.length) {
    where.push(
      `EXISTS (SELECT 1 FROM payload_flight pf WHERE pf.payload_id = p.id AND COALESCE(pf.destination,'Non renseignée') IN (${f.destinations.map(() => '?').join(',')}))`,
    );
    params.push(...f.destinations);
  }
  const order = f.sort === 'name' ? 'p.name ASC' : 'launch_date IS NULL, launch_date DESC';
  return db
    .prepare(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`)
    .all(...params) as PayloadListItem[];
}

export function getPayload(id: string): PayloadRow | null {
  const db = requireDb();
  return (db.prepare('SELECT * FROM payload WHERE id = ?').get(id) as PayloadRow | undefined) ?? null;
}

/**
 * Every flight of this payload, kept as separate associations.
 * Two objects with similar names are never merged, and one object flown twice keeps both rows.
 */
export function getPayloadFlights(payloadId: string) {
  const db = requireDb();
  return db
    .prepare(
      `
    SELECT pf.id, pf.destination, pf.amount, pf.source_kind,
           l.slug, l.name AS launch_name, l.phase, l.outcome, l.net, l.date_lo, l.date_hi,
           l.precision_kind, l.precision_label, l.orbit_name, l.pad_name, l.location_name, l.mission_type
    FROM payload_flight pf JOIN launch l ON l.id = pf.launch_id
    WHERE pf.payload_id = ? ORDER BY l.date_lo IS NULL, l.date_lo DESC
  `,
    )
    .all(payloadId) as Array<Record<string, unknown>>;
}

export function getPayloadFacets() {
  const db = requireDb();
  return {
    types: db
      .prepare(
        `SELECT COALESCE(type,'Non renseigné') AS value, COALESCE(type,'Non renseigné') AS label, COUNT(*) AS count FROM payload GROUP BY value ORDER BY count DESC`,
      )
      .all() as Array<{ value: string; label: string; count: number }>,
    operators: db
      .prepare(
        `SELECT COALESCE(operator,'Non renseigné') AS value, COALESCE(operator,'Non renseigné') AS label, COUNT(*) AS count FROM payload GROUP BY value ORDER BY count DESC LIMIT 30`,
      )
      .all() as Array<{ value: string; label: string; count: number }>,
    destinations: db
      .prepare(
        `SELECT COALESCE(destination,'Non renseignée') AS value, COALESCE(destination,'Non renseignée') AS label, COUNT(*) AS count FROM payload_flight GROUP BY value ORDER BY count DESC`,
      )
      .all() as Array<{ value: string; label: string; count: number }>,
  };
}
