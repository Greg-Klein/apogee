import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores(['.next/**', 'node_modules/**', 'data/**', 'dist/**', 'next-env.d.ts']),

  {
    // The ingest script walks raw Launch Library JSON, whose `detailed` payload is
    // far wider and looser than the slice we type in src/lib/ll2/types.ts. Narrowing
    // every nested branch there would encode the upstream shape twice; the schema
    // and the domain modules are where the guarantees actually live.
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    // Remote imagery comes from Launch Library's object storage at arbitrary sizes,
    // and a broken asset must degrade to nothing rather than to an empty box. Plain
    // <img> with an onError fallback does that; next/image cannot.
    files: ['src/components/ui/imagery.tsx', 'src/components/launch/webcast.tsx'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
]);

export default eslintConfig;
