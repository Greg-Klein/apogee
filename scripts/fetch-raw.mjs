// Pull raw Launch Library 2 pages to data/raw/*.json.
//
// LL2 allows ~15 anonymous requests/hour, so this script is resumable: pages already
// on disk are skipped, and a 429 pauses instead of failing.
//
//   npm run sync              full pull (about 15 requests, so roughly one hour)
//   npm run sync -- --since   only records the source touched since the last sync,
//                             which usually costs a single request
//
// LL2_BASE can point at https://lldev.thespacedevs.com/2.3.0 for an unmetered but
// stale development mirror.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.LL2_BASE ?? 'https://ll.thespacedevs.com/2.3.0';
const OUT = path.resolve('data/raw');
const SPACEX_AGENCY_ID = 121;
const PAGE = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, file) {
  const dest = path.join(OUT, file);
  if (existsSync(dest)) {
    const cached = JSON.parse(await readFile(dest, 'utf8'));
    console.log(`skip  ${file} (count=${cached.count ?? '?'})`);
    return cached;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': 'spacex-board/1.0 (dashboard)' } });
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after')) || 600;
      console.warn(`429   waiting ${retry}s before retrying ${file}`);
      await sleep(retry * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`);
    const body = await res.json();
    await writeFile(dest, JSON.stringify(body));
    console.log(`fetch ${file} (count=${body.count ?? '?'}, results=${body.results?.length ?? 0})`);
    await sleep(2000);
    return body;
  }
  throw new Error(`giving up on ${url}`);
}

async function paginate(name, buildUrl, expected) {
  let offset = 0;
  let total = expected ?? Infinity;
  while (offset < total) {
    const body = await get(buildUrl(offset), `${name}-${String(offset).padStart(5, '0')}.json`);
    total = body.count ?? 0;
    if (!body.results?.length) break;
    offset += PAGE;
  }
  console.log(`done  ${name}: ${total} records`);
}

await mkdir(OUT, { recursive: true });

const args = process.argv.slice(2);
const incremental = args.includes('--since');

if (incremental) {
  // Refresh only what changed, so a routine update stays well inside the hourly
  // quota. Pages land under a distinct prefix and the builder merges them over the
  // full pull, keeping the most recently updated record for each launch.
  const previous = existsSync(path.join(OUT, 'meta.json'))
    ? JSON.parse(await readFile(path.join(OUT, 'meta.json'), 'utf8')).fetchedAt
    : null;
  if (!previous) {
    console.error('No previous sync recorded. Run a full `npm run sync` first.');
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const body = await get(
      `${BASE}/launches/?lsp__id=${SPACEX_AGENCY_ID}&mode=detailed&limit=${PAGE}&offset=${offset}` +
        `&ordering=net&last_updated__gte=${encodeURIComponent(previous)}`,
      `updates-${stamp}-${String(offset).padStart(5, '0')}.json`,
    );
    total = body.count ?? 0;
    if (!body.results?.length) break;
    offset += PAGE;
  }
  console.log(`incremental: ${total} launches changed since ${previous}`);
  await writeFile(
    path.join(OUT, 'meta.json'),
    JSON.stringify({ base: BASE, fetchedAt: new Date().toISOString(), incrementalFrom: previous }, null, 2),
  );
  console.log('incremental pull complete');
  process.exit(0);
}

await paginate(
  'launches',
  (o) => `${BASE}/launches/?lsp__id=${SPACEX_AGENCY_ID}&mode=detailed&limit=${PAGE}&offset=${o}&ordering=net`,
);
await paginate(
  'launchers',
  (o) =>
    `${BASE}/launchers/?launcher_config__manufacturer__id=${SPACEX_AGENCY_ID}&mode=detailed&limit=${PAGE}&offset=${o}`,
);
await paginate('payload-flights', (o) => `${BASE}/payload_flights/?mode=detailed&limit=${PAGE}&offset=${o}`);
await paginate('payloads', (o) => `${BASE}/payloads/?mode=detailed&limit=${PAGE}&offset=${o}`);

await writeFile(
  path.join(OUT, 'meta.json'),
  JSON.stringify({ base: BASE, fetchedAt: new Date().toISOString() }, null, 2),
);
console.log('raw pull complete');
