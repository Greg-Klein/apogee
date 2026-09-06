import Link from 'next/link';

/** Fiche introuvable: always offers a way back into the catalogue. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 py-16">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">Erreur 404</span>
      <h1 className="text-2xl tracking-tight text-ink md:text-3xl">Cette fiche est introuvable</h1>
      <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
        L&apos;adresse demandée ne correspond à aucune mission, aucun exemplaire ni aucune charge utile de
        l&apos;instantané. Elle a pu changer, ou l&apos;entrée n&apos;existe pas dans les données de la
        source.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/vols"
          className="rounded-lg bg-ion px-4 py-2 text-sm font-medium text-ground transition-transform duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Catalogue des vols
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-hairline-2 px-4 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-ion/40 hover:text-ink active:scale-[0.98]"
        >
          Vue d&apos;ensemble
        </Link>
      </div>
    </div>
  );
}
