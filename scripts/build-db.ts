/**
 * Normalises the raw Launch Library pages in data/raw into data/spacex.db.
 *
 * Everything the UI reads comes from this database, so the rules the brief cares
 * about are enforced here once: date precision becomes an interval, scheduling is
 * kept apart from outcome, recovery is recorded per physical article, and counters
 * are computed from the launches we actually hold rather than copied from the source.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { resolvePrecision } from '../src/lib/domain/precision';
import { phaseOf, outcomeOf, recoveryOf } from '../src/lib/domain/status';
import type { LL2Launch, LL2LauncherStage, LL2Paginated, LL2SpacecraftStage } from '../src/lib/ll2/types';

const RAW = path.resolve('data/raw');
const DB_PATH = path.resolve('data/spacex.db');
const SCHEMA = path.resolve('src/lib/db/schema.sql');

function readPages<T>(prefix: string): T[] {
  if (!existsSync(RAW)) return [];
  const files = readdirSync(RAW)
    .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.json'))
    .sort();
  const out: T[] = [];
  for (const f of files) {
    const body = JSON.parse(readFileSync(path.join(RAW, f), 'utf8')) as LL2Paginated<T>;
    if (Array.isArray(body.results)) out.push(...body.results);
  }
  return out;
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'vol';

const bool = (v: unknown): number => (v ? 1 : 0);
const nullableBool = (v: unknown): number | null => (v === null || v === undefined ? null : v ? 1 : 0);

/** ISO-8601 duration (`-PT38M`, `P41DT13H35M30S`) to signed seconds. */
function durationToSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m =
    /^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      iso.trim(),
    );
  if (!m) return null;
  const [, sign, d, h, mi, s] = m;
  const total = Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(mi ?? 0) * 60 + Number(s ?? 0);
  return sign ? -total : total;
}

const TEST_MISSION_TYPES = new Set(['Test Flight']);

// ---------------------------------------------------------------------------

if (!existsSync(RAW) || readdirSync(RAW).filter((f) => f.startsWith('launches-')).length === 0) {
  console.error('No raw launch pages in data/raw. Run `npm run sync` first.');
  process.exit(1);
}

/**
 * Full pull plus any incremental pages, deduplicated by launch id.
 *
 * When the same mission appears in both, the record the source touched most recently
 * wins, so a postponement updates the existing flight rather than adding a second one.
 */
function mergeLaunches(): LL2Launch[] {
  const byId = new Map<string, LL2Launch>();
  for (const l of [...readPages<LL2Launch>('launches'), ...readPages<LL2Launch>('updates')]) {
    const existing = byId.get(l.id);
    if (!existing || (l.last_updated ?? '') >= (existing.last_updated ?? '')) byId.set(l.id, l);
  }
  return [...byId.values()];
}

const launches = mergeLaunches();
const rawLaunchers = readPages<Record<string, any>>('launchers');
const rawPayloads = readPages<Record<string, any>>('payloads');
const rawPayloadFlights = readPages<Record<string, any>>('payload-flights');
console.log(
  `raw: ${launches.length} launches, ${rawLaunchers.length} launchers, ` +
    `${rawPayloads.length} payloads, ${rawPayloadFlights.length} payload flights`,
);

mkdirSync(path.dirname(DB_PATH), { recursive: true });
for (const suffix of ['', '-wal', '-shm']) rmSync(`${DB_PATH}${suffix}`, { force: true });

const db = new Database(DB_PATH);
db.exec(readFileSync(SCHEMA, 'utf8'));

