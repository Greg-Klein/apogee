import { requireDb } from './client';
import { toMatchQuery } from './launches';

export type SearchHit = {
  entity: 'launch' | 'booster' | 'spacecraft' | 'model' | 'payload';
  ref: string;
  title: string;
  subtitle: string;
  href: string;
};

const HREF: Record<SearchHit['entity'], (ref: string) => string> = {
  launch: (ref) => `/vols/${ref}`,
  booster: (ref) => `/materiel/exemplaires/${encodeURIComponent(ref)}`,
  spacecraft: (ref) => `/materiel/exemplaires/${encodeURIComponent(ref)}`,
  model: (ref) => `/materiel/modeles/${encodeURIComponent(ref)}`,
  payload: (ref) => `/charges-utiles/${encodeURIComponent(ref)}`,
};

/** Cross-entity search, grouped by type. Results link straight to the right page. */
export function search(q: string, perGroup = 6): Record<SearchHit['entity'], SearchHit[]> {
  const empty = { launch: [], booster: [], spacecraft: [], model: [], payload: [] } as Record<
    SearchHit['entity'],
    SearchHit[]
  >;
  if (!q.trim()) return empty;
  const db = requireDb();
  let rows: Array<{ entity: SearchHit['entity']; ref: string; title: string; subtitle: string }>;
  try {
    rows = db
      .prepare(
        `
      SELECT entity, ref, title, subtitle FROM search_index
      WHERE search_index MATCH ? ORDER BY rank LIMIT 120
    `,
      )
      .all(toMatchQuery(q)) as typeof rows;
  } catch {
    return empty;
  }
  const out = { ...empty };
  for (const r of rows) {
    const bucket = out[r.entity];
    if (!bucket || bucket.length >= perGroup) continue;
    bucket.push({ ...r, href: HREF[r.entity](r.ref) });
  }
  return out;
}
