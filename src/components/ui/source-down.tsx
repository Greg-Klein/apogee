import Link from 'next/link';

/**
 * Shown when the local snapshot is missing entirely.
 * Never substituted with demonstration data: the brief forbids silent fallbacks.
 */
export function SourceDown() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-xl border border-warn/25 bg-warn/5 p-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-warn">Source indisponible</span>
      <h1 className="text-xl tracking-tight text-ink">Aucun instantané de données n&apos;est chargé</h1>
      <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
        Le tableau de bord lit un instantané local de Launch Library 2. Ce fichier est absent, et aucune
        donnée de démonstration n&apos;est substituée à sa place.
      </p>
      <pre className="w-full overflow-x-auto rounded-lg border border-hairline bg-surface px-4 py-3 font-mono text-xs text-ink-2">
        npm run data
      </pre>
      <p className="text-xs text-ink-3">
        La synchronisation respecte la limite de 15 requêtes par heure de l&apos;API et reprend là où elle
        s&apos;est arrêtée.
      </p>
      <Link href="/" className="text-xs text-ion underline underline-offset-4">
        Réessayer
      </Link>
    </div>
  );
}
