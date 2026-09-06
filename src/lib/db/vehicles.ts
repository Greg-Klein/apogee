import { requireDb } from './client';
import type { RecoveryResult } from '../domain/status';

export type VehicleRow = {
  id: string;
  kind: 'booster' | 'spacecraft';
  source_id: number;
  serial_number: string | null;
  name: string;
  model_id: string | null;
  model_name: string | null;
  status_name: string | null;
  details: string | null;
  image_url: string | null;
  image_thumb: string | null;
  image_credit: string | null;
  is_placeholder: number;
  in_space: number | null;
  time_in_space: string | null;
  fastest_turnaround: string | null;
  source_flights: number | null;
  source_first_flight: string | null;
  source_last_flight: string | null;
  source_successful_landings: number | null;
  source_attempted_landings: number | null;
  recorded_flights: number;
  recorded_upcoming: number;
};

export type ModelRow = {
  id: string;
  kind: 'launcher' | 'spacecraft';
  source_id: number;
  name: string;
  full_name: string | null;
  family: string | null;
  type: string | null;
  manufacturer: string | null;
  description: string | null;
  maiden_flight: string | null;
  height: number | null;
  diameter: number | null;
  crew_capacity: number | null;
  human_rated: number | null;
  reusable: number | null;
  launch_mass: number | null;
  leo_capacity: number | null;
  gto_capacity: number | null;
  info_url: string | null;
  wiki_url: string | null;
  image_url: string | null;
  image_thumb: string | null;
  image_credit: string | null;
};

export type VehicleFilters = {
  kind?: 'booster' | 'spacecraft';
  q?: string;
  model?: string;
  status?: string;
  sort: 'flights_desc' | 'recent' | 'name';
};

export function listModels(): Array<ModelRow & { article_count: number; launch_count: number }> {
  const db = requireDb();
  return db
    .prepare(
      `
    SELECT m.*,
      (SELECT COUNT(*) FROM vehicle v WHERE v.model_id = m.id) AS article_count,
      (SELECT COUNT(DISTINCT a.launch_id) FROM flight_assignment a WHERE a.model_id = m.id) AS launch_count
    FROM vehicle_model m
    ORDER BY launch_count DESC, m.name ASC
  `,
    )
    .all() as Array<ModelRow & { article_count: number; launch_count: number }>;
}

export function getModel(id: string): ModelRow | null {
  const db = requireDb();
  return (db.prepare('SELECT * FROM vehicle_model WHERE id = ?').get(id) as ModelRow | undefined) ?? null;
}

export function listVehicles(f: VehicleFilters): VehicleRow[] {
  const db = requireDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.kind) {
    where.push('v.kind = ?');
    params.push(f.kind);
  }
  if (f.model) {
    where.push('v.model_id = ?');
    params.push(f.model);
  }
  if (f.status) {
    where.push('LOWER(COALESCE(v.status_name, "")) = LOWER(?)');
    params.push(f.status);
  }
  if (f.q?.trim()) {
    where.push('(v.name LIKE ? OR v.serial_number LIKE ? OR v.model_name LIKE ?)');
    const like = `%${f.q.trim()}%`;
    params.push(like, like, like);
  }
  const order = {
    flights_desc: 'v.recorded_flights DESC, v.name ASC',
    recent: 'v.source_last_flight IS NULL, v.source_last_flight DESC',
    name: 'v.name ASC',
  }[f.sort];
  return db
    .prepare(
      `SELECT v.* FROM vehicle v ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}`,
    )
    .all(...params) as VehicleRow[];
}

export function getVehicle(id: string): VehicleRow | null {
  const db = requireDb();
  return (db.prepare('SELECT * FROM vehicle WHERE id = ?').get(id) as VehicleRow | undefined) ?? null;
}

export type VehicleFlight = {
  assignment_id: number;
  launch_id: string;
  slug: string;
  launch_name: string;
  mission_type: string | null;
  phase: string;
  outcome: string;
  net: string | null;
  date_lo: number | null;
  date_hi: number | null;
  precision_kind: string;
  precision_label: string | null;
  pad_name: string | null;
  location_name: string | null;
  role: string;
  flight_number: number | null;
  reused: number | null;
  recovery: RecoveryResult;
  landing_type: string | null;
  landing_zone: string | null;
  landing_zone_abbrev: string | null;
  landing_description: string | null;
  turnaround: string | null;
  previous_flight: string | null;
  destination: string | null;
  duration: string | null;
  mission_end: string | null;
};

/** Chronological participation history. Flight rank stays the one recorded for that mission. */
export function getVehicleFlights(vehicleId: string): VehicleFlight[] {
  const db = requireDb();
  return db
    .prepare(
      `
    SELECT a.id AS assignment_id, a.launch_id, l.slug, l.name AS launch_name, l.mission_type,
           l.phase, l.outcome, l.net, l.date_lo, l.date_hi, l.precision_kind, l.precision_label,
           l.pad_name, l.location_name,
           a.role, a.flight_number, a.reused, a.recovery, a.landing_type, a.landing_zone,
           a.landing_zone_abbrev, a.landing_description, a.turnaround, a.previous_flight,
           a.destination, a.duration, a.mission_end
    FROM flight_assignment a JOIN launch l ON l.id = a.launch_id
    WHERE a.vehicle_id = ?
    ORDER BY l.date_lo IS NULL, l.date_lo ASC
  `,
    )
    .all(vehicleId) as VehicleFlight[];
}

export function getModelLaunches(modelId: string, limit = 30) {
  const db = requireDb();
  return db
    .prepare(
      `
    SELECT DISTINCT l.id, l.slug, l.name, l.phase, l.outcome, l.date_lo, l.date_hi,
           l.precision_kind, l.precision_label, l.net, l.mission_type, l.pad_name
    FROM flight_assignment a JOIN launch l ON l.id = a.launch_id
    WHERE a.model_id = ?
    ORDER BY l.date_lo IS NULL, l.date_lo DESC LIMIT ?
  `,
    )
    .all(modelId, limit) as Array<Record<string, unknown>>;
}

export function getModelArticles(modelId: string): VehicleRow[] {
  const db = requireDb();
  return db
    .prepare('SELECT * FROM vehicle WHERE model_id = ? ORDER BY recorded_flights DESC, name ASC')
    .all(modelId) as VehicleRow[];
}

export function getVehicleStatusFacets(kind?: 'booster' | 'spacecraft') {
  const db = requireDb();
  return db
    .prepare(
      `
    SELECT COALESCE(status_name, 'Non renseigné') AS value, COALESCE(status_name, 'Non renseigné') AS label, COUNT(*) AS count
    FROM vehicle ${kind ? 'WHERE kind = ?' : ''} GROUP BY value ORDER BY count DESC
  `,
    )
    .all(...(kind ? [kind] : [])) as Array<{ value: string; label: string; count: number }>;
}
