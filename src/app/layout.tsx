import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { PreferencesProvider } from '@/components/chrome/preferences';
import { Nav } from '@/components/chrome/nav';
import { SearchPalette } from '@/components/chrome/search-palette';
import { TimezoneSwitch } from '@/components/chrome/timezone-switch';
import { Freshness } from '@/components/chrome/freshness';
import { Starfield } from '@/components/viz/starfield';
import { getSyncMeta } from '@/lib/db/client';
import { SITE, metadataBase } from '@/lib/seo';

const sans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});
const mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const TITLE = `${SITE.name} : activité de vol SpaceX`;

export const metadata: Metadata = {
  metadataBase,
  title: { default: TITLE, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  category: 'technology',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    siteName: SITE.name,
    title: TITLE,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#07080c',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = getSyncMeta();

  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-[100dvh] antialiased">
        <PreferencesProvider>
          <Starfield />

          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-ion focus:px-3 focus:py-2 focus:text-sm focus:text-ground"
          >
            Aller au contenu
          </a>

          <header className="sticky top-0 z-30 border-b border-hairline bg-ground/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-[var(--shell-pad)] py-3">
              <div className="flex items-center gap-6">
                <Link href="/" className="group flex items-baseline gap-2">
                  <span className="font-mono text-[13px] font-medium tracking-[0.14em] text-ink transition-colors group-hover:text-ion">
                    APOGÉE
                  </span>
                  <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-ink-4 sm:inline">
                    SpaceX
                  </span>
                </Link>
                <div className="hidden md:block">
                  <Nav />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SearchPalette />
                <TimezoneSwitch />
              </div>
            </div>
            <div className="border-t border-hairline px-[var(--shell-pad)] py-2 md:hidden">
              <Nav />
            </div>
          </header>

          <main id="contenu" className="mx-auto w-full max-w-[1400px] px-[var(--shell-pad)] pb-24 pt-8">
            {children}
          </main>

          <footer className="border-t border-hairline bg-ground-2/60">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-[var(--shell-pad)] py-6">
              <Freshness meta={meta} />
              <p className="max-w-[85ch] text-[11px] leading-relaxed text-ink-4">
                Les données proviennent de Launch Library 2 (The Space Devs) et sont reproduites telles que
                publiées. Ce tableau de bord n&apos;effectue aucun suivi orbital et ne diffuse pas de
                télémétrie en direct. Une information absente de la source est signalée comme non renseignée,
                jamais complétée par déduction.
              </p>
            </div>
          </footer>
        </PreferencesProvider>
      </body>
    </html>
  );
}