const ins = {
  launch: db.prepare(`INSERT INTO launch (
    id, slug, name, designator, last_updated,
    status_id, status_name, status_abbrev, status_description, phase, outcome,
    fail_reason, probability, weather_concerns,
    net, precision_kind, precision_label, date_lo, date_hi, window_start, window_end, pad_turnaround,
    mission_name, mission_type, mission_description, orbit_name, orbit_abbrev,
    config_id, config_name, config_full_name, family,
    provider_id, provider_name,
    pad_id, pad_name, pad_wiki, pad_map_url, pad_lat, pad_lon,
    location_id, location_name, location_country,
    image_url, image_thumb, image_credit, patch_url, flightclub_url, webcast_live,
    is_crewed, is_test, booster_count, payload_count, has_video
  ) VALUES (
    @id, @slug, @name, @designator, @last_updated,
    @status_id, @status_name, @status_abbrev, @status_description, @phase, @outcome,
    @fail_reason, @probability, @weather_concerns,
    @net, @precision_kind, @precision_label, @date_lo, @date_hi, @window_start, @window_end, @pad_turnaround,
    @mission_name, @mission_type, @mission_description, @orbit_name, @orbit_abbrev,
    @config_id, @config_name, @config_full_name, @family,
    @provider_id, @provider_name,
    @pad_id, @pad_name, @pad_wiki, @pad_map_url, @pad_lat, @pad_lon,
    @location_id, @location_name, @location_country,
    @image_url, @image_thumb, @image_credit, @patch_url, @flightclub_url, @webcast_live,
    @is_crewed, @is_test, @booster_count, @payload_count, @has_video
  )`),
  program: db.prepare(
    `INSERT OR IGNORE INTO launch_program VALUES (@launch_id, @program_id, @name, @info_url, @wiki_url, @image_url)`,
  ),
  agency: db.prepare(
    `INSERT OR IGNORE INTO launch_agency VALUES (@launch_id, @agency_id, @name, @abbrev, @role)`,
  ),
  link: db.prepare(`INSERT INTO launch_link (launch_id, kind, priority, title, description, url, source, publisher, type_name, language, feature_image, start_time, is_live)
    VALUES (@launch_id, @kind, @priority, @title, @description, @url, @source, @publisher, @type_name, @language, @feature_image, @start_time, @is_live)`),
  update: db.prepare(
    `INSERT OR REPLACE INTO launch_update VALUES (@id, @launch_id, @comment, @info_url, @created_by, @created_on)`,
  ),
  timeline: db.prepare(
    `INSERT OR REPLACE INTO launch_timeline VALUES (@launch_id, @seq, @abbrev, @description, @offset_sec)`,
  ),
  model: db.prepare(`INSERT OR REPLACE INTO vehicle_model VALUES (
    @id, @kind, @source_id, @name, @full_name, @family, @type, @manufacturer, @description, @maiden_flight,
    @height, @diameter, @crew_capacity, @human_rated, @reusable, @launch_mass, @leo_capacity, @gto_capacity,
    @info_url, @wiki_url, @image_url, @image_thumb, @image_credit)`),
  vehicle: db.prepare(`INSERT OR REPLACE INTO vehicle VALUES (
    @id, @kind, @source_id, @serial_number, @name, @model_id, @model_name, @status_name, @details,
    @image_url, @image_thumb, @image_credit, @is_placeholder, @in_space, @time_in_space, @fastest_turnaround,
    @source_flights, @source_first_flight, @source_last_flight, @source_successful_landings, @source_attempted_landings,
    0, 0)`),
  assignment: db.prepare(`INSERT INTO flight_assignment (
    launch_id, vehicle_id, model_id, kind, role, reused, flight_number, previous_flight, turnaround,
    landing_documented, landing_attempt, landing_success, recovery, landing_type, landing_type_abbrev,
    landing_zone, landing_zone_abbrev, landing_description, downrange_km, destination, duration, mission_end
  ) VALUES (
    @launch_id, @vehicle_id, @model_id, @kind, @role, @reused, @flight_number, @previous_flight, @turnaround,
    @landing_documented, @landing_attempt, @landing_success, @recovery, @landing_type, @landing_type_abbrev,
    @landing_zone, @landing_zone_abbrev, @landing_description, @downrange_km, @destination, @duration, @mission_end
  )`),
  crew: db.prepare(`INSERT OR IGNORE INTO crew_seat VALUES (
    @assignment_id, @launch_id, @astronaut_id, @name, @role, @role_priority, @phase, @agency, @nationality, @image_thumb, @wiki_url)`),
  payload: db.prepare(`INSERT OR REPLACE INTO payload VALUES (
    @id, @source_kind, @name, @type, @manufacturer, @operator, @description, @mass_kg,
    @image_url, @image_thumb, @info_url, @wiki_url)`),
  payloadFlight: db.prepare(
    `INSERT OR REPLACE INTO payload_flight VALUES (@id, @launch_id, @payload_id, @destination, @amount, @source_kind)`,
  ),
  search: db.prepare(`INSERT INTO search_index (entity, ref, title, subtitle, body) VALUES (?, ?, ?, ?, ?)`),
  meta: db.prepare(`INSERT OR REPLACE INTO sync_meta VALUES (?, ?)`),
};

