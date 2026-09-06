// Bundles the data-pipeline scripts into standalone ESM files under dist/tools/.
//
// The runtime image ships Next's standalone server, which deliberately omits the
// source tree and the dev dependencies. The sync and ingest steps still have to run
// there (Coolify executes them on a schedule), so they are pre-bundled here into
// plain JavaScript with no need for tsx or the TypeScript sources at runtime.
//
// better-sqlite3 stays external: it is a native addon and must be resolved from
// node_modules inside the image, not inlined.
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('dist/tools', { recursive: true });

await build({
  entryPoints: ['scripts/fetch-raw.mjs', 'scripts/build-db.ts'],
  outdir: 'dist/tools',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external: ['better-sqlite3'],
  // The bundle lives at a different depth than the sources, so anything resolved
  // relative to the process working directory is passed in by environment variable
  // instead (SPACEX_SCHEMA_PATH, SPACEX_RAW_PATH, SPACEX_DB_PATH).
  logLevel: 'info',
});

console.log('bundled dist/tools/fetch-raw.mjs and dist/tools/build-db.mjs');
