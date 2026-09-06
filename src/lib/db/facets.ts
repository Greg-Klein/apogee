import { requireDb } from './client';

export type Facet = { value: string; label: string; count: number };

/** Filter options, each with the number of launches behind it across the whole catalogue. */
export function getFacets() {
  const db = requireDb();
  const rows = <T>(sql: string) => db.prepare(sql).all() as T[];

  return {
    families: rows<Facet>(`
      SELECT family AS value, family AS label, COUNT(*) AS count
      FROM launch WHERE family IS NOT NULL GROUP BY family ORDER BY count DESC`),
    locations: rows<Facet>(`
      SELECT CAST(location_id AS TEXT) AS value, location_name AS label, COUNT(*) AS count
      FROM launch WHERE location_id IS NOT NULL GROUP BY location_id ORDER BY count DESC`),
    pads: rows<Facet & { location_id: number }>(`
      SELECT CAST(pad_id AS TEXT) AS value, pad_name AS label, location_id, COUNT(*) AS count
      FROM launch WHERE pad_id IS NOT NULL GROUP BY pad_id ORDER BY count DESC`),
    missionTypes: rows<Facet>(`
      SELECT mission_type AS value, mission_type AS label, COUNT(*) AS count
      FROM launch WHERE mission_type IS NOT NULL GROUP BY mission_type ORDER BY count DESC`),
    programs: rows<Facet>(`
      SELECT CAST(program_id AS TEXT) AS value, name AS label, COUNT(*) AS count
      FROM launch_program GROUP BY program_id ORDER BY count DESC`),
    agencies: rows<Facet>(`
      SELECT CAST(agency_id AS TEXT) AS value, name AS label, COUNT(DISTINCT launch_id) AS count
      FROM launch_agency WHERE role <> 'provider' GROUP BY agency_id ORDER BY count DESC LIMIT 40`),
    orbits: rows<Facet>(`
      SELECT orbit_name AS value, orbit_name AS label, COUNT(*) AS count
      FROM launch WHERE orbit_name IS NOT NULL GROUP BY orbit_name ORDER BY count DESC`),
  };
}

export type FacetSet = ReturnType<typeof getFacets>;

export function getDateBounds(): { min: number | null; max: number | null } {
  const db = requireDb();
  const r = db
    .prepare('SELECT MIN(date_lo) AS min, MAX(date_hi) AS max FROM launch WHERE date_lo IS NOT NULL')
    .get() as {
    min: number | null;
    max: number | null;
  };
  return r;
}