const seenSlugs = new Set<string>();
function uniqueSlug(name: string, id: string): string {
  const base = slugify(name);
  if (!seenSlugs.has(base)) {
    seenSlugs.add(base);
    return base;
  }
  const withId = `${base}-${id.slice(0, 6)}`;
  seenSlugs.add(withId);
  return withId;
}

const img = (o: any) => ({
  image_url: o?.image_url ?? null,
  image_thumb: o?.thumbnail_url ?? o?.image_url ?? null,
  image_credit: o?.credit ?? null,
});

// --- vehicle models -------------------------------------------------------

const models = new Map<string, any>();
function upsertLauncherModel(cfg: any): string | null {
  if (!cfg?.id) return null;
  const id = `launcher:${cfg.id}`;
  if (!models.has(id)) {
    const fam = Array.isArray(cfg.families) ? cfg.families : [];
    models.set(id, {
      id,
      kind: 'launcher',
      source_id: cfg.id,
      name: cfg.name,
      full_name: cfg.full_name ?? cfg.name,
      family: fam[0]?.name ?? null,
      type: 'Lanceur',
      manufacturer: fam[0]?.manufacturer?.[0]?.name ?? cfg.manufacturer?.name ?? null,
      description: cfg.description ?? fam[0]?.description ?? null,
      maiden_flight: cfg.maiden_flight ?? fam[0]?.maiden_flight ?? null,
      height: cfg.length ?? null,
      diameter: cfg.diameter ?? null,
      crew_capacity: null,
      human_rated: nullableBool(cfg.human_rated),
      reusable: nullableBool(cfg.reusable),
      launch_mass: cfg.launch_mass ?? null,
      leo_capacity: cfg.leo_capacity ?? null,
      gto_capacity: cfg.gto_capacity ?? null,
      info_url: cfg.info_url ?? null,
      wiki_url: cfg.wiki_url ?? null,
      ...img(cfg.image),
    });
  }
  return id;
}

function upsertSpacecraftModel(cfg: any): string | null {
  if (!cfg?.id) return null;
  const id = `spacecraft:${cfg.id}`;
  if (!models.has(id)) {
    const fam = Array.isArray(cfg.family) ? cfg.family : [];
    models.set(id, {
      id,
      kind: 'spacecraft',
      source_id: cfg.id,
      name: cfg.name,
      full_name: cfg.name,
      family: fam[fam.length - 1]?.name ?? null,
      type: cfg.type?.name ?? 'Vaisseau',
      manufacturer: cfg.manufacturer?.name ?? fam[0]?.manufacturer?.name ?? null,
      description: cfg.details ?? cfg.history ?? null,
      maiden_flight: cfg.maiden_flight ?? null,
      height: cfg.height ?? null,
      diameter: cfg.diameter ?? null,
      crew_capacity: cfg.crew_capacity ?? null,
      human_rated: nullableBool(cfg.human_rated),
      reusable: null,
      launch_mass: null,
      leo_capacity: cfg.payload_capacity ?? null,
      gto_capacity: null,
      info_url: cfg.info_link ?? null,
      wiki_url: cfg.wiki_link ?? null,
      ...img(cfg.image),
    });
  }
  return id;
}

// --- physical articles ----------------------------------------------------

const vehicles = new Map<string, any>();
function upsertBooster(l: any, modelId: string | null): string | null {
  if (!l?.id) return null;
  const id = `booster:${l.id}`;
  const existing = vehicles.get(id);
  const row = {
    id,
    kind: 'booster',
    source_id: l.id,
    serial_number: l.serial_number || null,
    name: l.serial_number || `Étage ${l.id}`,
    model_id: modelId,
    model_name: l.launcher_config?.full_name ?? l.launcher_config?.name ?? null,
    status_name: l.status?.name ?? null,
    details: l.details ?? null,
    ...img(l.image),
    is_placeholder: bool(l.is_placeholder),
    in_space: null,
    time_in_space: null,
    fastest_turnaround: l.fastest_turnaround ?? null,
    source_flights: l.flights ?? null,
    source_first_flight: l.first_launch_date ?? null,
    source_last_flight: l.last_launch_date ?? null,
    source_successful_landings: l.successful_landings ?? null,
    source_attempted_landings: l.attempted_landings ?? null,
  };
  vehicles.set(id, { ...existing, ...row, model_id: modelId ?? existing?.model_id ?? null });
  return id;
}

