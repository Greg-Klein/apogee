PRAGMA journal_mode = WAL;

DROP TABLE IF EXISTS sync_meta;
CREATE TABLE sync_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

DROP TABLE IF EXISTS launch;
CREATE TABLE launch (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  designator        TEXT,
  last_updated      TEXT,

  -- scheduling, kept separate from outcome on purpose
  status_id         INTEGER NOT NULL,
  status_name       TEXT NOT NULL,
  status_abbrev     TEXT NOT NULL,
  status_description TEXT,
  phase             TEXT NOT NULL,          -- scheduled | in_flight | flown
  outcome           TEXT NOT NULL,          -- success | failure | partial | unknown
  fail_reason       TEXT,
  probability       INTEGER,
  weather_concerns  TEXT,

  -- dates as an interval plus the precision that produced it
  net               TEXT,
  precision_kind    TEXT NOT NULL,          -- instant | day | month | quarter | half | year | decade | unrecorded | unknown
  precision_label   TEXT,
  date_lo           INTEGER,                -- epoch ms, inclusive
  date_hi           INTEGER,                -- epoch ms, exclusive
  window_start      TEXT,
  window_end        TEXT,
  pad_turnaround    TEXT,

  -- mission
  mission_name      TEXT,
  mission_type      TEXT,
  mission_description TEXT,
  orbit_name        TEXT,
  orbit_abbrev      TEXT,

  -- vehicle configuration (the model, not the physical article)
  config_id         INTEGER,
  config_name       TEXT,
  config_full_name  TEXT,
  family            TEXT,

  -- provider and site
  provider_id       INTEGER,
  provider_name     TEXT,
  pad_id            INTEGER,
  pad_name          TEXT,
  pad_wiki          TEXT,
  pad_map_url       TEXT,
  pad_lat           REAL,
  pad_lon           REAL,
  location_id       INTEGER,
  location_name     TEXT,
  location_country  TEXT,

  image_url         TEXT,
  image_thumb       TEXT,
  image_credit      TEXT,
  patch_url         TEXT,
  flightclub_url    TEXT,
  webcast_live      INTEGER NOT NULL DEFAULT 0,

  -- derived flags used by filters and counters
  is_crewed         INTEGER NOT NULL DEFAULT 0,
  is_test           INTEGER NOT NULL DEFAULT 0,
  booster_count     INTEGER NOT NULL DEFAULT 0,
  payload_count     INTEGER NOT NULL DEFAULT 0,
  has_video         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_launch_dates   ON launch (date_lo, date_hi);
CREATE INDEX idx_launch_phase   ON launch (phase, date_lo);
CREATE INDEX idx_launch_config  ON launch (config_id);
CREATE INDEX idx_launch_pad     ON launch (pad_id);
CREATE INDEX idx_launch_family  ON launch (family);

DROP TABLE IF EXISTS launch_program;
CREATE TABLE launch_program (
  launch_id   TEXT NOT NULL REFERENCES launch(id),
  program_id  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  info_url    TEXT,
  wiki_url    TEXT,
  image_url   TEXT,
  PRIMARY KEY (launch_id, program_id)
);
CREATE INDEX idx_program_id ON launch_program (program_id);

DROP TABLE IF EXISTS launch_agency;
CREATE TABLE launch_agency (
  launch_id  TEXT NOT NULL REFERENCES launch(id),
  agency_id  INTEGER NOT NULL,
  name       TEXT NOT NULL,
  abbrev     TEXT,
  role       TEXT NOT NULL,   -- provider | mission | payload_operator | payload_manufacturer
  PRIMARY KEY (launch_id, agency_id, role)
);
CREATE INDEX idx_launch_agency_id ON launch_agency (agency_id);

DROP TABLE IF EXISTS launch_link;
CREATE TABLE launch_link (
  launch_id     TEXT NOT NULL REFERENCES launch(id),
  kind          TEXT NOT NULL,  -- video | info
  priority      INTEGER,
  title         TEXT,
  description   TEXT,
  url           TEXT NOT NULL,
  source        TEXT,
  publisher     TEXT,
  type_name     TEXT,
  language      TEXT,
  feature_image TEXT,
  start_time    TEXT,
  is_live       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_launch_link ON launch_link (launch_id, kind);

DROP TABLE IF EXISTS launch_update;
CREATE TABLE launch_update (
  id         INTEGER PRIMARY KEY,
  launch_id  TEXT NOT NULL REFERENCES launch(id),
  comment    TEXT,
  info_url   TEXT,
  created_by TEXT,
  created_on TEXT
);
CREATE INDEX idx_launch_update ON launch_update (launch_id, created_on);

DROP TABLE IF EXISTS launch_timeline;
CREATE TABLE launch_timeline (
  launch_id     TEXT NOT NULL REFERENCES launch(id),
  seq           INTEGER NOT NULL,
  abbrev        TEXT NOT NULL,
  description   TEXT,
  offset_sec    INTEGER NOT NULL,   -- signed seconds relative to T-0
  PRIMARY KEY (launch_id, seq)
);

-- Models and configurations: what a Falcon 9 is, as opposed to which booster flew.
DROP TABLE IF EXISTS vehicle_model;
CREATE TABLE vehicle_model (
  id            TEXT PRIMARY KEY,     -- "launcher:164" | "spacecraft:6"
  kind          TEXT NOT NULL,        -- launcher | spacecraft
  source_id     INTEGER NOT NULL,
  name          TEXT NOT NULL,
  full_name     TEXT,
  family        TEXT,
  type          TEXT,
  manufacturer  TEXT,
  description   TEXT,
  maiden_flight TEXT,
  height        REAL,
  diameter      REAL,
  crew_capacity INTEGER,
  human_rated   INTEGER,
  reusable      INTEGER,
  launch_mass   REAL,
  leo_capacity  REAL,
  gto_capacity  REAL,
  info_url      TEXT,
  wiki_url      TEXT,
  image_url     TEXT,
  image_thumb   TEXT,
  image_credit  TEXT
);

-- Physical articles: a booster serial number, a named capsule.
DROP TABLE IF EXISTS vehicle;
CREATE TABLE vehicle (
  id             TEXT PRIMARY KEY,    -- "booster:114" | "capsule:551"
  kind           TEXT NOT NULL,       -- booster | spacecraft
  source_id      INTEGER NOT NULL,
  serial_number  TEXT,
  name           TEXT NOT NULL,
  model_id       TEXT REFERENCES vehicle_model(id),
  model_name     TEXT,
  status_name    TEXT,
  details        TEXT,
  image_url      TEXT,
  image_thumb    TEXT,
  image_credit   TEXT,
  is_placeholder INTEGER NOT NULL DEFAULT 0,
  in_space       INTEGER,
  time_in_space  TEXT,
  fastest_turnaround TEXT,
  -- counters reported by the source, kept apart from what we can see in our catalogue
  source_flights INTEGER,
  source_first_flight TEXT,
  source_last_flight  TEXT,
  source_successful_landings INTEGER,
  source_attempted_landings  INTEGER,
  -- counters computed from the launches we hold
  recorded_flights  INTEGER NOT NULL DEFAULT 0,
  recorded_upcoming INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_vehicle_kind ON vehicle (kind, serial_number);

-- One row per participation of one article in one launch.
DROP TABLE IF EXISTS flight_assignment;
CREATE TABLE flight_assignment (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  launch_id           TEXT NOT NULL REFERENCES launch(id),
  vehicle_id          TEXT REFERENCES vehicle(id),
  model_id            TEXT REFERENCES vehicle_model(id),
  kind                TEXT NOT NULL,   -- booster | spacecraft
  role                TEXT NOT NULL,   -- core | side_booster | spacecraft
  reused              INTEGER,
  flight_number       INTEGER,         -- rank of this flight for this article, as of this launch
  previous_flight     TEXT,
  turnaround          TEXT,
  -- recovery, per article
  landing_documented  INTEGER NOT NULL DEFAULT 0,
  landing_attempt     INTEGER,
  landing_success     INTEGER,
  recovery            TEXT NOT NULL,   -- success | failure | no_attempt | attempted_unknown | undocumented
  landing_type        TEXT,
  landing_type_abbrev TEXT,
  landing_zone        TEXT,
  landing_zone_abbrev TEXT,
  landing_description TEXT,
  downrange_km        REAL,
  -- spacecraft only
  destination         TEXT,
  duration            TEXT,
  mission_end         TEXT
);
CREATE INDEX idx_assign_launch  ON flight_assignment (launch_id);
CREATE INDEX idx_assign_vehicle ON flight_assignment (vehicle_id);

DROP TABLE IF EXISTS crew_seat;
CREATE TABLE crew_seat (
  assignment_id INTEGER NOT NULL REFERENCES flight_assignment(id),
  launch_id     TEXT NOT NULL REFERENCES launch(id),
  astronaut_id  INTEGER NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT,
  role_priority INTEGER,
  phase         TEXT NOT NULL,   -- launch | onboard | landing
  agency        TEXT,
  nationality   TEXT,
  image_thumb   TEXT,
  wiki_url      TEXT,
  PRIMARY KEY (assignment_id, astronaut_id, phase)
);

DROP TABLE IF EXISTS payload;
CREATE TABLE payload (
  id            TEXT PRIMARY KEY,   -- "payload:24" | "spacecraft-flight:901"
  source_kind   TEXT NOT NULL,      -- payload | spacecraft
  name          TEXT NOT NULL,
  type          TEXT,
  manufacturer  TEXT,
  operator      TEXT,
  description   TEXT,
  mass_kg       REAL,
  image_url     TEXT,
  image_thumb   TEXT,
  info_url      TEXT,
  wiki_url      TEXT
);

DROP TABLE IF EXISTS payload_flight;
CREATE TABLE payload_flight (
  id           TEXT PRIMARY KEY,
  launch_id    TEXT NOT NULL REFERENCES launch(id),
  payload_id   TEXT NOT NULL REFERENCES payload(id),
  destination  TEXT,
  amount       INTEGER,
  source_kind  TEXT NOT NULL       -- payload_flight | spacecraft_stage
);
CREATE INDEX idx_payload_flight_launch  ON payload_flight (launch_id);
CREATE INDEX idx_payload_flight_payload ON payload_flight (payload_id);

-- Cross-entity search. Rebuilt wholesale on each sync.
DROP TABLE IF EXISTS search_index;
CREATE VIRTUAL TABLE search_index USING fts5(
  entity UNINDEXED,
  ref    UNINDEXED,
  title,
  subtitle,
  body,
  tokenize = "unicode61 remove_diacritics 2"
);
