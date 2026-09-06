'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Temporary failure state. Offers a retry rather than substituting placeholder
 * data, which the brief forbids.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[apogee]', error);
  }, [error]);

  const sourceMissing = error.message.includes('Snapshot Launch Library');

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 py-16">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-warn">
        {sourceMissing ? 'Source indisponible' : 'Erreur temporaire'}
      </span>
      <h1 className="text-2xl tracking-tight text-ink md:text-3xl">
        {sourceMissing ? "L'instantané de données n'est pas accessible" : "Cet écran n'a pas pu s'afficher"}
      </h1>
      <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
        {sourceMissing
          ? 'Le tableau de bord lit un instantané local de Launch Library 2. Il est absent ou illisible, et aucune donnée de démonstration ne lui est substituée. Relancez `npm run data` pour le reconstruire.'
          : 'Une erreur est survenue pendant le rendu. Les données déjà synchronisées restent intactes ; la navigation et les filtres continuent de fonctionner sur les autres écrans.'}
      </p>
      {error.digest ? (
        <p className="font-mono text-[10px] text-ink-4">Référence technique : {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-ion px-4 py-2 text-sm font-medium text-ground transition-transform duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Réessayer
        </button>
        <Link
          href="/vols"
          className="rounded-lg border border-hairline-2 px-4 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-ion/40 hover:text-ink active:scale-[0.98]"
        >
          Catalogue des vols
        </Link>
      </div>
    </div>
  );
}