function upsertCapsule(sc: any, modelId: string | null): string | null {
  if (!sc?.id) return null;
  const id = `capsule:${sc.id}`;
  vehicles.set(id, {
    id,
    kind: 'spacecraft',
    source_id: sc.id,
    serial_number: sc.serial_number || null,
    name: sc.name || sc.serial_number || `Vaisseau ${sc.id}`,
    model_id: modelId,
    model_name: sc.spacecraft_config?.name ?? null,
    status_name: sc.status?.name ?? null,
    details: sc.description ?? null,
    ...img(sc.image),
    is_placeholder: bool(sc.is_placeholder),
    in_space: nullableBool(sc.in_space),
    time_in_space: sc.time_in_space ?? null,
    fastest_turnaround: sc.fastest_turnaround ?? null,
    source_flights: sc.flights_count ?? null,
    source_first_flight: null,
    source_last_flight: null,
    source_successful_landings: null,
    source_attempted_landings: null,
  });
  return id;
}

// --- launches -------------------------------------------------------------

const payloadRows = new Map<string, any>();
const payloadFlightRows: any[] = [];

const ingest = db.transaction(() => {
  // Models and physical articles are collected while walking the launches and
  // flushed at the end, so references are only resolvable at commit time.
  db.exec('PRAGMA defer_foreign_keys = ON');

  for (const raw of launches) {
    const l = raw as any;
    const statusId: number = l.status?.id ?? 2;
    const phase = phaseOf(statusId);
    const hasFlown = phase === 'flown' || phase === 'in_flight';
    const prec = resolvePrecision(l.net ?? null, l.net_precision?.name ?? null, hasFlown);

    const stages: LL2LauncherStage[] = l.rocket?.launcher_stage ?? [];
    const spacecraftStages: LL2SpacecraftStage[] = l.rocket?.spacecraft_stage ?? [];
    const inlinePayloads: any[] = l.rocket?.payloads ?? [];
    const videos: any[] = l.vid_urls ?? [];
    const crewCount = spacecraftStages.reduce((n, s: any) => n + (s.launch_crew?.length ?? 0), 0);
    const slug = uniqueSlug(l.name, l.id);
    const cfg = l.rocket?.configuration;
    const configModelId = upsertLauncherModel(cfg);

    ins.launch.run({
      id: l.id,
      slug,
      name: l.name,
      designator: l.launch_designator ?? null,
      last_updated: l.last_updated ?? null,
      status_id: statusId,
      status_name: l.status?.name ?? 'Inconnu',
      status_abbrev: l.status?.abbrev ?? '?',
      status_description: l.status?.description ?? null,
      phase,
      outcome: outcomeOf(statusId),
      fail_reason: l.failreason || null,
      probability: l.probability ?? null,
      weather_concerns: l.weather_concerns ?? null,
      net: l.net ?? null,
      precision_kind: prec?.kind ?? 'unknown',
      precision_label: prec?.sourceLabel ?? null,
      date_lo: prec?.lo ?? null,
      date_hi: prec?.hi ?? null,
      window_start: l.window_start ?? null,
      window_end: l.window_end ?? null,
      pad_turnaround: l.pad_turnaround ?? null,
      mission_name: l.mission?.name ?? null,
      mission_type: l.mission?.type ?? null,
      mission_description: l.mission?.description ?? null,
      orbit_name: l.mission?.orbit?.name ?? null,
      orbit_abbrev: l.mission?.orbit?.abbrev ?? null,
      config_id: cfg?.id ?? null,
      config_name: cfg?.name ?? null,
      config_full_name: cfg?.full_name ?? cfg?.name ?? null,
      family: cfg?.families?.[0]?.name ?? cfg?.name ?? null,
      provider_id: l.launch_service_provider?.id ?? null,
      provider_name: l.launch_service_provider?.name ?? null,
      pad_id: l.pad?.id ?? null,
      pad_name: l.pad?.name ?? null,
      pad_wiki: l.pad?.wiki_url ?? null,
      pad_map_url: l.pad?.map_url ?? null,
      pad_lat: l.pad?.latitude ?? null,
      pad_lon: l.pad?.longitude ?? null,
      location_id: l.pad?.location?.id ?? null,
      location_name: l.pad?.location?.name ?? null,
      location_country: l.pad?.location?.country?.[0]?.name ?? null,
      ...img(l.image),
      // Highest-priority mission patch, when the source publishes one.
      patch_url:
        [...(l.mission_patches ?? [])].sort((a: any, b: any) => (a.priority ?? 99) - (b.priority ?? 99))[0]
          ?.image_url ?? null,
      flightclub_url: l.flightclub_url ?? null,
      webcast_live: bool(l.webcast_live),
      is_crewed: bool(crewCount > 0),
      is_test: bool(TEST_MISSION_TYPES.has(l.mission?.type) || /prototype/i.test(cfg?.name ?? '')),
      booster_count: stages.length,
      payload_count: inlinePayloads.length + spacecraftStages.length,
      has_video: bool(videos.length > 0),
    });

    for (const p of l.program ?? []) {
      ins.program.run({
        launch_id: l.id,
        program_id: p.id,
        name: p.name,
        info_url: p.info_url ?? null,
        wiki_url: p.wiki_url ?? null,
        image_url: p.image?.thumbnail_url ?? p.image?.image_url ?? null,
      });
    }

    if (l.launch_service_provider?.id) {
      ins.agency.run({
        launch_id: l.id,
        agency_id: l.launch_service_provider.id,
        name: l.launch_service_provider.name,
        abbrev: l.launch_service_provider.abbrev ?? null,
        role: 'provider',
      });
    }
    for (const a of l.mission?.agencies ?? []) {
      ins.agency.run({
        launch_id: l.id,
        agency_id: a.id,
        name: a.name,
        abbrev: a.abbrev ?? null,
        role: 'mission',
      });
    }

    for (const v of videos) {
      ins.link.run({
        launch_id: l.id,
        kind: 'video',
        priority: v.priority ?? null,
        title: v.title ?? null,
        description: v.description ?? null,
        url: v.url,
        source: v.source ?? null,
        publisher: v.publisher ?? null,
        type_name: v.type?.name ?? null,
        language: v.language?.name ?? null,
        feature_image: v.feature_image ?? null,
        start_time: v.start_time ?? null,
        is_live: bool(v.live),
      });
    }
    for (const v of l.info_urls ?? []) {
      ins.link.run({
        launch_id: l.id,
        kind: 'info',
        priority: v.priority ?? null,
        title: v.title ?? null,
        description: v.description ?? null,
        url: v.url,
        source: v.source ?? null,
        publisher: v.publisher ?? null,
        type_name: v.type?.name ?? null,
        language: v.language?.name ?? null,
        feature_image: v.feature_image ?? null,
        start_time: null,
        is_live: 0,
      });
    }
    for (const u of l.updates ?? []) {
      ins.update.run({
        id: u.id,
        launch_id: l.id,
        comment: u.comment ?? null,
        info_url: u.info_url ?? null,
        created_by: u.created_by ?? null,
        created_on: u.created_on ?? null,
      });
    }
    (l.timeline ?? []).forEach((t: any, i: number) => {
      const offset = durationToSeconds(t.relative_time);
      if (offset === null) return;
      ins.timeline.run({
        launch_id: l.id,
        seq: i,
        abbrev: t.type?.abbrev ?? 'Événement',
        description: t.type?.description ?? null,
        offset_sec: Math.round(offset),
      });
    });

    // --- boosters
    stages.forEach((s: any) => {
      const launcher = s.launcher;
      const stageModelId = upsertLauncherModel(launcher?.launcher_config) ?? configModelId;
      // A placeholder article carries no real serial number: link to the model instead
      // of minting a fake identity for it.
      const vehicleId = launcher && !launcher.is_placeholder ? upsertBooster(launcher, stageModelId) : null;
      const landing = s.landing;
      ins.assignment.run({
        launch_id: l.id,
        vehicle_id: vehicleId,
        model_id: stageModelId,
        kind: 'booster',
        role: s.type === 'Strap-On Booster' ? 'side_booster' : 'core',
        reused: nullableBool(s.reused),
        flight_number: s.launcher_flight_number ?? null,
        previous_flight: s.previous_flight_date ?? null,
        turnaround: s.turn_around_time ?? null,
        landing_documented: bool(landing),
        landing_attempt: nullableBool(landing?.attempt),
        landing_success: nullableBool(landing?.success),
        recovery: recoveryOf(Boolean(landing), landing?.attempt ?? null, landing?.success ?? null),
        landing_type: landing?.type?.name ?? null,
        landing_type_abbrev: landing?.type?.abbrev ?? null,
        landing_zone: landing?.landing_location?.name ?? null,
        landing_zone_abbrev: landing?.landing_location?.abbrev ?? null,
        landing_description: landing?.description ?? null,
        downrange_km: landing?.downrange_distance ?? null,
        destination: null,
        duration: null,
        mission_end: null,
      });
    });

    // --- spacecraft: the vehicle itself, its crew, and its journey
    spacecraftStages.forEach((s: any) => {
      const sc = s.spacecraft;
      const scModelId = upsertSpacecraftModel(sc?.spacecraft_config);
      const vehicleId = sc && !sc.is_placeholder ? upsertCapsule(sc, scModelId) : null;
      const landing = s.landing;
      const info = ins.assignment.run({
        launch_id: l.id,
        vehicle_id: vehicleId,
        model_id: scModelId,
        kind: 'spacecraft',
        role: 'spacecraft',
        reused: null,
        flight_number: null,
        previous_flight: null,
        turnaround: s.turn_around_time ?? null,
        landing_documented: bool(landing),
        landing_attempt: nullableBool(landing?.attempt),
        landing_success: nullableBool(landing?.success),
        recovery: recoveryOf(Boolean(landing), landing?.attempt ?? null, landing?.success ?? null),
        landing_type: landing?.type?.name ?? null,
        landing_type_abbrev: landing?.type?.abbrev ?? null,
        landing_zone: landing?.landing_location?.name ?? null,
        landing_zone_abbrev: landing?.landing_location?.abbrev ?? null,
        landing_description: landing?.description ?? null,
        downrange_km: landing?.downrange_distance ?? null,
        destination: s.destination ?? null,
        duration: s.duration ?? null,
        mission_end: s.mission_end ?? null,
      });
      const assignmentId = Number(info.lastInsertRowid);

      for (const [phaseName, seats] of [
        ['launch', s.launch_crew],
        ['onboard', s.onboard_crew],
        ['landing', s.landing_crew],
      ] as const) {
        for (const seat of seats ?? []) {
          const a = seat.astronaut;
          if (!a?.id) continue;
          ins.crew.run({
            assignment_id: assignmentId,
            launch_id: l.id,
            astronaut_id: a.id,
            name: a.name,
            role: seat.role?.role ?? null,
            role_priority: seat.role?.priority ?? null,
            phase: phaseName,
            agency: a.agency?.name ?? null,
            nationality: a.nationality?.[0]?.nationality_name ?? null,
            image_thumb: a.image?.thumbnail_url ?? null,
            wiki_url: a.wiki ?? null,
          });
        }
      }

      // The capsule is a distinct object from what it carries: recorded as a payload
      // entry so the flight page can list it, but never merged with its cargo.
      if (sc?.id) {
        const pid = `spacecraft:${sc.id}`;
        payloadRows.set(pid, {
          id: pid,
          source_kind: 'spacecraft',
          name: sc.name || sc.serial_number || 'Vaisseau',
          type: sc.spacecraft_config?.type?.name ?? 'Vaisseau',
          manufacturer: sc.spacecraft_config?.manufacturer?.name ?? null,
          operator: l.launch_service_provider?.name ?? null,
          description: sc.description ?? sc.spacecraft_config?.details ?? null,
          mass_kg: null,
          ...img(sc.image),
          info_url: sc.spacecraft_config?.info_link ?? null,
          wiki_url: sc.spacecraft_config?.wiki_link ?? null,
        });
        payloadFlightRows.push({
          id: `sc-${s.id}`,
          launch_id: l.id,
          payload_id: pid,
          destination: s.destination ?? null,
          amount: 1,
          source_kind: 'spacecraft_stage',
        });
      }
    });

    // --- payloads carried inline on the launch record.
    // `rocket.payloads` holds payload *flight* records, each wrapping the payload
    // itself: the flight carries destination and quantity, the payload carries identity.
    for (const pf of inlinePayloads) {
      const p = (pf as any).payload;
      if (!p?.id || !p.name) continue;
      const pid = `payload:${p.id}`;
      payloadRows.set(pid, {
        id: pid,
        source_kind: 'payload',
        name: p.name,
        type: p.type?.name ?? null,
        manufacturer: p.manufacturer?.name ?? null,
        operator: p.operator?.name ?? null,
        description: p.description ?? null,
        mass_kg: p.mass ?? null,
        ...img(p.image),
        info_url: p.info_url ?? null,
        wiki_url: p.wiki_link ?? null,
      });
      payloadFlightRows.push({
        id: `pf-${(pf as any).id}`,
        launch_id: l.id,
        payload_id: pid,
        destination: (pf as any).destination ?? null,
        amount: (pf as any).amount ?? null,
        source_kind: 'payload_flight',
      });
      if (p.operator?.id) {
        ins.agency.run({
          launch_id: l.id,
          agency_id: p.operator.id,
          name: p.operator.name,
          abbrev: p.operator.abbrev ?? null,
          role: 'payload_operator',
        });
      }
      if (p.manufacturer?.id) {
        ins.agency.run({
          launch_id: l.id,
          agency_id: p.manufacturer.id,
          name: p.manufacturer.name,
          abbrev: p.manufacturer.abbrev ?? null,
          role: 'payload_manufacturer',
        });
      }
    }
  }

  // --- boosters known to the source but absent from our launches -----------
  const launchIds = new Set(launches.map((l: any) => l.id));
  for (const l of rawLaunchers) {
    const mfr =
      l.launcher_config?.manufacturer?.name ?? l.launcher_config?.families?.[0]?.manufacturer?.[0]?.name;
    if (mfr !== 'SpaceX') continue;
    if (l.is_placeholder) continue;
    upsertBooster(l, upsertLauncherModel(l.launcher_config));
  }

  // --- standalone payload catalogue ---------------------------------------
  const payloadById = new Map<number, any>(rawPayloads.map((p: any) => [p.id, p]));
  for (const pf of rawPayloadFlights) {
    const launchId = pf.launch?.id ?? pf.launch;
    if (!launchId || !launchIds.has(launchId)) continue;
    const p = pf.payload ?? payloadById.get(pf.payload_id);
    if (!p?.id) continue;
    const pid = `payload:${p.id}`;
    payloadRows.set(pid, {
      id: pid,
      source_kind: 'payload',
      name: p.name,
      type: p.type?.name ?? null,
      manufacturer: p.manufacturer?.name ?? null,
      operator: p.operator?.name ?? null,
      description: p.description ?? null,
      mass_kg: p.mass ?? null,
      ...img(p.image),
      info_url: p.info_url ?? null,
      wiki_url: p.wiki_link ?? null,
    });
    payloadFlightRows.push({
      id: `pf-${pf.id}`,
      launch_id: launchId,
      payload_id: pid,
      destination: pf.destination ?? null,
      amount: pf.amount ?? null,
      source_kind: 'payload_flight',
    });
  }

  for (const m of models.values()) ins.model.run(m);
  for (const v of vehicles.values()) ins.vehicle.run(v);
  for (const p of payloadRows.values()) ins.payload.run(p);
  const seenPf = new Set<string>();
  for (const pf of payloadFlightRows) {
    if (seenPf.has(pf.id)) continue;
    seenPf.add(pf.id);
    ins.payloadFlight.run(pf);
  }
});

