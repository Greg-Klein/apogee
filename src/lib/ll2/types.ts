/**
 * Minimal typings for the slice of Launch Library 2 this project consumes.
 * The upstream `detailed` payload is far wider; anything not declared here is
 * deliberately ignored rather than carried through the app untyped.
 */

export type LL2Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type LL2Image = {
  image_url: string | null;
  thumbnail_url: string | null;
  credit: string | null;
} | null;

export type LL2Named = { id: number; name: string; abbrev?: string | null };

export type LL2Landing = {
  attempt: boolean | null;
  success: boolean | null;
  description: string | null;
  downrange_distance: number | null;
  landing_location: (LL2Named & { abbrev: string | null }) | null;
  type: (LL2Named & { abbrev: string | null }) | null;
} | null;

export type LL2LauncherStage = {
  id: number;
  type: string | null;
  reused: boolean | null;
  launcher_flight_number: number | null;
  previous_flight_date: string | null;
  turn_around_time: string | null;
  launcher: {
    id: number;
    serial_number: string | null;
    is_placeholder: boolean;
    status: LL2Named | null;
    details: string | null;
    image: LL2Image;
    flights: number | null;
    first_launch_date: string | null;
    last_launch_date: string | null;
    successful_landings: number | null;
    attempted_landings: number | null;
    fastest_turnaround: string | null;
    launcher_config?: Record<string, unknown>;
  } | null;
  landing: LL2Landing;
};

export type LL2CrewSeat = {
  id: number;
  role: { role: string; priority: number } | null;
  astronaut: {
    id: number;
    name: string;
    image: LL2Image;
    wiki: string | null;
    agency: LL2Named | null;
    nationality: Array<{ nationality_name: string }> | null;
  } | null;
};

export type LL2SpacecraftStage = {
  id: number;
  destination: string | null;
  mission_end: string | null;
  duration: string | null;
  turn_around_time: string | null;
  landing: LL2Landing;
  launch_crew: LL2CrewSeat[] | null;
  onboard_crew: LL2CrewSeat[] | null;
  landing_crew: LL2CrewSeat[] | null;
  spacecraft: {
    id: number;
    name: string;
    serial_number: string | null;
    is_placeholder: boolean;
    in_space: boolean | null;
    time_in_space: string | null;
    flights_count: number | null;
    status: LL2Named | null;
    description: string | null;
    image: LL2Image;
    spacecraft_config?: Record<string, unknown>;
  } | null;
};

export type LL2Launch = {
  id: string;
  name: string;
  slug: string;
  launch_designator: string | null;
  last_updated: string | null;
  status: (LL2Named & { abbrev: string; description: string | null }) | null;
  net: string | null;
  net_precision: (LL2Named & { abbrev: string }) | null;
  window_start: string | null;
  window_end: string | null;
  failreason: string | null;
  probability: number | null;
  weather_concerns: string | null;
  webcast_live: boolean;
  image: LL2Image;
  flightclub_url: string | null;
  pad_turnaround: string | null;
  rocket: {
    configuration: Record<string, unknown> | null;
    launcher_stage: LL2LauncherStage[] | null;
    spacecraft_stage: LL2SpacecraftStage[] | null;
    payloads: Array<Record<string, unknown>> | null;
  };
  mission: Record<string, unknown> | null;
  pad: Record<string, unknown> | null;
  program: Array<Record<string, unknown>> | null;
  launch_service_provider: LL2Named | null;
  updates: Array<Record<string, unknown>> | null;
  info_urls: Array<Record<string, unknown>> | null;
  vid_urls: Array<Record<string, unknown>> | null;
  timeline: Array<Record<string, unknown>> | null;
};
