import type { CatalogFilters, CatalogSort, CatalogView } from '@/lib/db/launches';

/**
 * The catalogue state lives in the URL.
 *
 * Every filter, the sort, the page and the scroll anchor are representable as
 * search params, so a search is shareable, the browser back button works, and
 * returning from a flight page restores the same list.
 */

export const PER_PAGE = 25;

const VIEWS: CatalogView[] = ['upcoming', 'past', 'all'];
const SORTS: CatalogSort[] = ['date_desc', 'date_asc', 'name_asc'];

export type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Multi-value params are comma separated, which keeps shared URLs readable. */
const many = (v: string | string[] | undefined): string[] => {
  const raw = Array.isArray(v) ? v : v ? [v] : [];
  return raw
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
};

const numbers = (v: string | string[] | undefined): number[] =>
  many(v)
    .map(Number)
    .filter((n) => Number.isFinite(n));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCatalogParams(sp: RawParams): CatalogFilters {
  const view = (VIEWS as string[]).includes(one(sp.vue) ?? '') ? (one(sp.vue) as CatalogView) : 'all';
  const sortParam = one(sp.tri);
  const sort: CatalogSort = (SORTS as string[]).includes(sortParam ?? '')
    ? (sortParam as CatalogSort)
    : // Upcoming reads best nearest-first, archives most-recent-first.
      view === 'upcoming'
      ? 'date_asc'
      : 'date_desc';

  const from = one(sp.du);
  const to = one(sp.au);
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);

  return {
    view,
    q: one(sp.q)?.trim() || undefined,
    families: many(sp.famille),
    outcomes: many(sp.resultat),
    locations: numbers(sp.site),
    pads: numbers(sp.pas),
    missionTypes: many(sp.type),
    programs: numbers(sp.programme),
    agencies: numbers(sp.organisation),
    crewed: one(sp.equipage) === 'yes' ? 'yes' : one(sp.equipage) === 'no' ? 'no' : undefined,
    from: from && DATE_RE.test(from) ? from : undefined,
    to: to && DATE_RE.test(to) ? to : undefined,
    sort,
    page,
    perPage: PER_PAGE,
  };
}

/** Serialises filters back to a query string, omitting defaults to keep URLs short. */
export function serializeCatalogParams(f: Partial<CatalogFilters>): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | undefined) => {
    if (v) p.set(k, v);
  };
  const setList = (k: string, v: Array<string | number> | undefined) => {
    if (v?.length) p.set(k, v.join(','));
  };

  if (f.view && f.view !== 'all') set('vue', f.view);
  set('q', f.q);
  setList('famille', f.families);
  setList('resultat', f.outcomes);
  setList('site', f.locations);
  setList('pas', f.pads);
  setList('type', f.missionTypes);
  setList('programme', f.programs);
  setList('organisation', f.agencies);
  set('equipage', f.crewed);
  set('du', f.from);
  set('au', f.to);

  const defaultSort = f.view === 'upcoming' ? 'date_asc' : 'date_desc';
  if (f.sort && f.sort !== defaultSort) set('tri', f.sort);
  if (f.page && f.page > 1) set('page', String(f.page));

  return p;
}

export function catalogHref(f: Partial<CatalogFilters>): string {
  const qs = serializeCatalogParams(f).toString();
  return qs ? `/vols?${qs}` : '/vols';
}

export type ActiveFilter = {
  category: string;
  label: string;
  value: string;
  remove: Partial<CatalogFilters>;
};

export function countActiveFilters(f: CatalogFilters): number {
  return (
    (f.q ? 1 : 0) +
    (f.families?.length ?? 0) +
    (f.outcomes?.length ?? 0) +
    (f.locations?.length ?? 0) +
    (f.pads?.length ?? 0) +
    (f.missionTypes?.length ?? 0) +
    (f.programs?.length ?? 0) +
    (f.agencies?.length ?? 0) +
    (f.crewed ? 1 : 0) +
    (f.from ? 1 : 0) +
    (f.to ? 1 : 0)
  );
}