ingest();

// --- counters computed from what we hold, not copied from the source -------
db.exec(`
  UPDATE vehicle SET
    recorded_flights = (
      SELECT COUNT(*) FROM flight_assignment a JOIN launch l ON l.id = a.launch_id
      WHERE a.vehicle_id = vehicle.id AND l.phase IN ('flown', 'in_flight')
    ),
    recorded_upcoming = (
      SELECT COUNT(*) FROM flight_assignment a JOIN launch l ON l.id = a.launch_id
      WHERE a.vehicle_id = vehicle.id AND l.phase = 'scheduled'
    );
  UPDATE launch SET payload_count = (
    SELECT COUNT(*) FROM payload_flight pf WHERE pf.launch_id = launch.id
  );
`);

// --- cross-entity search --------------------------------------------------
const launchDocs = db
  .prepare(
    `
  SELECT l.id, l.slug, l.name, l.mission_name, l.mission_type, l.designator, l.config_full_name,
         l.pad_name, l.location_name, l.orbit_name, l.mission_description,
         COALESCE(GROUP_CONCAT(DISTINCT v.serial_number), '') AS serials,
         COALESCE(GROUP_CONCAT(DISTINCT p.name), '') AS programs
  FROM launch l
  LEFT JOIN flight_assignment a ON a.launch_id = l.id
  LEFT JOIN vehicle v ON v.id = a.vehicle_id
  LEFT JOIN launch_program p ON p.launch_id = l.id
  GROUP BY l.id
`,
  )
  .all() as any[];

