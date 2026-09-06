import type { Metadata } from 'next';

/**
 * Single source of truth for site identity. `url` falls back to localhost so
 * `next build` and `next dev` never crash on a missing env var; production
 * deploys must set `NEXT_PUBLIC_SITE_URL`.
 */
export const SITE = {
  name: 'Apogée',
  description:
    "Tableau de bord des vols SpaceX : prochains départs, archives, matériel réutilisé et charges utiles, d'après Launch Library 2.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  locale: 'fr_FR',
} as const;

/** Root against which every relative URL in metadata (canonical, OG, sitemap) resolves. */
export const metadataBase = new URL(SITE.url);

type PageMetaInput = {
  /** Bare page title; Next applies the root template (`%s · Apogée`) on top of it. */
  title: string;
  description?: string;
  /** Path relative to the site root, e.g. `/vols` or `/vols/starlink-10-1`. */
  path: string;
  /** False marks the page `noindex,nofollow`. Every current route is indexable. */
  index?: boolean;
};

/**
 * Builds a per-page `Metadata` object: canonical URL plus Open Graph and
 * Twitter overrides derived from the same title/description, so a page only
 * states its title and description once.
 */
export function buildMetadata({ title, description, path, index = true }: PageMetaInput): Metadata {
  const desc = description ?? SITE.description;
  const url = new URL(path, metadataBase).toString();

  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: desc,
      url,
      type: 'website',
      locale: SITE.locale,
      siteName: SITE.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
  };
}

// --- JSON-LD ----------------------------------------------------------------
// Plain objects only: pages render them via
// `<script type="application/ld+json">{JSON.stringify(...)}</script>`, never as JSX.

/**
 * Site-wide `WebSite` node with a `SearchAction` pointing at the catalogue
 * search, so a query typed into a search engine's box can deep-link straight
 * into `/vols?q=...`.
 */
export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/vols?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Credits Launch Library 2 (The Space Devs) as the dataset behind the
 * catalogue. This describes the site's data source as a whole; individual
 * flight pages should carry their own `Event`/`Article`-flavoured JSON-LD
 * rather than reuse this node.
 */
export function buildDatasetJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Catalogue des vols SpaceX (Apogée)',
    description: SITE.description,
    url: SITE.url,
    license: 'https://ll.thespacedevs.com/2.3.0/',
    creator: {
      '@type': 'Organization',
      name: 'The Space Devs',
      url: 'https://thespacedevs.com',
    },
    isBasedOn: {
      '@type': 'WebAPI',
      name: 'Launch Library 2',
      url: 'https://thespacedevs.com',
    },
  };
}