const indexAll = db.transaction(() => {
  for (const d of launchDocs) {
    ins.search.run(
      'launch',
      d.slug,
      d.name,
      [d.mission_type, d.config_full_name, d.pad_name].filter(Boolean).join(' · '),
      [
        d.mission_name,
        d.designator,
        d.location_name,
        d.orbit_name,
        d.serials,
        d.programs,
        d.mission_description,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  for (const v of db
    .prepare(`SELECT id, name, serial_number, model_name, kind, details FROM vehicle`)
    .all() as any[]) {
    ins.search.run(
      v.kind === 'booster' ? 'booster' : 'spacecraft',
      v.id,
      v.name,
      v.model_name ?? '',
      [v.serial_number, v.details].filter(Boolean).join(' '),
    );
  }
  for (const m of db.prepare(`SELECT id, name, full_name, family, type FROM vehicle_model`).all() as any[]) {
    ins.search.run(
      'model',
      m.id,
      m.full_name ?? m.name,
      [m.type, m.family].filter(Boolean).join(' · '),
      m.name,
    );
  }
  for (const p of db
    .prepare(`SELECT id, name, type, operator, manufacturer, description FROM payload`)
    .all() as any[]) {
    ins.search.run(
      'payload',
      p.id,
      p.name,
      [p.type, p.operator].filter(Boolean).join(' · '),
      [p.manufacturer, p.description].filter(Boolean).join(' '),
    );
  }
});
indexAll();

const rawMeta = existsSync(path.join(RAW, 'meta.json'))
  ? JSON.parse(readFileSync(path.join(RAW, 'meta.json'), 'utf8'))
  : {};
const sourceUpdated = db.prepare(`SELECT MAX(last_updated) AS m FROM launch`).get() as any;

ins.meta.run('source', rawMeta.base ?? 'https://ll.thespacedevs.com/2.3.0');
ins.meta.run('synced_at', rawMeta.fetchedAt ?? new Date().toISOString());
ins.meta.run('built_at', new Date().toISOString());
ins.meta.run('source_last_updated', sourceUpdated?.m ?? '');
ins.meta.run('launch_count', String(launches.length));

db.exec('PRAGMA optimize');
const counts = db
  .prepare(
    `
  SELECT (SELECT COUNT(*) FROM launch) AS launches,
         (SELECT COUNT(*) FROM vehicle WHERE kind='booster') AS boosters,
         (SELECT COUNT(*) FROM vehicle WHERE kind='spacecraft') AS spacecraft,
         (SELECT COUNT(*) FROM vehicle_model) AS models,
         (SELECT COUNT(*) FROM flight_assignment) AS assignments,
         (SELECT COUNT(*) FROM payload) AS payloads,
         (SELECT COUNT(*) FROM payload_flight) AS payload_flights,
         (SELECT COUNT(*) FROM crew_seat) AS crew
`,
  )
  .get();
console.log('built data/spacex.db', counts);
db.close();
